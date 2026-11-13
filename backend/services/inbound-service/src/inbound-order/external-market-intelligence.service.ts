import { Injectable, Logger } from '@nestjs/common';

export interface MarketEvent {
  id: string;
  name: string;
  code: string;
  seasonType: 'FESTIVAL' | 'WEATHER' | 'COMMERCIAL';
  approximateSolarPeriod: string; // VD: Tháng 1 - Tháng 2
  lunarDateNote?: string;
  peakDaysNotice: number;         // Số ngày trước sự kiện cần bắt đầu gom hàng (VD 21 ngày)
  macroReasoning: string;
  categoryMultipliers: Record<string, number>;
  keywordMultipliers: Array<{
    keyword: string;
    multiplier: number;
    reason: string;
  }>;
}

export interface SeasonalTimelineItem {
  eventId: string;
  eventName: string;
  period: string;
  seasonType: string;
  multiplier: number;
  projectedDailyDemand: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  reason: string;
  isPeak: boolean;
}

export interface ExternalMarketInsightResponse {
  currentActiveEvent: MarketEvent;
  availableEvents: Array<{ id: string; name: string; code: string; seasonType: string; approximateSolarPeriod: string }>;
  eventNoticeDays: number;
  macroReasoning: string;
  topImpactedCategories: Array<{ category: string; multiplier: number; growthPercent: number }>;
  priorityStockpileProducts: Array<{
    keyword: string;
    sampleSku?: string;
    sampleName?: string;
    multiplier: number;
    reason: string;
  }>;
}

@Injectable()
export class ExternalMarketIntelligenceService {
  private readonly logger = new Logger(ExternalMarketIntelligenceService.name);

