import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Navigation, Gauge, ThermometerSnowflake, RefreshCw, AlertTriangle, Phone, Store, MapPin, Route, Layers, CheckCircle, Users, Eye, Sparkles, Clock, Check, Truck, Bike, Maximize2, Building2 } from 'lucide-react';

const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY || 'xR9zgCIphv0ZQ7sAS02MRDA9mouqEfatcx24BtYl';
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6';

// Decode Google / Goong encoded polyline points
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push([lat * 1e-5, lng * 1e-5]);
  }
  return points;
}

export interface ShipperLiveState {
  id: string;
  name: string;
  phone: string;
  plate: string;
  lat: number;
  lng: number;
  speed: number;
  temperature: number;
  status: 'DELIVERING' | 'READY_FOR_DELIVERY' | 'IDLE' | 'RETURNING' | 'CRITICAL_TEMP';
  vehicleType: 'BIKE' | 'TRUCK' | 'VAN';
  warehouseCode: string;
  warehouseName: string;
  zone: string;
  currentOrderId?: string;
  orderCode?: string;
  currentCustomerName?: string;
  currentCustomerAddress?: string;
  routeStops?: Array<{ id: string; name: string; address: string; lat: number; lng: number; seq: number; status?: string }>;
}

// ── TOÀN BỘ ĐỘI XE 9 TÀI XẾ TOÀN HỆ THỐNG SMARTWAREHOUSE ──
const INITIAL_SHIPPERS: ShipperLiveState[] = [
  // ── 1. Đội Xe Tải & Bán Tải (Tiêu Hủy Đa Phước, Chuyển Kho, Đơn Sỉ > 30kg) ──
  {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944778899',
    plate: '51D-892.45',
    lat: 10.8250,
    lng: 106.6720,
    speed: 35,
    temperature: -2.0,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'TRUCK',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    zone: 'Toàn TP.HCM & Trạm Tiêu Hủy Môi Trường Đa Phước',
    routeStops: [
      { id: 'disposal-01', name: 'Trạm Xử Lý Rác Đa Phước', address: 'Khu Liên Hợp Xử Lý Chất Thải Đa Phước, Bình Chánh', lat: 10.6850, lng: 106.6200, seq: 1 },
    ]
  },
  {
    id: 'NV-VAN01',
    name: 'Phan Hữu Nam',
    phone: '0918776655',
    plate: '51C-734.12',
    lat: 10.8380,
    lng: 106.6450,
    speed: 30,
    temperature: 3.0,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'VAN',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    zone: 'Gò Vấp - Quận 12 - Tân Bình',
    routeStops: [
      { id: 'van-01', name: 'Đại Lý C.T Mart Chi Nhánh 1', address: '88 Phan Huy Ích, Gò Vấp', lat: 10.8315, lng: 106.6345, seq: 1 },
    ]
  },

  // ── 2. Đội Xe Máy Thùng Lạnh Kho Gò Vấp (WH-006) ──
  {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977112233',
    plate: '59-V1 888.99',
    lat: 10.8440,
    lng: 106.6580,
    speed: 28,
    temperature: 3.2,
    status: 'DELIVERING',
    vehicleType: 'BIKE',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    zone: 'Gò Vấp - Bình Thạnh',
    currentOrderId: 'ord-03',
    orderCode: 'ECOMM-9D6FDFA9',
    currentCustomerName: 'Hoàng Kim Ngân',
    currentCustomerAddress: '76 Thống Nhất, Phường 11, Gò Vấp',
    routeStops: [
      { id: 'ord-01', name: 'Đặng Thanh Thảo', address: '450 Nguyễn Oanh, Gò Vấp', lat: 10.8420, lng: 106.6780, seq: 1 },
      { id: 'ord-02', name: 'Bùi Anh Tuấn', address: '128 Lê Đức Thọ, Gò Vấp', lat: 10.8520, lng: 106.6710, seq: 2 },
      { id: 'ord-03', name: 'Hoàng Kim Ngân', address: '76 Thống Nhất, Gò Vấp', lat: 10.8465, lng: 106.6690, seq: 3, status: 'DELIVERING' },
      { id: 'ord-04', name: 'Ngô Trọng Nghĩa', address: '310 Phan Văn Trị, Gò Vấp', lat: 10.8285, lng: 106.6852, seq: 4 },
      { id: 'ord-05', name: 'Dương Mỹ Linh', address: '95 Dương Quảng Hàm, Gò Vấp', lat: 10.8362, lng: 106.6895, seq: 5 },
    ],
  },
  {
    id: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    phone: '0909888111',
    plate: '59-G2 688.39',
    lat: 10.8330,
    lng: 106.6400,
    speed: 0,
    temperature: 2.8,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'BIKE',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    zone: 'Gò Vấp - Phú Nhuận',
    routeStops: [
      { id: 'ord-06', name: 'Nguyễn Hoàng Nam', address: '142 Quang Trung, Gò Vấp', lat: 10.8398, lng: 106.6582, seq: 1 },
      { id: 'ord-07', name: 'Trần Thị Mai', address: '215 Phạm Văn Chiêu, Gò Vấp', lat: 10.8492, lng: 106.6543, seq: 2 },
    ]
  },
  {
    id: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933445566',
    plate: '59-P1 456.78',
    lat: 10.8380,
    lng: 106.6620,
    speed: 0,
    temperature: 3.5,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'BIKE',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    zone: 'Gò Vấp - Tân Bình',
    routeStops: [
      { id: 'ord-08', name: 'Phạm Minh Hạnh', address: '540 Lê Văn Thọ, Gò Vấp', lat: 10.8465, lng: 106.6521, seq: 1 },
      { id: 'ord-09', name: 'Vũ Đức Thắng', address: '32/5 Cây Trâm, Gò Vấp', lat: 10.8432, lng: 106.6567, seq: 2 },
    ],
  },
  {
    id: 'NV-GV08',
    name: 'Phạm Hoàng Nam',
    phone: '0918776655',
    plate: '59-K1 234.56',
    lat: 10.8320,
    lng: 106.6380,
    speed: 0,
    temperature: 3.1,
    status: 'IDLE',
    vehicleType: 'BIKE',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    zone: 'Gò Vấp - Quận 12',
  },
  {
    id: 'NV-GV09',
    name: 'Lê Thanh Tùng',
    phone: '0966332211',
    plate: '59-X1 999.11',
    lat: 10.8510,
    lng: 106.6690,
    speed: 0,
    temperature: 4.1,
    status: 'IDLE',
    vehicleType: 'BIKE',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    zone: 'Gò Vấp - Thủ Đức',
  },

  // ── 3. Đội Xe Liên Kho (Bình Thạnh & Tân Bình) ──
  {
    id: 'NV-BT01',
    name: 'Bùi Hoàng Long',
    phone: '0988112244',
    plate: '59-S2 555.66',
    lat: 10.8020,
    lng: 106.7020,
    speed: 25,
    temperature: 3.0,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'BIKE',
    warehouseCode: 'WH-002',
    warehouseName: 'Kho Bình Thạnh',
    zone: 'Kho Bình Thạnh (120 Phan Đăng Lưu)',
    routeStops: [
      { id: 'bt-01', name: 'Lê Văn Tám', address: '120 Phan Đăng Lưu, Bình Thạnh', lat: 10.8012, lng: 106.6980, seq: 1 },
    ]
  },
  {
    id: 'NV-TB01',
    name: 'Trương Gia Huy',
    phone: '0977223344',
    plate: '59-H1 333.22',
    lat: 10.8010,
    lng: 106.6550,
    speed: 20,
    temperature: 2.7,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'BIKE',
    warehouseCode: 'WH-003',
    warehouseName: 'Kho Tân Bình',
    zone: 'Kho Tân Bình (45 Trường Chinh)',
    routeStops: [
      { id: 'tb-01', name: 'Trần Hưng Đạo', address: '45 Trường Chinh, Tân Bình', lat: 10.7985, lng: 106.6520, seq: 1 },
    ]
  },
];

