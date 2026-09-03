import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Navigation, Gauge, ThermometerSnowflake, RefreshCw, AlertTriangle, Phone, Store, MapPin, Route, Layers, CheckCircle, Users, Eye, Sparkles, Clock, Check, Truck, Bike } from 'lucide-react';

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

interface ShipperLiveState {
  id: string;
  name: string;
  phone: string;
  plate: string;
  lat: number;
  lng: number;
  speed: number;
  temperature: number;
  status: 'DELIVERING' | 'READY_FOR_DELIVERY' | 'IDLE' | 'RETURNING' | 'CRITICAL_TEMP';
  vehicleType: 'BIKE' | 'TRUCK';
  currentOrderId?: string;
  orderCode?: string;
  currentCustomerName?: string;
  currentCustomerAddress?: string;
  routeStops?: Array<{ id: string; name: string; address: string; lat: number; lng: number; seq: number; status?: string }>;
}

const INITIAL_SHIPPERS: ShipperLiveState[] = [
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
    id: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933445566',
    plate: '59-P1 456.78',
    lat: 10.8380,
    lng: 106.6620,
    speed: 0,
    temperature: 2.9,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'BIKE',
    routeStops: [
      { id: 'ord-06', name: 'Nguyễn Hoàng Nam', address: '142 Quang Trung, Gò Vấp', lat: 10.8398, lng: 106.6582, seq: 1 },
      { id: 'ord-07', name: 'Trần Thị Mai', address: '215 Phạm Văn Chiêu, Gò Vấp', lat: 10.8492, lng: 106.6543, seq: 2 },
      { id: 'ord-08', name: 'Phạm Minh Hạnh', address: '540 Lê Văn Thọ, Gò Vấp', lat: 10.8465, lng: 106.6521, seq: 3 },
      { id: 'ord-09', name: 'Vũ Đức Thắng', address: '32/5 Cây Trâm, Gò Vấp', lat: 10.8432, lng: 106.6567, seq: 4 },
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
    temperature: 3.5,
    status: 'READY_FOR_DELIVERY',
    vehicleType: 'TRUCK',
    routeStops: [
      { id: 'ord-10', name: 'Lê Quốc Bảo', address: '88 Phan Huy Ích, Gò Vấp', lat: 10.8315, lng: 106.6345, seq: 1 },
    ],
  },
  { id: 'NV-GV06', name: 'Nguyễn Văn Hùng', phone: '0909888111', plate: '59-G2 688.39', lat: 10.8330, lng: 106.6400, speed: 0, temperature: 3.8, status: 'IDLE', vehicleType: 'BIKE' },
  { id: 'NV-GV09', name: 'Lê Thanh Tùng', phone: '0966332211', plate: '59-X1 999.11', lat: 10.8510, lng: 106.6690, speed: 0, temperature: 4.1, status: 'IDLE', vehicleType: 'BIKE' },
  { id: 'NV-GV10', name: 'Đặng Hữu Phúc', phone: '0944778899', plate: '59-T2 777.88', lat: 10.8360, lng: 106.6680, speed: 0, temperature: 2.8, status: 'IDLE', vehicleType: 'TRUCK' },
];