  // Danh mục sự kiện văn hóa, mùa vụ và Lễ Tết tiêu biểu của thị trường bán lẻ Việt Nam
  private readonly MARKET_EVENTS: MarketEvent[] = [
    {
      id: 'EVT_TET_NGUYEN_DAN',
      code: 'TET_LUNAR_NEW_YEAR',
      name: 'Tết Nguyên Đán (Tết Cổ Truyền Việt Nam)',
      seasonType: 'FESTIVAL',
      approximateSolarPeriod: 'Tháng 1 - Tháng 2 Dương Lịch',
      lunarDateNote: '23 Tháng Chạp đến Mùng 7 Tháng Giêng Âm Lịch',
      peakDaysNotice: 28,
      macroReasoning: 'Mùa mua sắm lớn nhất năm tại Việt Nam. Nhu cầu nguyên liệu làm bánh truyền thống (bánh chưng, bánh tét), mâm ngũ quả, thịt tươi dự trữ và đồ uống đãi tiệc tăng vọt gấp 2.5 - 4 lần so với ngày thường.',
      categoryMultipliers: {
        'Lương thực': 3.2,
        'Gia vị & Đồ khô': 2.5,
        'Thịt & Hải sản': 2.4,
        'Thịt tươi': 2.4,
        'Trái cây': 2.8,
        'Rau củ, trái cây': 2.2,
        'Đồ uống': 2.0,
        'Bánh kẹo & Đồ ăn vặt': 2.6,
        'DEFAULT': 1.6,
      },
      keywordMultipliers: [
        {
          keyword: 'gạo nếp',
          multiplier: 3.8,
          reason: 'Nguyên liệu cốt lõi gói bánh chưng, bánh tét, đồ xôi cúng tất niên và cúng giao thừa.',
        },
        {
          keyword: 'nếp',
          multiplier: 3.5,
          reason: 'Nhu cầu làm bánh tét, bánh chưng và chè Tết tăng đột biến trên toàn quốc.',
        },
        {
          keyword: 'đậu xanh',
          multiplier: 2.8,
          reason: 'Nhân bánh chưng, bánh tét và các loại chè cúng gia tiên đầu năm.',
        },
        {
          keyword: 'dưa hấu',
          multiplier: 2.7,
          reason: 'Mặt hàng chưng mâm ngũ quả ngày Tết (cầu may mắn, ruột đỏ tài lộc) và thanh nhiệt ngày xuân.',
        },
        {
          keyword: 'bưởi',
          multiplier: 2.5,
          reason: 'Mặt hàng không thể thiếu trên bàn thờ mâm ngũ quả Tết.',
        },
        {
          keyword: 'thịt ba chỉ',
          multiplier: 2.6,
          reason: 'Nguyên liệu làm nhân bánh chưng, món thịt kho tàu (thịt kho hột vịt) truyền thống ngày Tết.',
        },
        {
          keyword: 'thịt heo',
          multiplier: 2.3,
          reason: 'Món ăn gia đình chính trong 3 ngày Tết cổ truyền.',
        },
        {
          keyword: 'bia',
          multiplier: 2.2,
          reason: 'Nhu cầu quà biếu tặng và tiệc tất niên, đón khách đầu năm.',
        },
        {
          keyword: 'nước ngọt',
          multiplier: 2.0,
          reason: 'Đồ uống đãi tiệc và giải khát cho gia đình trong kỳ nghỉ Tết.',
        },
        {
          keyword: 'hạt dưa',
          multiplier: 3.0,
          reason: 'Món ăn vặt tiếp khách ngày Tết truyền thống.',
        },
      ],
    },
    {
      id: 'EVT_SUMMER_HEAT',
      code: 'SUMMER_HEATWAVE',
      name: 'Mùa Nắng Nóng & Giải Nhiệt Mùa Hè (Nam Bộ & TP.HCM)',
      seasonType: 'WEATHER',
      approximateSolarPeriod: 'Tháng 4 - Tháng 6 Dương Lịch',
      peakDaysNotice: 14,
      macroReasoning: 'Nhiệt độ ngoài trời tại TP.HCM duy trì ở mức cao (35°C - 38°C). Sức mua các mặt hàng giải khát, nước đóng chai, đá tinh khiết, kem và các loại trái cây mọng nước thanh nhiệt tăng mạnh từ 60% đến 150%.',
      categoryMultipliers: {
        'Đồ uống': 2.3,
        'Trái cây': 2.0,
        'Rau củ, trái cây': 1.6,
        'Kem & Tráng miệng': 2.5,
        'DEFAULT': 1.1,
      },
      keywordMultipliers: [
        {
          keyword: 'nước khoáng',
          multiplier: 2.4,
          reason: 'Nhu cầu bù khoáng và giải khát thường nhật tăng vọt khi thời tiết oi bức.',
        },
        {
          keyword: 'dưa hấu',
          multiplier: 2.1,
          reason: 'Trái cây giải nhiệt mùa nóng được tiêu thụ mạnh tại các hộ gia đình.',
        },
        {
          keyword: 'dừa',
          multiplier: 2.2,
          reason: 'Nước dừa tươi thanh nhiệt tự nhiên rất được ưa chuộng vào mùa hè.',
        },
        {
          keyword: 'kem',
          multiplier: 2.5,
          reason: 'Món tráng miệng hạ nhiệt cho trẻ em và giới trẻ.',
        },
        {
          keyword: 'bia',
          multiplier: 1.8,
          reason: 'Sức tiêu thụ bia mát lạnh tăng cao vào các buổi chiều tối mùa nóng.',
        },
      ],
    },
    {
      id: 'EVT_MID_AUTUMN',
      code: 'MID_AUTUMN_FESTIVAL',
      name: 'Tết Trung Thu (Rằm Tháng Tám Âm Lịch)',
      seasonType: 'FESTIVAL',
      approximateSolarPeriod: 'Tháng 8 - Tháng 9 Dương Lịch',
      lunarDateNote: 'Rằm tháng 8 Âm Lịch',
      peakDaysNotice: 21,
      macroReasoning: 'Thời điểm sản xuất và tiêu thụ bánh trung thu truyền thống. Nhu cầu bột mì, đậu xanh hạt, trứng vịt muối, lạp xưởng và trà khô tăng vọt gấp đôi so với ngày thường.',
      categoryMultipliers: {
        'Gia vị & Đồ khô': 2.2,
        'Lương thực': 1.8,
        'Trứng & Đậu hũ': 2.0,
        'Bánh kẹo & Đồ ăn vặt': 2.4,
        'DEFAULT': 1.15,
      },
      keywordMultipliers: [
        {
          keyword: 'đậu xanh',
          multiplier: 2.6,
          reason: 'Nguyên liệu làm nhân bánh nướng, bánh dẻo trung thu.',
        },
        {
          keyword: 'trứng muối',
          multiplier: 2.5,
          reason: 'Thành phần nhân bánh trung thu thập cẩm và đậu xanh trứng muối.',
        },
        {
          keyword: 'bột mì',
          multiplier: 2.0,
          reason: 'Vỏ bánh nướng và bánh dẻo.',
        },
        {
          keyword: 'lạp xưởng',
          multiplier: 2.2,
          reason: 'Thành phần bánh trung thu nhân thập cẩm truyền thống.',
        },
        {
          keyword: 'trà',
          multiplier: 1.9,
          reason: 'Thưởng trà ngắm trăng rằm cùng bánh trung thu.',
        },
      ],
    },
    {
      id: 'EVT_YEAR_END_PARTY',
      code: 'YEAR_END_FESTIVITIES',
      name: 'Lễ Hội Tiệc Tùng Cuối Năm & Giáng Sinh (Dương Lịch)',
      seasonType: 'COMMERCIAL',
      approximateSolarPeriod: 'Tháng 12 Dương Lịch',
      peakDaysNotice: 14,
      macroReasoning: 'Mùa liên hoan, tiệc tất niên công ty và họp mặt bạn bè cuối năm dương lịch. Nhu cầu thịt bò nướng, hải sản, đồ hộp khai vị, đồ nhắm và đồ uống tăng trưởng ấn tượng.',
      categoryMultipliers: {
        'Đồ uống': 2.2,
        'Thịt & Hải sản': 1.9,
        'Thịt tươi': 1.8,
        'Bánh kẹo & Đồ ăn vặt': 1.7,
        'DEFAULT': 1.2,
      },
      keywordMultipliers: [
        {
          keyword: 'thịt bò',
          multiplier: 2.1,
          reason: 'Món ăn tiệc nướng BBQ và lẩu liên hoan cuối năm.',
        },
        {
          keyword: 'bia',
          multiplier: 2.3,
          reason: 'Tiệc tất niên, họp mặt gia đình và bạn bè đón năm mới.',
        },
        {
          keyword: 'xúc xích',
          multiplier: 1.8,
          reason: 'Đồ ăn nhanh và tiệc nướng tiện lợi.',
        },
        {
          keyword: 'hải sản',
          multiplier: 1.9,
          reason: 'Món chính trong các bữa tiệc họp mặt gia đình cuối năm.',
        },
      ],
    },
    {
      id: 'EVT_REGULAR',
      code: 'REGULAR_BASELINE',
      name: 'Chu Kỳ Thường Nhật (Cơ Bản - Hệ số 1.0x)',
      seasonType: 'COMMERCIAL',
      approximateSolarPeriod: 'Quanh Năm (Ngày Thường)',
      peakDaysNotice: 7,
      macroReasoning: 'Mô hình dự báo vận hành theo nhu cầu tiêu dùng hữu cơ chuẩn (Standard Baseline). Không áp dụng hệ số kích cầu lễ hội, ưu tiên tối ưu hóa vòng quay hàng tồn kho và giữ tồn kho an toàn tinh gọn.',
      categoryMultipliers: {
        'DEFAULT': 1.0,
      },
      keywordMultipliers: [],
    },
  ];

