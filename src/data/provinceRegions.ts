export interface ProvinceRegion {
  id: string;
  name: string;
  /** Tọa độ tương đối (0..1) bên trong khung bordersBounds của /map_borders.svg */
  relX: number;
  relY: number;
  isMain?: boolean;
  isForeign?: boolean;
}

export const PROVINCE_REGIONS: ProvinceRegion[] = [
  { id: 'thanh_hoa', name: 'THANH HÓA', relX: 0.548, relY: 0.484, isMain: true },
  { id: 'nghe_an', name: 'NGHỆ AN', relX: 0.495, relY: 0.625 },
  { id: 'thuan_hoa', name: 'TÂN BÌNH - THUẬN HÓA', relX: 0.595, relY: 0.76 },
  { id: 'son_nam', name: 'SƠN NAM', relX: 0.642, relY: 0.38 },
  { id: 'dong_do', name: 'ĐÔNG ĐÔ', relX: 0.612, relY: 0.298 },
  { id: 'hai_duong', name: 'HẢI DƯƠNG', relX: 0.73, relY: 0.32 },
  { id: 'kinh_bac', name: 'KINH BẮC', relX: 0.672, relY: 0.25 },
  { id: 'son_tay', name: 'SƠN TÂY', relX: 0.542, relY: 0.268 },
  { id: 'hung_hoa', name: 'HƯNG HÓA', relX: 0.385, relY: 0.222 },
  { id: 'tuyen_quang', name: 'TUYÊN QUANG', relX: 0.535, relY: 0.135 },
  { id: 'thai_nguyen', name: 'THÁI NGUYÊN', relX: 0.642, relY: 0.165 },
  { id: 'lang_son', name: 'LẠNG SƠN', relX: 0.742, relY: 0.178 },
  { id: 'ai_lao', name: 'AI LAO', relX: 0.265, relY: 0.455, isForeign: true },
  { id: 'chiem_thanh', name: 'CHIÊM THÀNH', relX: 0.725, relY: 0.895, isForeign: true },
];
