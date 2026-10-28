import type { StarTier } from '../types';

export type StarDisplayTier = 'silver' | 'gold' | 'red' | 'empty';

export interface GeneralRatingResult {
  tier: StarTier;
  stars: number;
  avg: number;
  redStatsCount: number;
  goldStatsCount: number;
  layeredStars: StarDisplayTier[];
}

/**
 * Ngưỡng định nghĩa màu của từng chỉ số:
 * - Chỉ số Đỏ: >= 90 (đỉnh cao xuất quỷ nhập thần)
 * - Chỉ số Vàng: 80 <= chỉ số < 90 (hào kiệt, xuất chúng)
 * - Chỉ số Bạc: < 80 (chỉ số cơ bản / hỗ trợ)
 */
export const STAT_THRESHOLDS = {
  RED: 90,
  GOLD: 80,
};

/**
 * QUY TẮC PHÂN BẬC VÀ SỐ SAO MỚI:
 *
 * 1. VIỀN PHÁT SÁNG (TIER):
 *    - Chỉ cần có >= 1 sao đỏ  => VIỀN ĐỎ (red)
 *    - Không có sao đỏ VÀ AVG >= 80 => VIỀN VÀNG (gold)
 *    - Còn lại (AVG < 80 và 0 sao đỏ) => VIỀN TRẮNG (silver)
 *
 * 2. CƠ CHẾ SAO ĐỎ (Dựa trên số lượng chỉ số Đỏ, Vàng và AVG):
 *    - 1 Đỏ, 0 Vàng hoặc 1 Đỏ, 1 Vàng => 1* Đỏ (1 đỏ 1 vàng vẫn chỉ là 1 sao đỏ)
 *    - 1 Đỏ, 2 Vàng                   => 2* Đỏ (1 đỏ 2 vàng mới được 2 sao đỏ)
 *    - 2 Đỏ                           => 3* Đỏ (2 đỏ là 3 sao đỏ)
 *    - 3 Đỏ (AVG < 95.0)              => 4* Đỏ (3 đỏ là 4 sao đỏ)
 *    - 3 Đỏ (AVG >= 95.0)             => 5* Đỏ (3 đỏ AVG >= 95 mới được 5 sao đỏ)
 *
 * 3. CƠ CHẾ SAO VÀNG (Khi AVG >= 80 và 0 chỉ số Đỏ):
 *    Vì không có chỉ số Đỏ (mọi chỉ số < 90), dải AVG thực tế của nhóm này là từ 80.0 đến ~86.5.
 *    Do đó, thang điểm AVG được thiết kế với bước nhảy 1 điểm hợp lý:
 *    - 80.0 <= AVG < 81.0 => 1* Vàng
 *    - 81.0 <= AVG < 82.0 => 2* Vàng
 *    - 82.0 <= AVG < 83.0 => 3* Vàng
 *    - 83.0 <= AVG < 84.0 => 4* Vàng
 *    - AVG >= 84.0        => 5* Vàng (Đỉnh cao của nhóm Vàng: Trần Nguyên Hãn, Lý Triện, Nguyễn Chích, Trần Lựu)
 *
 * 4. CƠ CHẾ SAO BẠC (Khi AVG < 80 và 0 chỉ số Đỏ):
 *    - AVG < 70.0         => 1* Bạc
 *    - 70.0 <= AVG < 73.0 => 2* Bạc
 *    - 73.0 <= AVG < 75.0 => 3* Bạc
 *    - 75.0 <= AVG < 77.0 => 4* Bạc
 *    - 77.0 <= AVG < 80.0 => 5* Bạc (Cận ngưỡng viền vàng)
 */
