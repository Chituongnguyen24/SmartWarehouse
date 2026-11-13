import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client | null = null;

  private readonly bucketName = process.env.AWS_S3_BUCKET_NAME || 's3-smartwarehouse-kltn';
  private readonly region = process.env.AWS_REGION || 'ap-southeast-1';
  private readonly accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  private readonly secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  constructor() {
    if (this.accessKeyId && this.secretAccessKey && this.accessKeyId !== 'AKIA_SAMPLE_KEY') {
      try {
        this.s3Client = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
          },
        });
        this.logger.log(`[AWS S3] Initialized S3Client for region: ${this.region}, bucket: ${this.bucketName}`);
      } catch (err: any) {
        this.logger.error(`[AWS S3] Failed to init S3Client: ${err.message}`);
      }
    }
  }

  /**
   * Upload ảnh sản phẩm lên Amazon S3
   * @param base64Data Chuỗi ảnh base64 hoặc Data URL
   * @param sku Mã SKU sản phẩm
   * @param mimeType Định dạng ảnh (image/jpeg, image/png, image/webp)
   */
  async uploadProductImage(
    base64Data: string,
    sku: string = 'PRODUCT',
    mimeType: string = 'image/jpeg',
  ): Promise<{ url: string; bucket: string; key: string; isSimulated: boolean }> {
    const timestamp = Date.now();
    const cleanSku = (sku || 'SKU').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const filename = `products/${cleanSku}_${timestamp}.${ext}`;

    if (this.s3Client) {
      try {
        this.logger.log(`[AWS S3] Đang tải ảnh sản phẩm lên s3://${this.bucketName}/${filename}...`);
        
        // Làm sạch base64 data header nếu có
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');

        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
        });

        await this.s3Client.send(command);
        const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
        this.logger.log(`[AWS S3] Upload ảnh sản phẩm thành công: ${s3Url}`);
        
        return {
          url: s3Url,
          bucket: this.bucketName,
          key: filename,
          isSimulated: false,
        };
      } catch (err: any) {
        this.logger.error(`[AWS S3] Lỗi tải ảnh lên S3: ${err.message}`);
      }
    }

    // Fallback URL khi không có kết nối AWS
    const previewUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
    this.logger.warn(`[AWS S3 Fallback] Dùng URL dự phòng: ${previewUrl}`);
    return {
      url: previewUrl,
      bucket: this.bucketName,
      key: filename,
      isSimulated: true,
    };
  }
}

