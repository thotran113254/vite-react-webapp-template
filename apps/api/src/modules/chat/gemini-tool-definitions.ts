import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

const getMarketOverview: FunctionDeclaration = {
  name: "getMarketOverview",
  description:
    "Lấy tổng quan thị trường và DANH SÁCH cơ sở lưu trú (tên, loại, sao, số phòng). KHÔNG có chi tiết phòng hay giá. Dùng bước đầu khi cần biết thị trường có gì. Sau đó gọi getPropertyDetails cho cơ sở cụ thể.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slug: {
        type: Type.STRING,
        description: "Slug thị trường (vd: da-nang, phu-quoc, cat-ba)",
      },
    },
    required: ["slug"],
  },
};

const getPropertyDetails: FunctionDeclaration = {
  name: "getPropertyDetails",
  description:
    "Lấy CHI TIẾT một cơ sở lưu trú cụ thể: mô tả, tiện ích, danh sách phòng, sức chứa (KHÔNG có giá). Dùng sau getMarketOverview khi đã xác định cơ sở cần xem.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slug: { type: Type.STRING, description: "Slug thị trường" },
      propertySlug: {
        type: Type.STRING,
        description: "Slug cơ sở lưu trú (lấy từ kết quả getMarketOverview)",
      },
    },
    required: ["slug", "propertySlug"],
  },
};

const getPropertyPricing: FunctionDeclaration = {
  name: "getPropertyPricing",
  description:
    "Lấy bảng giá phòng. NÊN chỉ định propertySlug để lấy giá cơ sở cụ thể (tiết kiệm). Có thể lọc thêm theo combo type, day type. Dùng khi khách hỏi giá, báo giá, so sánh giá.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slug: { type: Type.STRING, description: "Slug thị trường" },
      propertySlug: {
        type: Type.STRING,
        description: "Slug cơ sở lưu trú — NÊN dùng để lấy giá chính xác 1 cơ sở (optional nhưng khuyến khích)",
      },
      comboType: {
        type: Type.STRING,
        description: "Lọc theo loại combo: 2n1d, 3n2d, per_night (optional)",
      },
      dayType: {
        type: Type.STRING,
        description:
          "Lọc theo loại ngày: weekday, friday, saturday, sunday, holiday (optional)",
      },
    },
    required: ["slug"],
  },
};

const getMarketAttractions: FunctionDeclaration = {
  name: "getMarketAttractions",
  description:
    "Lấy danh sách điểm du lịch, ẩm thực, phương tiện di chuyển. Dùng khi khách hỏi tham quan, ăn uống, di chuyển.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slug: { type: Type.STRING, description: "Slug thị trường" },
    },
    required: ["slug"],
  },
};

const getItineraryTemplates: FunctionDeclaration = {
  name: "getItineraryTemplates",
  description:
    "Lấy lịch trình mẫu. Dùng khi khách cần gợi ý plan trip, lịch trình du lịch.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slug: { type: Type.STRING, description: "Slug thị trường" },
      durationDays: {
        type: Type.NUMBER,
        description: "Lọc theo số ngày (optional)",
      },
      customerType: {
        type: Type.STRING,
        description: "Loại khách: gia đình, cặp đôi, nhóm bạn (optional)",
      },
    },
    required: ["slug"],
  },
};

const getMarketBusinessData: FunctionDeclaration = {
  name: "getMarketBusinessData",
  description:
    "Dữ liệu kinh doanh: đối thủ, khách hàng mục tiêu, hành trình khách hàng, chiến lược ôm quỹ phòng, chính sách giá (trẻ em, phụ thu, vận chuyển). Dùng khi cần phân tích thị trường hoặc tra chính sách pricing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slug: { type: Type.STRING, description: "Slug thị trường" },
    },
    required: ["slug"],
  },
};

const compareProperties: FunctionDeclaration = {
  name: "compareProperties",
  description:
    "So sánh 2-5 cơ sở lưu trú cụ thể side-by-side (kèm giá). Dùng khi sale cần so sánh trực tiếp, hoặc khách đang phân vân giữa các lựa chọn. TIẾT KIỆM hơn gọi nhiều tool riêng lẻ.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        description: "Danh sách cơ sở cần so sánh (2-5 items)",
        items: {
          type: Type.OBJECT,
          properties: {
            slug: { type: Type.STRING, description: "Slug thị trường" },
            propertySlug: { type: Type.STRING, description: "Slug cơ sở lưu trú" },
          },
          required: ["slug", "propertySlug"],
        },
      },
      comboType: {
        type: Type.STRING,
        description: "Lọc giá theo combo: 2n1d, 3n2d, per_night (optional)",
      },
      dayType: {
        type: Type.STRING,
        description: "Lọc giá theo loại ngày: weekday, friday, saturday, sunday, holiday (optional)",
      },
    },
    required: ["items"],
  },
};