export const calculateGeneralRating = (stats: {
  command: number;
  martial: number;
  intellect: number;
}): GeneralRatingResult => {
  const { command, martial, intellect } = stats;
  const statValues = [command, martial, intellect];
  const avg = Number(((command + martial + intellect) / 3).toFixed(1));

  const redStatsCount = statValues.filter(v => v >= STAT_THRESHOLDS.RED).length;
  const goldStatsCount = statValues.filter(
    v => v >= STAT_THRESHOLDS.GOLD && v < STAT_THRESHOLDS.RED
  ).length;

  let tier: StarTier = 'silver';
  let stars = 1;

  // --- TRƯỜNG HỢP 1: CÓ ÍT NHẤT 1 CHỈ SỐ ĐỎ => LÊN SAO ĐỎ & VIỀN ĐỎ ---
  if (redStatsCount >= 1) {
    tier = 'red';

    if (redStatsCount === 3) {
      stars = avg >= 95.0 ? 5 : 4; // 3 đỏ avg >= 95 mới được 5* đỏ, còn lại 3 đỏ là 4* đỏ
    } else if (redStatsCount === 2) {
      stars = 3; // 2 đỏ là 3* đỏ
    } else if (redStatsCount === 1 && goldStatsCount === 2) {
      stars = 2; // 1 đỏ 2 vàng mới được 2* đỏ
    } else {
      stars = 1; // 1 đỏ 1 vàng hoặc 1 đỏ 0 vàng vẫn chỉ là 1* đỏ
    }
  }
  // --- TRƯỜNG HỢP 2: KHÔNG CÓ ĐỎ, NHƯNG AVG >= 80 => VIỀN VÀNG & SAO VÀNG ---
  else if (avg >= 80.0) {
    tier = 'gold';

    if (avg >= 84.0) {
      stars = 5; // AVG >= 84 (Trần Nguyên Hãn 86.3, Lý Triện 84.7, Nguyễn Chích 84.3, Trần Lựu 84.3)
    } else if (avg >= 83.0) {
      stars = 4; // 83.0 <= AVG < 84.0 (Đinh Lễ 83.7, Lưu Nhân Chú 83.3)
    } else if (avg >= 82.0) {
      stars = 3; // 82.0 <= AVG < 83.0 (Nguyễn Xí 82.7, Phạm Văn Xảo 82.3, Lê Khôi 82.3)
    } else if (avg >= 81.0) {
      stars = 2; // 81.0 <= AVG < 82.0 (Bùi Quốc Hưng 81.3, Đinh Liệt 81.7, Lê Ngân 81.7, Trịnh Khả 81.3, Đỗ Bí 81.0)
    } else {
      stars = 1; // 80.0 <= AVG < 81.0
    }
  }
  // --- TRƯỜNG HỢP 3: CÒN LẠI (AVG < 80 VÀ 0 ĐỎ) => VIỀN TRẮNG & SAO BẠC ---
  else {
    tier = 'silver';

    if (avg >= 77.0) {
      stars = 5; // Cầm Quý 79.3, Cầm Bành 79.0, Lê Hiểm 77.7, Lê Liễu 77.7
    } else if (avg >= 75.0) {
      stars = 4; // Lê Cảnh Quản 75.0, Trịnh Tuân 75.0
    } else if (avg >= 73.0) {
      stars = 3; // Đào Bồi 74.3, Phạm Ngọc 73.3
    } else if (avg >= 70.0) {
      stars = 2;
    } else {
      stars = 1;
    }
  }

  const layeredStars = getLayeredStars(tier, stars);

  return {
    tier,
    stars,
    avg,
    redStatsCount,
    goldStatsCount,
    layeredStars,
  };
};

/**
 * Cơ chế Sao đè Sao (Layered Stars):
 * - Bậc Bạc: 1..5 sao Bạc (các vị trí còn lại là rỗng)
 * - Bậc Vàng: Sao Vàng đè lên Sao Bạc (1 Vàng + 4 Bạc -> 5 Vàng)
 * - Bậc Đỏ: Sao Đỏ đè lên Sao Vàng (1 Đỏ + 4 Vàng -> 5 Đỏ)
 */
export const getLayeredStars = (tier: StarTier, stars: number): StarDisplayTier[] => {
  const clamped = Math.max(1, Math.min(5, stars));
  const list: StarDisplayTier[] = [];

  for (let i = 0; i < 5; i++) {
    if (tier === 'red') {
      list.push(i < clamped ? 'red' : 'gold');
    } else if (tier === 'gold') {
      list.push(i < clamped ? 'gold' : 'silver');
    } else {
      list.push(i < clamped ? 'silver' : 'empty');
    }
  }

  return list;
};
