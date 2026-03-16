export type PricingOptionSeed = {
  category: string;
  optionKey: string;
  label: string;
  description: string;
  config: Record<string, unknown>;
  sortOrder: number;
};

export const comboTypeSeedData: PricingOptionSeed[] = [
  {
    category: "combo_type",
    optionKey: "3n2d",
    label: "3N2Đ",
    description: "Combo 3 ngày 2 đêm — gói phổ biến nhất cho khách du lịch cuối tuần dài",
    config: { days: 3, nights: 2 },
    sortOrder: 1,
  },
  {
    category: "combo_type",
    optionKey: "2n1d",
    label: "2N1Đ",
    description: "Combo 2 ngày 1 đêm — gói ngắn ngày cho khách đi nhanh",
    config: { days: 2, nights: 1 },
    sortOrder: 2,
  },
  {
    category: "combo_type",
    optionKey: "per_night",
    label: "Giá/đêm",
    description: "Giá theo đêm — áp dụng cho khách đặt linh hoạt số đêm",
    config: { days: null, nights: 1 },
    sortOrder: 3,
  },
];

export const dayTypeSeedData: PricingOptionSeed[] = [
  {
    category: "day_type",
    optionKey: "weekday",
    label: "T2-T5",
    description: "Ngày thường từ thứ 2 đến thứ 5 — giá thấp nhất",
    config: { daysOfWeek: [1, 2, 3, 4] },
    sortOrder: 1,
  },
  {
    category: "day_type",
    optionKey: "friday",
    label: "T6",
    description: "Thứ 6 — giá cuối tuần bắt đầu, khách check-in nhiều",
    config: { daysOfWeek: [5] },
    sortOrder: 2,
  },
  {
    category: "day_type",
    optionKey: "saturday",
    label: "T7",
    description: "Thứ 7 — ngày cao điểm cuối tuần, giá cao nhất trong tuần",
    config: { daysOfWeek: [6] },
    sortOrder: 3,
  },
  {
    category: "day_type",
    optionKey: "sunday",
    label: "CN",
    description: "Chủ nhật — ngày cuối tuần, khách check-out nhiều",
    config: { daysOfWeek: [0] },
    sortOrder: 4,
  },
  {
    category: "day_type",
    optionKey: "holiday",
    label: "Lễ",
    description: "Ngày lễ/Tết — giá peak season, cần đặt trước sớm",
    config: { daysOfWeek: [], isHoliday: true },
    sortOrder: 5,
  },
];

export const pricingOptionsSeedData: PricingOptionSeed[] = [
  ...comboTypeSeedData,
  ...dayTypeSeedData,
];
