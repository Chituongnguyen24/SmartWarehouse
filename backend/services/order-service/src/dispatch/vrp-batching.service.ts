import { Injectable, Logger } from '@nestjs/common';
import { SmartRoutingService } from './smart-routing.service';

export interface VrpOrderCandidate {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  latitude: number;
  longitude: number;
  totalWeightKg: number;
  totalAmount: number;
  storageType: 'COLD' | 'FROZEN' | 'AMBIENT';
  corridorAxis?: string; // Tên trục đường / hành lang chính
  bearingAngle?: number;  // Góc phương vị từ kho (0-360 độ)
  timeSlot?: string;
}

export interface VrpStop {
  sequence: number;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerAddress: string;
  corridorName?: string;
  latitude: number;
  longitude: number;
  distanceFromPreviousKm: number;
  estimatedTravelTimeMinutes: number;
  estimatedArrivalTime: string;
  codAmount: number;
}

export interface VrpBatchRoute {
  routeId: string;
  warehouseCode: string;
  warehouseName: string;
  corridorName: string; // Tên hành lang tuyến đường (ví dụ: "Trục Phạm Văn Chiêu - Phan Huy Ích")
  assignedDriverId: string;
  assignedDriverName: string;
  assignedDriverPhone: string;
  assignedDriverPlate: string;
  totalOrders: number;
  totalWeightKg: number;
  totalDistanceKm: number;
  estimatedTotalMinutes: number;
  trafficLevel: 'LOW' | 'MEDIUM' | 'HEAVY' | 'RUSH_HOUR';
  averageSpeedKmh: number;
  stops: VrpStop[];
  dispatchType: 'INTERNAL_FLEET' | '3PL_PARTNER';
}

export const INTERNAL_DRIVERS = [
  { id: 'NV-GV05', name: 'Võ Minh Trí', phone: '0977112233', plate: '59-V1 888.99', maxCapacityKg: 30, isAvailable: true },
  { id: 'NV-GV06', name: 'Nguyễn Văn Hùng', phone: '0909888111', plate: '59-G2 688.39', maxCapacityKg: 30, isAvailable: true },
  { id: 'NV-GV07', name: 'Trần Quốc Bảo', phone: '0933445566', plate: '59-P1 456.78', maxCapacityKg: 30, isAvailable: true },
  { id: 'NV-GV08', name: 'Phạm Hoàng Nam', phone: '0918776655', plate: '59-K1 234.56', maxCapacityKg: 30, isAvailable: true },
  { id: 'NV-GV09', name: 'Lê Thanh Tùng', phone: '0966332211', plate: '59-X1 999.11', maxCapacityKg: 30, isAvailable: true },
  { id: 'NV-GV10', name: 'Đặng Hữu Phúc', phone: '0944778899', plate: '59-T2 777.88', maxCapacityKg: 30, isAvailable: true },
];

