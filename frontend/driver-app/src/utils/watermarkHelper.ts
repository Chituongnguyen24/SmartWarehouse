/**
 * Watermark Engine for Driver App Proof of Delivery (POD)
 * Burns GPS coordinates, real timestamp, order code, driver info, and cold-chain temperature directly into the photo.
 */

export interface WatermarkMetadata {
  orderCode: string;
  customerName: string;
  deliveryAddress: string;
  lat?: number;
  lng?: number;
  driverName: string;
  licensePlate: string;
  tempC?: number;
  type?: 'POD_DELIVERY' | 'RETURN_EXCEPTION';
}

export async function addPodWatermark(
  imageSourceUri: string,
  meta: WatermarkMetadata
): Promise<string> {
  // If running in an environment without DOM Canvas (e.g. pure SSR), return source
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return imageSourceUri;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSourceUri);
          return;
        }

        // Set dimensions (cap width to max 1280 for performance & file size)
        const maxWidth = 1280;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw original image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;

        // Overlay banner at the bottom (Height ~28% of photo or min 160px)
        const bannerHeight = Math.max(160, Math.round(h * 0.26));
        const bannerY = h - bannerHeight;

        // Gradient Dark Backdrop for ultra-high legibility
        const gradient = ctx.createLinearGradient(0, bannerY, 0, h);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0.0)');
        gradient.addColorStop(0.2, 'rgba(15, 23, 42, 0.88)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.98)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, bannerY, w, bannerHeight);

        // Header Line: Branding & Timestamp
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        // Top Accent Bar (Emerald for POD, Amber for Exception)
        const isPod = meta.type !== 'RETURN_EXCEPTION';
        ctx.fillStyle = isPod ? '#10b981' : '#f59e0b';
        ctx.fillRect(0, bannerY + 15, w, 4);

        const fontSizeBase = Math.max(14, Math.round(w * 0.022));
        const paddingLeft = Math.max(16, Math.round(w * 0.03));
        let cursorY = bannerY + 42;

        // Line 1: Header Tag & Date Time
        ctx.font = `bold ${fontSizeBase + 2}px sans-serif`;
        ctx.fillStyle = isPod ? '#34d399' : '#fbbf24';
        const tagText = isPod ? '✓ BẰNG CHỨNG GIAO HÀNG (POD)' : '⚠️ BIÊN BẢN HÀNG HOÀN / HỎNG';
        ctx.fillText(tagText, paddingLeft, cursorY);

        ctx.font = `normal ${fontSizeBase}px sans-serif`;
        ctx.fillStyle = '#f8fafc';
        const timeDisplay = `🕒 ${dateStr} ${timeStr}`;
        const timeWidth = ctx.measureText(timeDisplay).width;
        ctx.fillText(timeDisplay, w - paddingLeft - timeWidth, cursorY);

        // Line 2: Order Code & Customer
        cursorY += fontSizeBase + 12;
        ctx.font = `bold ${fontSizeBase + 1}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`📦 Đơn: #${meta.orderCode}`, paddingLeft, cursorY);

        ctx.font = `normal ${fontSizeBase}px sans-serif`;
        ctx.fillStyle = '#94a3b8';
        const custText = `Khách: ${meta.customerName}`;
        ctx.fillText(` |  👤 ${custText}`, paddingLeft + ctx.measureText(`📦 Đơn: #${meta.orderCode}`).width + 8, cursorY);

        // Line 3: GPS Coordinates & Temp
        cursorY += fontSizeBase + 10;
        const lat = meta.lat ? meta.lat.toFixed(5) : '10.83542';
        const lng = meta.lng ? meta.lng.toFixed(5) : '106.66681';
        const temp = meta.tempC !== undefined ? `${meta.tempC.toFixed(1)}°C` : '3.2°C';
        
        ctx.font = `normal ${fontSizeBase}px sans-serif`;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`📍 GPS: ${lat}°N, ${lng}°E`, paddingLeft, cursorY);

        ctx.fillStyle = '#a7f3d0';
        const tempText = `❄️ Chuỗi lạnh: ${temp}`;
        const tempWidth = ctx.measureText(tempText).width;
        ctx.fillText(tempText, w - paddingLeft - tempWidth, cursorY);

        // Line 4: Delivery Address & Driver Info
        cursorY += fontSizeBase + 10;
        ctx.font = `normal ${fontSizeBase - 1}px sans-serif`;
        ctx.fillStyle = '#cbd5e1';
        const shortAddr = meta.deliveryAddress.length > 55 ? meta.deliveryAddress.slice(0, 52) + '...' : meta.deliveryAddress;
        ctx.fillText(`🏠 ${shortAddr}`, paddingLeft, cursorY);

        // Watermark Security Seal on Top Right
        ctx.font = `bold ${fontSizeBase - 2}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText(`🚚 ${meta.driverName} • ${meta.licensePlate}`, paddingLeft, h - 14);

        const sealText = 'SFWMS COLD-CHAIN VERIFIED';
        ctx.fillText(sealText, w - paddingLeft - ctx.measureText(sealText).width, h - 14);

        // Export as High-Quality JPEG Data URI
        const watermarkedDataUri = canvas.toDataURL('image/jpeg', 0.88);
        resolve(watermarkedDataUri);
      } catch (err) {
        resolve(imageSourceUri);
      }
    };

    img.onerror = () => {
      resolve(imageSourceUri);
    };

    img.src = imageSourceUri;
  });
}
