/**
 * Utility helper to resolve exact Vietnamese product units (Gói, Hộp, Chai, Lon, Khay, Cái...)
 * and calculate actual shipping carton / box counts from the warehouse packing stage.
 */

export function resolveProductUnit(productName: string = '', rawUnit?: string): string {
  const cleanRaw = (rawUnit || '').trim().toLowerCase();
  
  // If rawUnit is already a specific valid unit and not generic 'kiện' / 'item' / 'unit'
  const genericUnits = ['kiện', 'kien', 'item', 'items', 'unit', 'units', 'pcs', 'piece', 'sp', 'san pham'];
  if (cleanRaw && !genericUnits.includes(cleanRaw)) {
    return rawUnit!.charAt(0).toUpperCase() + rawUnit!.slice(1);
  }

  const name = (productName || '').toLowerCase();

  // Smart regex & keyword extraction from product name:
  if (name.includes('gói') || name.includes('goi')) return 'Gói';
  if (name.includes('hộp') || name.includes('hop')) return 'Hộp';
  if (name.includes('chai')) return 'Chai';
  if (name.includes('lon')) return 'Lon';
  if (name.includes('khay')) return 'Khay';
  if (name.includes('túi') || name.includes('tui')) return 'Túi';
  if (name.includes('lốc') || name.includes('loc')) return 'Lốc';
  if (name.includes('thùng') || name.includes('thung')) return 'Thùng';
  if (name.includes('hũ') || name.includes('hu') || name.includes('lọ') || name.includes('lo')) return 'Hũ';
  if (name.includes('vỉ') || name.includes('vi')) return 'Vỉ';
  if (name.includes('bịch') || name.includes('bich')) return 'Bịch';
  if (name.includes('can') || name.includes('bình') || name.includes('binh')) return 'Can';
  if (name.includes('bó') || name.includes('bo')) return 'Bó';
  if (name.includes('cuộn') || name.includes('cuon')) return 'Cuộn';
  if (name.includes('bánh') || name.includes('banh')) return 'Bánh';
  if (name.includes('thanh')) return 'Thanh';
  if (name.includes('kg') || name.includes('kí') || name.includes('kilogram')) return 'Kg';
  if (name.includes('cái') || name.includes('cai') || name.includes('chiếc')) return 'Cái';

  // Fallback defaults
  if (cleanRaw && cleanRaw !== 'kiện') return rawUnit!.charAt(0).toUpperCase() + rawUnit!.slice(1);
  return 'Gói/Món';
}

export function calculatePackingBoxes(totalQuantity: number, existingCount?: number): number {
  if (existingCount && existingCount > 0) return existingCount;
  if (totalQuantity >= 800) return Math.ceil(totalQuantity / 120);
  if (totalQuantity >= 200) return Math.ceil(totalQuantity / 60);
  if (totalQuantity >= 50) return Math.ceil(totalQuantity / 25);
  if (totalQuantity >= 15) return 2;
  return 1;
}
