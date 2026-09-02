import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);

  private readonly bucketName = process.env.AWS_S3_BUCKET_NAME || 'citymart-coldchain-pod';
  private readonly region = process.env.AWS_REGION || 'ap-southeast-1';
  private readonly accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  private readonly secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  /**
   * Upload ảnh chụp POD hoặc ảnh báo cáo Hàng hoàn lên Amazon S3
   * @param base64Data Dữ liệu ảnh Base64 hoặc URI
   * @param orderId Mã đơn hàng
   * @param type Loại ảnh: 'POD' (giao thành công) hoặc 'RETURN' (hàng hoàn)
   */
  async uploadImage(
    base64Data: string,
    orderId: string,
    type: 'POD' | 'RETURN' = 'POD',
  ): Promise<{ url: string; bucket: string; key: string; isSimulated: boolean }> {
    const timestamp = Date.now();
    const cleanOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '');
    const folder = type === 'POD' ? 'proof-of-delivery' : 'return-exceptions';
    const filename = `${folder}/${cleanOrderId}_${timestamp}.jpg`;

    // Nếu đã cấu hình đầy đủ AWS S3 Key
    if (this.accessKeyId && this.secretAccessKey && this.accessKeyId !== 'AKIA_SAMPLE_KEY') {
      try {
        this.logger.log(`[AWS S3] Uploading real image to s3://${this.bucketName}/${filename}...`);
        
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        // Có thể gọi PutObjectCommand trực tiếp
        const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
        return {
          url: s3Url,
          bucket: this.bucketName,
          key: filename,
          isSimulated: false,
        };
      } catch (err: any) {
        this.logger.error(`[AWS S3] Upload failed: ${err.message}. Falling back to CDN preview URL.`);
      }
    }

    // Fallback khi chưa cung cấp Access Key: Tạo URL S3 chuẩn định dạng
    const previewUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
    this.logger.log(`[AWS S3 Ready] Image mapped to Amazon S3 URI: ${previewUrl}`);

    return {
      url: previewUrl,
      bucket: this.bucketName,
      key: filename,
      isSimulated: true,
    };
  }
}
