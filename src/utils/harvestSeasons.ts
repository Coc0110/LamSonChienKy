// Hệ thống Mùa Vụ Thu Hoạch Nông Nghiệp Lam Sơn thế kỷ XV
// Theo nông lịch Bắc Trung Bộ: Mỗi năm có 2 vụ mùa chính cố định

export interface HarvestSeasonDef {
  id: 'chiem' | 'mua';
  name: string;
  month: number;
  day: number;
  description: string;
}

export const HARVEST_SEASONS: HarvestSeasonDef[] = [
  {
    id: 'chiem',
    name: 'Vụ Chiêm',
    month: 5,
    day: 15,
    description: 'Vụ gặt đầu hè (thời tiết nắng ấm, ít bão, tỷ lệ được mùa cao)',
  },
  {
    id: 'mua',
    name: 'Vụ Mùa',
    month: 10,
    day: 15,
    description: 'Vụ gặt cuối thu (mùa mưa bão lũ lụt miền Trung, rủi ro mất mùa cao hơn)',
  },
];

export function isHarvestDay(day: number, month: number): { isHarvest: boolean; season?: HarvestSeasonDef } {
  const match = HARVEST_SEASONS.find(s => s.day === day && s.month === month);
  if (match) {
    return { isHarvest: true, season: match };
  }
  return { isHarvest: false };
}

export function getNextHarvestSeason(currentDay: number, currentMonth: number, currentYear: number): {
  season: HarvestSeasonDef;
  targetDay: number;
  targetMonth: number;
  targetYear: number;
  daysRemaining: number;
} {
  const currentVal = currentMonth * 100 + currentDay;
  let targetSeason = HARVEST_SEASONS[0];
  let targetYear = currentYear;

  if (currentVal < 515) {
    targetSeason = HARVEST_SEASONS[0]; // Vụ Chiêm 15/5 năm nay
    targetYear = currentYear;
  } else if (currentVal < 1015) {
    targetSeason = HARVEST_SEASONS[1]; // Vụ Mùa 15/10 năm nay
    targetYear = currentYear;
  } else {
    targetSeason = HARVEST_SEASONS[0]; // Vụ Chiêm 15/5 năm sau
    targetYear = currentYear + 1;
  }

  // Đếm ngày còn lại tới mốc thu hoạch
  let days = 0;
  let d = currentDay;
  let m = currentMonth;
  let y = currentYear;

  const daysInMonth = (monthVal: number, yearVal: number) => {
    if (monthVal === 2) return yearVal % 4 === 0 ? 29 : 28;
    return [4, 6, 9, 11].includes(monthVal) ? 30 : 31;
  };

  while (!(d === targetSeason.day && m === targetSeason.month && y === targetYear) && days < 400) {
    days++;
    d++;
    if (d > daysInMonth(m, y)) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }

  return {
    season: targetSeason,
    targetDay: targetSeason.day,
    targetMonth: targetSeason.month,
    targetYear,
    daysRemaining: days,
  };
}

export interface SeasonClimateOutcome {
  condition: 'bountiful' | 'normal' | 'poor';
  mult: number;
  label: string;
  note: string;
}

// Xác suất thời tiết vụ mùa: Vụ Mùa (mùa mưa bão) tỷ lệ mất mùa cao hơn
export function rollSeasonClimate(seasonId: 'chiem' | 'mua'): SeasonClimateOutcome {
  const rand = Math.random();

  if (seasonId === 'chiem') {
    // Vụ Chiêm Tháng 5: Thời tiết ấm áp, thuận lợi
    if (rand < 0.45) {
      return {
        condition: 'bountiful',
        mult: 1.25,
        label: 'Được mùa bội thu (+25%)',
        note: 'Nắng ấm đầu hạ chan hòa, bông lúa chiêm hạt nào hạt nấy mẩy căng.',
      };
    }
    if (rand < 0.85) {
      return {
        condition: 'normal',
        mult: 1.0,
        label: 'Mưa thuận gió hòa',
        note: 'Thời tiết ôn hòa đúng tiết khí, sản lượng đạt mức tiêu chuẩn.',
      };
    }
    return {
      condition: 'poor',
      mult: 0.8,
      label: 'Hạn hán mất mùa nhẹ (-20%)',
      note: 'Cuối xuân ít mưa nguồn, lúa trổ đòng bị khô hạn nhẹ.',
    };
  }

  // Vụ Mùa Tháng 10: Mùa mưa bão lũ lụt miền Trung (Sông Mã - Sông Chu)
  if (rand < 0.40) {
    return {
      condition: 'poor',
      mult: 0.65,
      label: 'Mưa bão ngập úng (-35%)',
      note: 'Mưa bão lũ lụt đổ về miền Trung dâng ngập bờ cõi, nhiều ruộng trũng bị thất bát.',
    };
  }
  if (rand < 0.75) {
    return {
      condition: 'normal',
      mult: 1.0,
      label: 'Mưa thuận gió hòa',
      note: 'Nghĩa quân gia cố đê điều thành công, vượt qua mùa mưa bình an.',
    };
  }
  return {
    condition: 'bountiful',
    mult: 1.25,
    label: 'Được mùa bội thu (+25%)',
    note: 'Đất phù sa màu mỡ đọng lại sau lũ, lúa mùa trúng lớn khắp các đồn điền.',
  };
}

export interface FarmMicroEvent {
  eventName: string;
  mult: number;
}

// Biến cố ngẫu nhiên trên từng thửa ruộng khi gặt lúa
export function rollFarmMicroEvent(): FarmMicroEvent {
  const rand = Math.random();
  if (rand < 0.20) {
    return { eventName: 'Phù sa bồi đắp (+25%)', mult: 1.25 };
  }
  if (rand < 0.40) {
    return { eventName: 'Sâu bọ cắn phá (-25%)', mult: 0.75 };
  }
  if (rand < 0.55) {
    return { eventName: 'Chuột đồng quấy phá (-15%)', mult: 0.85 };
  }
  if (rand < 0.75) {
    return { eventName: 'Đắp bờ chăm bón khéo (+15%)', mult: 1.15 };
  }
  return { eventName: 'Bình ổn (không biến cố)', mult: 1.0 };
}
