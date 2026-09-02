import { Injectable, Logger } from '@nestjs/common';

export interface WarehouseLocation {
  id: string;
  code: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export const WAREHOUSE_NETWORK: WarehouseLocation[] = [
  {
    id: 'WH-001',
    code: 'WH-001',
    name: 'Kho Hàng Quận 12 (HCM North)',
    address: '12 Tô Ký, Phường Tân Chánh Hiệp, TP.HCM',
    latitude: 10.8671,
    longitude: 106.6713,
    isActive: true,
  },
  {
    id: 'WH-002',
    code: 'WH-002',
    name: 'Kho Hàng Thủ Đức (HCM East)',
    address: '1 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức',
    latitude: 10.8494,
    longitude: 106.7725,
    isActive: true,
  },
  {
    id: 'WH-003',
    code: 'WH-003',
    name: 'Kho Hàng Bình Chánh (HCM West)',
    address: 'Tỉnh lộ 10, Xã Vĩnh Lộc / Tân Tạo, Huyện Bình Chánh, TP.HCM',
    latitude: 10.6868,
    longitude: 106.5932,
    isActive: true,
  },
  {
    id: 'WH-004',
    code: 'WH-004',
    name: 'Kho Hàng Quận 7 (HCM South)',
    address: '1025 Nguyễn Văn Linh, Phường Tân Phong, TP.HCM',
    latitude: 10.7324,
    longitude: 106.7214,
    isActive: true,
  },
  {
    id: 'WH-005',
    code: 'WH-005',
    name: 'Kho Hàng Bình Thạnh (HCM Center-East)',
    address: '150 Điện Biên Phủ, Phường 25, TP.HCM',
    latitude: 10.8016,
    longitude: 106.7135,
    isActive: true,
  },
  {
    id: 'WH-006',
    code: 'WH-006',
    name: 'Kho Hàng Gò Vấp (Trung Tâm)',
    address: '350 Quang Trung, Phường 10, Quận Gò Vấp, TP.HCM',
    latitude: 10.8252,
    longitude: 106.6631,
    isActive: true,
  },
  {
    id: 'WH-007',
    code: 'WH-007',
    name: 'Kho Hàng Quận 1 (HCM Center)',
    address: '85 Lê Lợi, Phường Bến Nghé, TP.HCM',
    latitude: 10.7769,
    longitude: 106.7009,
    isActive: true,
  },
  {
    id: 'WH-008',
    code: 'WH-008',
    name: 'Kho Hàng Quận 5 (HCM South-West)',
    address: '105 An Dương Vương, Phường 9, TP.HCM',
    latitude: 10.7574,
    longitude: 106.6635,
    isActive: true,
  },
  {
    id: 'WH-009',
    code: 'WH-009',
    name: 'Kho Hàng Tân Bình (HCM West-Center)',
    address: '20 Trường Chinh, Phường 15, TP.HCM',
    latitude: 10.7938,
    longitude: 106.6509,
    isActive: true,
  },
  {
    id: 'WH-010',
    code: 'WH-010',
    name: 'Kho Hàng Bình Tân (HCM Deep-West)',
    address: '88 Kinh Dương Vương, Phường An Lạc, TP.HCM',
    latitude: 10.7492,
    longitude: 106.6025,
    isActive: true,
  },
  {
    id: 'WH-011',
    code: 'WH-011',
    name: 'Kho Hàng Hóc Môn (HCM Far-North)',
    address: '14 Nguyễn Ảnh Thủ, Xã Bà Điểm, TP.HCM',
    latitude: 10.8833,
    longitude: 106.5931,
    isActive: true,
  },
  {
    id: 'WH-012',
    code: 'WH-012',
    name: 'Kho Hàng Nhà Bè (HCM Far-South)',
    address: '500 Huỳnh Tấn Phát, Xã Phú Xuân, TP.HCM',
    latitude: 10.6953,
    longitude: 106.7231,
    isActive: true,
  },
  {
    id: 'WH-013',
    code: 'WH-013',
    name: 'Kho Hàng Phú Nhuận (HCM Mid-Center)',
    address: '18 Phan Xích Long, Phường 2, TP.HCM',
    latitude: 10.7992,
    longitude: 106.6803,
    isActive: true,
  },
  {
    id: 'WH-014',
    code: 'WH-014',
    name: 'Kho Hàng Quận 8 (HCM South-West-Line)',
    address: '1020 Phạm Thế Hiển, Phường 5, TP.HCM',
    latitude: 10.7239,
    longitude: 106.6342,
    isActive: true,
  },
  {
    id: 'WH-015',
    code: 'WH-015',
    name: 'Kho Hàng Củ Chi (HCM Northwest-Zone)',
    address: '450 Quốc lộ 22, Xã Tân Thông Hội, TP.HCM',
    latitude: 10.9625,
    longitude: 106.4981,
    isActive: true,
  },
  {
    id: 'WH-016',
    code: 'WH-016',
    name: 'Kho Hàng Quận 10 (HCM Center-West)',
    address: '123 Đường 3 Tháng 2, Phường 11, TP.HCM',
    latitude: 10.7719,
    longitude: 106.6669,
    isActive: true,
  },
];

@Injectable()
export class SmartRoutingService {
  private readonly logger = new Logger(SmartRoutingService.name);

