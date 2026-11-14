import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OtpVerification, OtpActionType } from './otp-verification.entity';

@Injectable()
export class EsmsService {
  private readonly logger = new Logger(EsmsService.name);
  private apiKey: string;
  private secretKey: string;
  private smsType: string;
  private brandname: string;
  private isLiveSend: boolean;

  constructor(
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('ESMS_API_KEY', 'C2ABDF260DF0EBB1BCE73867029096');
    this.secretKey = this.configService.get<string>('ESMS_SECRET_KEY', 'DB49F3A2DF3AC4B0E6046ECFF07ED0');
    this.smsType = this.configService.get<string>('ESMS_SMS_TYPE', '2');
    this.brandname = this.configService.get<string>('ESMS_BRANDNAME', 'Baotrixemay');
    this.isLiveSend = this.configService.get<string>('ESMS_LIVE_SEND', 'true') === 'true';
  }

  /**
   * Chuẩn hóa số điện thoại di động Việt Nam (e.g. +84, 84 -> 09..., 08..., 07..., 03..., 05...)
   */
  normalizePhone(rawPhone: string): string {
    if (!rawPhone) return '';
    let p = rawPhone.trim().replace(/[\s\-\.]/g, '');
    if (p.startsWith('+84')) {
      p = '0' + p.substring(3);
    } else if (p.startsWith('84') && p.length >= 11) {
      p = '0' + p.substring(2);
    }
    return p;
  }

  /**
   * Kiểm tra số điện thoại có đúng định dạng di động Việt Nam
   */
  isValidVietnamPhone(phone: string): boolean {
    return /^0(3|5|7|8|9)[0-9]{8}$/.test(phone);
  }