  /**
   * Lấy sự kiện ngoại cảnh đang chọn hoặc sự kiện phù hợp nhất
   */
  getActiveEvent(eventId?: string): MarketEvent {
    if (eventId === 'ALL_SEASONS') {
      return {
        id: 'ALL_SEASONS',
        code: 'ALL_SEASONS_CYCLE',
        name: 'Toàn Bộ Chu Kỳ Mùa Vụ Cả Năm (So Sánh 5 Đợt)',
        seasonType: 'COMMERCIAL',
        approximateSolarPeriod: 'Chu kỳ 12 tháng (4 Mùa & Lễ Tết)',
        peakDaysNotice: 28,
        macroReasoning: 'Bức tranh toàn cảnh nhu cầu tiêu thụ chuỗi cung ứng qua 5 giai đoạn cốt lõi: Ngày Thường, Tết Nguyên Đán, Mùa Nắng Nóng, Tết Trung Thu và Lễ Hội Tiệc Tùng Cuối Năm. Phục vụ lập kế hoạch nhập hàng chiến lược và ký hợp đồng dài hạn.',
        categoryMultipliers: {
          'Lương thực': 3.2,
          'Đồ uống': 2.3,
          'Gia vị & Đồ khô': 2.5,
          'Thịt & Hải sản': 2.4,
          'Trái cây': 2.8,
          'Rau củ, trái cây': 2.2,
          'Bánh kẹo & Đồ ăn vặt': 2.6,
          'DEFAULT': 1.6,
        },
        keywordMultipliers: [
          { keyword: 'gạo nếp', multiplier: 3.8, reason: 'Đạt đỉnh vào dịp Tết Nguyên Đán (gói bánh chưng, bánh tét)' },
          { keyword: 'dưa hấu', multiplier: 2.7, reason: 'Đạt đỉnh vào Tết Nguyên Đán (x2.7) và Mùa Hè Nắng Nóng (x2.1)' },
          { keyword: 'đậu xanh', multiplier: 2.8, reason: 'Tăng vọt dịp Tết & Trung Thu' },
          { keyword: 'bia', multiplier: 2.3, reason: 'Cao điểm dịp Tết và Tiệc Cuối Năm' },
          { keyword: 'nước khoáng', multiplier: 2.4, reason: 'Cao điểm Mùa Hè Nắng Nóng' },
          { keyword: 'thịt bò', multiplier: 2.1, reason: 'Cao điểm Tiệc Cuối Năm & Mùa Lạnh' },
        ],
      };
    }

    if (eventId && eventId !== 'EVT_AUTO') {
      const found = this.MARKET_EVENTS.find(e => e.id === eventId || e.code === eventId);
      if (found) return found;
    }

    // Tự động nhận diện mùa vụ theo tháng thực tế (Calendar Auto-Detect)
    return this.autoDetectCurrentEvent();
  }