export const ControlTowerMap: React.FC<{ activeAlert?: any; onDismissAlert?: () => void }> = ({ activeAlert, onDismissAlert }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routeLayersRef = useRef<any[]>([]);

  const [shippers, setShippers] = useState<ShipperLiveState[]>(INITIAL_SHIPPERS);
  const [selectedShipper, setSelectedShipper] = useState<ShipperLiveState | null>(INITIAL_SHIPPERS[0]);
  const [activeTab, setActiveTab] = useState<'route' | 'fleet'>('route');
  const [vehicleMode, setVehicleMode] = useState<'BIKE' | 'TRUCK'>('BIKE');

  // 1. Fetch real orders & poll Live GPS Telemetry from connected phones
  useEffect(() => {
    async function syncRealData() {
      try {
        const resOrders = await fetch('http://localhost:3004/orders');
        const orders = resOrders.ok ? await resOrders.json() : [];

        const resLive = await fetch('http://localhost:3004/orders/drivers-live');
        const liveDrivers: any[] = resLive.ok ? await resLive.json() : [];

        setShippers(prev => {
          const updatedList = prev.map(s => {
            const liveMatch = liveDrivers.find(
              ld => ld.id === s.id || (ld.phone && s.phone && ld.phone.replace(/\D/g, '') === s.phone.replace(/\D/g, ''))
            );

            // Filter ONLY active uncompleted orders (COMPLETED & CANCELLED are completely removed!)
            const assignedOrders = orders.filter(
              (o: any) =>
                (o.assignedDriverId === s.id || o.assignedDriverName === s.name) &&
                o.status !== 'COMPLETED' &&
                o.status !== 'DELIVERED' &&
                o.status !== 'CANCELLED'
            );

            let stops: any[] = [];
            if (orders.length > 0) {
              // If DB has orders, use ONLY uncompleted assigned orders
              stops = assignedOrders.map((o: any, idx: number) => ({
                id: o.id,
                name: o.customerName || 'Khách Hàng',
                address: o.customerAddress || 'Gò Vấp',
                lat: Number(o.shippingLat) || (10.835 + idx * 0.004),
                lng: Number(o.shippingLng) || (106.655 + idx * 0.004),
                seq: idx + 1,
                status: o.status,
              }));
            } else {
              // Fallback to initial uncompleted stops
              stops = s.routeStops || [];
            }

            const currentLat = liveMatch ? liveMatch.lat : s.lat;
            const currentLng = liveMatch ? liveMatch.lng : s.lng;
            const currentSpeed = liveMatch ? liveMatch.speed : (s.status === 'DELIVERING' ? 28 : s.speed);
            const currentTemp = liveMatch ? liveMatch.temperature : s.temperature;

            // Check if driver is actively delivering an order
            const isDelivering = !!(
              liveMatch?.currentCustomerName ||
              liveMatch?.currentOrderId ||
              liveMatch?.status === 'DELIVERING' ||
              assignedOrders.some((o: any) => o.status === 'DELIVERING') ||
              s.currentCustomerName
            );

            let activeOrderCode = s.orderCode;
            let activeCustomerName = s.currentCustomerName;
            let activeCustomerAddr = s.currentCustomerAddress;
            let currentOrderId = s.currentOrderId;

            if (isDelivering) {
              if (liveMatch?.currentCustomerName || liveMatch?.currentOrderId) {
                currentOrderId = liveMatch.currentOrderId || (assignedOrders[0]?.id);
                activeOrderCode = liveMatch.orderCode || (currentOrderId ? currentOrderId.slice(0, 8).toUpperCase() : 'ECOMM-01');
                activeCustomerName = liveMatch.currentCustomerName || assignedOrders.find((o: any) => o.status === 'DELIVERING')?.customerName;
                activeCustomerAddr = liveMatch.currentCustomerAddress || assignedOrders.find((o: any) => o.status === 'DELIVERING')?.customerAddress;
              } else {
                const activeOrder = assignedOrders.find((o: any) => o.status === 'DELIVERING');
                if (activeOrder) {
                  currentOrderId = activeOrder.id;
                  activeOrderCode = activeOrder.id.slice(0, 8).toUpperCase();
                  activeCustomerName = activeOrder.customerName;
                  activeCustomerAddr = activeOrder.customerAddress;
                }
              }
            } else {
              activeOrderCode = undefined;
              activeCustomerName = undefined;
              activeCustomerAddr = undefined;
              currentOrderId = undefined;
            }

            // Status: DELIVERING only if driver pressed Start Delivery; otherwise READY_FOR_DELIVERY or IDLE
            const currentStatus: 'DELIVERING' | 'READY_FOR_DELIVERY' | 'IDLE' = isDelivering
              ? 'DELIVERING'
              : stops.length > 0
              ? 'READY_FOR_DELIVERY'
              : 'IDLE';

            // Move marker on Leaflet map in real time
            const marker = markersRef.current.get(s.id);
            if (marker && currentLat && currentLng) {
              marker.setLatLng([currentLat, currentLng]);
            }

            return {
              ...s,
              lat: currentLat,
              lng: currentLng,
              speed: currentSpeed,
              temperature: currentTemp,
              status: currentStatus,
              currentOrderId,
              orderCode: activeOrderCode,
              currentCustomerName: activeCustomerName,
              currentCustomerAddress: activeCustomerAddr,
              routeStops: stops,
            };
          });

          return updatedList;
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

  // Update Route Polyline & Waypoint Pins with Vehicle-specific Routing (Bike vs Truck)
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
      const isTruck = vehicleMode === 'TRUCK';
      const vehicle = isTruck ? 'car' : 'bike';

      // 1. Fetch real road polyline from Goong Direction API
      const origin = `${selectedShipper.lat},${selectedShipper.lng}`;
      const activeStop = stops.find(st => st.id === selectedShipper.currentOrderId) || stops[0];
      const destination = `${activeStop.lat},${activeStop.lng}`;

      const goongDirUrl = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}`;

      fetch(goongDirUrl)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes.length > 0 && data.routes[0].overview_polyline?.points) {
            const coordinates = decodePolyline(data.routes[0].overview_polyline.points);

            // Glow Outline
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
            }).addTo(map);

            routeLayersRef.current.push(glowLine, mainLine);
          } else {
            // Fallback connecting straight lines
            const waypoints = [
              [10.8354, 106.6668],
              [selectedShipper.lat, selectedShipper.lng],
              ...stops.map(st => [st.lat, st.lng]),
            ];
            const fbLine = L.polyline(waypoints as [number, number][], { color: '#0284c7', weight: 3, dashArray: '6,6' }).addTo(map);
            routeLayersRef.current.push(fbLine);
          }
        })
        .catch(() => {
          const waypoints = [
            [10.8354, 106.6668],
            [selectedShipper.lat, selectedShipper.lng],
            ...stops.map(st => [st.lat, st.lng]),
          ];
          const fbLine = L.polyline(waypoints as [number, number][], { color: '#0284c7', weight: 3, dashArray: '6,6' }).addTo(map);
          routeLayersRef.current.push(fbLine);
        });

      // 2. Add Stop Markers
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
              ${isCurrentActive ? '<span style="background:#dcfce7; color:#15803d; font-size:10px; font-weight:800; padding:2px 6px; borderRadius:4px;">🟢 ĐANG GIAO ĐƠN NÀY</span>' : ''}
            </div>
          `);

        routeLayersRef.current.push(stopMarker);
      });
    }
  }, [selectedShipper?.id, selectedShipper?.lat, selectedShipper?.lng, selectedShipper?.currentCustomerAddress, selectedShipper?.status, vehicleMode]);

  // Leaflet Map Initialization with Goong Map Tiles
  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      // 1. Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Load MapLibre CSS & JS for Goong Vector Tiles
      if (!document.getElementById('maplibre-css')) {
        const mlLink = document.createElement('link');
        mlLink.id = 'maplibre-css';
        mlLink.rel = 'stylesheet';
        mlLink.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
        document.head.appendChild(mlLink);
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

      // Center closely on Go Vap Hub
      const map = L.map(mapRef.current, {
        center: [10.8400, 106.6620],
        zoom: 14,
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

      // Warehouse Hub Marker (🏬 WH-006)
      const whIcon = L.divIcon({
        className: 'control-tower-wh',
        html: `
          <div style="
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 8px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            font-size: 22px;
          ">
            🏬
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      L.marker([10.8354, 106.6668], { icon: whIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; min-width:200px; padding:2px;">
            <div style="font-size:13px; font-weight:800; color:#065f46;">🏬 Kho Hàng Gò Vấp (WH-006)</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">350 Quang Trung, P.10, Gò Vấp</div>
            <div style="margin-top:6px; font-size:10px; background:#ecfdf5; color:#047857; padding:3px 6px; border-radius:4px; font-weight:700;">
              Hub Điều Phối Xe Máy Thùng Lạnh
            </div>
          </div>
        `);

      // Shipper Live GPS Markers
      INITIAL_SHIPPERS.forEach(s => {
        const isCritical = s.temperature > 5.0;
        const shortName = s.name.split(' ').pop();
        
        const icon = L.divIcon({
          className: 'shipper-tower-marker',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
              <div style="
                background: ${isCritical ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #0284c7, #06b6d4)'};
                color: white;
                border-radius: 50%;
                border: 2.5px solid white;
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 4px 14px ${isCritical ? 'rgba(239, 68, 68, 0.9)' : 'rgba(6, 182, 212, 0.8)'};
              ">
                🛵
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

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl text-slate-100 mb-6">
      
      {/* ── Enterprise Control Tower Top Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/40 shadow-inner">
            <Navigation size={20} className="animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-wide uppercase">
                TRUNG TÂM GIÁM SÁT ĐỘI XE TMS • ĐỊNH TUYẾN VRP & IOT CHUỖI LẠNH
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                WH-006 GÒ VẤP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Định vị vệ tinh GPS thời gian thực • Giám sát nhiệt độ thùng xe lạnh • Tối ưu luồn lách ngõ hẻm
            </p>
          </div>
        </div>

        {/* Vehicle Mode Toggle & Fleet KPI Badges */}
        <div className="flex items-center gap-2.5">
          {/* Vehicle Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setVehicleMode('BIKE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                vehicleMode === 'BIKE' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bike size={14} />
              <span>Xe Máy (Hẻm phố)</span>
            </button>
            <button
              onClick={() => setVehicleMode('TRUCK')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                vehicleMode === 'TRUCK' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck size={14} />
              <span>Xe Tải (Đường lớn)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-slate-300 font-medium">Trực Tuyến:</span>
            <span className="font-extrabold text-emerald-400">{shippers.length} Xe</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs">
            <ThermometerSnowflake size={14} className="text-cyan-400" />
            <span className="text-slate-300 font-medium">Chuẩn Lạnh (&le;4°C):</span>
            <span className="font-extrabold text-cyan-400">100% Đạt</span>
          </div>
        </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 h-[460px]">
        
        {/* Main Map Box (8 cols) */}
        <div className="lg:col-span-8 relative h-full bg-slate-950">
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Quick Map Overlay: Current Selected Shipper Info Banner */}
          {selectedShipper && (
            <div className="absolute top-4 left-4 z-[500] bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-2xl flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-black flex items-center justify-center text-sm shadow">
                {vehicleMode === 'TRUCK' ? '🚚' : '🛵'}
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>{selectedShipper.name}</span>
                  <span className="text-[10px] text-cyan-300 font-mono">({selectedShipper.plate})</span>
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                    {vehicleMode === 'TRUCK' ? 'Xe Tải Lạnh' : 'Xe Máy Hẻm Phố'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {selectedShipper.status === 'DELIVERING' && selectedShipper.currentCustomerName ? (
                    <span className="text-emerald-400 font-semibold">
                      Đang giao: {selectedShipper.currentCustomerName} ➔ {selectedShipper.currentCustomerAddress?.split(',')[0]}
                    </span>
                  ) : selectedShipper.routeStops && selectedShipper.routeStops.length > 0 ? (
                    <span className="text-amber-400 font-medium">
                      ⏳ Đã gán {selectedShipper.routeStops.length} đơn hàng • Chờ tài xế xuất phát
                    </span>
                  ) : (
                    <span className="text-slate-400">Đã hoàn thành toàn bộ ca giao • Sẵn sàng chuyến mới</span>
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
              onClick={() => setActiveTab('route')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'route' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Route size={13} />
              <span>Chi Tiết Chuyến</span>
            </button>
            <button
              onClick={() => setActiveTab('fleet')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'fleet' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={13} />
              <span>Đội Xe ({shippers.length})</span>
            </button>
          </div>

          {activeTab === 'route' && selectedShipper ? (
            <div className="space-y-3">
              {/* Shipper Profile Header Card */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm uppercase shadow">
                    {selectedShipper.name.split(' ').pop()?.slice(0, 3)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{selectedShipper.name}</span>
                      <span className="text-[10px] bg-slate-800 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                        {selectedShipper.plate}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{selectedShipper.phone} • Ca Sáng (Gò Vấp)</div>
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

              {/* 🟢 CONDITIONAL ACTIVE ORDER SPOTLIGHT CARD */}
              {selectedShipper.status === 'DELIVERING' && selectedShipper.currentCustomerName ? (
                /* Card khi tài xế ĐÃ BẮT ĐẦU GIAO ĐƠN */
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
                    <span>Tuyến đường: <b>{vehicleMode === 'TRUCK' ? 'Trục đường lớn' : 'Ngõ hẻm tối ưu'}</b></span>
                    <span>Vận tốc: <b>{selectedShipper.speed} km/h</b></span>
                  </div>
                </div>
              ) : selectedShipper.routeStops && selectedShipper.routeStops.length > 0 ? (
                /* Card khi đã phân công lộ trình VRP nhưng TÀI XẾ CHƯA BẤM BẮT ĐẦU GIAO */
                <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/40 text-xs shadow-inner">
                  <div className="flex items-center justify-between font-bold text-amber-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-400" />
                      LỘ TRÌNH ĐÃ PHÂN BỔ ({selectedShipper.routeStops.length} ĐƠN)
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                      Chờ tài xế bắt đầu
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] mt-1">
                    Bấm vào từng trạm dừng bên dưới để theo dõi lộ trình chi tiết.
                  </div>
                </div>
              ) : (
                /* Card khi tài xế rảnh / đã giao hết đơn */
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

              {/* Route Stops Sequence (Remaining active uncompleted stops) */}
              {selectedShipper.routeStops && selectedShipper.routeStops.length > 0 && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div className="text-[10px] text-cyan-400 font-bold mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Route size={12} />
                      <span>Các điểm dừng chưa giao ({selectedShipper.routeStops.length} điểm):</span>
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
                              {st.seq}
                            </span>
                            <span className="truncate">{st.name} - {st.address.split(',')[0]}</span>
                          </div>
                          {isCurrentActive ? (
                            <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-black shrink-0 animate-pulse">
                              ĐANG ĐẾN
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500 shrink-0">Chưa giao</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Contact Button */}
              <a
                href={`tel:${selectedShipper.phone}`}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Phone size={13} />
                <span>Gọi Tài Xế ({selectedShipper.phone})</span>
              </a>
            </div>
          ) : (
            /* Fleet List View */
            <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1">
              <div className="text-[11px] font-bold text-slate-400 mb-1">CHỌN XE MÁY ĐỂ THEO DÕI:</div>
              {shippers.map(s => {
                const isSelected = selectedShipper?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectShipper(s)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'bg-cyan-950/80 border-cyan-500 shadow-md' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center">
                        {s.vehicleType === 'TRUCK' ? '🚚' : '🛵'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span>{s.name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">({s.plate})</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.status === 'DELIVERING' && s.currentCustomerName
                            ? `Đang giao: ${s.currentCustomerName}`
                            : s.routeStops && s.routeStops.length > 0
                            ? `Đã phân ${s.routeStops.length} đơn`
                            : 'Đã hoàn thành'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-400">{s.temperature}°C</div>
                      <div className="text-[10px] text-slate-400">{s.speed} km/h</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Hub summary footer */}
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Store size={13} className="text-emerald-400" /> Hub Gò Vấp (WH-006)
            </span>
            <span className="text-slate-400 font-mono text-[10px]">10.8354, 106.6668</span>
          </div>

        </div>

      </div>
    </div>
  );
};
