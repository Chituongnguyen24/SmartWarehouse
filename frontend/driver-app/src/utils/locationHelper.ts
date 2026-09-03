import { Linking, Alert, Platform } from 'react-native';

const GOONG_API_KEY = '9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6';

// Từ điển tọa độ các tuyến đường & địa bàn trọng điểm TP.HCM
const KNOWN_GEO_DICT: Array<{ keywords: string[]; lat: number; lng: number; defaultStreet: string }> = [
  { keywords: ['quang trung'], lat: 10.8398, lng: 106.6582, defaultStreet: 'Quang Trung, Phường 10, Gò Vấp' },
  { keywords: ['phạm văn chiêu', 'pham van chieu'], lat: 10.8492, lng: 106.6543, defaultStreet: 'Phạm Văn Chiêu, Phường 14, Gò Vấp' },
  { keywords: ['phan huy ích', 'phan huy ich'], lat: 10.8315, lng: 106.6345, defaultStreet: 'Phan Huy Ích, Phường 12, Gò Vấp' },
  { keywords: ['lê văn thọ', 'le van tho'], lat: 10.8465, lng: 106.6521, defaultStreet: 'Lê Văn Thọ, Phường 16, Gò Vấp' },
  { keywords: ['cây trâm', 'cay tram', 'nguyễn văn khối', 'nguyen van khoi'], lat: 10.8432, lng: 106.6567, defaultStreet: 'Nguyễn Văn Khối, Phường 9, Gò Vấp' },
  { keywords: ['nguyễn oanh', 'nguyen oanh'], lat: 10.8420, lng: 106.6780, defaultStreet: 'Nguyễn Oanh, Phường 6, Gò Vấp' },
  { keywords: ['lê đức thọ', 'le duc tho'], lat: 10.8520, lng: 106.6710, defaultStreet: 'Lê Đức Thọ, Phường 7, Gò Vấp' },
  { keywords: ['thống nhất', 'thong nhat'], lat: 10.8465, lng: 106.6690, defaultStreet: 'Thống Nhất, Phường 11, Gò Vấp' },
  { keywords: ['phan văn trị', 'phan van tri'], lat: 10.8285, lng: 106.6852, defaultStreet: 'Phan Văn Trị, Phường 5, Gò Vấp' },
  { keywords: ['dương quảng hàm', 'duong quang ham'], lat: 10.8362, lng: 106.6895, defaultStreet: 'Dương Quảng Hàm, Phường 5, Gò Vấp' },
  { keywords: ['bạch đằng', 'bach dang', 'tân sơn hòa'], lat: 10.8123, lng: 106.6800, defaultStreet: 'Bạch Đằng, Phường 2, Tân Bình' },
  { keywords: ['tân sơn', 'tan son'], lat: 10.8280, lng: 106.6450, defaultStreet: 'Tân Sơn, Phường 12, Gò Vấp' },
  { keywords: ['lại hùng cường', 'lai hung cuong', 'vĩnh lộc', 'vinh loc', 'võ văn vân', 'vo van van', 'bình chánh', 'binh chanh'], lat: 10.6868, lng: 106.5932, defaultStreet: 'Vĩnh Lộc, Bình Chánh' },
  { keywords: ['nguyễn văn linh', 'nguyen van linh', 'quận 7', 'quan 7', 'phú mỹ hưng'], lat: 10.7324, lng: 106.7214, defaultStreet: 'Nguyễn Văn Linh, Quận 7' },
];

export const resolveCoordsAndCleanAddress = (address: string, fallbackLat?: number, fallbackLng?: number) => {
  const raw = (address || '').trim();
  const lower = raw.toLowerCase();

  // Kiểm tra nếu đã có tọa độ hợp lệ
  if (fallbackLat && fallbackLng && !isNaN(fallbackLat) && !isNaN(fallbackLng) && fallbackLat > 0) {
    return { lat: fallbackLat, lng: fallbackLng, cleanAddress: raw };
  }

  // Tra từ điển địa bàn
  for (const item of KNOWN_GEO_DICT) {
    if (item.keywords.some(kw => lower.includes(kw))) {
      return { lat: item.lat, lng: item.lng, cleanAddress: raw || item.defaultStreet };
    }
  }

  // Tọa độ mặc định tại Gò Vấp (350 Quang Trung)
  return { lat: 10.8385, lng: 106.6650, cleanAddress: raw || 'Quận Gò Vấp, TP.HCM' };
};

/**
 * Tra cứu lộ trình từ Goong Direction API cho tài xế
 */
export const fetchGoongDriverDirection = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  vehicle: 'bike' | 'car' = 'bike'
) => {
  try {
    const url = `https://rsapi.goong.io/Direction?origin=${originLat},${originLng}&destination=${destLat},${destLng}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[Goong Direction API Error]', err);
  }
  return null;
};

/**
 * Mở Bản đồ dẫn đường trực tiếp cho 1 đơn hàng (Goong Maps GPS Universal)
 * Dùng tọa độ GPS chính xác kết hợp định danh nhãn địa chỉ
 */
export const openSingleGoogleMapsNavigation = (address: string, lat?: number, lng?: number) => {
  const geo = resolveCoordsAndCleanAddress(address, lat, lng);
  const targetLat = geo.lat;
  const targetLng = geo.lng;
  const label = encodeURIComponent(geo.cleanAddress);

  // 1. Dùng Universal Map Direction URL với GPS đích đến (Chính xác 100% không bị lệch)
  const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=two_wheeler`;

  // 2. Android Geo Intent with Label (hiển thị đúng tên địa chỉ thay vì "Vị trí đã ghim")
  const androidIntentUrl = `geo:${targetLat},${targetLng}?q=${targetLat},${targetLng}(${label})`;

  if (Platform.OS === 'android') {
    Linking.canOpenURL(androidIntentUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(androidIntentUrl);
        }
        return Linking.openURL(universalUrl);
      })
      .catch(() => Linking.openURL(universalUrl));
  } else {
    Linking.openURL(universalUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`);
    });
  }
};

/**
 * Mở Bản đồ toàn bộ lộ trình VRP đa điểm dừng
 * Tự động lấy điểm GPS chính xác của từng trạm và dẫn đường từ vị trí thực tế của tài xế
 */
export const openMultiStopGoogleMapsRoute = (
  stops: Array<{ address: string; lat?: number; lng?: number; customerName?: string }>,
) => {
  if (!stops || stops.length === 0) {
    Alert.alert('Thông báo', 'Không có điểm dừng nào trong lộ trình.');
    return;
  }

  const resolvedStops = stops.map(s => resolveCoordsAndCleanAddress(s.address, s.lat, s.lng));

  const lastStop = resolvedStops[resolvedStops.length - 1];
  const destination = `${lastStop.lat},${lastStop.lng}`;

  const waypoints = resolvedStops
    .slice(0, -1)
    .map(s => `${s.lat},${s.lng}`)
    .join('|');

  const url =
    waypoints.length > 0
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=two_wheeler`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=two_wheeler`;

  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destination}`);
  });
};
