export interface ProvinceRegion {
  id: string;
  name: string;
  /** Tọa độ tương đối (0..1) bên trong khung bordersBounds của /map_borders.svg */
  relX: number;
  relY: number;
  /** Đa giác vùng tương tác của tỉnh/khu vực theo tọa độ tương đối (0..1) */
  polygon: [number, number][];
  isMain?: boolean;
  isForeign?: boolean;
}

export const PROVINCE_REGIONS: ProvinceRegion[] = [
  {
    id: 'thanh_hoa',
    name: 'THANH HÓA',
    relX: 0.548,
    relY: 0.484,
    polygon: [[0.42, 0.43], [0.64, 0.42], [0.69, 0.51], [0.58, 0.55], [0.43, 0.53]],
    isMain: true,
  },
  {
    id: 'nghe_an',
    name: 'NGHỆ AN',
    relX: 0.495,
    relY: 0.625,
    polygon: [[0.40, 0.54], [0.60, 0.55], [0.61, 0.69], [0.43, 0.70], [0.37, 0.61]],
  },
  {
    id: 'thuan_hoa',
    name: 'TÂN BÌNH - THUẬN HÓA',
    relX: 0.595,
    relY: 0.76,
    polygon: [[0.45, 0.69], [0.64, 0.69], [0.73, 0.83], [0.55, 0.84]],
  },
  {
    id: 'son_nam',
    name: 'SƠN NAM',
    relX: 0.642,
    relY: 0.38,
    polygon: [[0.57, 0.33], [0.69, 0.34], [0.71, 0.43], [0.60, 0.43]],
  },
  {
    id: 'dong_do',
    name: 'ĐÔNG ĐÔ',
    relX: 0.612,
    relY: 0.298,
    polygon: [[0.58, 0.26], [0.65, 0.26], [0.66, 0.34], [0.57, 0.33]],
  },
  {
    id: 'hai_duong',
    name: 'HẢI DƯƠNG',
    relX: 0.73,
    relY: 0.32,
    polygon: [[0.66, 0.26], [0.85, 0.26], [0.83, 0.40], [0.68, 0.39]],
  },
  {
    id: 'kinh_bac',
    name: 'KINH BẮC',
    relX: 0.672,
    relY: 0.25,
    polygon: [[0.61, 0.20], [0.74, 0.21], [0.73, 0.28], [0.62, 0.27]],
  },
  {
    id: 'son_tay',
    name: 'SƠN TÂY',
    relX: 0.542,
    relY: 0.268,
    polygon: [[0.48, 0.20], [0.60, 0.20], [0.58, 0.35], [0.47, 0.34]],
  },
  {
    id: 'hung_hoa',
    name: 'HƯNG HÓA',
    relX: 0.385,
    relY: 0.222,
    polygon: [[0.20, 0.08], [0.49, 0.10], [0.48, 0.36], [0.24, 0.33]],
  },
  {
    id: 'tuyen_quang',
    name: 'TUYÊN QUANG',
    relX: 0.535,
    relY: 0.135,
    polygon: [[0.44, 0.04], [0.61, 0.05], [0.60, 0.20], [0.46, 0.20]],
  },
  {
    id: 'thai_nguyen',
    name: 'THÁI NGUYÊN',
    relX: 0.642,
    relY: 0.165,
    polygon: [[0.60, 0.07], [0.72, 0.08], [0.71, 0.22], [0.60, 0.21]],
  },
  {
    id: 'lang_son',
    name: 'LẠNG SƠN',
    relX: 0.742,
    relY: 0.178,
    polygon: [[0.71, 0.08], [0.89, 0.10], [0.86, 0.26], [0.72, 0.24]],
  },
  {
    id: 'ai_lao',
    name: 'AI LAO',
    relX: 0.265,
    relY: 0.455,
    polygon: [[0.06, 0.25], [0.39, 0.34], [0.41, 0.68], [0.08, 0.65]],
    isForeign: true,
  },
  {
    id: 'chiem_thanh',
    name: 'CHIÊM THÀNH',
    relX: 0.725,
    relY: 0.895,
    polygon: [[0.54, 0.83], [0.89, 0.82], [0.90, 0.99], [0.55, 0.99]],
    isForeign: true,
  },
];
