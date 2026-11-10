import type { StateCreator } from 'zustand';
import type { GameStore } from './types';
import type { BattlefieldState } from '../../types/battlefield';
import { generateBattlefieldTerrain, determineScaleFromTroops } from '../../utils/battlefieldTerrainGenerator';
import { mapArmiesToBattlefield } from '../../utils/battlefieldArmyMapper';
import { resolveBattlefieldTick } from '../../utils/battlefieldCombatEngine';
import { notify } from '../dialogStore';

export interface BattleSlice {
  currentBattle: BattlefieldState | null;
  isBattleModalOpen: boolean;
  battleResultToReport: BattlefieldState | null;

  startBattle: (params: {
    formationId: string;
    mingTroops: number;
    battleName: string;
    locationName: string;
    mapCol: number;
    mapRow: number;
    targetCityId?: string;
  }) => void;

  startSandboxBattle: (params: {
    formation: any;
    mingTroops: number;
    battleName: string;
    locationName: string;
    mapCol: number;
    mapRow: number;
    customTerrainPreset?: string;
  }) => void;

  restartBattle: () => void;
  tickBattle: () => void;
  setBattleStance: (stance: 'advancing' | 'holding') => void;
  retreatBattle: () => void;
  closeBattleModal: () => void;
  closeBattleResultModal: () => void;
}

