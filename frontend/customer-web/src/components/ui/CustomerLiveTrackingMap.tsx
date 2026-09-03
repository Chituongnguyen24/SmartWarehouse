"use client";

import React, { useEffect, useRef, useState } from "react";
import { Phone, Navigation, Store, MapPin, Gauge, ThermometerSnowflake } from "lucide-react";

interface CustomerLiveTrackingMapProps {
  order: {
    id: string;
    orderCode?: string;
    customerName?: string;
    customerAddress?: string;
    assignedWarehouseName?: string;
    assignedDriverName?: string;
    assignedDriverPhone?: string;
    assignedDriverPlate?: string;
    status: string;
  };
}

const GOONG_MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || "xR9zgCIphv0ZQ7sAS02MRDA9mouqEfatcx24BtYl";
const GOONG_API_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || "9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6";

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

// Geolocation coordinates dictionary for Gò Vấp & HCM routes
const getCoordinatesForAddress = (address: string): { dest: [number, number]; label: string } => {
  const addr = (address || "").toLowerCase();

  if (addr.includes("phạm văn chiêu") || addr.includes("pham van chieu")) {
    return { dest: [10.8492, 106.6543], label: "29 Phạm Văn Chiêu, P.14, Gò Vấp" };
  }
  if (addr.includes("phan huy ích") || addr.includes("phan huy ich")) {
    return { dest: [10.8315, 106.6345], label: "30 Phan Huy Ích, P.12, Gò Vấp" };
  }
  if (addr.includes("quang trung")) {
    return { dest: [10.8398, 106.6582], label: "618 Quang Trung, P.11, Gò Vấp" };
  }
  if (addr.includes("nguyễn oanh") || addr.includes("nguyen oanh")) {
    return { dest: [10.8420, 106.6780], label: "Nguyễn Oanh, Gò Vấp" };
  }
  if (addr.includes("thống nhất") || addr.includes("thong nhat")) {
    return { dest: [10.8465, 106.6690], label: "Thống Nhất, Gò Vấp" };
  }
  if (addr.includes("lê đức thọ") || addr.includes("le duc tho")) {
    return { dest: [10.8520, 106.6710], label: "Lê Đức Thọ, Gò Vấp" };
  }
  return { dest: [10.8450, 106.6600], label: address || "Địa chỉ nhận hàng" };
};

const WAREHOUSE_COORDS: [number, number] = [10.8354, 106.6668]; // Kho Gò Vấp (WH-006)

