import type { TacticalFormation } from '../types/armyFormation';
import type { General } from '../types';
import type { BattlefieldScaleLevel, BattlefieldUnit } from '../types/battlefield';

export function mapArmiesToBattlefield(
  lamSonFormation: TacticalFormation,
  generals: General[],
  mingTroopsCount: number,
  scale: BattlefieldScaleLevel
): BattlefieldUnit[] {
  const result: BattlefieldUnit[] = [];

  // 1. Ánh xạ toàn bộ quân Lam Sơn từ Sa Bàn 32x32 vào Cột 0..31
  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 32; c++) {
      const cell = lamSonFormation.grid[r]?.[c];
      if (cell && cell.isRoot) {
        const genId = cell.generalId || (cell.unitTypeId === 'general' ? lamSonFormation.commanderGeneralId : undefined);
        const general = genId ? generals.find(g => g.id === genId) : undefined;
        const count = Math.max(1, cell.soldiersCount || 10);
        const hp = cell.hp || count * 10;
        const maxHp = cell.maxHp || hp;

        result.push({
          id: `ls_${cell.id}`,
          formationId: lamSonFormation.id,
          faction: 'lam_son',
          unitTypeId: cell.unitTypeId,
          col: cell.col,
          row: cell.row,
          spanCols: cell.spanCols || 1,
          spanRows: cell.spanRows || 1,
          soldiersCount: count,
          maxSoldiersCount: count,
          hp,
          maxHp,
          morale: cell.morale || 100,
          generalId: genId || undefined,
          generalName: general?.name,
          commandAuraRadius: general ? 4 + Math.floor(general.stats.command / 30) : 4,
          weaponsBreakdown: cell.weaponsBreakdown || { swords: Math.ceil(count / 2), bows: Math.floor(count / 2), spears: 0 },
          status: 'holding',
          hasActedThisTurn: false,
        });
      }
    }
  }

  // 2. Sinh lực lượng quân Minh ở cánh phải (Cột 64..95) theo Trọng Lượng Quân Cờ
  // Xác định số lượng đơn vị giặc theo scale
  let targetUnitCount: number;
  let unitSoldiersBase: number;

  switch (scale) {
    case '100x':
      targetUnitCount = Math.min(40, Math.max(20, Math.round(mingTroopsCount / 2000)));
      unitSoldiersBase = Math.round(mingTroopsCount / targetUnitCount);
      break;
    case '10x':
      targetUnitCount = Math.min(32, Math.max(16, Math.round(mingTroopsCount / 250)));
      unitSoldiersBase = Math.round(mingTroopsCount / targetUnitCount);
      break;
    case '1x':
    default:
      targetUnitCount = Math.min(24, Math.max(8, Math.round(mingTroopsCount / 35)));
      unitSoldiersBase = Math.round(mingTroopsCount / targetUnitCount);
      break;
  }

  let remainingTroops = mingTroopsCount;
  const occupiedPositions = new Set<string>();

  // Sinh vị trí ngẫu nhiên nhưng theo hàng lối quân đội:
  // Tiên phong (Cột 66..72), Trung quân (Cột 74..80), Hậu quân (Cột 82..90)
  for (let i = 0; i < targetUnitCount; i++) {
    const isCommander = i === targetUnitCount - 1;
    let unitType: BattlefieldUnit['unitTypeId'] = 'swordsman';
    let targetColMin = 66;
    let targetColMax = 72;

    if (isCommander) {
      unitType = 'general';
      targetColMin = 86;
      targetColMax = 92;
    } else if (i < targetUnitCount * 0.4) {
      unitType = i % 2 === 0 ? 'swordsman' : 'spearman';
      targetColMin = 66;
      targetColMax = 72;
    } else if (i < targetUnitCount * 0.75) {
      unitType = 'archer';
      targetColMin = 74;
      targetColMax = 82;
    } else {
      unitType = i % 2 === 0 ? 'cavalry' : 'supply_cart';
      targetColMin = 83;
      targetColMax = 90;
    }

    // Tìm tọa độ trống
    let placedCol = targetColMin;
    let placedRow = 4 + (i % 24);
    let attempts = 0;

    while (attempts < 50) {
      const col = targetColMin + Math.floor(Math.random() * (targetColMax - targetColMin + 1));
      const row = 4 + Math.floor(Math.random() * 24);
      const key = `${col},${row}`;
      if (!occupiedPositions.has(key)) {
        placedCol = col;
        placedRow = row;
        occupiedPositions.add(key);
        break;
      }
      attempts++;
    }

    // Phân bổ quân số
    const isLast = i === targetUnitCount - 1;
    const count = isLast 
      ? Math.max(1, remainingTroops) 
      : Math.min(remainingTroops, Math.max(1, Math.round(unitSoldiersBase * (0.8 + Math.random() * 0.4))));
    remainingTroops = Math.max(0, remainingTroops - count);

    const hp = count * 10;
    const maxHp = hp;

    result.push({
      id: `ming_unit_${i + 1}`,
      formationId: 'ming_army',
      faction: 'ming',
      unitTypeId: unitType,
      col: placedCol,
      row: placedRow,
      spanCols: unitType === 'cavalry' ? 2 : unitType === 'supply_cart' ? 2 : 1,
      spanRows: unitType === 'cavalry' ? 2 : unitType === 'supply_cart' ? 2 : 1,
      soldiersCount: count,
      maxSoldiersCount: count,
      hp,
      maxHp,
      morale: 100,
      generalName: isCommander ? 'Chủ Tướng Quân Minh' : undefined,
      commandAuraRadius: isCommander ? 5 : undefined,
      weaponsBreakdown: {
        swords: unitType === 'swordsman' || unitType === 'cavalry' ? count : 0,
        bows: unitType === 'archer' ? count : 0,
        spears: unitType === 'spearman' ? count : 0,
      },
      status: 'advancing',
      hasActedThisTurn: false,
    });
  }

  return result;
}