  /**
   * Tự động nhận diện sự kiện ngoại cảnh theo tháng hiện tại
   */
  autoDetectCurrentEvent(): MarketEvent {
    const month = new Date().getMonth() + 1; // 1-12
    if (month === 12 || month === 1 || month === 2) {
      return this.MARKET_EVENTS.find(e => e.id === 'EVT_TET_NGUYEN_DAN')!;
    } else if (month >= 4 && month <= 6) {
      return this.MARKET_EVENTS.find(e => e.id === 'EVT_SUMMER_HEAT')!;
    } else if (month >= 8 && month <= 9) {
      return this.MARKET_EVENTS.find(e => e.id === 'EVT_MID_AUTUMN')!;
    } else if (month >= 10 && month <= 11) {
      return this.MARKET_EVENTS.find(e => e.id === 'EVT_YEAR_END_PARTY')!;
    }
    return this.MARKET_EVENTS.find(e => e.id === 'EVT_REGULAR') || this.MARKET_EVENTS[0];
  }

  /**
   * Lấy toàn bộ danh sách sự kiện hỗ trợ (kèm option Toàn Bộ Cả Năm và Tự Động)
   */
  getAllEvents(): MarketEvent[] {
    return this.MARKET_EVENTS;
  }

  /**
   * Tính toán ma trận 5 đợt chu kỳ cả năm cho 1 SKU cụ thể
   */
  computeAnnualTimeline(
    sku: string,
    productName: string,
    category: string,
    baseDailyDemand: number,
    leadTimeDays: number,
    stdDev: number,
    currentStock: number,
  ): SeasonalTimelineItem[] {
    const coreEvents = [
      { id: 'EVT_REGULAR', name: 'Ngày Thường', period: 'Quanh năm' },
      { id: 'EVT_TET_NGUYEN_DAN', name: 'Tết Nguyên Đán', period: 'Tháng 1 - 2' },
      { id: 'EVT_SUMMER_HEAT', name: 'Mùa Nắng Nóng', period: 'Tháng 4 - 6' },
      { id: 'EVT_MID_AUTUMN', name: 'Tết Trung Thu', period: 'Tháng 8 - 9' },
      { id: 'EVT_YEAR_END_PARTY', name: 'Tiệc Cuối Năm', period: 'Tháng 11 - 12' },
    ];

    let maxMult = 0;
    const items = coreEvents.map(evt => {
      const surge = this.computeSkuMultiplier(sku, productName, category, evt.id);
      if (surge.multiplier > maxMult) maxMult = surge.multiplier;
      const projectedDailyDemand = Math.max(1, Math.round(baseDailyDemand * surge.multiplier));
      const safetyStock = Math.round(1.65 * stdDev * Math.sqrt(leadTimeDays) * Math.sqrt(surge.multiplier));
      const reorderPoint = Math.round(projectedDailyDemand * leadTimeDays + safetyStock);
      let suggestedReplenishment = 0;
      if (currentStock <= safetyStock) {
        suggestedReplenishment = Math.max(30, Math.round(reorderPoint * 2.0 - currentStock));
      } else if (currentStock <= reorderPoint) {
        suggestedReplenishment = Math.max(20, Math.round(reorderPoint * 1.5 - currentStock));
      }

      return {
        eventId: evt.id,
        eventName: evt.name,
        period: evt.period,
        seasonType: this.MARKET_EVENTS.find(e => e.id === evt.id)?.seasonType || 'COMMERCIAL',
        multiplier: surge.multiplier,
        projectedDailyDemand,
        safetyStock,
        reorderPoint,
        suggestedOrderQty: suggestedReplenishment,
        reason: surge.reason,
        isPeak: false,
      };
    });

    items.forEach(it => {
      if (it.multiplier === maxMult && maxMult > 1.05) {
        it.isPeak = true;
      }
    });

    return items;
  }

