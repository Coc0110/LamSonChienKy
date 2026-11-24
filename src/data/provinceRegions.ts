export interface ProvinceRegion {
  id: string;
  name: string;
  /** Tọa độ tương đối (0..1) bên trong khung bordersBounds của /map_borders.svg */
  relX: number;
  relY: number;
  /** Đa giác vùng tương tác của phủ/châu theo tọa độ tương đối (0..1) */
  polygon: [number, number][];
  isMain?: boolean;
}

/**
 * 22 Phủ & Châu trực lệ của Giao Chỉ đẳng xứ Thừa tuyên Bố chính sứ ty (1407–1427)
 * Khớp theo bản đồ /map_borders.svg
 */
export const PROVINCE_REGIONS: ProvinceRegion[] = [
  {
    id: 'tuyen_hoa',
    name: 'TUYÊN HÓA',
    relX: 0.36,
    relY: 0.14,
    polygon: [[0.28, 0.07], [0.43, 0.04], [0.42, 0.21], [0.29, 0.19]],
  },
  {
    id: 'quy_hoa',
    name: 'QUY HÓA',
    relX: 0.28,
    relY: 0.21,
    polygon: [[0.18, 0.12], [0.30, 0.15], [0.34, 0.26], [0.22, 0.28]],
  },
  {
    id: 'thai_nguyen',
    name: 'THÁI NGUYÊN',
    relX: 0.46,
    relY: 0.16,
    polygon: [[0.42, 0.06], [0.52, 0.08], [0.51, 0.23], [0.41, 0.22]],
  },
  {
    id: 'lang_son',
    name: 'LẠNG SƠN',
    relX: 0.55,
    relY: 0.17,
    polygon: [[0.51, 0.09], [0.61, 0.14], [0.59, 0.23], [0.51, 0.22]],
  },
  {
    id: 'tam_giang',
    name: 'TAM GIANG',
    relX: 0.37,
    relY: 0.27,
    polygon: [[0.32, 0.22], [0.42, 0.22], [0.41, 0.31], [0.33, 0.30]],
  },
  {
    id: 'gia_hung',
    name: 'GIA HƯNG',
    relX: 0.32,
    relY: 0.33,
    polygon: [[0.20, 0.27], [0.39, 0.29], [0.40, 0.39], [0.22, 0.37]],
  },
  {
    id: 'bac_giang',
    name: 'BẮC GIANG',
    relX: 0.47,
    relY: 0.27,
    polygon: [[0.42, 0.22], [0.52, 0.23], [0.51, 0.31], [0.43, 0.30]],
  },
  {
    id: 'lang_giang',
    name: 'LẠNG GIANG',
    relX: 0.55,
    relY: 0.25,
    polygon: [[0.51, 0.21], [0.62, 0.21], [0.60, 0.30], [0.51, 0.29]],
  },
  {
    id: 'tan_an',
    name: 'TÂN AN',
    relX: 0.64,
    relY: 0.26,
    polygon: [[0.59, 0.21], [0.71, 0.22], [0.67, 0.32], [0.58, 0.30]],
  },
  {
    id: 'giao_chau',
    name: 'GIAO CHÂU',
    relX: 0.44,
    relY: 0.32,
    polygon: [[0.40, 0.29], [0.49, 0.30], [0.48, 0.35], [0.40, 0.34]],
  },
  {
    id: 'quang_oai',
    name: 'QUẢNG OAI',
    relX: 0.43,
    relY: 0.36,
    polygon: [[0.39, 0.34], [0.48, 0.34], [0.47, 0.39], [0.39, 0.38]],
  },
  {
    id: 'ninh_hoa',
    name: 'NINH HÓA',
    relX: 0.42,
    relY: 0.40,
    polygon: [[0.36, 0.38], [0.48, 0.38], [0.47, 0.43], [0.37, 0.43]],
  },
  {
    id: 'tran_man',
    name: 'TRẤN MAN',
    relX: 0.51,
    relY: 0.35,
    polygon: [[0.48, 0.31], [0.56, 0.31], [0.55, 0.37], [0.48, 0.36]],
  },
  {
    id: 'kien_xuong',
    name: 'KIẾN XƯƠNG',
    relX: 0.55,
    relY: 0.37,
    polygon: [[0.52, 0.34], [0.58, 0.34], [0.57, 0.40], [0.52, 0.39]],
  },
  {
    id: 'phung_hoa',
    name: 'PHỤNG HÓA',
    relX: 0.52,
    relY: 0.40,
    polygon: [[0.48, 0.37], [0.55, 0.38], [0.54, 0.42], [0.48, 0.41]],
  },
  {
    id: 'kien_binh',
    name: 'KIẾN BÌNH',
    relX: 0.50,
    relY: 0.43,
    polygon: [[0.46, 0.40], [0.53, 0.41], [0.52, 0.45], [0.46, 0.44]],
  },
  {
    id: 'thanh_hoa',
    name: 'THANH HÓA',
    relX: 0.44,
    relY: 0.48,
    polygon: [[0.35, 0.43], [0.49, 0.44], [0.50, 0.52], [0.36, 0.53]],
    isMain: true,
  },
  {
    id: 'dien_chau',
    name: 'DIỄN CHÂU',
    relX: 0.40,
    relY: 0.56,
    polygon: [[0.32, 0.52], [0.46, 0.53], [0.45, 0.59], [0.31, 0.58]],
  },
  {
    id: 'nghe_an',
    name: 'NGHỆ AN',
    relX: 0.38,
    relY: 0.65,
    polygon: [[0.21, 0.58], [0.47, 0.59], [0.49, 0.72], [0.23, 0.69]],
  },
  {
    id: 'tan_binh',
    name: 'TÂN BÌNH',
    relX: 0.55,
    relY: 0.77,
    polygon: [[0.47, 0.70], [0.62, 0.72], [0.64, 0.82], [0.50, 0.81]],
  },
  {
    id: 'thuan_hoa',
    name: 'THUẬN HÓA',
    relX: 0.68,
    relY: 0.84,
    polygon: [[0.58, 0.81], [0.78, 0.82], [0.80, 0.90], [0.61, 0.88]],
  },
  {
    id: 'thang_hoa',
    name: 'THĂNG HOA',
    relX: 0.84,
    relY: 0.92,
    polygon: [[0.76, 0.88], [0.92, 0.89], [0.93, 0.97], [0.81, 0.97]],
  },
];
