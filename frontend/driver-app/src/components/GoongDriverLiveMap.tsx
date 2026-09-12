import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { DeliveryTask } from '../types/driver';
import { resolveCoordsAndCleanAddress } from '../utils/locationHelper';
import {
  Navigation,
  Compass,
  MapPin,
  Layers,
  Maximize2,
  Minimize2,
  ExternalLink,
  Phone,
  Truck,
  Bike,
  Sparkles,
  Route,
  RefreshCw,
  LocateFixed,
} from 'lucide-react-native';

const GOONG_MAPTILES_KEY = 'xR9zgCIphv0ZQ7sAS02MRDA9mouqEfatcx24BtYl';
const GOONG_API_KEY = '9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6';

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

interface GoongDriverLiveMapProps {
  driverLocation: { lat: number; lng: number; speedKmh: number };
  tasks: DeliveryTask[];
  currentTask?: DeliveryTask | null;
  driverName?: string;
  vehicleType?: 'TRUCK' | 'BIKE' | 'VAN';
  isBatchDeparted?: boolean;
  onSelectTask?: (task: DeliveryTask) => void;
}

export const GoongDriverLiveMap: React.FC<GoongDriverLiveMapProps> = ({
  driverLocation,
  tasks,
  currentTask,
  driverName = 'Tài xế',
  vehicleType = 'TRUCK',
  isBatchDeparted = false,
  onSelectTask,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const stopsLayerRef = useRef<any[]>([]);
  const activeRoutePolylineRef = useRef<any>(null);
  const allStopsPolylineRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [distanceEtaText, setDistanceEtaText] = useState<string>('Đang tính lộ trình...');
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // ── Smart API Throttling & Caching Refs (Saves 99% of API Tokens) ──
  const lastRoutedTaskIdRef = useRef<string | null>(null);
  const lastRoutedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // 1. Initialize Leaflet + Map Tiles on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    let isSubscribed = true;

    const setupLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (!isSubscribed || !mapContainerRef.current || !L) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const initialCenter: [number, number] = [
        driverLocation?.lat || 10.8354,
        driverLocation?.lng || 106.6668,
      ];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Goong.io & Google Maps',
      }).addTo(map);

      // Warehouse Hub Marker (Kho Gò Vấp)
      const hubIcon = L.divIcon({
        className: 'goong-wh-hub-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #059669, #0f172a);
            color: white;
            padding: 5px 8px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(5,150,105,0.4);
            border: 2px solid #ffffff;
            white-space: nowrap;
          ">
            <span>🏬 Kho Gò Vấp (WH-006)</span>
          </div>
        `,
        iconSize: [160, 30],
        iconAnchor: [80, 15],
      });
      L.marker([10.8354, 106.6668], { icon: hubIcon }).addTo(map);

      leafletMapRef.current = map;
      setIsMapReady(true);
    };

    setupLeaflet();

    return () => {
      isSubscribed = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // 2. Update Driver GPS Marker & Radar on Location change
  useEffect(() => {
    if (!isMapReady || !leafletMapRef.current || typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L) return;

    const lat = driverLocation.lat;
    const lng = driverLocation.lng;
    const speed = driverLocation.speedKmh || 0;
    const isTruck = vehicleType === 'TRUCK' || vehicleType === 'VAN';
    const vehicleIconChar = isTruck ? '🚛' : '🛵';

    const driverHtml = `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.25);
          animation: goongPulse 2s infinite ease-out;
          border: 1.5px solid #0284c7;
        "></div>
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7, #0369a1);
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(2, 132, 199, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          z-index: 2;
        ">
          ${vehicleIconChar}
        </div>
        <div style="
          position: absolute;
          bottom: -18px;
          background: #0f172a;
          color: #38bdf8;
          font-size: 9px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 999px;
          border: 1px solid #0284c7;
          white-space: nowrap;
          z-index: 3;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          ${speed > 0 ? `${speed} km/h` : 'Đang đỗ'}
        </div>
      </div>
      <style>
        @keyframes goongPulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
    `;

    const icon = L.divIcon({
      className: 'goong-driver-marker',
      html: driverHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(leafletMapRef.current);
      driverMarkerRef.current.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 4px;">
          <div style="font-weight: 800; color: #0f172a; font-size: 12px; margin-bottom: 2px;">
            ${vehicleIconChar} ${driverName} (${vehicleType})
          </div>
          <div style="font-size: 11px; color: #64748b;">
            Tốc độ hiện tại: <b>${speed} km/h</b>
          </div>
          <div style="font-size: 10px; color: #0284c7; margin-top: 4px;">
            📍 Tọa độ GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
        </div>
      `);
    } else {
      driverMarkerRef.current.setLatLng([lat, lng]);
      driverMarkerRef.current.setIcon(icon);
    }
  }, [driverLocation.lat, driverLocation.lng, driverLocation.speedKmh, isMapReady, vehicleType, driverName]);

  // 3. Render Delivery Task Stop Markers & Draw Goong Route Polylines
  useEffect(() => {
    if (!isMapReady || !leafletMapRef.current || typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L) return;

    stopsLayerRef.current.forEach((m) => m.remove());
    stopsLayerRef.current = [];

    if (activeRoutePolylineRef.current) {
      activeRoutePolylineRef.current.remove();
      activeRoutePolylineRef.current = null;
    }
    if (allStopsPolylineRef.current) {
      allStopsPolylineRef.current.remove();
      allStopsPolylineRef.current = null;
    }

    if (!tasks || tasks.length === 0) {
      setDistanceEtaText('Chưa có đơn hàng trong chuyến');
      return;
    }

    const map = leafletMapRef.current;
    const bounds = L.latLngBounds([[driverLocation.lat, driverLocation.lng]]);

    // Add Stop Markers
    tasks.forEach((task, index) => {
      const isCurrentActive = currentTask?.id === task.id || (index === 0 && task.status === 'IN_TRANSIT');
      const isDelivered = task.status === 'DELIVERED';
      const address = (task as any).customerAddress || task.deliveryAddress || '';
      const latVal = (task as any).customerLat || task.latitude;
      const lngVal = (task as any).customerLng || task.longitude;
      const geo = resolveCoordsAndCleanAddress(address, latVal, lngVal);

      bounds.extend([geo.lat, geo.lng]);

      const markerColor = isDelivered ? '#10b981' : isCurrentActive ? '#0284c7' : '#f59e0b';
      const badgeBg = isDelivered ? '#059669' : isCurrentActive ? '#0284c7' : '#d97706';

      const stopIcon = L.divIcon({
        className: 'goong-stop-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: ${markerColor};
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-weight: 900;
              font-size: 11px;
            ">
              ${isDelivered ? '✓' : index + 1}
            </div>
            <div style="
              background: rgba(15, 23, 42, 0.9);
              color: #ffffff;
              font-size: 9px;
              font-weight: 700;
              padding: 1px 5px;
              border-radius: 4px;
              margin-top: 2px;
              white-space: nowrap;
              border: 1px solid rgba(255,255,255,0.2);
            ">
              ${task.orderCode || `#Đơn ${index + 1}`}
            </div>
          </div>
        `,
        iconSize: [60, 48],
        iconAnchor: [30, 24],
      });

      const stopMarker = L.marker([geo.lat, geo.lng], { icon: stopIcon }).addTo(map);

      stopMarker.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 180px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="background: ${badgeBg}; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              ${isDelivered ? 'ĐÃ GIAO' : isCurrentActive ? 'ĐANG GIAO (ĐIỂM DỪNG NÀY)' : `ĐIỂM DỪNG #${index + 1}`}
            </span>
            <span style="font-size: 11px; font-weight: 800; color: #0f172a;">${task.orderCode}</span>
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            👤 ${task.customerName}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px; line-height: 1.3;">
            📍 ${geo.cleanAddress}
          </div>
          ${task.customerPhone ? `<div style="font-size: 11px; color: #0284c7; font-weight: 700;">📞 ${task.customerPhone}</div>` : ''}
        </div>
      `);

      stopsLayerRef.current.push(stopMarker);
    });

    // 4. Fetch Goong Direction Route from Driver to Active / Next Stop (Throttled & Cached)
    const targetTask = currentTask || tasks.find((t) => t.status !== 'DELIVERED') || tasks[0];
    if (targetTask) {
      const address = (targetTask as any).customerAddress || targetTask.deliveryAddress || '';
      const latVal = (targetTask as any).customerLat || targetTask.latitude;
      const lngVal = (targetTask as any).customerLng || targetTask.longitude;
      const destGeo = resolveCoordsAndCleanAddress(address, latVal, lngVal);

      const now = Date.now();
      const hasTaskChanged = lastRoutedTaskIdRef.current !== targetTask.id;
      const lastCoords = lastRoutedCoordsRef.current;
      
      // Calculate distance moved from last API call
      let distanceMovedKm = 999;
      if (lastCoords) {
        const dLat = (driverLocation.lat - lastCoords.lat) * 111.32;
        const dLng = (driverLocation.lng - lastCoords.lng) * 111.32 * Math.cos((driverLocation.lat * Math.PI) / 180);
        distanceMovedKm = Math.sqrt(dLat * dLat + dLng * dLng);
      }

      // ONLY call Goong API if:
      // 1. Switched to another delivery task/order
      // 2. Or moved > 300 meters from last route calculation AND > 30s elapsed
      // Otherwise REUSE existing polyline (0 API tokens consumed)
      const shouldCallGoongApi = hasTaskChanged || (distanceMovedKm > 0.3 && now - lastFetchTimeRef.current > 30000);

      if (shouldCallGoongApi) {
        lastRoutedTaskIdRef.current = targetTask.id;
        lastRoutedCoordsRef.current = { lat: driverLocation.lat, lng: driverLocation.lng };
        lastFetchTimeRef.current = now;

        const vehicle = vehicleType === 'TRUCK' || vehicleType === 'VAN' ? 'car' : 'bike';
        const goongUrl = `https://rsapi.goong.io/Direction?origin=${driverLocation.lat},${driverLocation.lng}&destination=${destGeo.lat},${destGeo.lng}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}`;

        setIsRoutingLoading(true);
        fetch(goongUrl)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.routes && data.routes[0]) {
              const route = data.routes[0];
              const distanceKm = (route.legs[0]?.distance?.value || 0) / 1000;
              const durationMin = Math.ceil((route.legs[0]?.duration?.value || 0) / 60);

              setDistanceEtaText(
                `Đến ${targetTask.customerName}: ${distanceKm.toFixed(1)} km (~${durationMin} phút)`
              );

              const encoded = route.overview_polyline?.points;
              if (encoded) {
                const polyPoints = decodePolyline(encoded);
                if (activeRoutePolylineRef.current) activeRoutePolylineRef.current.remove();

                activeRoutePolylineRef.current = L.polyline(polyPoints, {
                  color: '#0284c7',
                  weight: 5,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }).addTo(map);
              }
            } else {
              const fallbackPoints = [
                [driverLocation.lat, driverLocation.lng],
                [destGeo.lat, destGeo.lng],
              ];
              if (activeRoutePolylineRef.current) activeRoutePolylineRef.current.remove();
              activeRoutePolylineRef.current = L.polyline(fallbackPoints, {
                color: '#0284c7',
                weight: 4,
                dashArray: '8, 8',
                opacity: 0.8,
              }).addTo(map);
              setDistanceEtaText(`Đang dẫn đường đến ${targetTask.customerName}`);
            }
          })
          .catch((err) => {
            console.warn('Goong driver route fetch fallback:', err);
            const fallbackPoints = [
              [driverLocation.lat, driverLocation.lng],
              [destGeo.lat, destGeo.lng],
            ];
            if (activeRoutePolylineRef.current) activeRoutePolylineRef.current.remove();
            activeRoutePolylineRef.current = L.polyline(fallbackPoints, {
              color: '#0284c7',
              weight: 4,
              dashArray: '8, 8',
            }).addTo(map);
          })
          .finally(() => {
            setIsRoutingLoading(false);
          });
      }
    }

    // Connect upcoming stops with dotted line
    const remainingCoords: [number, number][] = [];
    tasks
      .filter((t) => t.status !== 'DELIVERED')
      .forEach((t) => {
        const address = (t as any).customerAddress || t.deliveryAddress || '';
        const latVal = (t as any).customerLat || t.latitude;
        const lngVal = (t as any).customerLng || t.longitude;
        const g = resolveCoordsAndCleanAddress(address, latVal, lngVal);
        remainingCoords.push([g.lat, g.lng]);
      });

    if (remainingCoords.length > 1) {
      allStopsPolylineRef.current = L.polyline(remainingCoords, {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.6,
      }).addTo(map);
    }
  }, [tasks, currentTask, driverLocation.lat, driverLocation.lng, isMapReady, vehicleType]);

  const handleRecenter = () => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.setView([driverLocation.lat, driverLocation.lng], 15, {
      animate: true,
    });
  };

  const handleFitAll = () => {
    if (!leafletMapRef.current || !(window as any).L) return;
    const L = (window as any).L;
    const bounds = L.latLngBounds([[driverLocation.lat, driverLocation.lng]]);
    tasks.forEach((t) => {
      const address = (t as any).customerAddress || t.deliveryAddress || '';
      const latVal = (t as any).customerLat || t.latitude;
      const lngVal = (t as any).customerLng || t.longitude;
      const g = resolveCoordsAndCleanAddress(address, latVal, lngVal);
      bounds.extend([g.lat, g.lng]);
    });
    leafletMapRef.current.fitBounds(bounds, { padding: [30, 30], animate: true });
  };

  return (
    <View style={styles.cardContainer}>
      {/* ── TOP MAP HUD BAR ── */}
      <View style={styles.topHud}>
        <View style={styles.gpsStatusWrap}>
          <View style={styles.pulsingDot} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.gpsTitle}>GOONG MAPS DẪN ĐƯỜNG GPS</Text>
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>TRỰC TUYẾN</Text>
              </View>
            </View>
            <Text style={styles.gpsCoords}>
              {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)} • Tốc độ:{' '}
              <Text style={{ color: '#4ade80', fontWeight: '800' }}>
                {driverLocation.speedKmh || 0} km/h
              </Text>
            </Text>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.hudActions}>
          <TouchableOpacity
            style={styles.hudBtn}
            onPress={handleRecenter}
            activeOpacity={0.8}
          >
            <LocateFixed size={16} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hudBtn}
            onPress={handleFitAll}
            activeOpacity={0.8}
          >
            <Route size={16} color="#fbbf24" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hudBtn, isExpanded && { backgroundColor: '#0284c7' }]}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.8}
          >
            {isExpanded ? (
              <Minimize2 size={16} color="#ffffff" />
            ) : (
              <Maximize2 size={16} color="#cbd5e1" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── INTERACTIVE GOONG MAP VIEW CONTAINER ── */}
      <View style={[styles.mapWrap, { height: isExpanded ? 420 : 250 }]}>
        {Platform.OS === 'web' ? (
          <div
            ref={mapContainerRef as any}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '0 0 16px 16px',
              backgroundColor: '#090d16',
            }}
          />
        ) : (
          <View style={styles.nativeFallback}>
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700' }}>
              Bản đồ GPS trực tiếp (Vui lòng truy cập trên nền Web/Mobile Web)
            </Text>
          </View>
        )}

        {/* Bottom Floating Route Info Banner */}
        <View style={styles.routeFloatingBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
            <Navigation size={16} color="#38bdf8" />
            <Text style={styles.routeBannerText} numberOfLines={1}>
              {distanceEtaText}
            </Text>
          </View>
          {isRoutingLoading && <ActivityIndicator size="small" color="#38bdf8" />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#090d16',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  gpsStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  gpsTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveTag: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  liveTagText: {
    color: '#4ade80',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gpsCoords: {
    color: '#94a3b8',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  hudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapWrap: {
    width: '100%',
    position: 'relative',
    transition: 'height 0.3s ease',
  } as any,
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  routeFloatingBanner: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(8px)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  } as any,
  routeBannerText: {
    color: '#f8fafc',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
