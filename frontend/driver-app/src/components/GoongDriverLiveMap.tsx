import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { DeliveryTask } from '../types/driver';
import { resolveCoordsAndCleanAddress } from '../utils/locationHelper';
import {
  Navigation,
  Maximize2,
  Minimize2,
  Route,
  LocateFixed,
} from 'lucide-react-native';

let WebViewComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    WebViewComponent = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview not loaded:', e);
  }
}

const GOONG_MAPTILES_KEY = 'xR9zgCIphv0ZQ7sAS02MRDA9mouqEfatcx24BtYl';
const GOONG_API_KEY = '9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6';

// Warehouse Hub: Kho Gò Vấp
const WAREHOUSE_HUB_COORDS: [number, number] = [10.8354, 106.6668];

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

interface StopData {
  id: string;
  orderCode: string;
  customerName: string;
  cleanAddress: string;
  phone: string;
  lat: number;
  lng: number;
  isCurrentActive: boolean;
  isDelivered: boolean;
  seq: number;
}

// Generate self-contained HTML for Native WebView with Leaflet 1.9.4
function buildMapHtml(params: {
  initialLoc: { lat: number; lng: number; speedKmh: number };
  initialStops: StopData[];
  initialRoute: [number, number][];
  driverName: string;
  vehicleType: string;
}): string {
  const jsonInit = JSON.stringify({
    loc: params.initialLoc,
    stops: params.initialStops,
    route: params.initialRoute,
    driverName: params.driverName,
    vehicleType: params.vehicleType,
    hubCoords: WAREHOUSE_HUB_COORDS,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      background: #090d16;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }
    @keyframes goongPulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .goong-driver-marker {
      overflow: visible !important;
      z-index: 1000 !important;
    }
    .goong-stop-marker {
      overflow: visible !important;
      z-index: 800 !important;
    }
    .goong-wh-hub-marker {
      overflow: visible !important;
      z-index: 900 !important;
    }
    .leaflet-popup-content-wrapper {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      border: 1px solid #334155;
      padding: 0;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    }
    .leaflet-popup-content {
      margin: 8px 12px;
      line-height: 1.4;
    }
    .leaflet-popup-tip {
      background: #0f172a;
    }
    .leaflet-container {
      background: #090d16;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function() {
      var config = ${jsonInit};
      var map = null;
      var driverMarker = null;
      var hubMarker = null;
      var stopsLayer = [];
      var activeRouteLine = null;
      var allStopsLine = null;

      function getDriverIconHtml(speed) {
        var spdText = (speed && speed > 0) ? (speed + ' km/h') : 'Đang đỗ';
        return '<div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">' +
          '<div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(14,165,233,0.25);animation:goongPulse 2s infinite ease-out;border:1.5px solid #0284c7;"></div>' +
          '<div style="width:32px;height:32px;border-radius:50%;background:#0284c7;border:2px solid #ffffff;box-shadow:0 3px 8px rgba(2,132,199,0.5);display:flex;align-items:center;justify-content:center;z-index:2;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>' +
          '</div>' +
          '<div id="driver-speed-badge" style="position:absolute;bottom:-14px;background:#0f172a;color:#38bdf8;font-size:9px;font-weight:700;padding:1px 6px;border-radius:999px;border:1px solid #0284c7;white-space:nowrap;z-index:3;box-shadow:0 2px 4px rgba(0,0,0,0.3);">' +
            spdText +
          '</div>' +
        '</div>';
      }

      function init() {
        if (!window.L) {
          setTimeout(init, 100);
          return;
        }
        var L = window.L;
        var initLat = (config.loc && config.loc.lat) || 10.8354;
        var initLng = (config.loc && config.loc.lng) || 106.6668;

        map = L.map('map', {
          center: [initLat, initLng],
          zoom: 14,
          zoomControl: false,
          attributionControl: false
        });

        // High-performance Google Maps tiles with ArcGIS Street Map fallback
        var baseLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['0', '1', '2', '3'],
          attribution: '&copy; Goong / Google Maps'
        });
        baseLayer.on('tileerror', function() {
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
          }).addTo(map);
        });
        baseLayer.addTo(map);

        // Force Leaflet to recalculate WebView container dimensions
        setTimeout(function() {
          if (map) {
            map.invalidateSize();
            fitAll();
          }
        }, 300);
        setTimeout(function() {
          if (map) {
            map.invalidateSize();
          }
        }, 1200);

        // Warehouse Hub Marker
        var hubIcon = L.divIcon({
          className: 'goong-wh-hub-marker',
          html: '<div style="background:#065f46;color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;display:flex;align-items:center;border:1.5px solid #10b981;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><span>Kho Gò Vấp (WH-006)</span></div>',
          iconSize: [150, 26],
          iconAnchor: [75, 13]
        });
        hubMarker = L.marker(config.hubCoords || [10.8354, 106.6668], { icon: hubIcon }).addTo(map);
        hubMarker.bindPopup('<div style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0f172a;">Trung tâm điều phối: Kho Gò Vấp (WH-006)</div>');

        // Render Driver Marker
        updateDriver(config.loc);

        // Render Stops
        updateStops(config.stops);

        // Render Route
        if (config.route && config.route.length > 0) {
          updateRoute(config.route);
        }

        // Fit bounds
        setTimeout(fitAll, 200);

        window.driverMap = {
          map: map,
          updateDriver: updateDriver,
          updateStops: updateStops,
          updateRoute: updateRoute,
          recenter: recenter,
          fitAll: fitAll
        };
      }

      function updateDriver(loc) {
        if (!loc || !map || !window.L) return;
        var L = window.L;
        if (!driverMarker) {
          var icon = L.divIcon({
            className: 'goong-driver-marker',
            html: getDriverIconHtml(loc.speedKmh || 0),
            iconSize: [48, 48],
            iconAnchor: [24, 24]
          });
          driverMarker = L.marker([loc.lat, loc.lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
          driverMarker.bindPopup(
            '<div style="font-family:sans-serif;padding:2px;">' +
              '<div style="font-weight:700;color:#0f172a;font-size:12px;">' + (config.driverName || 'Tài xế') + ' (' + (config.vehicleType || 'TRUCK') + ')</div>' +
              '<div style="font-size:11px;color:#64748b;margin-top:2px;">Tốc độ: <b>' + (loc.speedKmh || 0) + ' km/h</b></div>' +
              '<div style="font-size:10px;color:#0284c7;margin-top:2px;">GPS: ' + loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5) + '</div>' +
            '</div>'
          );
        } else {
          driverMarker.setLatLng([loc.lat, loc.lng]);
          var spdEl = document.getElementById('driver-speed-badge');
          if (spdEl) {
            spdEl.innerText = (loc.speedKmh && loc.speedKmh > 0) ? (loc.speedKmh + ' km/h') : 'Đang đỗ';
          }
        }
      }

      function updateStops(stops) {
        if (!map || !window.L) return;
        var L = window.L;
        stopsLayer.forEach(function(m) { m.remove(); });
        stopsLayer = [];

        if (!stops || stops.length === 0) return;

        stops.forEach(function(stop) {
          var color = stop.isDelivered ? '#10b981' : stop.isCurrentActive ? '#0284c7' : '#f59e0b';
          var badgeBg = stop.isDelivered ? '#059669' : stop.isCurrentActive ? '#0284c7' : '#d97706';
          var iconContent = stop.isDelivered
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : stop.seq;

          var stopIcon = L.divIcon({
            className: 'goong-stop-marker',
            html: '<div style="position:relative;display:flex;flex-direction:column;align-items:center;">' +
              '<div style="width:26px;height:26px;border-radius:50%;background:' + color + ';border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;font-size:11px;">' +
                iconContent +
              '</div>' +
              '<div style="background:rgba(15,23,42,0.9);color:#ffffff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;margin-top:2px;white-space:nowrap;border:1px solid rgba(255,255,255,0.2);">' +
                stop.orderCode +
              '</div>' +
            '</div>',
            iconSize: [60, 44],
            iconAnchor: [30, 22]
          });

          var marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
          marker.bindPopup(
            '<div style="font-family:sans-serif;min-width:180px;padding:2px;">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
                '<span style="background:' + badgeBg + ';color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">' +
                  (stop.isDelivered ? 'ĐÃ GIAO' : stop.isCurrentActive ? 'ĐANG GIAO (ĐIỂM NÀY)' : ('ĐIỂM DỪNG #' + stop.seq)) +
                '</span>' +
                '<span style="font-size:11px;font-weight:700;color:#0f172a;">' + stop.orderCode + '</span>' +
              '</div>' +
              '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:2px;">' + stop.customerName + '</div>' +
              '<div style="font-size:11px;color:#475569;margin-bottom:4px;line-height:1.3;">' + (stop.cleanAddress || '') + '</div>' +
              (stop.phone ? '<div style="font-size:11px;color:#0284c7;font-weight:600;">ĐT: ' + stop.phone + '</div>' : '') +
            '</div>'
          );
          stopsLayer.push(marker);
        });

        // Remaining coords polyline
        if (allStopsLine) {
          allStopsLine.remove();
          allStopsLine = null;
        }
        var remaining = stops.filter(function(s) { return !s.isDelivered; }).map(function(s) { return [s.lat, s.lng]; });
        if (remaining.length > 1) {
          allStopsLine = L.polyline(remaining, {
            color: '#f59e0b',
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.6
          }).addTo(map);
        }
      }

      function updateRoute(points) {
        if (!map || !window.L) return;
        var L = window.L;
        if (activeRouteLine) {
          activeRouteLine.remove();
          activeRouteLine = null;
        }
        if (!points || points.length === 0) return;
        activeRouteLine = L.polyline(points, {
          color: '#0284c7',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      }

      function recenter() {
        if (!map || !driverMarker) return;
        map.setView(driverMarker.getLatLng(), 15, { animate: true });
      }

      function fitAll() {
        if (!map || !window.L) return;
        var L = window.L;
        map.invalidateSize();
        var pts = [];
        if (driverMarker) pts.push(driverMarker.getLatLng());
        stopsLayer.forEach(function(m) { pts.push(m.getLatLng()); });
        if (hubMarker) pts.push(hubMarker.getLatLng());

        if (pts.length === 1) {
          map.setView(pts[0], 15, { animate: true });
        } else if (pts.length > 1) {
          var bounds = L.latLngBounds(pts);
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: true });
        }
      }

      function onMsg(event) {
        try {
          var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!msg) return;
          if (msg.type === 'UPDATE_DRIVER') {
            updateDriver({ lat: msg.lat, lng: msg.lng, speedKmh: msg.speed });
          } else if (msg.type === 'UPDATE_STOPS') {
            updateStops(msg.stops);
          } else if (msg.type === 'UPDATE_ROUTE') {
            updateRoute(msg.points);
          } else if (msg.type === 'RECENTER') {
            recenter();
          } else if (msg.type === 'FIT_ALL') {
            fitAll();
          }
        } catch(e) {}
      }

      window.addEventListener('message', onMsg);
      document.addEventListener('message', onMsg);

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
      } else {
        document.addEventListener('DOMContentLoaded', init);
      }
    })();
  </script>