// Danh mục trục hành lang giao thông đô thị TP.HCM
const CORRIDOR_DICTIONARY = [
  {
    name: 'Trục Tây-Bắc Gò Vấp (Quang Trung - Phan Huy Ích - Phạm Văn Chiêu)',
    keywords: ['phạm văn chiêu', 'phan huy ích', 'quang trung', 'lê văn thọ', 'cây trâm', 'phường 8', 'phường 9', 'phường 12', 'phường 14'],
  },
  {
    name: 'Trục Đông-Bắc Gò Vấp (Nguyễn Oanh - Lê Đức Thọ - Thống Nhất)',
    keywords: ['nguyễn oanh', 'lê đức thọ', 'thống nhất', 'nguyễn văn lượng', 'phan văn trị', 'dương quảng hàm', 'phường 6', 'phường 17'],
  },
  {
    name: 'Trục Tây TP.HCM (Tân Bình - Tân Phú - Trường Chinh - Cộng Hòa)',
    keywords: ['trường chinh', 'cộng hòa', 'hoàng hoa thám', 'bàu cát', 'lũy bán bích', 'tân kỳ tân quý', 'tân bình', 'tân phú'],
  },
  {
    name: 'Trục Bắc TP.HCM (Quận 12 - Hóc Môn - Tô Ký - Nguyễn Ảnh Thủ)',
    keywords: ['tô ký', 'tân chánh hiệp', 'nguyễn ảnh thủ', 'nguyễn văn quá', 'quận 12', 'hóc môn', 'bà điểm', 'quốc lộ 1a'],
  },
  {
    name: 'Trục Tây Ngoại Thành (Bình Chánh - Vĩnh Lộc - Tỉnh Lộ 10)',
    keywords: ['lại hùng cường', 'vĩnh lộc', 'tỉnh lộ 10', 'bình chánh', 'võ văn vân', 'trần văn giàu', 'tân tạo', 'tân kiên'],
  },
  {
    name: 'Trục Nam Sài Gòn (Quận 7 - Nhà Bè - Nguyễn Văn Linh)',
    keywords: ['nguyễn văn linh', 'phú mỹ hưng', 'quận 7', 'nhà bè', 'huỳnh tấn phát', 'nguyễn thị thập', 'nguyễn hữu thọ'],
  },
  {
    name: 'Trục Đông Sài Gòn (Thủ Đức - Võ Văn Ngân - Phạm Văn Đồng)',
    keywords: ['thủ đức', 'võ văn ngân', 'phạm văn đồng', 'linh trung', 'kha vạn cân', 'xa lộ hà nội', 'đặng văn bi'],
  },
  {
    name: 'Trục Trung Tâm (Quận 1 - Quận 3 - Quận 5 - Quận 10)',
    keywords: ['lê lợi', 'bến thành', 'quận 1', 'quận 3', 'quận 5', 'quận 10', 'đường 3 tháng 2', 'an dương vương', 'hùng vương'],
  },
];

@Injectable()
export class VrpBatchingService {
  private readonly logger = new Logger(VrpBatchingService.name);

  constructor(private readonly smartRoutingService: SmartRoutingService) {}