export const CustomerLiveTrackingMap: React.FC<CustomerLiveTrackingMapProps> = ({ order }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const shipperMarkerRef = useRef<any>(null);
  const traveledPolylineRef = useRef<any>(null);

  const [etaMinutes, setEtaMinutes] = useState(12);
  const [distanceKm, setDistanceKm] = useState(1.4);
  const [currentSpeed, setCurrentSpeed] = useState(32);
  const [containerTemp, setContainerTemp] = useState(3.2);
  const [progressRatio, setProgressRatio] = useState(0.45);

  const driverName = order.assignedDriverName || "Võ Minh Trí";
  const driverPlate = order.assignedDriverPlate || "59-V1 888.99";
  const driverPhone = order.assignedDriverPhone || "0977112233";
  const warehouseName = order.assignedWarehouseName || "Kho Gò Vấp (WH-006)";

  useEffect(() => {
    let animationTimer: any = null;
    let isCancelled = false;

    const initMap = async () => {
      // 1. Inject Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // 2. Inject MapLibre CSS
      if (!document.getElementById("maplibre-css")) {
        const mlLink = document.createElement("link");
        mlLink.id = "maplibre-css";
        mlLink.rel = "stylesheet";
        mlLink.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
        document.head.appendChild(mlLink);
      }

      const loadScript = (id: string, src: string) => {
        return new Promise<void>((resolve) => {
          if (document.getElementById(id)) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.id = id;
          script.src = src;
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      };

      await loadScript("leaflet-js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");

      const L = (window as any).L;
      if (isCancelled || !mapContainerRef.current || !L) return;

      // Clean old instance
      if (leafletInstance.current) {
        leafletInstance.current.remove();
      }

      const { dest } = getCoordinatesForAddress(order.customerAddress || "");
      const start = WAREHOUSE_COORDS;

      // Create Leaflet Map centered between warehouse & dest
      const map = L.map(mapContainerRef.current, {
        center: [(start[0] + dest[0]) / 2, (start[1] + dest[1]) / 2],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      leafletInstance.current = map;

      // High-res Goong / Carto Voyager Tile Layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: "&copy; Goong.io Maps",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      // 1. Warehouse Marker (🏬 Green Theme)
      const warehouseIcon = L.divIcon({
        className: "custom-wh-marker",
        html: `
          <div style="
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 6px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker(start, { icon: warehouseIcon })
        .addTo(map)
        .bindPopup(`<b>🏬 ${warehouseName}</b><br><span style="font-size:11px;color:#64748b">Điểm xuất phát hàng tươi sống</span>`);

      // 2. Destination Marker (📍 Red/Rose Theme)
      const destIcon = L.divIcon({
        className: "custom-dest-marker",
        html: `
          <div style="
            background: linear-gradient(135deg, #e11d48, #f43f5e);
            color: white;
            padding: 6px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 15px rgba(244, 63, 94, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker(dest, { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>📍 Địa chỉ nhận hàng của bạn</b><br><span style="font-size:11px;color:#64748b">${order.customerAddress || "Điểm đến"}</span>`);

      // 3. Fetch Real Road Routing from Goong Direction API
      let smoothPath: [number, number][] = [];
      try {
        const goongDirUrl = `https://rsapi.goong.io/Direction?origin=${start[0]},${start[1]}&destination=${dest[0]},${dest[1]}&vehicle=bike&api_key=${GOONG_API_KEY}`;
        const dirRes = await fetch(goongDirUrl);
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          if (dirData.routes && dirData.routes.length > 0 && dirData.routes[0].overview_polyline?.points) {
            smoothPath = decodePolyline(dirData.routes[0].overview_polyline.points);
          }
        }
      } catch (err) {
        console.warn("[CustomerLiveTrackingMap] Goong Direction fallback:", err);
      }

      // Fallback if API is offline
      if (smoothPath.length < 2) {
        const fullRoutePoints: [number, number][] = [
          start,
          [start[0] + (dest[0] - start[0]) * 0.35 + 0.002, start[1] + (dest[1] - start[1]) * 0.35 - 0.0015],
          [start[0] + (dest[0] - start[0]) * 0.7 - 0.001, start[1] + (dest[1] - start[1]) * 0.7 + 0.0012],
          dest,
        ];
        for (let i = 0; i < fullRoutePoints.length - 1; i++) {
          const p1 = fullRoutePoints[i];
          const p2 = fullRoutePoints[i + 1];
          for (let s = 0; s < 15; s++) {
            const t = s / 15;
            smoothPath.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
          }
        }
        smoothPath.push(dest);
      }

      // 4. Planned Route Polyline (Full Background Line)
      L.polyline(smoothPath, {
        color: "#94a3b8",
        weight: 6,
        opacity: 0.35,
        lineCap: "round",
      }).addTo(map);

      // 5. Traveled Active Polyline (Emerald Glowing Line)
      const initialStep = Math.floor(smoothPath.length * 0.4);
      const traveledLine = L.polyline(smoothPath.slice(0, initialStep + 1), {
        color: "#10b981",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
      }).addTo(map);
      traveledPolylineRef.current = traveledLine;

      // 6. Shipper Real-time GPS Marker with Pulse Ring
      const initialPos = smoothPath[initialStep] || start;
      const shipperIcon = L.divIcon({
        className: "custom-shipper-marker",
        html: `
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
            <div style="
              position: absolute;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: rgba(16, 185, 129, 0.4);
              animation: pulseRing 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            "></div>
            <div style="
              position: relative;
              background: linear-gradient(135deg, #0284c7, #06b6d4);
              color: white;
              border-radius: 50%;
              border: 2.5px solid white;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(2, 132, 199, 0.7);
              font-size: 18px;
            ">
              🛵
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const shipperMarker = L.marker(initialPos, { icon: shipperIcon }).addTo(map);
      shipperMarker.bindPopup(`
        <div style="min-width:160px">
          <b>🛵 Shipper: ${driverName}</b><br>
          <span style="font-size:11px;color:#0284c7">Biển số: ${driverPlate}</span><br>
          <span style="font-size:11px;color:#10b981">Nhiệt độ thùng lạnh: ${containerTemp}°C</span>
        </div>
      `);
      shipperMarkerRef.current = shipperMarker;

      // 7. Live GPS Simulation Movement Loop along Real Goong Path
      let stepIndex = initialStep;
      let direction = 1;

      animationTimer = setInterval(() => {
        if (!shipperMarkerRef.current || !traveledPolylineRef.current) return;

        stepIndex += direction;
        if (stepIndex >= smoothPath.length - 2) {
          direction = -1; // bounce back for live continuous demo
        } else if (stepIndex <= 2) {
          direction = 1;
        }

        const newPos = smoothPath[stepIndex];
        shipperMarkerRef.current.setLatLng(newPos);
        traveledPolylineRef.current.setLatLngs(smoothPath.slice(0, stepIndex + 1));

        const ratio = stepIndex / smoothPath.length;
        setProgressRatio(ratio);

        const remainingKm = Math.max(0.2, 2.8 * (1 - ratio)).toFixed(1);
        setDistanceKm(Number(remainingKm));

        const remainingMin = Math.max(2, Math.round(15 * (1 - ratio)));
        setEtaMinutes(remainingMin);

        // Fluctuate speed realistically between 28 - 36 km/h
        const dynamicSpeed = Math.round(30 + Math.sin(stepIndex * 0.5) * 6);
        setCurrentSpeed(dynamicSpeed);

        // Cold box temperature fluctuation between 2.8°C - 3.4°C
        const dynamicTemp = (3.1 + Math.sin(stepIndex * 0.3) * 0.3).toFixed(1);
        setContainerTemp(Number(dynamicTemp));
      }, 1200);
    };

    initMap();

    return () => {
      isCancelled = true;
      if (animationTimer) clearInterval(animationTimer);
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [order.customerAddress, driverPlate, warehouseName]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl my-3 text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation size={14} className="text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
            Định Tuyến & GPS Trực Tiếp Xe Giao Hàng (Goong.io)
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
            <span>⏱️ Dự kiến đến:</span>
            <span className="text-white font-extrabold text-xs">~{etaMinutes} phút</span>
          </span>
        </div>
      </div>

      {/* Main Interactive Map Container */}
      <div className="relative w-full h-72 sm:h-80 bg-slate-900">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Telemetry Badges (HUD) */}
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 pointer-events-none">
          {/* Speed badge */}
          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-lg text-[11px]">
            <Gauge size={13} className="text-cyan-400" />
            <span className="text-slate-300 font-medium">Vận tốc:</span>
            <span className="font-black text-cyan-300">{currentSpeed} km/h</span>
          </div>

          {/* IoT Temperature badge */}
          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-lg text-[11px]">
            <ThermometerSnowflake size={13} className="text-blue-400" />
            <span className="text-slate-300 font-medium">Thùng lạnh IoT:</span>
            <span className="font-black text-emerald-400">{containerTemp}°C (Chuẩn)</span>
          </div>
        </div>

        {/* Distance Remaining Badge */}
        <div className="absolute top-3 right-12 z-[400] pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur px-3 py-1 rounded-lg border border-slate-700/80 shadow-lg text-[11px] flex items-center gap-1">
            <span className="text-slate-300">Cách bạn:</span>
            <span className="font-extrabold text-amber-400">{distanceKm} km</span>
          </div>
        </div>

        {/* Progress Bar At Map Bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-[400] h-1.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700"
            style={{ width: `${Math.round(progressRatio * 100)}%` }}
          />
        </div>
      </div>

      {/* Driver Information & Actions Footer */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Driver Card */}
        <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm uppercase shadow-md shrink-0">
              {driverName.split(" ").pop()?.slice(0, 3) || "TRÍ"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>{driverName}</span>
                <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded font-bold border border-amber-400/30">⭐ 4.95</span>
              </div>
              <div className="text-[11px] text-cyan-300 font-mono font-semibold">
                🛵 {driverPlate}
              </div>
            </div>
          </div>

          <a
            href={`tel:${driverPhone}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
            title="Gọi ngay cho tài xế"
          >
            <Phone size={13} />
            <span>Gọi Shipper</span>
          </a>
        </div>

        {/* Live Route Summary */}
        <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 text-xs">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <Store size={11} /> {warehouseName}
            </div>
            <div className="text-slate-400 text-[11px] truncate mt-0.5 flex items-center gap-1">
              <MapPin size={11} className="text-rose-400 shrink-0" />
              <span className="truncate">{order.customerAddress || "Địa chỉ khách hàng"}</span>
            </div>
          </div>

          <div className="text-right shrink-0 border-l border-slate-800 pl-3">
            <div className="text-[10px] text-slate-400">Tiến độ</div>
            <div className="text-xs font-black text-emerald-400">
              {Math.round(progressRatio * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Pulse Ring CSS */}
      <style jsx global>{`
        @keyframes pulseRing {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
