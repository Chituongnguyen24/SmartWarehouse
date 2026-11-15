import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

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

  hasS3Client(): boolean {
    return !!this.s3Client;
  }

  async getObjectStream(key: string): Promise<Readable | null> {
    if (!this.s3Client) return null;
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      return response.Body as Readable;
    } catch (e: any) {
      this.logger.warn(`[AWS S3] getObjectStream error for key "${key}": ${e?.message}`);
      return null;
    }
  }

  /**
   * Upload ảnh chụp POD hoặc ảnh báo cáo Hàng hoàn lên Amazon S3 & lưu dự phòng cục bộ
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

    // 1. Nếu dữ liệu đầu vào đã là một URL ảnh online hợp lệ (VD Unsplash)
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      return {
        url: base64Data,
        bucket: this.bucketName,
        key: filename,
        isSimulated: false,
      };
    }

    // 2. Decode base64 buffer và lưu dự phòng vào thư mục uploads cục bộ
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    try {
      const uploadDir = path.join(process.cwd(), 'uploads', folder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, `${cleanOrderId}_${timestamp}.jpg`), buffer);
    } catch (fsErr: any) {
      this.logger.warn(`Failed to save local POD backup: ${fsErr?.message}`);
    }

    // 3. Nếu đã cấu hình S3 Client, upload lên S3
    if (this.s3Client) {
      try {
        this.logger.log(`[AWS S3] Uploading real image to s3://${this.bucketName}/${filename}...`);
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
          url: `/orders/pod-photo/${filename}`,
          bucket: this.bucketName,
          key: filename,
          isSimulated: false,
        };
      } catch (err: any) {
        this.logger.error(`[AWS S3] Upload error: ${err.message}. Returning local proxy URL.`);
      }
    }

    // Luôn trả về URL endpoint proxy của hệ thống để frontend hiển thị 100% không bị chặn bởi CORS/403
    const proxyUrl = `/orders/pod-photo/${filename}`;
    this.logger.log(`[POD Image Ready] Accessible via proxy URL: ${proxyUrl}`);

    return {
      url: proxyUrl,
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