export const createBattleSlice: StateCreator<GameStore, [], [], BattleSlice> = (set, get) => ({
  currentBattle: null,
  isBattleModalOpen: false,
  battleResultToReport: null,

  startSandboxBattle: (params) => {
    const state = get();
    const { formation, mingTroops, battleName, locationName, mapCol, mapRow } = params;

    const lamSonTroops = formation.totalTroops || 10;
    const scale = determineScaleFromTroops(lamSonTroops, mingTroops);
    const grid = generateBattlefieldTerrain(mapCol, mapRow, scale);
    const units = mapArmiesToBattlefield(formation, state.generals, mingTroops, scale);

    const actualLamSonTroops = units
      .filter(u => u.faction === 'lam_son')
      .reduce((sum, u) => sum + u.soldiersCount, 0);

    const actualMingTroops = units
      .filter(u => u.faction === 'ming')
      .reduce((sum, u) => sum + u.soldiersCount, 0);

    const newBattle: BattlefieldState = {
      id: `sandbox_battle_${Date.now()}`,
      isSandbox: true,
      sandboxParams: params,
      battleName,
      locationName,
      scale,
      grid,
      units,
      turn: 0,
      maxTurns: 999,
      phase: 'in_progress',
      lamSonMorale: 100,
      mingMorale: 100,
      initialLamSonSoldiers: actualLamSonTroops,
      initialMingSoldiers: actualMingTroops,
      casualties: {
        lamSonKilled: 0,
        mingKilled: 0,
        weaponsLost: 0,
        weaponsCaptured: 0,
        foodCaptured: 0,
        goldCaptured: 0,
      },
      logs: [
        {
          id: `log_init_${Date.now()}`,
          turn: 0,
          canhHour: 'Canh 1',
          type: 'system',
          message: `⚔️ [Tester Sandbox] Bắt đầu thao diễn chiến trận tại ${locationName}! [${formation.name}] (${actualLamSonTroops} quân) đối đầu ${actualMingTroops} quân Minh!`,
        },
      ],
    };

    set({
      isPaused: true,
      currentBattle: newBattle,
      isBattleModalOpen: true,
      battleResultToReport: null,
    });

    notify.info(`Đã mở Diễn Võ Trường: [${formation.name}] nghênh chiến ${actualMingTroops} quân Minh!`);
  },

  restartBattle: () => {
    const { currentBattle } = get();
    if (!currentBattle || !currentBattle.isSandbox || !currentBattle.sandboxParams) return;
    get().startSandboxBattle(currentBattle.sandboxParams);
  },

  startBattle: ({
    formationId,
    mingTroops,
    battleName,
    locationName,
    mapCol,
    mapRow,
    targetCityId: _targetCityId,
  }) => {
    const state = get();
    const formation = state.formations.find(f => f.id === formationId);
    if (!formation) {
      notify.error('Không tìm thấy đạo quân tham chiến!');
      return;
    }

    const lamSonTroops = formation.totalTroops || 10;
    const scale = determineScaleFromTroops(lamSonTroops, mingTroops);
    const grid = generateBattlefieldTerrain(mapCol, mapRow, scale);
    const units = mapArmiesToBattlefield(formation, state.generals, mingTroops, scale);

    const actualLamSonTroops = units
      .filter(u => u.faction === 'lam_son')
      .reduce((sum, u) => sum + u.soldiersCount, 0);

    const actualMingTroops = units
      .filter(u => u.faction === 'ming')
      .reduce((sum, u) => sum + u.soldiersCount, 0);

    const newBattle: BattlefieldState = {
      id: `battle_${Date.now()}_${formationId}`,
      battleName,
      locationName,
      scale,
      grid,
      units,
      turn: 0,
      maxTurns: 999,
      phase: 'in_progress',
      lamSonMorale: 100,
      mingMorale: 100,
      initialLamSonSoldiers: actualLamSonTroops,
      initialMingSoldiers: actualMingTroops,
      casualties: {
        lamSonKilled: 0,
        mingKilled: 0,
        weaponsLost: 0,
        weaponsCaptured: 0,
        foodCaptured: 0,
        goldCaptured: 0,
      },
      logs: [
        {
          id: `log_init_${Date.now()}`,
          turn: 0,
          canhHour: 'Canh 1',
          type: 'system',
          message: `⚔️ Giao tranh bùng nổ tại ${locationName}! [${formation.name}] (${lamSonTroops} quân) đối đầu ${mingTroops} quân Minh!`,
        },
      ],
    };

    // Tạm dừng thời gian trò chơi khi mở bàn cờ chiến trận
    set({
      isPaused: true,
      currentBattle: newBattle,
      isBattleModalOpen: true,
      battleResultToReport: null,
    });

    notify.warning(`Chiến sự bùng nổ: [${formation.name}] nghênh chiến ${mingTroops} quân Minh tại ${locationName}!`);
  },

  tickBattle: () => {
    const { currentBattle } = get();
    if (!currentBattle || currentBattle.phase !== 'in_progress') return;

    const nextBattle = resolveBattlefieldTick(currentBattle);

    // Kiểm tra nếu trận đánh kết thúc (thắng hoặc bại)
    if (nextBattle.phase === 'victory' || nextBattle.phase === 'defeat') {
      if (nextBattle.isSandbox) {
        set({
          currentBattle: nextBattle,
          isBattleModalOpen: false,
          battleResultToReport: nextBattle,
        });
        if (nextBattle.phase === 'victory') {
          notify.success('🏆 [Tester Sandbox] Đại Thắng Chiến Trận Thao Diễn!');
        } else {
          notify.error('💀 [Tester Sandbox] Chiến Trận Thao Diễn Thất Bại!');
        }
        return;
      }
      const state = get();
      const formation = state.formations.find(f => f.id === currentBattle.id.split('_')[2]);

      // Khấu trừ thương vong cho đạo quân Lam Sơn
      const casualties = nextBattle.casualties;
      let nextFormations = state.formations;

      if (formation) {
        const remainingTroops = Math.max(0, formation.totalTroops - casualties.lamSonKilled);
        nextFormations = state.formations.map(f => {
          if (f.id === formation.id) {
            return {
              ...f,
              totalTroops: remainingTroops,
              status: nextBattle.phase === 'defeat' ? ('retreating' as const) : ('stationed' as const),
            };
          }
          return f;
        });
      }

      // Khấu trừ quân Minh từ thành trì mục tiêu (nếu có)
      const nextCities = state.cities.map(c => {
        if (c.faction === 'ming' && formation?.engagedTargetCityId === c.id) {
          const nextTroops = Math.max(0, c.troops - casualties.mingKilled);
          return { ...c, troops: nextTroops };
        }
        return c;
      });

      // Chỉ cộng tài nguyên chiến lợi phẩm nếu thắng trận
      const nextResources = nextBattle.phase === 'victory' ? {
        ...state.resources,
        food: state.resources.food + casualties.foodCaptured,
        gold: state.resources.gold + casualties.goldCaptured,
        swords: state.resources.swords + Math.ceil(casualties.weaponsCaptured * 0.4),
        bows: state.resources.bows + Math.floor(casualties.weaponsCaptured * 0.3),
        spears: state.resources.spears + (casualties.weaponsCaptured - Math.ceil(casualties.weaponsCaptured * 0.4) - Math.floor(casualties.weaponsCaptured * 0.3)),
      } : state.resources;

      set({
        currentBattle: nextBattle,
        isBattleModalOpen: false,
        battleResultToReport: nextBattle,
        formations: nextFormations,
        cities: nextCities,
        resources: nextResources,
      });

      if (nextBattle.phase === 'victory') {
        notify.success(`Đại Thắng! Thu giữ ${casualties.weaponsCaptured} vũ khí, ${casualties.foodCaptured} lương thảo!`);
      } else {
        notify.error(`Thất bại tại chiến trường! Quân ta thương vong ${casualties.lamSonKilled} binh sĩ!`);
      }
    } else {
      set({ currentBattle: nextBattle });
    }
  },

  setBattleStance: (stance: 'advancing' | 'holding') => {
    const { currentBattle } = get();
    if (!currentBattle || currentBattle.phase !== 'in_progress') return;

    const nextUnits = currentBattle.units.map(u => {
      if (u.faction === 'lam_son' && u.status !== 'eliminated' && u.status !== 'routing') {
        if (u.unitTypeId === 'supply_cart') return u;
        return {
          ...u,
          status: stance,
        };
      }
      return u;
    });

    set({
      currentBattle: {
        ...currentBattle,
        units: nextUnits,
      },
    });
  },

  retreatBattle: () => {
    const { currentBattle } = get();
    if (!currentBattle) return;

    const state = get();
    const retreatedBattle: BattlefieldState = {
      ...currentBattle,
      phase: 'retreated',
      casualties: {
        ...currentBattle.casualties,
        weaponsCaptured: 0,
        foodCaptured: 0,
        goldCaptured: 0,
      },
    };

    const formationId = currentBattle.id.split('_')[2];
    const nextFormations = currentBattle.isSandbox
      ? state.formations
      : state.formations.map(f => {
      if (f.id === formationId) {
        return {
          ...f,
          status: 'retreating' as const,
          totalTroops: Math.max(0, f.totalTroops - currentBattle.casualties.lamSonKilled),
        };
      }
      return f;
    });

    set({
      currentBattle: retreatedBattle,
      isBattleModalOpen: false,
      battleResultToReport: retreatedBattle,
      formations: nextFormations,
    });

    notify.warning('Nghĩa quân đã hạ lệnh thu quân rút lui để bảo toàn lực lượng!');
  },

  closeBattleModal: () => {
    set({ isBattleModalOpen: false });
  },

  closeBattleResultModal: () => {
    set({ battleResultToReport: null });
  },
});
