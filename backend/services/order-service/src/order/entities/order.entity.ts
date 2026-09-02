import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',                             // Vừa đặt hàng
  PROCESSING = 'PROCESSING',                       // Đang chờ xử lý
  PICKING = 'PICKING',                             // Đang nhặt hàng trong kho (FEFO)
  PACKING = 'PACKING',                             // Đang đóng gói
  PACKED = 'PACKED',                               // Đã đóng gói xong kiện hàng
  CONFIRMED = 'CONFIRMED',                         // Đã xuất kho xác nhận
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',       // Sẵn sàng tại cửa xuất kho
  DELIVERING = 'DELIVERING',                       // Đang giao hàng
  COMPLETED = 'COMPLETED',                         // Đã giao thành công (POD)
  FAILED_DELIVERY = 'FAILED_DELIVERY',             // Giao không thành công (Reverse Logistics)
  RETURN_TO_WAREHOUSE = 'RETURN_TO_WAREHOUSE',     // Đang trả hàng về kho
  CANCELLED = 'CANCELLED'                          // Đã hủy
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  customerAddress: string;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true })
  deliveryMethod: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'float', nullable: true })
  shippingLat: number; // Tọa độ vĩ độ

  @Column({ type: 'float', nullable: true })
  shippingLng: number; // Tọa độ kinh độ

  @Column({ nullable: true })
  assignedWarehouseId: string; // ID của kho xử lý (WH-006)

  @Column({ nullable: true })
  assignedWarehouseCode: string; // Mã kho xử lý

  @Column({ nullable: true })
  assignedWarehouseName: string; // Tên kho xử lý

  @Column({ name: 'assignedDriverId', nullable: true })
  assignedDriverId: string; // Mã nhân viên / ID tài xế (NV-GV05)

  @Column({ name: 'assignedDriverName', nullable: true })
  assignedDriverName: string; // Tên tài xế (Võ Minh Trí)

  @Column({ name: 'assignedDriverPhone', nullable: true })
  assignedDriverPhone: string; // SĐT tài xế

  @Column({ name: 'assignedDriverPlate', nullable: true })
  assignedDriverPlate: string; // Biển số xe máy (59-V1 888.99)

  // REVERSE LOGISTICS & EXCEPTION FIELDS
  @Column({ nullable: true })
  failureReason: string; // Lý do giao thất bại (Khách không nghe máy, Hàng hỏng...)

  @Column({ nullable: true })
  failurePhotoUrl: string; // Ảnh bằng chứng sự cố giao hàng

  // ELECTRONIC POD FIELDS
  @Column({ nullable: true })
  podPhotoUrl: string; // Ảnh chụp hiện trường giao hàng thành công

  @Column({ nullable: true })
  podSignature: string; // Chữ ký điện tử hoặc mã OTP nhận hàng

  // IOT & TRAFFIC TELEMETRY FIELDS
  @Column({ type: 'float', nullable: true })
  currentTemperature: number; // Nhiệt độ thùng xe lúc giao (°C)

  @Column({ nullable: true })
  trafficCongestionLevel: string; // Mức độ kẹt xe lúc giao (LOW / MEDIUM / RUSH_HOUR)

  @OneToMany(() => OrderItem, item => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