</body>
</html>`;
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
  const webViewRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [distanceEtaText, setDistanceEtaText] = useState<string>('Đang tính lộ trình...');
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [activeRoutePoints, setActiveRoutePoints] = useState<[number, number][]>([]);

  // Smart API Throttling & Caching Refs
  const lastRoutedTaskIdRef = useRef<string | null>(null);
  const lastRoutedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Compute prepared stops list for both Web and Native
  const preparedStops: StopData[] = useMemo(() => {
    return (tasks || []).map((task, index) => {
      const isCurrentActive = currentTask?.id === task.id || (index === 0 && task.status === 'IN_TRANSIT');
      const isDelivered = task.status === 'DELIVERED';
      const address = (task as any).customerAddress || task.deliveryAddress || '';
      const latVal = (task as any).customerLat || task.latitude;
      const lngVal = (task as any).customerLng || task.longitude;
      const geo = resolveCoordsAndCleanAddress(address, latVal, lngVal);

      return {
        id: task.id,
        orderCode: task.orderCode || `#Đơn ${index + 1}`,
        customerName: task.customerName || 'Khách hàng',
        cleanAddress: geo.cleanAddress,
        phone: task.customerPhone || '',
        lat: geo.lat,
        lng: geo.lng,
        isCurrentActive,
        isDelivered,
        seq: index + 1,
      };
    });
  }, [tasks, currentTask]);

  // Initial HTML for Native WebView (memoized to prevent reload flashes)
  const initialMapHtml = useMemo(() => {
    return buildMapHtml({
      initialLoc: driverLocation,
      initialStops: preparedStops,
      initialRoute: activeRoutePoints,
      driverName,
      vehicleType,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverName, vehicleType]);

  // ── 1. Web-only Leaflet Initialization ──
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
        driverLocation?.lat || WAREHOUSE_HUB_COORDS[0],
        driverLocation?.lng || WAREHOUSE_HUB_COORDS[1],
      ];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Goong / Google Maps',
      }).addTo(map);

      // Warehouse Hub Marker
      const hubIcon = L.divIcon({
        className: 'goong-wh-hub-marker',
        html: `
          <div style="
            background: #065f46;
            color: #ffffff;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            border: 1.5px solid #10b981;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            <span>Kho Gò Vấp (WH-006)</span>
          </div>
        `,
        iconSize: [150, 26],
        iconAnchor: [75, 13],
      });
      L.marker(WAREHOUSE_HUB_COORDS, { icon: hubIcon }).addTo(map);

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

  // ── 2. Real-time Driver GPS Marker Updates (Web & Native) ──
  useEffect(() => {
    // Web Leaflet update
    if (Platform.OS === 'web' && isMapReady && leafletMapRef.current && (window as any).L) {
      const L = (window as any).L;
      const lat = driverLocation.lat;
      const lng = driverLocation.lng;
      const speed = driverLocation.speedKmh || 0;

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
            background: #0284c7;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(2, 132, 199, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
          <div style="
            position: absolute;
            bottom: -16px;
            background: #0f172a;
            color: #38bdf8;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 999px;
            border: 1px solid #0284c7;
            white-space: nowrap;
            z-index: 3;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            ${speed > 0 ? `${speed} km/h` : 'Đang đỗ'}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'goong-driver-marker',
        html: driverHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(leafletMapRef.current);
      } else {
        driverMarkerRef.current.setLatLng([lat, lng]);
        driverMarkerRef.current.setIcon(icon);
      }
    }

    // Native WebView update
    if (Platform.OS !== 'web' && webViewRef.current) {
      const js = `if(window.driverMap&&window.driverMap.updateDriver){window.driverMap.updateDriver({lat:${driverLocation.lat},lng:${driverLocation.lng},speedKmh:${driverLocation.speedKmh || 0}});}true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [driverLocation.lat, driverLocation.lng, driverLocation.speedKmh, isMapReady, vehicleType, driverName]);

  // ── 3. Render Delivery Task Stop Markers & Route Calculation ──
  useEffect(() => {
    // Web Leaflet stops render
    if (Platform.OS === 'web' && isMapReady && leafletMapRef.current && (window as any).L) {
      const L = (window as any).L;
      stopsLayerRef.current.forEach((m) => m.remove());
      stopsLayerRef.current = [];

      preparedStops.forEach((stop) => {
        const markerColor = stop.isDelivered ? '#10b981' : stop.isCurrentActive ? '#0284c7' : '#f59e0b';
        const badgeBg = stop.isDelivered ? '#059669' : stop.isCurrentActive ? '#0284c7' : '#d97706';

        const stopIcon = L.divIcon({
          className: 'goong-stop-marker',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
              <div style="
                width: 26px;
                height: 26px;
                border-radius: 50%;
                background: ${markerColor};
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-weight: 700;
                font-size: 11px;
              ">
                ${stop.isDelivered ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : stop.seq}
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
                ${stop.orderCode}
              </div>
            </div>
          `,
          iconSize: [60, 44],
          iconAnchor: [30, 22],
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(leafletMapRef.current);
        stopsLayerRef.current.push(stopMarker);
      });
    }

    // Native WebView stops update
    if (Platform.OS !== 'web' && webViewRef.current) {
      const stopsJson = JSON.stringify(preparedStops);
      const js = `if(window.driverMap&&window.driverMap.updateStops){window.driverMap.updateStops(${stopsJson});}true;`;
      webViewRef.current.injectJavaScript(js);
    }

    // ── 4. Fetch Goong Direction Route from Driver to Active / Next Stop ──
    if (!tasks || tasks.length === 0) {
      setDistanceEtaText('Chưa có đơn hàng trong chuyến');
      return;
    }

    const targetTask = currentTask || tasks.find((t) => t.status !== 'DELIVERED') || tasks[0];
    if (targetTask) {
      const address = (targetTask as any).customerAddress || targetTask.deliveryAddress || '';
      const latVal = (targetTask as any).customerLat || targetTask.latitude;
      const lngVal = (targetTask as any).customerLng || targetTask.longitude;
      const destGeo = resolveCoordsAndCleanAddress(address, latVal, lngVal);

      const now = Date.now();
      const hasTaskChanged = lastRoutedTaskIdRef.current !== targetTask.id;
      const lastCoords = lastRoutedCoordsRef.current;

      let distanceMovedKm = 999;
      if (lastCoords) {
        const dLat = (driverLocation.lat - lastCoords.lat) * 111.32;
        const dLng = (driverLocation.lng - lastCoords.lng) * 111.32 * Math.cos((driverLocation.lat * Math.PI) / 180);
        distanceMovedKm = Math.sqrt(dLat * dLat + dLng * dLng);
      }

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
                setActiveRoutePoints(polyPoints);

                // Update Web
                if (Platform.OS === 'web' && leafletMapRef.current && (window as any).L) {
                  const L = (window as any).L;
                  if (activeRoutePolylineRef.current) activeRoutePolylineRef.current.remove();
                  activeRoutePolylineRef.current = L.polyline(polyPoints, {
                    color: '#0284c7',
                    weight: 5,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }).addTo(leafletMapRef.current);
                }

                // Update Native
                if (Platform.OS !== 'web' && webViewRef.current) {
                  const ptsJson = JSON.stringify(polyPoints);
                  const js = `if(window.driverMap&&window.driverMap.updateRoute){window.driverMap.updateRoute(${ptsJson});}true;`;
                  webViewRef.current.injectJavaScript(js);
                }
              }
            } else {
              const fallbackPoints: [number, number][] = [
                [driverLocation.lat, driverLocation.lng],
                [destGeo.lat, destGeo.lng],
              ];
              setActiveRoutePoints(fallbackPoints);
              setDistanceEtaText(`Đang dẫn đường đến ${targetTask.customerName}`);

              if (Platform.OS === 'web' && leafletMapRef.current && (window as any).L) {
                const L = (window as any).L;
                if (activeRoutePolylineRef.current) activeRoutePolylineRef.current.remove();
                activeRoutePolylineRef.current = L.polyline(fallbackPoints, {
                  color: '#0284c7',
                  weight: 4,
                  dashArray: '8, 8',
                }).addTo(leafletMapRef.current);
              }

              if (Platform.OS !== 'web' && webViewRef.current) {
                const ptsJson = JSON.stringify(fallbackPoints);
                const js = `if(window.driverMap&&window.driverMap.updateRoute){window.driverMap.updateRoute(${ptsJson});}true;`;
                webViewRef.current.injectJavaScript(js);
              }
            }
          })
          .catch((err) => {
            console.warn('Goong driver route fetch fallback:', err);
            const fallbackPoints: [number, number][] = [
              [driverLocation.lat, driverLocation.lng],
              [destGeo.lat, destGeo.lng],
            ];
            setActiveRoutePoints(fallbackPoints);

            if (Platform.OS !== 'web' && webViewRef.current) {
              const ptsJson = JSON.stringify(fallbackPoints);
              const js = `if(window.driverMap&&window.driverMap.updateRoute){window.driverMap.updateRoute(${ptsJson});}true;`;
              webViewRef.current.injectJavaScript(js);
            }
          })
          .finally(() => {
            setIsRoutingLoading(false);
          });
      }
    }
  }, [tasks, currentTask, driverLocation.lat, driverLocation.lng, isMapReady, vehicleType, preparedStops]);

  // ── HUD Actions ──
  const handleRecenter = () => {
    if (Platform.OS === 'web') {
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([driverLocation.lat, driverLocation.lng], 15, { animate: true });
      }
    } else {
      webViewRef.current?.injectJavaScript('if(window.driverMap&&window.driverMap.recenter){window.driverMap.recenter();}true;');
    }
  };

  const handleFitAll = () => {
    if (Platform.OS === 'web') {
      if (!leafletMapRef.current || !(window as any).L) return;
      const L = (window as any).L;
      const bounds = L.latLngBounds([[driverLocation.lat, driverLocation.lng]]);
      preparedStops.forEach((s) => bounds.extend([s.lat, s.lng]));
      bounds.extend(WAREHOUSE_HUB_COORDS);
      leafletMapRef.current.fitBounds(bounds, { padding: [30, 30], animate: true });
    } else {
      webViewRef.current?.injectJavaScript('if(window.driverMap&&window.driverMap.fitAll){window.driverMap.fitAll();}true;');
    }
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
              <Text style={{ color: '#166534', fontWeight: '700' }}>
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
              borderRadius: '0 0 10px 10px',
              backgroundColor: '#090d16',
            }}
          />
        ) : WebViewComponent ? (
          <WebViewComponent
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: initialMapHtml }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            geolocationEnabled={true}
            nestedScrollEnabled={true}
            scrollEnabled={false}
            style={styles.webView}
            onLoadEnd={() => {
              // Sync latest route points if available once map loads
              if (webViewRef.current && activeRoutePoints.length > 0) {
                const ptsJson = JSON.stringify(activeRoutePoints);
                webViewRef.current.injectJavaScript(`if(window.driverMap&&window.driverMap.updateRoute){window.driverMap.updateRoute(${ptsJson});}true;`);
              }
            }}
          />
        ) : (
          <View style={styles.nativeFallback}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
              Đang khởi tạo bản đồ...
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  gpsTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  liveTagText: {
    color: '#166534',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gpsCoords: {
    color: '#94a3b8',
    fontSize: 10.5,
    fontWeight: '500',
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
    borderRadius: 6,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapWrap: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#090d16',
  },
  webView: {
    flex: 1,
    backgroundColor: '#090d16',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
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
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 999,
  },
  routeBannerText: {
    color: '#f8fafc',
    fontSize: 11.5,
    fontWeight: '600',
  },
});
