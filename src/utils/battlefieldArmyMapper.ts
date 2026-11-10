import type { TacticalFormation } from '../types/armyFormation';
import { TACTICAL_UNIT_CONFIGS } from '../types/armyFormation';
import type { General } from '../types';
import type { BattlefieldScaleLevel, BattlefieldUnit } from '../types/battlefield';

export function mapArmiesToBattlefield(
  lamSonFormation: TacticalFormation,
  generals: General[],
  mingTroopsCount: number,
  scale: BattlefieldScaleLevel
): BattlefieldUnit[] {
  const result: BattlefieldUnit[] = [];

  // 1. ÁNH XẠ SA BÀN LAM SƠN 32x32 VÀO CÁNH TẢ (CỘT 0..31, HÀNG 0..31)
  // Xoay 90 độ theo chiều kim đồng hồ để hướng Tiên phong (Hàng 0 trên Sa bàn) hướng sang phải (Cột 31 trên Chiến trường)
  // - Sa bàn: Hàng 0 = Tiên phong (đối diện giặc), Hàng 31 = Hậu phương.
  // - Bàn cờ ngang: Cột 31 = Tiên phong (áp sát trung lộ), Cột 0 = Hậu phương.
  // - Sa bàn: Cột 0 = Cánh Tả, Cột 31 = Cánh Hữu -> Bàn cờ ngang: Hàng 0 = Cánh Tả (Bắc), Hàng 31 = Cánh Hữu (Nam).
  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 32; c++) {
      const cell = lamSonFormation.grid[r]?.[c];
      if (cell && cell.isRoot) {
        const genId = cell.generalId || (cell.type === 'general' ? lamSonFormation.commanderGeneralId : undefined);
        const general = genId ? generals.find(g => g.id === genId) : undefined;
        
        const unitCfg = TACTICAL_UNIT_CONFIGS[cell.type];
        const origSpanCols = unitCfg?.spanCols || 1;
        const origSpanRows = unitCfg?.spanRows || 1;
        
        // Khi xoay 90 độ: spanRows trở thành spanCols, spanCols trở thành spanRows
        const spanCols = origSpanRows;
        const spanRows = origSpanCols;
        
        // Tọa độ mới sau khi xoay 90 độ:
        const mappedCol = 31 - (cell.row + origSpanRows - 1);
        const mappedRow = cell.col;
        
        const troopsBase = unitCfg?.cost.combatTroops || 1;
        const multiplier = cell.multiplier || 1;
        const count = Math.max(1, troopsBase * multiplier);
        
        const hp = cell.hp || count * 10;
        const maxHp = cell.maxHp || hp;

        // Binh chủng cận chiến tiên phong sẽ chủ động xuất kích đón đánh địch; Cung thủ và Tướng giữ thế trận yểm trợ
        const isCombatUnit = cell.type !== 'supply_cart';

        result.push({
          id: `ls_${cell.id}`,
          formationId: lamSonFormation.id,
          faction: 'lam_son',
          unitTypeId: cell.type,
          col: Math.max(0, Math.min(31, mappedCol)),
          row: Math.max(0, Math.min(31, mappedRow)),
          spanCols,
          spanRows,
          soldiersCount: count,
          maxSoldiersCount: count,
          hp,
          maxHp,
          morale: cell.morale || 100,
          generalId: genId || undefined,
          generalName: general?.name,
          commandAuraRadius: general ? 4 + Math.floor(general.stats.command / 30) : 4,
          weaponsBreakdown: cell.weaponsBreakdown || { swords: Math.ceil(count / 2), bows: Math.floor(count / 2), spears: 0 },
          status: isCombatUnit ? 'advancing' : 'holding',
          hasActedThisTurn: false,
        });
      }
    }
  }

  // 2. SINH LỰC LƯỢNG QUÂN MINH Ở CÁNH PHẢI (CỘT 64..95) THEO TRỌNG LƯỢNG QUÂN CỜ
  // Đảm bảo mỗi quân cờ của giặc có đủ quân số thực tế (tối thiểu 15-25 lính ở 1x, không sinh ra quân cờ 1 lính)
  let minSoldiersPerUnit = 20;
  let maxUnits = 20;

  switch (scale) {
    case '100x':
      minSoldiersPerUnit = 500;
      maxUnits = 36;
      break;
    case '10x':
      minSoldiersPerUnit = 80;
      maxUnits = 28;
      break;
    case '1x':
    default:
      minSoldiersPerUnit = 20;
      maxUnits = 18;
      break;
  }

  const targetUnitCount = Math.min(maxUnits, Math.max(1, Math.round(mingTroopsCount / minSoldiersPerUnit)));
  const baseCountPerUnit = Math.floor(mingTroopsCount / targetUnitCount);
  let remainingTroops = mingTroopsCount;

  const occupiedPositions = new Set<string>();

  // Sinh vị trí theo hàng ngũ: Tiên phong (Cột 66..72), Trung quân (Cột 74..80), Hậu quân (Cột 82..90)
  for (let i = 0; i < targetUnitCount; i++) {
    const isCommander = i === targetUnitCount - 1 && targetUnitCount >= 3;
    let unitType: BattlefieldUnit['unitTypeId'] = 'swordsman';
    let targetColMin = 66;
    let targetColMax = 72;

    if (isCommander) {
      unitType = 'general';
      targetColMin = 86;
      targetColMax = 92;
    } else if (i < targetUnitCount * 0.45) {
      unitType = i % 2 === 0 ? 'swordsman' : 'spearman';
      targetColMin = 66;
      targetColMax = 74;
    } else if (i < targetUnitCount * 0.8) {
      unitType = 'archer';
      targetColMin = 75;
      targetColMax = 82;
    } else {
      unitType = i % 2 === 0 ? 'cavalry' : 'supply_cart';
      targetColMin = 83;
      targetColMax = 90;
    }

    let placedCol = targetColMin;
    let placedRow = 6 + (i * 2) % 20;
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

    const isLast = i === targetUnitCount - 1;
    const count = isLast ? Math.max(1, remainingTroops) : Math.max(1, Math.min(remainingTroops, baseCountPerUnit));
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