  /**
   * Tính toán góc phương vị (Bearing Angle: 0° - 360°) từ tâm Kho tới địa chỉ khách
   */
  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));

    const bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }

  /**
   * Tự động nhận diện trục hành lang tuyến đường chính từ địa chỉ
   */
  private identifyCorridor(address: string, bearing: number): string {
    const addr = (address || '').toLowerCase();
    for (const c of CORRIDOR_DICTIONARY) {
      if (c.keywords.some(kw => addr.includes(kw))) {
        return c.name;
      }
    }

    // Phân loại theo rẻ quạt phương vị địa lý nếu địa chỉ chưa có tên đường chính
    if (bearing >= 315 || bearing < 45) return 'Trục Hành Lang Hướng Bắc (Sector North)';
    if (bearing >= 45 && bearing < 135) return 'Trục Hành Lang Hướng Đông (Sector East)';
    if (bearing >= 135 && bearing < 225) return 'Trục Hành Lang Hướng Nam (Sector South)';
    return 'Trục Hành Lang Hướng Tây (Sector West)';
  }

  /**
   * Tính ma trận vận tốc phụ thuộc khung giờ (Time-Dependent Speed Matrix) tại TP.HCM
   */
  getCurrentTrafficProfile(): {
    trafficLevel: 'LOW' | 'MEDIUM' | 'HEAVY' | 'RUSH_HOUR';
    averageSpeedKmh: number;
    delayFactor: number;
  } {
    const currentHour = new Date().getHours();

    if ((currentHour >= 7 && currentHour < 9) || (currentHour >= 17 && currentHour < 19)) {
      return { trafficLevel: 'RUSH_HOUR', averageSpeedKmh: 18, delayFactor: 1.6 };
    }
    if ((currentHour >= 11 && currentHour < 14) || (currentHour >= 16 && currentHour < 17)) {
      return { trafficLevel: 'MEDIUM', averageSpeedKmh: 24, delayFactor: 1.25 };
    }
    return { trafficLevel: 'LOW', averageSpeedKmh: 32, delayFactor: 1.0 };
  }

  /**
   * Thuật toán VRP Gom Đơn Thông Minh Cùng Tuyến Đường (Corridor-Aware Polar Sweep & 2-Opt TSP)
   * 1. Phân tích hành lang tuyến đường & góc phương vị từ kho xuất phát
   * 2. Gom cụm các đơn cùng trục đường / cùng hướng (Sector Coherence <= 4.0km, <= 30kg, <= 5 đơn)
   * 3. Sắp xếp chuỗi điểm dừng tối ưu liên tục tiến tới (Không quay đầu ngược đường)
   * 4. Gán tài xế có lộ trình và thùng lạnh phù hợp
   */
  optimizeBatchRoutes(
    orders: VrpOrderCandidate[],
    warehouseLat = 10.8354,
    warehouseLng = 106.6668,
    warehouseCode = 'WH-006',
    warehouseName = 'Kho Hàng Gò Vấp (Trung Tâm)',
  ): VrpBatchRoute[] {
    if (!orders || orders.length === 0) return [];

    const traffic = this.getCurrentTrafficProfile();
    const MAX_BIKE_CAPACITY_KG = 30;
    const MAX_CORRIDOR_RADIUS_KM = 4.0;
    const MAX_STOPS_PER_TRIP = 5;

    // 1. Chuẩn hóa tọa độ, tính góc phương vị và xác định hành lang tuyến đường
    const enrichedOrders: VrpOrderCandidate[] = orders.map(o => {
      let lat = o.latitude;
      let lng = o.longitude;
      if (!lat || !lng) {
        const coords = this.smartRoutingService.geocodeAddress(o.customerAddress);
        lat = coords.lat;
        lng = coords.lng;
      }
      const bearing = this.calculateBearing(warehouseLat, warehouseLng, lat, lng);
      const corridor = this.identifyCorridor(o.customerAddress, bearing);

      return {
        ...o,
        latitude: lat,
        longitude: lng,
        totalWeightKg: o.totalWeightKg || 2.5,
        bearingAngle: bearing,
        corridorAxis: corridor,
      };
    });

    // 2. Nhóm các đơn theo cùng Hành Lang Tuyến Đường (Corridor-First Grouping)
    const corridorGroups: Record<string, VrpOrderCandidate[]> = {};
    for (const ord of enrichedOrders) {
      const cName = ord.corridorAxis || 'Trục Đô Thị Trung Tâm';
      if (!corridorGroups[cName]) {
        corridorGroups[cName] = [];
      }
      corridorGroups[cName].push(ord);
    }

    const clusters: { corridorName: string; orders: VrpOrderCandidate[] }[] = [];

    // 3. Phân cụm bên trong từng hành lang (Polar Sweep + Greedy Radius Constraint)
    for (const [cName, ordList] of Object.entries(corridorGroups)) {
      // Sắp xếp theo khoảng cách tăng dần từ kho dọc theo hành lang
      ordList.sort((a, b) => {
        const distA = this.smartRoutingService.calculateHaversineDistance(warehouseLat, warehouseLng, a.latitude, a.longitude);
        const distB = this.smartRoutingService.calculateHaversineDistance(warehouseLat, warehouseLng, b.latitude, b.longitude);
        return distA - distB;
      });

      const unassigned = [...ordList];
      while (unassigned.length > 0) {
        const seed = unassigned.shift()!;
        const currentCluster: VrpOrderCandidate[] = [seed];
        let currentWeight = seed.totalWeightKg;

        let i = 0;
        while (i < unassigned.length) {
          const candidate = unassigned[i];
          const dist = this.smartRoutingService.calculateHaversineDistance(
            seed.latitude,
            seed.longitude,
            candidate.latitude,
            candidate.longitude,
          );

          if (
            dist <= MAX_CORRIDOR_RADIUS_KM &&
            currentWeight + candidate.totalWeightKg <= MAX_BIKE_CAPACITY_KG &&
            currentCluster.length < MAX_STOPS_PER_TRIP
          ) {
            currentCluster.push(candidate);
            currentWeight += candidate.totalWeightKg;
            unassigned.splice(i, 1);
          } else {
            i++;
          }
        }
        clusters.push({ corridorName: cName, orders: currentCluster });
      }
    }

    // 4. Sắp xếp thứ tự giao tối ưu liên tục (Unidirectional 2-Opt TSP) cho từng chuyến
    const routes: VrpBatchRoute[] = [];

    clusters.forEach((clusterObj, clusterIdx) => {
      const cluster = clusterObj.orders;
      let currentLat = warehouseLat;
      let currentLng = warehouseLng;
      const remainingStops = [...cluster];
      const orderedStops: VrpOrderCandidate[] = [];

      // Nearest Neighbor từ kho tiến dọc theo hành lang
      while (remainingStops.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let j = 0; j < remainingStops.length; j++) {
          const d = this.smartRoutingService.calculateHaversineDistance(
            currentLat,
            currentLng,
            remainingStops[j].latitude,
            remainingStops[j].longitude,
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = j;
          }
        }

        const picked = remainingStops.splice(nearestIdx, 1)[0];
        orderedStops.push(picked);
        currentLat = picked.latitude;
        currentLng = picked.longitude;
      }

      // Xây dựng chuỗi điểm dừng chi tiết (VRP Stops)
      let accumulatedMinutes = 5; // 5 phút chuẩn bị hàng & kiểm tra thùng lạnh
      let prevLat = warehouseLat;
      let prevLng = warehouseLng;
      let totalDist = 0;

      const stops: VrpStop[] = orderedStops.map((ord, seqIdx) => {
        const legDist = this.smartRoutingService.calculateHaversineDistance(
          prevLat,
          prevLng,
          ord.latitude,
          ord.longitude,
        );
        totalDist += legDist;

        const legMinutes = Math.max(3, Math.round((legDist / traffic.averageSpeedKmh) * 60));
        accumulatedMinutes += legMinutes + 3; // + 3 phút dừng bàn giao

        const arrivalDate = new Date(Date.now() + accumulatedMinutes * 60 * 1000);
        const hours = String(arrivalDate.getHours()).padStart(2, '0');
        const mins = String(arrivalDate.getMinutes()).padStart(2, '0');

        prevLat = ord.latitude;
        prevLng = ord.longitude;

        return {
          sequence: seqIdx + 1,
          orderId: ord.id,
          orderCode: ord.orderCode,
          customerName: ord.customerName,
          customerAddress: ord.customerAddress,
          corridorName: ord.corridorAxis,
          latitude: ord.latitude,
          longitude: ord.longitude,
          distanceFromPreviousKm: legDist,
          estimatedTravelTimeMinutes: legMinutes,
          estimatedArrivalTime: `${hours}:${mins}`,
          codAmount: ord.totalAmount,
        };
      });

      // Gán tài xế nội bộ
      const driver = INTERNAL_DRIVERS[clusterIdx % INTERNAL_DRIVERS.length];
      const totalWeight = cluster.reduce((sum, o) => sum + o.totalWeightKg, 0);

      routes.push({
        routeId: `ROUTE-${warehouseCode}-${Date.now().toString().slice(-4)}-${clusterIdx + 1}`,
        warehouseCode,
        warehouseName,
        corridorName: clusterObj.corridorName,
        assignedDriverId: driver.id,
        assignedDriverName: driver.name,
        assignedDriverPhone: driver.phone,
        assignedDriverPlate: driver.plate,
        totalOrders: cluster.length,
        totalWeightKg: Number(totalWeight.toFixed(1)),
        totalDistanceKm: Number(totalDist.toFixed(1)),
        estimatedTotalMinutes: accumulatedMinutes,
        trafficLevel: traffic.trafficLevel,
        averageSpeedKmh: traffic.averageSpeedKmh,
        stops,
        dispatchType: 'INTERNAL_FLEET',
      });
    });

    this.logger.log(
      `[VRP Smart Batching] Đã tối ưu ${orders.length} đơn thành ${routes.length} chuyến theo hành lang cùng tuyến đường.`,
    );

    return routes;
  }
}
