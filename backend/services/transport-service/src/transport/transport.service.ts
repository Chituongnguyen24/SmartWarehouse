import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductService, StorageType } from '../product/product.service';

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand: number; // in units/kg
  requiredVehicleType?: 'REFRIGERATED' | 'FROZEN' | 'NORMAL';
}

@Injectable()
export class TransportService {
  private readonly WAREHOUSE_COORDS: Record<string, { lat: number; lng: number }> = {
    'WH-006': { lat: 10.8385, lng: 106.6660 }, // Gò Vấp (350 Quang Trung)
    'WH-001': { lat: 10.8672, lng: 106.6412 }, // Quận 12 (Tân Thới Hiệp)
    'WH-002': { lat: 10.8504, lng: 106.7719 }, // TP. Thủ Đức
    'WH-003': { lat: 10.7925, lng: 106.6534 }, // Tân Bình (45 Trường Chinh)
    'WH-004': { lat: 10.7328, lng: 106.7196 }, // Quận 7 (Nguyễn Văn Linh)
    'WH-005': { lat: 10.8033, lng: 106.6997 }, // Bình Thạnh
    'WH-007': { lat: 10.7769, lng: 106.7009 }, // Quận 1
    'WH-008': { lat: 10.7554, lng: 106.6672 }, // Quận 5
  };

  constructor(private readonly productService: ProductService) {}

  // 1. Internal optimization: Suggest warehouse zone and location based on REAL product specs
  async suggestZonePlacement(sku: string): Promise<any> {
    const product = await this.productService.findOneBySku(sku);

    if (!product) {
      throw new NotFoundException(`Sản phẩm với SKU '${sku}' không tồn tại trong hệ thống danh mục.`);
    }

    let zone = 'DRY';
    let suggestedLocation = 'DRY-A-01';
    let instructions = 'Bảo quản ở nhiệt độ phòng nơi khô ráo, thoáng mát.';

    const st = (product.storageType || '').toString().toUpperCase();
    if (st === 'COLD') {
      zone = 'COLD';
      suggestedLocation = 'COOL-A-01';
      instructions = `Duy trì dải nhiệt độ tiêu chuẩn từ ${product.minTemp ?? 0}°C đến ${product.maxTemp ?? 4}°C. Độ ẩm tối đa ${product.maxHumidity ?? 80}%.`;
    } else if (st === 'FROZEN') {
      zone = 'FROZEN';
      suggestedLocation = 'FROZEN-B-01';
      instructions = `Bảo quản đông lạnh sâu dưới ${product.maxTemp ?? -18}°C. Tránh tiếp xúc không khí ẩm.`;
    }

    return {
      sku,
      productName: product.name,
      recommendedZone: zone,
      suggestedLocation,
      environmentalRequirements: {
        minTemp: product.minTemp,
        maxTemp: product.maxTemp,
        maxHumidity: product.maxHumidity,
      },
      instructions,
    };
  }

  // 2. Inbound dock scheduling: returns optimized slots avoiding overlaps
  getInboundSchedule(): any[] {
    const bookings = [
      { id: '1', supplier: 'Dalat Organic Farms', time: '08:00', durationMin: 60, status: 'Scheduled', dock: 1 },
      { id: '2', supplier: 'Vissan Meat JSC', time: '08:30', durationMin: 90, status: 'Scheduled', dock: 1 },
      { id: '3', supplier: 'Masan Consumer', time: '10:00', durationMin: 45, status: 'Scheduled', dock: 2 },
      { id: '4', supplier: 'CP Poultry Vietnam', time: '10:30', durationMin: 60, status: 'Scheduled', dock: 2 },
    ];

    const resolved = [];
    const dockOccupancy: Record<number, number> = { 1: 0, 2: 0 };

    for (const b of bookings) {
      const [hours, mins] = b.time.split(':').map(Number);
      const startMinutes = hours * 60 + mins;

      let assignedDock = b.dock;
      let actualStartMinutes = startMinutes;

      if (dockOccupancy[assignedDock] > startMinutes) {
        const altDock = assignedDock === 1 ? 2 : 1;
        if (dockOccupancy[altDock] <= startMinutes) {
          assignedDock = altDock;
        } else {
          actualStartMinutes = Math.min(dockOccupancy[assignedDock], dockOccupancy[altDock]);
          assignedDock = dockOccupancy[assignedDock] <= dockOccupancy[altDock] ? assignedDock : altDock;
        }
      }

      const endMinutes = actualStartMinutes + b.durationMin;
      dockOccupancy[assignedDock] = endMinutes;

      const adjHours = Math.floor(actualStartMinutes / 60).toString().padStart(2, '0');
      const adjMins = (actualStartMinutes % 60).toString().padStart(2, '0');

      resolved.push({
        ...b,
        assignedDock,
        adjustedTime: `${adjHours}:${adjMins}`,
        status: actualStartMinutes > startMinutes ? 'Rescheduled' : 'Confirmed',
      });
    }

    return resolved;
  }