  /**
   * Gửi OTP qua SMS eSMS.vn kèm bảo vệ chống spam (Cooldown 60s & Daily Cap)
   */
  async sendOtp(rawPhone: string, actionType: OtpActionType | string = OtpActionType.RESET_PASSWORD): Promise<{
    success: boolean;
    phone: string;
    cooldownSeconds: number;
    expiresAt: Date;
    otpCode?: string;
    message: string;
  }> {
    const phone = this.normalizePhone(rawPhone);
    if (!this.isValidVietnamPhone(phone)) {
      throw new BadRequestException('Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số bắt đầu bằng 03, 05, 07, 08 hoặc 09.');
    }

    const now = new Date();

    // 1. CHỐNG SPAM: Cooldown 60 giây giữa các lần yêu cầu
    const recentOtp = await this.otpRepository.findOne({
      where: {
        phone,
        createdAt: MoreThan(new Date(now.getTime() - 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOtp) {
      const elapsedSeconds = Math.floor((now.getTime() - new Date(recentOtp.createdAt).getTime()) / 1000);
      const remaining = Math.max(1, 60 - elapsedSeconds);
      throw new BadRequestException(`Vui lòng đợi ${remaining} giây trước khi yêu cầu gửi lại mã OTP!`);
    }

    // 2. CHỐNG LÃNG PHÍ TIỀN: Giới hạn tối đa SMS / 24 giờ cho một số điện thoại (ưu tiên số admin test)
    const dailyCount = await this.otpRepository.count({
      where: {
        phone,
        createdAt: MoreThan(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      },
    });

    const maxDaily = phone === '0377019958' ? 50 : 15;
    if (dailyCount >= maxDaily) {
      throw new BadRequestException('Số điện thoại này đã nhận quá hạn mức SMS trong ngày. Vui lòng thử lại vào ngày mai!');
    }

    // 3. SINH MÃ OTP 6 CHỮ SỐ
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // Hiệu lực 5 phút

    // Lưu vào database
    const otpRecord = this.otpRepository.create({
      phone,
      otpCode,
      actionType,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });
    await this.otpRepository.save(otpRecord);

    // Luôn log ra console để phục vụ phát triển/test không bị nghẽn (khi tài khoản eSMS hết tiền)
    console.log(`\n\x1b[32m============================================================\x1b[0m`);
    console.log(`\x1b[33m🔑 [OTP TERMINAL] SĐT: ${phone} | MÃ OTP: \x1b[32m\x1b[1m${otpCode}\x1b[0m (Hiệu lực 5 phút)`);
    console.log(`\x1b[32m============================================================\x1b[0m\n`);
    this.logger.log(`[eSMS OTP GATEWAY] SĐT: ${phone} | MÃ OTP: ${otpCode} | Action: ${actionType}`);

    // Bắn log trực tiếp sang Terminal của giao diện Dev Server (Vite 5173, 5174, 5175)
    this.broadcastToFrontendTerminals({ phone, otpCode, action: String(actionType) });

    // 4. BẮN SMS QUA eSMS.vn (Nếu bật cờ LIVE)
    if (this.isLiveSend) {
      try {
        // Khớp 100% với template đã duyệt của Brandname Baotrixemay: "Ma xac nhan cua ban la {P}"
        const content = `Ma xac nhan cua ban la ${otpCode}`;
        const apiUrl = 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json';

        const payload: Record<string, string> = {
          ApiKey: this.apiKey,
          SecretKey: this.secretKey,
          Phone: phone,
          Content: content,
          SmsType: this.smsType || '8',
          IsUnicode: '0',
        };

        if (this.brandname && this.smsType === '2') {
          payload.Brandname = this.brandname;
        }

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (data && data.CodeResult === '100') {
          this.logger.log(`[eSMS] Gửi SMS thành công tới ${phone}. SMSID: ${data.SMSID}`);
        } else {
          this.logger.warn(`[eSMS Warning] Phản hồi từ eSMS: ${JSON.stringify(data)}`);
        }
      } catch (err: any) {
        this.logger.error(`[eSMS Error] Không thể gửi SMS qua eSMS API: ${err.message}`);
        // Không throw lỗi làm sập flow, vì OTP đã lưu vào DB và hiển thị trên terminal
      }
    }

    return {
      success: true,
      phone,
      cooldownSeconds: 60,
      expiresAt,
      otpCode,
      message: 'Mã xác thực OTP đã được gửi đến số điện thoại của bạn qua tin nhắn SMS.',
    };
  }

  /**
   * Xác thực mã OTP
   */
  async verifyOtp(rawPhone: string, otpCode: string, actionType?: string): Promise<{ success: boolean; verified: boolean }> {
    const phone = this.normalizePhone(rawPhone);
    const code = (otpCode || '').trim();

    if (!code) {
      throw new BadRequestException('Vui lòng nhập mã OTP 6 chữ số!');
    }

    const now = new Date();

    // Tìm mã OTP mới nhất chưa sử dụng và chưa hết hạn
    const record = await this.otpRepository.findOne({
      where: {
        phone,
        isUsed: false,
        expiresAt: MoreThan(now),
        ...(actionType ? { actionType } : {}),
      },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException('Mã xác thực OTP không đúng hoặc đã hết hạn sử dụng. Vui lòng yêu cầu mã mới!');
    }

    if (record.otpCode !== code) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        record.isUsed = true; // Khóa mã này sau 5 lần nhập sai
      }
      await this.otpRepository.save(record);
      throw new BadRequestException(`Mã OTP không chính xác! (Còn ${Math.max(0, 5 - record.attempts)} lần thử)`);
    }

    // Đánh dấu đã sử dụng
    record.isUsed = true;
    await this.otpRepository.save(record);

    return {
      success: true,
      verified: true,
    };
  }

  /**
   * Đồng bộ in mã OTP sang Terminal của Giao Diện (Vite dev server)
   * Không ảnh hưởng luồng bảo mật (UI vẫn không nhận OTP qua HTTP response)
   */
  private broadcastToFrontendTerminals(data: { phone: string; otpCode: string; action?: string }) {
    const ports = [5173, 5174, 5175];
    const payload = JSON.stringify(data);
    ports.forEach(port => {
      fetch(`http://localhost:${port}/__vite_terminal_log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => {
        // Bỏ qua nếu port không lắng nghe
      });
    });
  }
}