  /**
   * Tính khoảng cách đường tròn lớn theo công thức Haversine (Đơn vị: Kilomet)
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Phân giải tọa độ chính xác dựa trên địa chỉ giao hàng tại TP.HCM (Geocoding Dictionary)
   */
  geocodeAddress(address: string): { lat: number; lng: number } {
    const addr = (address || '').toLowerCase();

    // 1. Bình Chánh & Vĩnh Lộc
    if (
      addr.includes('bình chánh') ||
      addr.includes('lại hùng cường') ||
      addr.includes('vĩnh lộc') ||
      addr.includes('tân kiên') ||
      addr.includes('bình hưng') ||
      addr.includes('an phú tây') ||
      addr.includes('quy đức') ||
      addr.includes('tân túc')
    ) {
      return { lat: 10.6868, lng: 106.5932 };
    }

    // 2. Bình Tân
    if (
      addr.includes('bình tân') ||
      addr.includes('tên lửa') ||
      addr.includes('kinh dương vương') ||
      addr.includes('an lạc') ||
      addr.includes('bình trị đông')
    ) {
      return { lat: 10.7492, lng: 106.6025 };
    }

    // 3. Quận 7 & Phú Mỹ Hưng
    if (
      addr.includes('quận 7') ||
      addr.includes('nguyễn văn linh') ||
      addr.includes('phú mỹ hưng') ||
      addr.includes('huỳnh tấn phát, quận 7') ||
      addr.includes('nguyễn thị thập')
    ) {
      return { lat: 10.7324, lng: 106.7214 };
    }

    // 4. Nhà Bè
    if (
      addr.includes('nhà bè') ||
      addr.includes('phú xuân') ||
      addr.includes('hiệp phước') ||
      addr.includes('long thới')
    ) {
      return { lat: 10.6953, lng: 106.7231 };
    }

    // 5. Củ Chi
    if (
      addr.includes('củ chi') ||
      addr.includes('quốc lộ 22') ||
      addr.includes('tân thông hội') ||
      addr.includes('an nhơn tây')
    ) {
      return { lat: 10.9625, lng: 106.4981 };
    }

    // 6. Hóc Môn
    if (
      addr.includes('hóc môn') ||
      addr.includes('bà điểm') ||
      addr.includes('nguyễn ảnh thủ') ||
      addr.includes('xuân thới thượng')
    ) {
      return { lat: 10.8833, lng: 106.5931 };
    }

    // 7. Thủ Đức
    if (
      addr.includes('thủ đức') ||
      addr.includes('võ văn ngân') ||
      addr.includes('linh trung') ||
      addr.includes('hiệp bình') ||
      addr.includes('quận 9') ||
      addr.includes('quận 2')
    ) {
      return { lat: 10.8494, lng: 106.7725 };
    }

    // 8. Quận 1 & Quận 3
    if (
      addr.includes('quận 1') ||
      addr.includes('lê lợi') ||
      addr.includes('bến nghé') ||
      addr.includes('bến thành') ||
      addr.includes('quận 3') ||
      addr.includes('nam kỳ khởi nghĩa')
    ) {
      return { lat: 10.7769, lng: 106.7009 };
    }

    // 9. Quận 5 & Quận 6
    if (
      addr.includes('quận 5') ||
      addr.includes('chợ lớn') ||
      addr.includes('an dương vương') ||
      addr.includes('hùng vương') ||
      addr.includes('quận 6') ||
      addr.includes('hậu giang')
    ) {
      return { lat: 10.7574, lng: 106.6635 };
    }

    // 10. Quận 8
    if (
      addr.includes('quận 8') ||
      addr.includes('phạm thế hiển') ||
      addr.includes('tạ quang bửu')
    ) {
      return { lat: 10.7239, lng: 106.6342 };
    }

    // 11. Quận 10 & Quận 11
    if (
      addr.includes('quận 10') ||
      addr.includes('đường 3 tháng 2') ||
      addr.includes('tô hiến thành') ||
      addr.includes('quận 11') ||
      addr.includes('lạc long quân')
    ) {
      return { lat: 10.7719, lng: 106.6669 };
    }

    // 12. Phú Nhuận
    if (
      addr.includes('phú nhuận') ||
      addr.includes('phan xích long') ||
      addr.includes('hoàng văn thụ, phú nhuận')
    ) {
      return { lat: 10.7992, lng: 106.6803 };
    }

    // 13. Bình Thạnh
    if (
      addr.includes('bình thạnh') ||
      addr.includes('điện biên phủ') ||
      addr.includes('xô viết nghệ tĩnh') ||
      addr.includes('hàng xanh')
    ) {
      return { lat: 10.8016, lng: 106.7135 };
    }

    // 14. Quận 12
    if (
      addr.includes('quận 12') ||
      addr.includes('tô ký') ||
      addr.includes('tân chánh hiệp') ||
      addr.includes('an phú đông')
    ) {
      return { lat: 10.8671, lng: 106.6713 };
    }

    // 15. Tân Bình
    if (
      addr.includes('tân bình') ||
      addr.includes('trường chinh') ||
      addr.includes('cộng hòa') ||
      addr.includes('bàu cát')
    ) {
      return { lat: 10.7938, lng: 106.6509 };
    }

    // 16. Gò Vấp
    if (
      addr.includes('phạm văn chiêu') ||
      addr.includes('phan huy ích') ||
      addr.includes('quang trung') ||
      addr.includes('nguyễn oanh') ||
      addr.includes('thống nhất') ||
      addr.includes('lê đức thọ') ||
      addr.includes('gò vấp')
    ) {
      if (addr.includes('phạm văn chiêu')) return { lat: 10.8492, lng: 106.6543 };
      if (addr.includes('phan huy ích')) return { lat: 10.8315, lng: 106.6345 };
      if (addr.includes('quang trung')) return { lat: 10.8398, lng: 106.6582 };
      if (addr.includes('nguyễn oanh')) return { lat: 10.842, lng: 106.678 };
      if (addr.includes('thống nhất')) return { lat: 10.8465, lng: 106.669 };
      if (addr.includes('lê đức thọ')) return { lat: 10.852, lng: 106.671 };
      return { lat: 10.8252, lng: 106.6631 };
    }

    // Default TP.HCM Center
    return { lat: 10.8252, lng: 106.6631 };
  }

