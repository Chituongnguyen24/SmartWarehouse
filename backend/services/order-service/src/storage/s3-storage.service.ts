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
    const cleanOrderId = (orderId || 'ORD').replace(/[^a-zA-Z0-9_-]/g, '');
    const folder = type === 'POD' ? 'proof-of-delivery' : 'return-exceptions';
    const filename = `${folder}/${cleanOrderId}_${timestamp}.jpg`;

    // Nếu đã cấu hình S3 Client
    if (this.s3Client) {
      try {
        this.logger.log(`[AWS S3] Uploading real image to s3://${this.bucketName}/${filename}...`);
        
        // Convert base64 to buffer
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');

        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: filename,
          Body: buffer,
          ContentType: 'image/jpeg',
        });

        await this.s3Client.send(command);
        const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
        this.logger.log(`[AWS S3] Upload SUCCESS: ${s3Url}`);
        return {
          url: s3Url,
          bucket: this.bucketName,
          key: filename,
          isSimulated: false,
        };
      } catch (err: any) {
        this.logger.error(`[AWS S3] Upload error: ${err.message}. Returning fallback URL.`);
      }
    }

    // Fallback URL khi chưa kết nối được
    const previewUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
    this.logger.log(`[AWS S3 Ready] Image mapped to Amazon S3 URI: ${previewUrl}`);

    return {
      url: previewUrl,
      bucket: this.bucketName,
      key: filename,
      isSimulated: true,
    };
  }

  /**
   * Upload hình ảnh hoặc video tin nhắn chat lên Amazon S3
   * @param base64Data Dữ liệu base64 (image hoặc video)
   * @param filename Tên file gốc hoặc định danh
   * @param mimeType Định dạng file (e.g. image/jpeg, image/webp, video/mp4, video/webm)
   */
  async uploadChatMedia(
    base64Data: string,
    filename = 'media.jpg',
    mimeType = 'image/jpeg',
  ): Promise<{ url: string; key: string; mediaType: 'IMAGE' | 'VIDEO'; isSimulated: boolean }> {
    const timestamp = Date.now();
    const cleanFilename = (filename || 'media').replace(/[^a-zA-Z0-9._-]/g, '_');
    const isVideo = (mimeType && mimeType.startsWith('video/')) || /\.(mp4|webm|mov|avi)$/i.test(cleanFilename);
    const folder = isVideo ? 'chat-media/videos' : 'chat-media/images';
    const key = `${folder}/${timestamp}_${cleanFilename}`;

    if (this.s3Client) {
      try {
        this.logger.log(`[AWS S3] Uploading chat media to s3://${this.bucketName}/${key} (${mimeType})...`);
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');

        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        });

        await this.s3Client.send(command);
        const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
        this.logger.log(`[AWS S3] Chat media upload SUCCESS: ${s3Url}`);
        return {
          url: s3Url,
          key,
          mediaType: isVideo ? 'VIDEO' : 'IMAGE',
          isSimulated: false,
        };
      } catch (err: any) {
        this.logger.error(`[AWS S3] Chat media upload error: ${err.message}. Using direct S3 URL template.`);
      }
    }

    const previewUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    return {
      url: previewUrl,
      key,
      mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      isSimulated: true,
    };
  }
}
