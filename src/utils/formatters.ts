/**
 * Tiện ích định dạng chuỗi và văn bản hiển thị
 */

/**
 * Xóa phần kích thước ô lưới dư thừa trong tên công trình, ví dụ "Đồn Điền Lam Sơn (5x5)" -> "Đồn Điền Lam Sơn"
 */
export const cleanStructureName = (name: string): string => {
  return name.replace(/\s*[([]\d+x\d+.*?[)\]]/gi, '').trim();
};

/**
 * Định dạng số nguyên kèm phân tách hàng nghìn
 */
export const formatNumber = (num: number): string => {
  return Math.floor(num).toLocaleString('vi-VN');
};

/**
 * Làm tròn số ngày còn lại để tránh sai số dấu phẩy động khi chuyển qua lại giữa Canh và Ngày
 */
export const roundRemainingDays = (days: number): number => {
  return Math.max(0, Number(days.toFixed(3)));
};

/**
 * Định dạng gọn số ngày còn lại để hiển thị trên UI (vd 4.419 -> "4.4", 5 -> "5", 0.08 -> "0.1")
 */
export const formatRemainingDays = (days: number): string => {
  const safe = Math.max(0, days);
  if (safe > 0 && safe < 0.1) return '0.1';
  return Number(safe.toFixed(1)).toString();
};