  // 3. Supermarket Outbound Grouping: group items by floor department for picking efficiency
  groupOutboundLots(lots: any[]): any {
    const departments: Record<string, any[]> = {
      'Tươi Sống (Fresh)': [],
      'Đông Lạnh (Frozen)': [],
      'Bách Hóa Khô (FMCG)': [],
      'Hóa Phẩm & Gia Dụng': [],
    };

    for (const lot of lots) {
      const cat = lot.category ? lot.category.toLowerCase() : '';
      if (cat.includes('thịt') || cat.includes('cá') || cat.includes('rau') || cat.includes('trái')) {
        departments['Tươi Sống (Fresh)'].push(lot);
      } else if (cat.includes('đông') || lot.storageType === 'FROZEN') {
        departments['Đông Lạnh (Frozen)'].push(lot);
      } else if (cat.includes('hóa') || cat.includes('tẩy') || cat.includes('dụng')) {
        departments['Hóa Phẩm & Gia Dụng'].push(lot);
      } else {
        departments['Bách Hóa Khô (FMCG)'].push(lot);
      }
    }

    return departments;
  }

  // 4. VRP Solver (Clark-Wright Savings Heuristic / Nearest Neighbor)
  solveVrp(stops: Stop[], vehicleCapacity: number = 200, drivers: any[] = []): any {
    const depot = { lat: 10.8231, lng: 106.6297, name: 'Tổng Kho CityMart TP.HCM' };

    const distance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
      const dlat = p1.lat - p2.lat;
      const dlng = p1.lng - p2.lng;
      return Math.sqrt(dlat * dlat + dlng * dlng) * 111;
    };

    const routes: any[] = [];
    let unassigned = [...stops];
    let routeId = 1;

    while (unassigned.length > 0) {
      let currentCap = 0;
      let currentLoc = depot;
      const routeStops: Stop[] = [];
      let totalDist = 0;

      while (unassigned.length > 0) {
        let nearestIdx = -1;
        let minDist = Infinity;

        for (let i = 0; i < unassigned.length; i++) {
          const stop = unassigned[i];
          if (currentCap + stop.demand <= vehicleCapacity) {
            const dist = distance(currentLoc, stop);
            if (dist < minDist) {
              minDist = dist;
              nearestIdx = i;
            }
          }
        }

        if (nearestIdx !== -1) {
          const nextStop = unassigned[nearestIdx];
          routeStops.push(nextStop);
          currentCap += nextStop.demand;
          totalDist += minDist;
          currentLoc = nextStop;
          unassigned.splice(nearestIdx, 1);
        } else {
          break;
        }
      }

      totalDist += distance(currentLoc, depot);

      const assignedDriver = drivers && drivers.length >= routeId ? drivers[routeId - 1] : null;

      routes.push({
        routeId: `ROUTE-0${routeId}`,
        assignedDriver: assignedDriver ? assignedDriver.name : `Tài xế Đội ${routeId}`,
        stopsCount: routeStops.length,
        totalDemandKg: currentCap,
        capacityUtilizationPercent: Math.round((currentCap / vehicleCapacity) * 100),
        estimatedDistanceKm: Math.round(totalDist * 10) / 10,
        estimatedTimeMinutes: Math.round(totalDist * 3.5 + routeStops.length * 10),
        stops: routeStops.map((s, idx) => ({
          sequence: idx + 1,
          name: s.name,
          demandKg: s.demand,
          lat: s.lat,
          lng: s.lng,
        })),
      });

      routeId++;
    }

