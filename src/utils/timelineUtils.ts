export const BASE_YEAR = 1416; // Mốc Hội thề Lũng Nhai

export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const getDaysInMonthFixed = (month: number, year: number): number => {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1] || 30;
};

// Đổi Ngày/Tháng/Năm sang số ngày tuyệt đối tính từ 01/01/1416 (bắt đầu từ index 0)
export const dateToDayIndex = (day: number, month: number, year: number): number => {
  let days = 0;
  for (let y = BASE_YEAR; y < year; y++) {
    days += isLeapYear(y) ? 366 : 365;
  }
  for (let m = 1; m < month; m++) {
    days += getDaysInMonthFixed(m, year);
  }
  return days + (day - 1);
};

// Đổi số ngày tuyệt đối sang Ngày/Tháng/Năm
export const dayIndexToDate = (dayIndex: number): { day: number; month: number; year: number } => {
  let idx = Math.max(0, Math.floor(dayIndex));
  let y = BASE_YEAR;

  while (true) {
    const yDays = isLeapYear(y) ? 366 : 365;
    if (idx < yDays) break;
    idx -= yDays;
    y++;
  }

  let m = 1;
  while (true) {
    const dim = getDaysInMonthFixed(m, y);
    if (idx < dim) break;
    idx -= dim;
    m++;
  }

  return { day: idx + 1, month: m, year: y };
};

// Tra cứu Can Chi năm lịch sử (thế kỷ XV)
const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

export const getLunarYearName = (year: number): string => {
  const canIndex = (year % 10 + 10) % 10;
  const chiIndex = (year % 12 + 12) % 12;
  return `${CAN[canIndex]} ${CHI[chiIndex]}`;
};

// 12 Thời thần / Canh giờ cổ truyền Việt Nam
export interface CanhGioInfo {
  index: number;
  name: string;
  shortName: string;
  timeRange: string;
  period: string;
  description: string;
}

export const CANH_GIO_DATA: CanhGioInfo[] = [
  { index: 0, name: 'Giờ Tý', shortName: 'Tý', timeRange: '23:00 - 01:00', period: 'Canh 3', description: 'Đêm sâu tĩnh mịch, nhân mã nghỉ ngơi hoặc đánh lén' },
  { index: 1, name: 'Giờ Sửu', shortName: 'Sửu', timeRange: '01:00 - 03:00', period: 'Canh 4', description: 'Trời sắp hửng, gà gáy lần đầu, mai phục sẵn sàng' },
  { index: 2, name: 'Giờ Dần', shortName: 'Dần', timeRange: '03:00 - 05:00', period: 'Canh 5', description: 'Rạng đông, điểm binh ăn sớm, chuẩn bị xuất trận' },
  { index: 3, name: 'Giờ Mão', shortName: 'Mão', timeRange: '05:00 - 07:00', period: 'Bình minh', description: 'Mặt trời mọc, cờ xí rợp trời, đại quân nhổ trại' },
  { index: 4, name: 'Giờ Thìn', shortName: 'Thìn', timeRange: '07:00 - 09:00', period: 'Sớm mai', description: 'Trời quang mây tạnh, bước chân hành quân dồn dập' },
  { index: 5, name: 'Giờ Tị', shortName: 'Tị', timeRange: '09:00 - 11:00', period: 'Gần trưa', description: 'Nắng lên cao, thám mã tung hoành do thám địa hình' },
  { index: 6, name: 'Giờ Ngọ', shortName: 'Ngọ', timeRange: '11:00 - 13:00', period: 'Chính trưa', description: 'Mặt trời đỉnh đầu, dừng ngựa nghỉ chân bên suối' },
  { index: 7, name: 'Giờ Mùi', shortName: 'Mùi', timeRange: '13:00 - 15:00', period: 'Đầu chiều', description: 'Gió nổi đồng bằng, tiếp tục tiến bước vượt ải' },
  { index: 8, name: 'Giờ Thân', shortName: 'Thân', timeRange: '15:00 - 17:00', period: 'Xế chiều', description: 'Nắng ngả về tây, chọn địa thế hiểm chuẩn bị hạ trại' },
  { index: 9, name: 'Giờ Dậu', shortName: 'Dậu', timeRange: '17:00 - 19:00', period: 'Hoàng hôn', description: 'Chiều tà khói bếp, cắt cử trinh sát canh gác các ngả' },
  { index: 10, name: 'Giờ Tuất', shortName: 'Tuất', timeRange: '19:00 - 21:00', period: 'Canh 1', description: 'Màn đêm buông xuống, đốt đuốc tuần tra quanh doanh trại' },
  { index: 11, name: 'Giờ Hợi', shortName: 'Hợi', timeRange: '21:00 - 23:00', period: 'Canh 2', description: 'Quân sĩ yên giấc, tướng lĩnh bàn tính kế sách trong trướng' },
];

export const getCanhGioInfo = (canhHour: number): CanhGioInfo => {
  const safeIdx = Math.max(0, Math.min(11, Math.floor(canhHour) % 12));
  return CANH_GIO_DATA[safeIdx] || CANH_GIO_DATA[0];
};

