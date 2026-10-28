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
