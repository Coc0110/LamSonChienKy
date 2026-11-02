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