    return {
      totalRoutes: routes.length,
      depot,
      vehicleCapacityKg: vehicleCapacity,
      routes,
    };
  }

  // ── Helper: Haversine distance in KM ──
  private calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // 1.35x road winding multiplier for realistic urban road network in HCMC
    return R * c * 1.35;
  }

  // 5. Gom đơn xuất kho thành các chuyến xe (Routes) tính toán khoảng cách GPS thực tế
  async optimizeBatch(orders: any[]): Promise<any[]> {
    if (!orders || orders.length === 0) return [];

    const grouped = orders.reduce((acc, order) => {
      const wh = order.warehouseCode || 'WH-006';
      if (!acc[wh]) acc[wh] = [];
      acc[wh].push(order);
      return acc;
    }, {} as Record<string, any[]>);

    const routes: any[] = [];
    for (const wh of Object.keys(grouped)) {
      const whOrders = grouped[wh];
      const whCoord = this.WAREHOUSE_COORDS[wh] || this.WAREHOUSE_COORDS['WH-006'];
      const CAPACITY = 5; // Tối đa 5 đơn / xe

      for (let i = 0; i < whOrders.length; i += CAPACITY) {
        const batch = whOrders.slice(i, i + CAPACITY);

        // Tính khoảng cách GPS thực tế từ kho qua từng điểm giao hàng
        let totalKm = 0;
        let currentPos = { lat: whCoord.lat, lng: whCoord.lng };

        for (const order of batch) {
          const oLat = Number(order.deliveryLat || order.lat || order.destinationLat);
          const oLng = Number(order.deliveryLng || order.lng || order.destinationLng);

          if (oLat && oLng && !isNaN(oLat) && !isNaN(oLng)) {
            totalKm += this.calculateHaversineKm(currentPos.lat, currentPos.lng, oLat, oLng);
            currentPos = { lat: oLat, lng: oLng };
          } else {
            // Ước tính khoảng cách chặng đô thị trung bình (3.5 km) nếu đơn chưa gắn tọa độ
            totalKm += 3.5;
          }
        }

        // Chặng quay về kho
        totalKm += this.calculateHaversineKm(currentPos.lat, currentPos.lng, whCoord.lat, whCoord.lng);
        const roundedKm = Math.max(3.0, Number(totalKm.toFixed(1)));

        routes.push({
          id: `ROUTE-${wh}-${Date.now().toString().slice(-4)}${i}`,
          warehouseCode: wh,
          orders: batch,
          totalDistanceKm: roundedKm.toFixed(1),
          status: 'PENDING_DISPATCH',
        });
      }
    }
    return routes;
  }

  // 6. Báo giá đối tác vận chuyển 3PL (GHN / Ahamove)
  async get3plQuote(routeInfo: any): Promise<any[]> {
    const distance = parseFloat(routeInfo.totalDistanceKm || '10');
    const orderCount = routeInfo.orders?.length || 1;

    // GHN: Giao tiêu chuẩn
    const ghnPrice = 15000 + distance * 4000 + orderCount * 5000;

    // Ahamove: Giao siêu tốc bảo quản nhiệt độ
    const ahamovePrice = 25000 + distance * 6000 + orderCount * 5000;

    return [
      {
        provider: 'GHN',
        name: 'Giao Hàng Nhanh',
        serviceType: 'Chuẩn (1-2 ngày)',
        price: Math.round(ghnPrice),
        estimatedTime: '24-48 giờ',
      },
      {
        provider: 'AHAMOVE',
        name: 'Ahamove',
        serviceType: 'Siêu Tốc (2-4 giờ)',
        price: Math.round(ahamovePrice),
        estimatedTime: '2-4 giờ',
      },
    ];
  }
}