  /**
   * Tự động quét toàn bộ 16 kho trong mạng lưới và chọn kho tối ưu nhất (Gần nhất theo công thức Haversine)
   */
  findOptimalWarehouse(
    customerAddress: string,
    customerLat?: number,
    customerLng?: number,
  ): {
    warehouse: WarehouseLocation;
    distanceKm: number;
    estimatedDeliveryMinutes: number;
  } {
    let lat = customerLat;
    let lng = customerLng;

    if (!lat || !lng) {
      const coords = this.geocodeAddress(customerAddress);
      lat = coords.lat;
      lng = coords.lng;
    }

    let nearestWarehouse = WAREHOUSE_NETWORK[0];
    let minDistance = Infinity;

    for (const wh of WAREHOUSE_NETWORK) {
      if (!wh.isActive) continue;
      const dist = this.calculateHaversineDistance(
        lat,
        lng,
        wh.latitude,
        wh.longitude,
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestWarehouse = wh;
      }
    }

    // Ước lượng thời gian giao hàng (Vận tốc trung bình đô thị 25 km/h + 5 phút đóng gói)
    const estimatedMinutes = Math.round((minDistance / 25) * 60 + 5);

    this.logger.log(
      `[SmartRouting] Địa chỉ "${customerAddress}" (Lat: ${lat}, Lng: ${lng}) -> Gán Kho tối ưu: ${nearestWarehouse.name} (${nearestWarehouse.code}) - Cự ly: ${minDistance} km (ETA: ${estimatedMinutes} phút)`,
    );

    return {
      warehouse: nearestWarehouse,
      distanceKm: minDistance,
      estimatedDeliveryMinutes: Math.max(10, estimatedMinutes),
    };
  }
}
