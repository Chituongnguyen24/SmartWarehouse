import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OtpActionType {
  REGISTER = 'REGISTER',
  RESET_PASSWORD = 'RESET_PASSWORD',
  LOGIN_OTP = 'LOGIN_OTP',
  UPDATE_PHONE = 'UPDATE_PHONE',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
}

@Entity('otp_verifications')
export class OtpVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  phone: string;

  @Column({ name: 'otp_code', length: 10 })
  otpCode: string;

  @Column({
    name: 'action_type',
    type: 'varchar',
    length: 30,
    default: OtpActionType.RESET_PASSWORD,
  })
  actionType: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

