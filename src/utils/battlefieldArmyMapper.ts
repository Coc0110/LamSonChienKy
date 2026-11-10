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
          // Toàn bộ quân Lam Sơn (kể cả xe lương) đều sẵn sàng hành quân tiến bước theo đội hình
          status: 'advancing',
          hasActedThisTurn: false,
        });
      }
    }
  }

  // 2. SINH LỰC LƯỢNG QUÂN MINH Ở CÁNH PHẢI (CỘT 64..95) THEO TRỌNG LƯỢNG QUÂN CỜ
  // QUY TẮC CHUẨN THEO YÊU CẦU:
  // - 1x (Tiểu trận): Mỗi quân cờ = đúng 1 người lính (tỷ lệ 1:1)
  // - 10x (Vạn quân): Mỗi quân cờ = đúng 10 người lính (tỷ lệ 1:10)
  // - 100x (Đại chiến): Mỗi quân cờ = đúng 100 người lính (tỷ lệ 1:100)
  const unitWeight = scale === '100x' ? 100 : scale === '10x' ? 10 : 1;
  const targetUnitCount = Math.max(1, Math.ceil(mingTroopsCount / unitWeight));
  let remainingTroops = mingTroopsCount;

  // Tính số hàng phù hợp để khối quân Minh dàn trận vuông vắn, quy củ
  let numRows = 24;
  if (targetUnitCount <= 30) {
    numRows = Math.min(targetUnitCount, 10);
  } else if (targetUnitCount <= 80) {
    numRows = 14;
  } else if (targetUnitCount <= 200) {
    numRows = 18;
  } else if (targetUnitCount <= 500) {
    numRows = 24;
  } else {
    numRows = 28;
  }

  const startRow = Math.floor((32 - numRows) / 2);
  const numCols = Math.ceil(targetUnitCount / numRows);
  const startCol = 66;

  for (let i = 0; i < targetUnitCount; i++) {
    const colOffset = Math.floor(i / numRows);
    const rowOffset = i % numRows;
    const placedCol = Math.min(94, startCol + colOffset);
    const placedRow = Math.min(30, startRow + rowOffset);

    // Phân bổ binh chủng theo chiều sâu chiến tuyến:
    // - Hàng đầu (Tiền phong, ~45% cột): Đao binh & Giáo binh
    // - Hàng giữa (Trung quân, ~35% cột): Cung nỏ binh
    // - Hàng cuối (Hậu quân): Kỵ binh & Xe vận lương
    // - Trung tâm hàng cuối: Soái tướng giặc Minh
    let unitType: BattlefieldUnit['unitTypeId'] = 'swordsman';
    const isCommander = (i === targetUnitCount - 1) || (colOffset === numCols - 1 && rowOffset === Math.floor(numRows / 2));

    if (isCommander) {
      unitType = 'general';
    } else if (colOffset < numCols * 0.45) {
      unitType = (colOffset + rowOffset) % 2 === 0 ? 'swordsman' : 'spearman';
    } else if (colOffset < numCols * 0.80) {
      unitType = 'archer';
    } else {
      unitType = (rowOffset % 3 === 0) ? 'supply_cart' : 'cavalry';
    }

    const isLast = i === targetUnitCount - 1;
    const count = isLast 
      ? Math.max(1, remainingTroops) 
      : Math.min(remainingTroops, unitWeight);
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
      spanCols: 1,
      spanRows: 1,
      soldiersCount: count,
      maxSoldiersCount: count,
      hp,
      maxHp,
      morale: 100,
      generalName: isCommander ? 'Quan Đô Ty Nhà Minh' : undefined,
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