const searchProperties: FunctionDeclaration = {
  name: "searchProperties",
  description:
    "Tìm kiếm cơ sở lưu trú XUYÊN tất cả thị trường. Dùng khi: 'resort nào tốt nhất?', 'homestay cho 4 người?', 'khách sạn 4 sao trở lên?'. Trả về danh sách lightweight có giá tham khảo.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: "Loại hình: homestay, hotel, resort, lodge, hostel, guesthouse (optional)",
      },
      starMin: {
        type: Type.NUMBER,
        description: "Số sao tối thiểu, vd: 3, 3.5, 4 (optional)",
      },
      region: {
        type: Type.STRING,
        description: "Vùng miền: Bắc, Trung, Nam (optional)",
      },
      capacity: {
        type: Type.NUMBER,
        description: "Sức chứa tối thiểu (số người), vd: 4 cho gia đình (optional)",
      },
    },
  },
};

const searchKnowledgeBase: FunctionDeclaration = {
  name: "searchKnowledgeBase",
  description:
    "Tìm kiếm bài viết trong Knowledge Base. Dùng khi cần tra chính sách, khuyến mãi, hướng dẫn, FAQ, quy trình.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Từ khóa tìm kiếm (tiếng Việt)",
      },
    },
    required: ["query"],
  },
};

const getTransportPricing: FunctionDeclaration = {
  name: "getTransportPricing",
  description:
    "Lấy bảng giá vận chuyển (xe khách, tàu/ferry) có cấu trúc: nhà xe, loại xe, hạng ghế, giá 1 chiều/khứ hồi, chính sách trẻ em, phụ thu liên tỉnh. Dùng khi khách hỏi giá xe, giá tàu, đặt vé.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      slug: { type: Type.STRING, description: "Slug thị trường (vd: cat-ba, da-nang)" },
      category: {
        type: Type.STRING,
        description: "Lọc: 'bus' hoặc 'ferry'. Bỏ trống = tất cả (optional)",
      },
    },
    required: ["slug"],
  },
};

const calculateComboPrice: FunctionDeclaration = {
  name: "calculateComboPrice",
  description:
    "Tính giá combo trọn gói: phòng + vận chuyển + tàu (nếu có). Áp dụng biên lợi nhuận. Trả về báo giá chi tiết từng hạng mục và giá/người. Dùng khi sale cần báo giá combo, tính giá trọn gói cho khách. Hỗ trợ lịch nhiều ngày có loại ngày khác nhau (ví dụ T5+T6+T7).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      marketSlug: { type: Type.STRING, description: "Slug thị trường" },
      propertySlug: {
        type: Type.STRING,
        description: "Slug cơ sở lưu trú (optional)",
      },
      numAdults: { type: Type.NUMBER, description: "Số người lớn (>10 tuổi)" },
      numChildrenUnder10: {
        type: Type.NUMBER,
        description: "Số trẻ 5-10 tuổi",
      },
      numChildrenUnder5: {
        type: Type.NUMBER,
        description: "Số trẻ <5 tuổi",
      },
      numNights: {
        type: Type.NUMBER,
        description: "Số đêm: 1 = 2N1Đ, 2 = 3N2Đ",
      },
      dayTypes: {
        type: Type.ARRAY,
        description:
          "Loại ngày từng đêm, dùng khi các đêm khác nhau loại ngày (ví dụ đặt T5+T6+T7 = [\"weekday\",\"friday\",\"saturday\"]). Ưu tiên hơn dayType.",
        items: { type: Type.STRING },
      },
      dayType: {
        type: Type.STRING,
        description: "weekday, friday, saturday, sunday, holiday — dùng khi tất cả đêm cùng loại. Bỏ qua nếu đã có dayTypes.",
      },
      transportClass: {
        type: Type.STRING,
        description: "cabin, limousine, sleeper (optional)",
      },
      ferryClass: {
        type: Type.STRING,
        description: "speed_boat, small_boat (optional)",
      },
      tripType: {
        type: Type.STRING,
        description: "roundtrip (mặc định) hoặc oneway — loại hình vận chuyển (optional)",
      },
      departureProvince: {
        type: Type.STRING,
        description: "Tỉnh khởi hành nếu khác tỉnh, để tính phụ thu liên tỉnh (vd: 'Quảng Ninh') (optional)",
      },
    },
    required: ["marketSlug", "numAdults", "numNights"],
  },
};

const getDateInfo: FunctionDeclaration = {
  name: "getDateInfo",
  description:
    "Kiểm tra ngày cụ thể: thứ trong tuần, loại ngày (weekday/friday/saturday/sunday/holiday), có phải ngày lễ không. LUÔN dùng tool này khi sale cung cấp ngày check-in để xác định chính xác loại ngày trước khi tính giá. Hỗ trợ kiểm tra nhiều ngày cùng lúc (cho lịch trình nhiều đêm).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      dates: {
        type: Type.ARRAY,
        description:
          "Danh sách ngày cần kiểm tra, format mỗi ngày: YYYY-MM-DD hoặc DD/MM/YYYY. VD: ['2026-03-25', '2026-03-26'] hoặc ['25/03/2026']",
        items: { type: Type.STRING },
      },
    },
    required: ["dates"],
  },
};

/** All tool declarations for Gemini function calling */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  getMarketOverview,
  getPropertyDetails,
  getPropertyPricing,
  compareProperties,
  searchProperties,
  getMarketAttractions,
  getItineraryTemplates,
  getMarketBusinessData,
  searchKnowledgeBase,
  getTransportPricing,
  calculateComboPrice,
  getDateInfo,
];

/** Tools config object for Gemini SDK */
export const GEMINI_TOOLS = [{ functionDeclarations: TOOL_DECLARATIONS }];