export const ControlTowerMap: React.FC<{ activeAlert?: any; onDismissAlert?: () => void }> = ({ activeAlert, onDismissAlert }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routeLayersRef = useRef<any[]>([]);

  const [shippers, setShippers] = useState<ShipperLiveState[]>(INITIAL_SHIPPERS);
  const [selectedShipper, setSelectedShipper] = useState<ShipperLiveState | null>(INITIAL_SHIPPERS[0]);
  const [activeTab, setActiveTab] = useState<'route' | 'fleet'>('fleet');
  const [fleetFilter, setFleetFilter] = useState<'ALL' | 'TRUCK' | 'BIKE' | 'WH-006' | 'CROSS_HUB'>('ALL');
  const [vehicleMode, setVehicleMode] = useState<'BIKE' | 'TRUCK'>('BIKE');

  // 1. Fetch real orders & poll Live GPS Telemetry from connected phones
  useEffect(() => {
    async function syncRealData() {
      try {
        const resOrders = await fetch('http://localhost:3004/orders').catch(() => null);
        const orders = resOrders && resOrders.ok ? await resOrders.json() : [];

        const resLive = await fetch('http://localhost:3004/orders/drivers-live').catch(() => null);
        const liveDrivers: any[] = resLive && resLive.ok ? await resLive.json() : [];

        setShippers(prev => {
          const baseMap = new Map<string, ShipperLiveState>();
          INITIAL_SHIPPERS.forEach(s => baseMap.set(s.id, { ...s }));
          prev.forEach(s => baseMap.set(s.id, { ...s }));

          // Merge live drivers from backend / phone telemetry
          liveDrivers.forEach(ld => {
            const cleanPhone = (ld.phone || '').replace(/\D/g, '');
            const existingKey = Array.from(baseMap.keys()).find(
              k => k === ld.id || (baseMap.get(k)?.phone.replace(/\D/g, '') === cleanPhone)
            );

            if (existingKey) {
              const cur = baseMap.get(existingKey)!;
              baseMap.set(existingKey, {
                ...cur,
                lat: ld.lat || cur.lat,
                lng: ld.lng || cur.lng,
                speed: ld.speed ?? cur.speed,
                temperature: ld.temperature ?? cur.temperature,
                status: ld.status || cur.status,
                currentCustomerName: ld.currentCustomerName || cur.currentCustomerName,
                currentCustomerAddress: ld.currentCustomerAddress || cur.currentCustomerAddress,
                orderCode: ld.orderCode || cur.orderCode,
                currentOrderId: ld.currentOrderId || cur.currentOrderId,
              });
            } else if (ld.id && ld.name) {
              baseMap.set(ld.id, {
                id: ld.id,
                name: ld.name,
                phone: ld.phone || '0901234567',
                plate: ld.licensePlate || '59-XX 123.45',
                lat: ld.lat || 10.8400,
                lng: ld.lng || 106.6600,
                speed: ld.speed || 0,
                temperature: ld.temperature || 3.0,
                status: ld.status || 'READY_FOR_DELIVERY',
                vehicleType: 'BIKE',
                warehouseCode: ld.warehouseCode || 'WH-006',
                warehouseName: 'Kho Gò Vấp',
                zone: 'Toàn TP.HCM',
              });
            }
          });

          // Update stops for all drivers based on real DB orders
          const allDrivers = Array.from(baseMap.values()).map(s => {
            const assignedOrders = orders.filter(
              (o: any) =>
                (o.assignedDriverId === s.id || o.assignedDriverName === s.name) &&
                o.status !== 'COMPLETED' &&
                o.status !== 'DELIVERED' &&
                o.status !== 'CANCELLED'
            );

            let stops = s.routeStops || [];
            if (assignedOrders.length > 0) {
              stops = assignedOrders.map((o: any, idx: number) => ({
                id: o.id,
                name: o.customerName || 'Khách Hàng',
                address: o.customerAddress || 'Gò Vấp',
                lat: Number(o.shippingLat) || (10.835 + idx * 0.004),
                lng: Number(o.shippingLng) || (106.655 + idx * 0.004),
                seq: idx + 1,
                status: o.status,
              }));
            }

            // Move marker on Leaflet map in real time
            const marker = markersRef.current.get(s.id);
            if (marker && s.lat && s.lng) {
              marker.setLatLng([s.lat, s.lng]);
            }

            return {
              ...s,
              routeStops: stops,
            };
          });

          return allDrivers;
        });
      } catch (e) {}
    }

    syncRealData();
    const interval = setInterval(syncRealData, 2500);
    return () => clearInterval(interval);
  }, []);

  // Sync selectedShipper when shippers list updates
  useEffect(() => {
    if (selectedShipper) {
      const match = shippers.find(s => s.id === selectedShipper.id);
      if (match) setSelectedShipper(match);
    }
  }, [shippers]);

  // Update Route Polyline & Waypoint Pins with Vehicle-specific Routing
  useEffect(() => {
    const map = leafletInstance.current;
    const L = (window as any).L;
    if (!map || !L || !selectedShipper) return;

    // Clear previous route layers
    routeLayersRef.current.forEach(layer => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    routeLayersRef.current = [];

    const stops = selectedShipper.routeStops || [];
    if (stops.length > 0) {
      const isTruck = selectedShipper.vehicleType === 'TRUCK' || selectedShipper.vehicleType === 'VAN' || vehicleMode === 'TRUCK';
      const vehicle = isTruck ? 'car' : 'bike';

      const origin = `${selectedShipper.lat},${selectedShipper.lng}`;
      const activeStop = stops.find(st => st.id === selectedShipper.currentOrderId) || stops[0];
      const destination = `${activeStop.lat},${activeStop.lng}`;

      const goongDirUrl = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}`;

      fetch(goongDirUrl)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes.length > 0 && data.routes[0].overview_polyline?.points) {
            const coordinates = decodePolyline(data.routes[0].overview_polyline.points);

            const glowLine = L.polyline(coordinates, {
              color: isTruck ? '#fb923c' : '#38bdf8',
              weight: isTruck ? 7 : 5,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: isTruck ? '12, 6' : '6, 6',
            }).addTo(map);

            const mainLine = L.polyline(coordinates, {
              color: isTruck ? '#ea580c' : '#0284c7',
              weight: isTruck ? 4 : 3,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);

            routeLayersRef.current.push(glowLine, mainLine);
          } else {
            // Direct polyline fallback
            const polyCoords = [[selectedShipper.lat, selectedShipper.lng], ...stops.map(s => [s.lat, s.lng])];
            const fallbackLine = L.polyline(polyCoords, {
              color: isTruck ? '#f97316' : '#0284c7',
              weight: 4,
              dashArray: '8, 8',
            }).addTo(map);
            routeLayersRef.current.push(fallbackLine);
          }
        })
        .catch(() => {
          const polyCoords = [[selectedShipper.lat, selectedShipper.lng], ...stops.map(s => [s.lat, s.lng])];
          const fallbackLine = L.polyline(polyCoords, {
            color: isTruck ? '#f97316' : '#0284c7',
            weight: 4,
            dashArray: '8, 8',
          }).addTo(map);
          routeLayersRef.current.push(fallbackLine);
        });

      // Add Waypoint Pins
      stops.forEach(st => {
        const isCurrentActive = selectedShipper.status === 'DELIVERING' && (
          (selectedShipper.currentCustomerName && st.name.toLowerCase().includes(selectedShipper.currentCustomerName.toLowerCase())) ||
          (selectedShipper.currentOrderId && st.id === selectedShipper.currentOrderId) ||
          (selectedShipper.currentCustomerAddress && st.address.toLowerCase().includes(selectedShipper.currentCustomerAddress.split(',')[0].toLowerCase()))
        );

        const stopIcon = L.divIcon({
          className: 'vrp-stop-pin',
          html: `
            <div style="
              background: ${isCurrentActive ? '#059669' : '#0f172a'};
              color: white;
              border: 2.5px solid ${isCurrentActive ? '#4ade80' : '#38bdf8'};
              border-radius: 50%;
              width: ${isCurrentActive ? '32px' : '26px'};
              height: ${isCurrentActive ? '32px' : '26px'};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${isCurrentActive ? '13px' : '11px'};
              font-weight: 900;
              box-shadow: ${isCurrentActive ? '0 0 18px rgba(74, 222, 128, 1)' : '0 2px 8px rgba(0,0,0,0.5)'};
            ">
              ${st.seq}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const stopMarker = L.marker([st.lat, st.lng], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif; min-width:180px; padding:2px;">
              <div style="font-size:12px; font-weight:800; color:#0f172a; margin-bottom:2px;">
                Điểm dừng #${st.seq}: ${st.name}
              </div>
              <div style="font-size:11px; color:#64748b; margin-bottom:6px;">📍 ${st.address}</div>
              ${isCurrentActive ? '<span style="background:#dcfce7; color:#15803d; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">🟢 ĐANG GIAO ĐƠN NÀY</span>' : ''}
            </div>
          `);

        routeLayersRef.current.push(stopMarker);
      });
    }
  }, [selectedShipper?.id, selectedShipper?.lat, selectedShipper?.lng, selectedShipper?.currentCustomerAddress, selectedShipper?.status, vehicleMode]);

  // Leaflet Map Initialization with Goong Map Tiles & All 9 Drivers
  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const loadScript = (id: string, src: string) => {
        return new Promise<void>((resolve) => {
          if (document.getElementById(id)) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.id = id;
          script.src = src;
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      };

      await loadScript('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');

      const L = (window as any).L;
      if (isCancelled || !mapRef.current || !L) return;

      if (leafletInstance.current) {
        leafletInstance.current.remove();
      }

      // Center closely on TP.HCM Hub Area
      const map = L.map(mapRef.current, {
        center: [10.8354, 106.6668],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      leafletInstance.current = map;

      // Clean High-Resolution Street Map Tiles
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Goong.io & Google Maps',
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // ── 1. WAREHOUSES & HUBS MARKERS ──
      const hubs = [
        { code: 'WH-006', name: 'Kho Trung Tâm Gò Vấp (WH-006)', addr: '350 Quang Trung, P.10, Gò Vấp', lat: 10.8354, lng: 106.6668, icon: '🏬', color: '#059669', desc: 'Hub Điều Phối Xe Máy & Xe Tải Lạnh' },
        { code: 'WH-002', name: 'Kho Chi Nhánh Bình Thạnh (WH-002)', addr: '120 Phan Đăng Lưu, Bình Thạnh', lat: 10.8012, lng: 106.6980, icon: '🏬', color: '#2563eb', desc: 'Hub Phân Phối Đông Sài Gòn' },
        { code: 'WH-003', name: 'Kho Chi Nhánh Tân Bình (WH-003)', addr: '45 Trường Chinh, Tân Bình', lat: 10.7985, lng: 106.6520, icon: '🏬', color: '#7c3aed', desc: 'Hub Logistics Sân Bay' },
        { code: 'DP-WASTE', name: 'Khu Xử Lý Môi Trường Đa Phước', addr: 'Xã Đa Phước, Huyện Bình Chánh, TP.HCM', lat: 10.6850, lng: 106.6200, icon: '☣️', color: '#dc2626', desc: 'Trạm Tiếp Nhận Tiêu Hủy Thực Phẩm Hết Hạn' },
      ];

      hubs.forEach(h => {
        const whIcon = L.divIcon({
          className: 'control-tower-wh',
          html: `
            <div style="
              background: linear-gradient(135deg, ${h.color}, #0f172a);
              color: white;
              padding: 6px;
              border-radius: 50%;
              border: 2.5px solid white;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 38px;
              font-size: 18px;
            ">
              ${h.icon}
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        L.marker([h.lat, h.lng], { icon: whIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif; min-width:210px; padding:3px;">
              <div style="font-size:13px; font-weight:800; color:${h.color};">${h.name}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">📍 ${h.addr}</div>
              <div style="margin-top:6px; font-size:10px; background:#f1f5f9; color:#334155; padding:3px 6px; border-radius:4px; font-weight:700;">
                ${h.desc}
              </div>
            </div>
          `);
      });

      // ── 2. RENDER ALL 9 DRIVERS ON MAP ──
      INITIAL_SHIPPERS.forEach(s => {
        const isCritical = s.temperature > 5.0;
        const shortName = s.name.split(' ').pop();
        const vIcon = s.vehicleType === 'TRUCK' ? '🚛' : s.vehicleType === 'VAN' ? '🚐' : '🛵';
        const vBg = s.vehicleType === 'TRUCK' 
          ? 'linear-gradient(135deg, #ea580c, #c2410c)' 
          : s.vehicleType === 'VAN'
          ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
          : isCritical 
          ? 'linear-gradient(135deg, #dc2626, #ef4444)' 
          : 'linear-gradient(135deg, #0284c7, #06b6d4)';

        const icon = L.divIcon({
          className: 'shipper-tower-marker',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
              <div style="
                background: ${vBg};
                color: white;
                border-radius: 50%;
                border: 2.5px solid white;
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
              ">
                ${vIcon}
              </div>
              <div style="
                margin-top: 2px;
                background: #0f172a;
                color: ${isCritical ? '#f87171' : '#38bdf8'};
                font-size: 10px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 6px;
                white-space: nowrap;
                border: 1px solid ${isCritical ? '#ef4444' : '#0284c7'};
                box-shadow: 0 2px 8px rgba(0,0,0,0.6);
                text-align: center;
              ">
                <div>${shortName} • ${s.temperature}°C</div>
              </div>
            </div>
          `,
          iconSize: [40, 56],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([s.lat, s.lng], { icon }).addTo(map);
        marker.on('click', () => {
          setSelectedShipper(s);
          setActiveTab('route');
          map.setView([s.lat, s.lng], 15, { animate: true });
        });
        markersRef.current.set(s.id, marker);
      });
    };

    initMap();

    return () => {
      isCancelled = true;
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, []);

  const handleSelectShipper = (s: ShipperLiveState) => {
    setSelectedShipper(s);
    setActiveTab('route');
    if (leafletInstance.current) {
      leafletInstance.current.setView([s.lat, s.lng], 15.5, { animate: true });
    }
  };

  // Zoom to Fit All 9 Drivers & Hubs
  const handleFitAllDrivers = () => {
    const map = leafletInstance.current;
    const L = (window as any).L;
    if (!map || !L || shippers.length === 0) return;

    const bounds = L.latLngBounds(shippers.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  };

  // Quick switch active delivering stop
  const handleSelectActiveStop = (st: any) => {
    if (!selectedShipper) return;
    const updated = {
      ...selectedShipper,
      status: 'DELIVERING' as const,
      currentOrderId: st.id,
      currentCustomerName: st.name,
      currentCustomerAddress: st.address,
      orderCode: st.id.slice(0, 8).toUpperCase(),
    };
    setSelectedShipper(updated);
    setShippers(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  // Filter shippers for sidebar display
  const displayedShippers = shippers.filter(s => {
    if (fleetFilter === 'TRUCK') return s.vehicleType === 'TRUCK' || s.vehicleType === 'VAN';
    if (fleetFilter === 'BIKE') return s.vehicleType === 'BIKE';
    if (fleetFilter === 'WH-006') return s.warehouseCode === 'WH-006';
    if (fleetFilter === 'CROSS_HUB') return s.warehouseCode !== 'WH-006';
    return true;
  });

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl text-slate-100 mb-6">
      
      {/* ── Enterprise Control Tower Top Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/40 shadow-inner">
            <Navigation size={20} className="animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white tracking-wide uppercase">
                TRUNG TÂM GIÁM SÁT TOÀN BỘ ĐỘI XE TMS • ĐỊNH TUYẾN VRP & IOT
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                9 TÀI XẾ TOÀN TP.HCM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Định vị vệ tinh GPS thời gian thực • Giám sát nhiệt độ thùng xe lạnh • Xe Tải Lạnh 2.5T & Xe Máy Thùng Lạnh
            </p>
          </div>
        </div>

        {/* Fleet Filter Chips & Zoom All Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Fit All Button */}
          <button
            onClick={handleFitAllDrivers}
            title="Zoom xem toàn bộ 9 tài xế trên bản đồ TP.HCM"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all shadow"
          >
            <Maximize2 size={13} />
            <span>Xem Toàn Bộ ({shippers.length} Xe)</span>
          </button>

          {/* Fleet Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-slate-300 font-medium">Trực Tuyến:</span>
            <span className="font-extrabold text-emerald-400">{shippers.length} Xe</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs">
            <ThermometerSnowflake size={14} className="text-cyan-400" />
            <span className="text-slate-300 font-medium">Chuẩn Lạnh (0-4°C):</span>
            <span className="font-extrabold text-cyan-400">100% Đạt</span>
          </div>
        </div>
      </div>

      {/* Fleet Filter Bar */}
      <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950 border-b border-slate-800/80 overflow-x-auto text-xs">
        <span className="text-slate-400 font-bold mr-1">Bộ lọc đội xe:</span>
        <button
          onClick={() => setFleetFilter('ALL')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            fleetFilter === 'ALL' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Tất Cả ({shippers.length})
        </button>
        <button
          onClick={() => setFleetFilter('TRUCK')}
          className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
            fleetFilter === 'TRUCK' ? 'bg-amber-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Truck size={13} />
          <span>🚛 Xe Tải & Bán Tải (2)</span>
        </button>
        <button
          onClick={() => setFleetFilter('BIKE')}
          className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
            fleetFilter === 'BIKE' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Bike size={13} />
          <span>🛵 Xe Máy Thùng Lạnh (7)</span>
        </button>
        <button
          onClick={() => setFleetFilter('WH-006')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            fleetFilter === 'WH-006' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          🏬 Kho Gò Vấp (7)
        </button>
        <button
          onClick={() => setFleetFilter('CROSS_HUB')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            fleetFilter === 'CROSS_HUB' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          🔄 Liên Kho Bình Thạnh & Tân Bình (2)
        </button>
      </div>

      {/* Emergency Cold-Chain Alert Banner if Active */}
      {activeAlert && (
        <div className="px-6 py-3 bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 border-b border-rose-600 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-400 shrink-0" />
            <div className="text-xs">
              <span className="font-black text-rose-300 uppercase">🚨 CẢNH BÁO NHIỆT ĐỘ THÙNG LẠNH: </span>
              <span className="text-white">{activeAlert.message || 'Nhiệt độ thùng xe vượt ngưỡng an toàn 5°C!'}</span>
            </div>
          </div>
          <button
            onClick={onDismissAlert}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors shadow"
          >
            Đã Xử Lý
          </button>
        </div>
      )}

      {/* GIS Map & Telemetry Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 h-[500px]">
        
        {/* Main Map Box (8 cols) */}
        <div className="lg:col-span-8 relative h-full bg-slate-950">
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Quick Map Overlay: Current Selected Shipper Info Banner */}
          {selectedShipper && (
            <div className="absolute top-4 left-4 z-[500] bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-2xl flex items-center gap-3 text-xs max-w-md">
              <div className={`w-9 h-9 rounded-full text-white font-black flex items-center justify-center text-sm shadow ${
                selectedShipper.vehicleType === 'TRUCK' ? 'bg-amber-600' : selectedShipper.vehicleType === 'VAN' ? 'bg-purple-600' : 'bg-cyan-600'
              }`}>
                {selectedShipper.vehicleType === 'TRUCK' ? '🚛' : selectedShipper.vehicleType === 'VAN' ? '🚐' : '🛵'}
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                  <span>{selectedShipper.name}</span>
                  <span className="text-[10px] text-cyan-300 font-mono">({selectedShipper.plate})</span>
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                    {selectedShipper.warehouseName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {selectedShipper.status === 'DELIVERING' && selectedShipper.currentCustomerName ? (
                    <span className="text-emerald-400 font-semibold">
                      Đang giao: {selectedShipper.currentCustomerName} ➔ {selectedShipper.currentCustomerAddress?.split(',')[0]}
                    </span>
                  ) : selectedShipper.routeStops && selectedShipper.routeStops.length > 0 ? (
                    <span className="text-amber-400 font-medium">
                      ⏳ Đã gán {selectedShipper.routeStops.length} điểm giao • Tuyến: {selectedShipper.zone}
                    </span>
                  ) : (
                    <span className="text-slate-400">Đã hoàn thành ca giao • Sẵn sàng chuyến mới</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Driver Telemetry Sidebar (4 cols) */}
        <div className="lg:col-span-4 p-4 bg-slate-900 border-l border-slate-800 flex flex-col justify-between overflow-y-auto">
          
          {/* Sidebar Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-3 shrink-0">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'fleet' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={13} />
              <span>Toàn Bộ Đội Xe ({shippers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('route')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'route' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Route size={13} />
              <span>Lộ Trình Đang Chọn</span>
            </button>
          </div>

          {activeTab === 'fleet' ? (
            /* ── TAB: TOÀN BỘ ĐỘI XE 9 TÀI XẾ ── */
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {displayedShippers.map(s => {
                const isSelected = selectedShipper?.id === s.id;
                const vIcon = s.vehicleType === 'TRUCK' ? '🚛' : s.vehicleType === 'VAN' ? '🚐' : '🛵';
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectShipper(s)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-md'
                        : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{vIcon}</span>
                        <div>
                          <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                            <span>{s.name}</span>
                            <span className="text-[10px] text-cyan-300 font-mono">({s.plate})</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{s.warehouseName} • {s.zone}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          s.temperature > 4.5 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {s.temperature}°C
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                      <span>Vận tốc: <b className="text-slate-200">{s.speed} km/h</b></span>
                      <span>Điểm dừng: <b className="text-cyan-400">{s.routeStops?.length || 0} trạm</b></span>
                      <span className={`font-bold ${s.status === 'DELIVERING' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {s.status === 'DELIVERING' ? '● Đang giao' : '○ Sẵn sàng'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : selectedShipper ? (
            /* ── TAB: CHI TIẾT LỘ TRÌNH TÀI XẾ ĐANG CHỌN ── */
            <div className="space-y-3">
              {/* Shipper Profile Header Card */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-black text-sm uppercase shadow ${
                    selectedShipper.vehicleType === 'TRUCK' ? 'bg-amber-600' : selectedShipper.vehicleType === 'VAN' ? 'bg-purple-600' : 'bg-cyan-600'
                  }`}>
                    {selectedShipper.vehicleType === 'TRUCK' ? '🚛' : selectedShipper.vehicleType === 'VAN' ? '🚐' : '🛵'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{selectedShipper.name}</span>
                      <span className="text-[10px] bg-slate-800 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                        {selectedShipper.plate}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{selectedShipper.phone} • {selectedShipper.warehouseName}</div>
                  </div>
                </div>

                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  selectedShipper.status === 'DELIVERING'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : selectedShipper.routeStops && selectedShipper.routeStops.length > 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {selectedShipper.status === 'DELIVERING' ? 'ĐANG GIAO' : selectedShipper.routeStops && selectedShipper.routeStops.length > 0 ? 'CHỜ XUẤT PHÁT' : 'HOÀN THÀNH'}
                </span>
              </div>

              {/* Spotlight Card */}
              {selectedShipper.status === 'DELIVERING' && selectedShipper.currentCustomerName ? (
                <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-900 p-3.5 rounded-xl border border-emerald-500/50 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                    <span className="text-emerald-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      ĐANG VẬN CHUYỂN TỚI KHÁCH:
                    </span>
                    {selectedShipper.orderCode && (
                      <span className="text-[11px] bg-emerald-500/30 text-emerald-300 font-black px-2 py-0.5 rounded">
                        #{selectedShipper.orderCode}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-extrabold text-white mb-0.5">
                    👤 {selectedShipper.currentCustomerName}
                  </div>

                  <div className="text-xs text-slate-300 flex items-start gap-1 mb-2">
                    <MapPin size={13} className="text-rose-400 shrink-0 mt-0.5" />
                    <span>{selectedShipper.currentCustomerAddress || 'Gò Vấp, TP.HCM'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-emerald-500/20 text-emerald-300">
                    <span>Tuyến đường: <b>{selectedShipper.vehicleType === 'TRUCK' ? 'Trục đường lớn' : 'Ngõ hẻm tối ưu'}</b></span>
                    <span>Vận tốc: <b>{selectedShipper.speed} km/h</b></span>
                  </div>
                </div>
              ) : selectedShipper.routeStops && selectedShipper.routeStops.length > 0 ? (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/40 text-xs shadow-inner">
                  <div className="flex items-center justify-between font-bold text-amber-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-400" />
                      LỘ TRÌNH ĐÃ PHÂN BỔ ({selectedShipper.routeStops.length} ĐIỂM)
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                      Tuyến: {selectedShipper.zone}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] mt-1">
                    Bấm vào từng trạm dừng bên dưới để theo dõi lộ trình chi tiết.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                  <Check size={18} className="mx-auto mb-1 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Đã hoàn thành toàn bộ đơn hàng!</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">Sẵn sàng nhận chuyến điều phối tiếp theo</div>
                </div>
              )}

              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                    <ThermometerSnowflake size={12} className="text-cyan-400" />
                    <span>Nhiệt độ thùng lạnh</span>
                  </div>
                  <div className={`text-base font-black ${selectedShipper.temperature > 4.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedShipper.temperature}°C
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                    <Gauge size={12} className="text-cyan-400" />
                    <span>Tốc độ di chuyển</span>
                  </div>
                  <div className="text-base font-black text-cyan-300">{selectedShipper.speed} km/h</div>
                </div>
              </div>

              {/* Route Stops Sequence */}
              {selectedShipper.routeStops && selectedShipper.routeStops.length > 0 && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div className="text-[10px] text-cyan-400 font-bold mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Route size={12} />
                      <span>Các điểm dừng ({selectedShipper.routeStops.length} điểm):</span>
                    </div>
                    <span className="text-[9px] text-slate-500">Bấm để chọn</span>
                  </div>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {selectedShipper.routeStops.map(st => {
                      const isCurrentActive = selectedShipper.status === 'DELIVERING' && (
                        (selectedShipper.currentCustomerName && st.name.toLowerCase().includes(selectedShipper.currentCustomerName.toLowerCase())) ||
                        (selectedShipper.currentOrderId && st.id === selectedShipper.currentOrderId) ||
                        (selectedShipper.currentCustomerAddress && st.address.toLowerCase().includes(selectedShipper.currentCustomerAddress.split(',')[0].toLowerCase()))
                      );
                      return (
                        <div
                          key={st.id}
                          onClick={() => handleSelectActiveStop(st)}
                          className={`flex items-center justify-between gap-1.5 text-[11px] p-1.5 rounded-lg cursor-pointer transition-colors ${
                            isCurrentActive
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold shadow'
                              : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 ${
                              isCurrentActive ? 'bg-emerald-500 text-slate-950' : 'bg-cyan-600 text-white'
                            }`}>
                              ${st.seq}
                            </span>
                            <span className="truncate">{st.name} - {st.address.split(',')[0]}</span>
                          </div>
                          {isCurrentActive ? (
                            <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded shrink-0">
                              ĐANG GIAO
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500 shrink-0">Trạm #{st.seq}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">
              Chọn một tài xế trong danh sách hoặc bấm vào xe trên bản đồ để xem chi tiết.
            </div>
          )}

          {/* Quick Footer Action Button */}
          <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles size={13} className="text-amber-400" />
              <span>AI VRP tối ưu đa điểm</span>
            </span>
            <button
              onClick={handleFitAllDrivers}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>Fit Bản Đồ</span>
              <Maximize2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
