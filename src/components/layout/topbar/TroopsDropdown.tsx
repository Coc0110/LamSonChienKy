import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Swords, Users, HeartHandshake } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';

export const TroopsDropdown: React.FC = React.memo(() => {
  const cities = useGameStore(state => state.cities);
  const structures = useGameStore(state => state.structures);
  const formations = useGameStore(state => state.formations);
  const horses = useGameStore(state => state.resources.horses);
  const elephants = useGameStore(state => state.resources.elephants);

  const activeDropdown = useUIStore(state => state.activeDropdown);
  const toggleDropdown = useUIStore(state => state.toggleDropdown);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 38, left: 180 });

  const isOpen = activeDropdown === 'troops';

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 270;
      const left = Math.max(8, Math.min(rect.left - 10, window.innerWidth - panelWidth - 8));
      const top = window.innerWidth >= 768 ? 38 : 34;
      setPanelPos({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // TÍNH TOÁN TỔNG QUÂN SỐ TẤT CẢ (BAO GỒM NGHĨA BINH, TRÁNG ĐINH, NGƯỜI GIÀ TRẺ NHỎ)
  const populationStats = useMemo(() => {
    let combatTroops = 0;
    let idleLaborers = 0;
    let farmLaborers = 0;
    let forgeLaborers = 0;
    let unfitPopulation = 0;
    let trainingCount = 0;
    let campBuilders = 0;

    // Duyệt qua tất cả căn cứ thuộc phe Lam Sơn
    cities.forEach(c => {
      if (c.faction === 'lam_son') {
        if (c.population) {
          combatTroops += c.population.combatTroops || 0;
          idleLaborers += c.population.idleLaborers || 0;
          farmLaborers += c.population.farmLaborers || 0;
          forgeLaborers += c.population.forgeLaborers || 0;
          unfitPopulation += c.population.unfitPopulation || 0;
        } else {
          combatTroops += c.troops || 0;
        }
        if (c.training) {
          trainingCount += c.training.traineesCount || 0;
        }
        if (c.upgrading) {
          campBuilders += c.upgrading.builders || 0;
        }
      }
    });

    // Thợ thi công công trình đang xây dựng
    let structureBuilders = 0;
    structures.forEach(s => {
      if (s.status === 'building') {
        structureBuilders += s.builderWorkers || 0;
      }
    });

    // Quân nhân đã biên chế trong các đạo quân
    let formationTroops = 0;
    formations.forEach(f => {
      formationTroops += f.totalTroops || 0;
    });

    // Tổng quân số tác chiến (dự bị tại căn cứ + trong đạo quân)
    const totalCombatPersonnel = combatTroops + formationTroops;

    let swappedCombatants = 0;
    cities.forEach(c => {
      if (c.faction === 'lam_son' && c.population) {
        swappedCombatants += c.population.swappedCombatants || 0;
      }
    });

    // Tổng tráng đinh lao động (nhàn rỗi, làm ruộng, rèn đúc, thao luyện, thi công)
    const totalLaborers = idleLaborers + farmLaborers + forgeLaborers + trainingCount + campBuilders + structureBuilders;

    // TỔNG QUÂN SỐ TOÀN DIỆN CẢ NGHĨA QUÂN (Bao gồm cả tráng đinh và người già trẻ nhỏ)
    const totalAllPeople = totalCombatPersonnel + totalLaborers + unfitPopulation;

    return {
      totalAllPeople,
      totalCombatPersonnel,
      totalLaborers,
      unfitPopulation,
      idleLaborers,
      farmLaborers,
      forgeLaborers,
      trainingCount,
      swappedCombatants,
    };
  }, [cities, structures, formations]);

  // Thống kê thực tế quân số theo từng binh chủng từ các đạo quân + số quân dự bị tại các căn cứ
  const breakdown = useMemo(() => {
    let formSwords = 0;
    let formBows = 0;
    let formSpears = 0;
    let formCavalry = 0;
    let formElephants = 0;
    let formOtherTroops = 0;

    formations.forEach(f => {
      const seen = new Set<string>();
      f.grid.forEach(row => {
        row.forEach(cell => {
          if (cell && !seen.has(cell.parentUnitId)) {
            seen.add(cell.parentUnitId);
            const mult = cell.multiplier || 1;
            if (cell.type === 'swordsman') formSwords += mult;
            else if (cell.type === 'archer') formBows += mult;
            else if (cell.type === 'spearman') formSpears += mult;
            else if (cell.type === 'cavalry' || cell.type === 'scout') formCavalry += mult;
            else if (cell.type === 'elephant') formElephants += mult;
            else if (cell.type === 'supply_cart') formOtherTroops += mult;
          }
        });
      });
    });

    const totalAssignedInFormations = formSwords + formBows + formSpears + formCavalry + formElephants + formOtherTroops;
    const unassignedCombatants = Math.max(0, populationStats.totalCombatPersonnel - totalAssignedInFormations);

    const reserveSwords = Math.floor(unassignedCombatants * 0.45);
    const reserveBows = Math.floor(unassignedCombatants * 0.25);
    const reserveSpears = Math.max(0, unassignedCombatants - reserveSwords - reserveBows);

    return {
      swordTroops: formSwords + reserveSwords,
      bowTroops: formBows + reserveBows,
      spearTroops: formSpears + reserveSpears + formOtherTroops,
      cavalryTroops: formCavalry + Math.floor(horses),
      elephantTroops: formElephants + Math.floor(elephants),
    };
  }, [formations, populationStats.totalCombatPersonnel, horses, elephants]);

  return (
    <div className="relative topbar-dropdown-container shrink-0 self-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown('troops');
        }}
        className={`relative px-1.5 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
          isOpen ? 'scale-105' : 'hover:bg-black/[0.04] active:scale-95'
        }`}
        title={`Tổng quân dân: ${populationStats.totalAllPeople.toLocaleString()} người (${populationStats.totalCombatPersonnel.toLocaleString()} nghĩa binh, ${populationStats.totalLaborers.toLocaleString()} tráng đinh, ${populationStats.unfitPopulation.toLocaleString()} già yếu/trẻ nhỏ)`}
      >
        {!isOpen && (
          <img 
            src="/icons/soldier_bust.png" 
            alt="Quân" 
            className="w-8 h-8 object-contain relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
        )}
        {isOpen ? (
          <div className="relative px-3.5 py-1 flex items-center justify-center">
            <img
              src="/ink_stroke_1.png"
              alt="Vết mực"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
            <span className="relative z-10 font-serif font-bold text-xs md:text-sm text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              Quân: {populationStats.totalAllPeople.toLocaleString()}
            </span>
          </div>
        ) : (
          <span className="relative z-10 font-serif font-bold text-[#2a1708]">
            Quân: {populationStats.totalAllPeople.toLocaleString()}
          </span>
        )}
      </button>

      {/* TỜ GIẤY THÔNG TIN QUÂN SỰ KHUẤT DƯỚI LỚP GIẤY THANH TRÊN (z-30) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ top: `${panelPos.top}px`, left: `${panelPos.left}px` }}
          className="fixed z-30 w-[270px] flex flex-col pointer-events-auto filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.75)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-150 topbar-paper-panel select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Nền giấy dó sứt mẻ tự nhiên */}
          <img
            src="/parchment_torn_panel.png"
            alt="Giấy quân lệnh"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            draggable={false}
          />

          <div className="relative z-10 px-4 pt-11 pb-4 flex flex-col font-serif">
            {/* Dòng 1: Tổng nhân khẩu nghĩa quân (toàn diện) */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#8c6b44]/35">
              <span className="font-serif font-black text-xs uppercase tracking-wider text-[#5c3e23]">
                Tổng Quân Dân:
              </span>
              <span className="font-serif font-black text-lg text-[#8c2d19]">
                {populationStats.totalAllPeople.toLocaleString()} người
              </span>
            </div>

            {/* Dòng 2: Cơ cấu 3 nhóm nhân lực */}
            <div className="space-y-1 pb-2 mb-2 border-b border-[#8c6b44]/25 text-[11.5px] font-serif text-[#3a220f]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-[#8c2d19]">
                  <Swords size={13} className="shrink-0" />
                  Nghĩa binh tác chiến:
                </span>
                <span className="font-black text-[#8c2d19]">
                  {populationStats.totalCombatPersonnel.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-[#2b593f]">
                  <Users size={13} className="shrink-0" />
                  Tráng đinh (ruộng, rèn, thợ):
                </span>
                <span className="font-bold text-[#1e3a29]">
                  {populationStats.totalLaborers.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-[#785434]">
                  <HeartHandshake size={13} className="shrink-0" />
                  Già yếu, phụ nữ, trẻ nhỏ:
                </span>
                <span className="font-bold text-[#5c3e23]">
                  {populationStats.unfitPopulation.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Tiêu đề mục binh chủng */}
            <div className="text-[10.5px] font-serif font-bold uppercase tracking-wider text-[#734e2e] mb-1">
              Biên Chế Binh Chủng ({populationStats.totalCombatPersonnel} binh):
            </div>

            {/* Danh sách 5 Binh Chủng Chiến Đấu */}
            <div className="space-y-1 text-xs text-[#2a1708]">
              {/* 1. Quân binh (Kiếm) */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img 
                    src="/icons/unit_sword.png" 
                    alt="Quân binh" 
                    className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-xs text-[#261304]">
                    Quân Binh (Kiếm)
                  </span>
                </div>
                <span className="font-serif font-black text-sm text-[#8c2d19]">
                  {breakdown.swordTroops.toLocaleString()}
                </span>
              </div>

              {/* 2. Cung thủ */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img 
                    src="/icons/unit_bow.png" 
                    alt="Cung thủ" 
                    className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-xs text-[#261304]">
                    Cung Thủ
                  </span>
                </div>
                <span className="font-serif font-black text-sm text-[#8c2d19]">
                  {breakdown.bowTroops.toLocaleString()}
                </span>
              </div>

              {/* 3. Trường thương binh */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img 
                    src="/icons/unit_spear.png" 
                    alt="Giáo binh" 
                    className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-xs text-[#261304]">
                    Trường Thương Binh
                  </span>
                </div>
                <span className="font-serif font-black text-sm text-[#8c2d19]">
                  {breakdown.spearTroops.toLocaleString()}
                </span>
              </div>

              {/* 4. Thiết kỵ binh */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img 
                    src="/icons/unit_cavalry.png" 
                    alt="Kỵ binh" 
                    className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-xs text-[#261304]">
                    Thiết Kỵ Binh
                  </span>
                </div>
                <span className="font-serif font-black text-sm text-[#8c2d19]">
                  {breakdown.cavalryTroops.toLocaleString()}
                </span>
              </div>

              {/* 5. Thiết tượng binh */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-black/[0.04] transition">
                <div className="flex items-center gap-2">
                  <img 
                    src="/icons/unit_elephant.png" 
                    alt="Tượng binh" 
                    className="w-8 h-8 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0" 
                  />
                  <span className="font-serif font-bold text-xs text-[#261304]">
                    Thiết Tượng Binh
                  </span>
                </div>
                <span className="font-serif font-black text-sm text-[#8c2d19]">
                  {breakdown.elephantTroops.toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

TroopsDropdown.displayName = 'TroopsDropdown';