  /**
   * Tính toán hệ số nhân đột biến (Surge Multiplier) cho 1 SKU cụ thể
   */
  computeSkuMultiplier(
    sku: string,
    productName: string,
    category: string,
    activeEventId?: string,
  ): { multiplier: number; eventName: string; reason: string; isSurgeActive: boolean } {
    const event = this.getActiveEvent(activeEventId);
    const pName = (productName || '').toLowerCase();
    const pCat = category || 'DEFAULT';

    // 1. Ưu tiên kiểm tra từ khóa chuyên biệt của sản phẩm (Specific Keyword Match)
    for (const item of event.keywordMultipliers) {
      if (pName.includes(item.keyword.toLowerCase())) {
        return {
          multiplier: item.multiplier,
          eventName: event.name,
          reason: item.reason,
          isSurgeActive: item.multiplier > 1.05,
        };
      }
    }

    // 2. Nếu không khớp từ khóa cụ thể, dùng hệ số danh mục
    let catMultiplier = 1.0;
    for (const [catKey, mult] of Object.entries(event.categoryMultipliers)) {
      if (catKey !== 'DEFAULT' && pCat.toLowerCase().includes(catKey.toLowerCase())) {
        catMultiplier = mult;
        break;
      }
    }

    if (catMultiplier === 1.0 && event.categoryMultipliers['DEFAULT']) {
      catMultiplier = event.categoryMultipliers['DEFAULT'];
    }

    const reason = catMultiplier > 1.05
      ? `Danh mục "${pCat}" có xu hướng tăng tiêu thụ trong dịp ${event.name}.`
      : `Mặt hàng tiêu dùng ổn định trong kỳ ${event.name}.`;

    return {
      multiplier: catMultiplier,
      eventName: event.name,
      reason,
      isSurgeActive: catMultiplier > 1.05,
    };
  }

  /**
   * Tạo báo cáo phân tích ngoại cảnh tổng hợp
   */
  generateMarketInsights(activeEventId?: string): ExternalMarketInsightResponse {
    const activeEvent = this.getActiveEvent(activeEventId);

    const currentMonth = new Date().getMonth() + 1;
    const availableEvents = [
      {
        id: 'EVT_AUTO',
        name: `Tự Động Theo Lịch Thực Tế (Hôm nay: Tháng ${currentMonth})`,
        code: 'CALENDAR_AUTO',
        seasonType: 'WEATHER',
        approximateSolarPeriod: `Tháng ${currentMonth} Hiện Tại`,
      },
      {
        id: 'ALL_SEASONS',
        name: 'Toàn Bộ Chu Kỳ Cả Năm (So Sánh 5 Đợt)',
        code: 'ALL_SEASONS',
        seasonType: 'COMMERCIAL',
        approximateSolarPeriod: 'Chu kỳ 12 tháng',
      },
      ...this.MARKET_EVENTS.map(e => ({
        id: e.id,
        name: e.name,
        code: e.code,
        seasonType: e.seasonType,
        approximateSolarPeriod: e.approximateSolarPeriod,
      })),
    ];

    const topImpactedCategories = Object.entries(activeEvent.categoryMultipliers)
      .filter(([k]) => k !== 'DEFAULT')
      .map(([category, multiplier]) => ({
        category,
        multiplier,
        growthPercent: Math.round((multiplier - 1) * 100),
      }))
      .sort((a, b) => b.multiplier - a.multiplier);

    const priorityStockpileProducts = activeEvent.keywordMultipliers.map(item => ({
      keyword: item.keyword,
      multiplier: item.multiplier,
      reason: item.reason,
    }));

    return {
      currentActiveEvent: activeEvent,
      availableEvents,
      eventNoticeDays: activeEvent.peakDaysNotice,
      macroReasoning: activeEvent.macroReasoning,
      topImpactedCategories,
      priorityStockpileProducts,
    };
  }
}

