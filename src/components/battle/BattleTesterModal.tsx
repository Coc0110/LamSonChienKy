import React, { useState, useRef, useCallback, useMemo } from 'react';
import { X, Swords, Save, Trash2, RotateCcw, Shield, Bookmark, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { notify } from '../../store/dialogStore';
import type { TacticalPlacedUnit, TacticalFormation, TacticalUnitType } from '../../types/armyFormation';

const STORAGE_KEY = 'lamson_tester_saved_formations_v1';

interface SavedFormationItem {
  id: string;
  name: string;
  createdAt: number;
  grid: (TacticalPlacedUnit | null)[][];
  totalTroops: number;
  multiplier: 1 | 10;
}



export const BattleTesterModal: React.FC = () => {
  const isBattleTesterOpen = useUIStore(state => state.isBattleTesterOpen);
  const setBattleTesterOpen = useUIStore(state => state.setBattleTesterOpen);
  const startSandboxBattle = useGameStore(state => state.startSandboxBattle);

  // Trạng thái lưới 32x32 độc lập cho tester
  const [grid, setGrid] = useState<(TacticalPlacedUnit | null)[][]>(() => 
    Array.from({ length: 32 }, () => Array(32).fill(null))
  );

  // Công cụ đặt quân
  const [selectedTool, setSelectedTool] = useState<TacticalUnitType | 'eraser'>('swordsman');
  const [multiplier, setMultiplier] = useState<1 | 10>(1);

  // Cấu hình phe Minh
  const [mingTroops, setMingTroops] = useState<number>(480);



  // Quản lý danh sách đội hình đã lưu (Lazy init từ localStorage)
  const [savedList, setSavedList] = useState<SavedFormationItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [saveNameInput, setSaveNameInput] = useState<string>('Đội Hình Test 1');

  // Thao tác kéo chuột vẽ/tẩy
  const isMouseDownRef = useRef<boolean>(false);
  const isRightClickRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tính thống kê quân số tức thời
  const stats = useMemo(() => {
    let total = 0;
    const counts: Record<string, number> = {
      swordsman: 0,
      spearman: 0,
      archer: 0,
      cavalry: 0,
      elephant: 0,
      supply_cart: 0,
      general: 0,
    };

    for (let r = 0; r < 32; r++) {
      for (let c = 0; c < 32; c++) {
        const u = grid[r][c];
        if (u) {
          const mult = u.multiplier || 1;
          counts[u.type] = (counts[u.type] || 0) + mult;
          total += mult;
        }
      }
    }
    return { total, counts };
  }, [grid]);

  // Đặt/xóa ô đơn lẻ
  const applyToolAt = useCallback((r: number, c: number, tool: TacticalUnitType | 'eraser', mult: 1 | 10) => {
    if (r < 0 || r >= 32 || c < 0 || c >= 32) return;

    setGrid(prev => {
      const next = prev.map(row => [...row]);
      if (tool === 'eraser') {
        next[r][c] = null;
      } else {
        next[r][c] = {
          id: `test_u_${r}_${c}_${Date.now()}`,
          parentUnitId: `test_u_${r}_${c}`,
          type: tool,
          name: tool === 'general' ? 'Lê Lợi' : tool,
          rootRow: r,
          rootCol: c,
          col: c,
          row: r,
          isRoot: true,
          offsetCol: 0,
          offsetRow: 0,
          multiplier: mult,
          hp: mult * 10,
          maxHp: mult * 10,
          morale: 100,
          generalId: tool === 'general' ? 'le_loi' : undefined,
        };
      }
      return next;
    });
  }, []);

  // Event delegation chuột trên lưới 32x32
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isMouseDownRef.current = true;
    isRightClickRef.current = e.button === 2;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cellSize = rect.width / 32;
    const c = Math.floor((e.clientX - rect.left) / cellSize);
    const r = Math.floor((e.clientY - rect.top) / cellSize);

    const tool = isRightClickRef.current ? 'eraser' : selectedTool;
    applyToolAt(r, c, tool, multiplier);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cellSize = rect.width / 32;
    const c = Math.floor((e.clientX - rect.left) / cellSize);
    const r = Math.floor((e.clientY - rect.top) / cellSize);

    const tool = isRightClickRef.current ? 'eraser' : selectedTool;
    applyToolAt(r, c, tool, multiplier);
  };

  const handlePointerUp = () => {
    isMouseDownRef.current = false;
    isRightClickRef.current = false;
  };

  // Nạp Đội Hình Mẫu Dựng Sẵn
  const loadPresetFormation = (type: '70_scout' | '500_infantry' | '1500_x10' | 'cavalry_rush') => {
    const nextGrid: (TacticalPlacedUnit | null)[][] = Array.from({ length: 32 }, () => Array(32).fill(null));

    if (type === '70_scout') {
      // 70 quân: 20 Tiên phong Đao (Hàng 5-6), 20 Giáo (Hàng 7-8), 20 Cung (Hàng 9-10), 1 Tướng (Hàng 11, Col 16), 2 Xe Lương, 7 Kỵ guard
      let count = 0;
      // Front swordsmen
      for (let c = 8; c <= 23 && count < 20; c++) {
        nextGrid[5][c] = { id: `p_${5}_${c}`, parentUnitId: `p_${5}_${c}`, type: 'swordsman', name: 'Đao', rootRow: 5, rootCol: c, col: c, row: 5, isRoot: true, offsetCol: 0, offsetRow: 0, multiplier: 1, hp: 10, maxHp: 10, morale: 100 };
        count++;
      }
      // Spearmen
      count = 0;
      for (let c = 8; c <= 23 && count < 20; c++) {
        nextGrid[7][c] = { id: `p_${7}_${c}`, parentUnitId: `p_${7}_${c}`, type: 'spearman', name: 'Giáo', rootRow: 7, rootCol: c, col: c, row: 7, isRoot: true, offsetCol: 0, offsetRow: 0, multiplier: 1, hp: 10, maxHp: 10, morale: 100 };
        count++;
      }
      // Archers
      count = 0;
      for (let c = 8; c <= 23 && count < 20; c++) {
        nextGrid[9][c] = { id: `p_${9}_${c}`, parentUnitId: `p_${9}_${c}`, type: 'archer', name: 'Cung', rootRow: 9, rootCol: c, col: c, row: 9, isRoot: true, offsetCol: 0, offsetRow: 0, multiplier: 1, hp: 10, maxHp: 10, morale: 100 };
        count++;
      }
      // General & Guards & Carts
      nextGrid[11][16] = { id: 'p_gen', parentUnitId: 'p_gen', type: 'general', name: 'Lê Lợi', rootRow: 11, rootCol: 16, col: 16, row: 11, isRoot: true, offsetCol: 0, offsetRow: 0, multiplier: 1, hp: 100, maxHp: 100, morale: 100, generalId: 'le_loi' };
      nextGrid[12][13] = { id: 'p_c1', parentUnitId: 'p_c1', type: 'supply_cart', name: 'Xe Lương', rootRow: 12, rootCol: 13, col: 13, row: 12, isRoot: true, offsetCol: 0, offsetRow: 0, multiplier: 1, hp: 20, maxHp: 20, morale: 100 };
      nextGrid[12][19] = { id: 'p_c2', parentUnitId: 'p_c2', type: 'supply_cart', name: 'Xe Lương', rootRow: 12, rootCol: 19, col: 19, row: 12, isRoot: true, offsetCol: 0, offsetRow: 0, multiplier: 1, hp: 20, maxHp: 20, morale: 100 };
      for (let c = 12; c <= 18; c++) {
        if (c !== 16) {
          nextGrid[13][c] = { id: `p_cav_${c}`, parentUnitId: `p_cav_${c}`, type: 'cavalry', name: 'Kỵ', rootRow: 13, rootCol: c, col: c, row: 13, isRoot: true, offsetCol: 0, offsetRow: 0, multiplier: 1, hp: 10, maxHp: 10, morale: 100 };
        }
      }
      setMultiplier(1);
    } else if (type === '500_infantry') {
      // 500 quân cấp 1x: trải đều 20 hàng x 25 cột
      let placed = 0;
      for (let r = 4; r < 24 && placed < 500; r++) {
        for (let c = 4; c < 29 && placed < 500; c++) {
          const uType: TacticalUnitType = (r === 14 && c === 16) ? 'general' :
            (r < 10) ? ((r + c) % 2 === 0 ? 'swordsman' : 'spearman') :
            (r < 18) ? 'archer' : ((c % 4 === 0) ? 'supply_cart' : 'cavalry');
          nextGrid[r][c] = {
            id: `p500_${r}_${c}`,
            parentUnitId: `p500_${r}_${c}`,
            type: uType,
            name: uType,
            rootRow: r,
            rootCol: c,
            col: c,
            row: r,
            isRoot: true,
            offsetCol: 0,
            offsetRow: 0,
            multiplier: 1,
            hp: 10,
            maxHp: 10,
            morale: 100,
            generalId: uType === 'general' ? 'le_loi' : undefined,
          };
          placed++;
        }
      }
      setMultiplier(1);
    } else if (type === '1500_x10') {
      // 150 quân cờ x10 = 1500 lính
      let placed = 0;
      for (let r = 6; r < 21 && placed < 150; r++) {
        for (let c = 11; c < 21 && placed < 150; c++) {
          const uType: TacticalUnitType = (r === 13 && c === 16) ? 'general' :
            (r < 11) ? ((r + c) % 2 === 0 ? 'swordsman' : 'spearman') :
            (r < 17) ? 'archer' : 'cavalry';
          nextGrid[r][c] = {
            id: `p1500_${r}_${c}`,
            parentUnitId: `p1500_${r}_${c}`,
            type: uType,
            name: uType,
            rootRow: r,
            rootCol: c,
            col: c,
            row: r,
            isRoot: true,
            offsetCol: 0,
            offsetRow: 0,
            multiplier: 10,
            hp: 100,
            maxHp: 100,
            morale: 100,
            generalId: uType === 'general' ? 'le_loi' : undefined,
          };
          placed++;
        }
      }
      setMultiplier(10);
    } else if (type === 'cavalry_rush') {
      // Đội hình Kỵ Binh & Tượng Binh
      for (let r = 8; r <= 16; r += 2) {
        for (let c = 10; c <= 22; c += 2) {
          const uType: TacticalUnitType = (r === 12 && c === 16) ? 'general' :
            (c === 10 || c === 22) ? 'elephant' : 'cavalry';
          nextGrid[r][c] = {
            id: `pcav_${r}_${c}`,
            parentUnitId: `pcav_${r}_${c}`,
            type: uType,
            name: uType,
            rootRow: r,
            rootCol: c,
            col: c,
            row: r,
            isRoot: true,
            offsetCol: 0,
            offsetRow: 0,
            multiplier: 1,
            hp: 20,
            maxHp: 20,
            morale: 100,
            generalId: uType === 'general' ? 'le_loi' : undefined,
          };
        }
      }
      setMultiplier(1);
    }

    setGrid(nextGrid);
    notify.success('Đã nạp đội hình mẫu!');
  };

  // Lưu đội hình hiện tại
  const handleSaveCurrentFormation = () => {
    if (!saveNameInput.trim()) {
      notify.warning('Vui lòng nhập tên cho đội hình cần lưu!');
      return;
    }
    if (stats.total === 0) {
      notify.warning('Đội hình hiện tại chưa có binh lính nào!');
      return;
    }

    const newItem: SavedFormationItem = {
      id: `saved_form_${Date.now()}`,
      name: saveNameInput.trim(),
      createdAt: Date.now(),
      grid,
      totalTroops: stats.total,
      multiplier,
    };

    const nextList = [newItem, ...savedList.filter(item => item.name !== newItem.name)];
    setSavedList(nextList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      notify.success(`Đã lưu đội hình [${newItem.name}] (${stats.total} quân)!`);
    } catch {
      notify.error('Không thể ghi dữ liệu vào bộ nhớ máy!');
    }
  };

  // Nạp đội hình đã lưu
  const handleLoadSavedFormation = (item: SavedFormationItem) => {
    setGrid(item.grid);
    setMultiplier(item.multiplier || 1);
    setSaveNameInput(item.name);
    notify.success(`Đã nạp [${item.name}] (${item.totalTroops} quân)!`);
  };

  // Xóa đội hình đã lưu
  const handleDeleteSavedFormation = (id: string, name: string) => {
    const nextList = savedList.filter(item => item.id !== id);
    setSavedList(nextList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      notify.info(`Đã xóa đội hình [${name}]`);
    } catch {
      // ignore
    }
  };

  // Xóa sạch lưới
  const handleClearGrid = () => {
    setGrid(Array.from({ length: 32 }, () => Array(32).fill(null)));
    notify.info('Đã xóa sạch lưới sa bàn!');
  };

  // Khởi động trận chiến
  const handleStartBattle = () => {
    if (stats.total === 0) {
      notify.warning('Vui lòng đặt ít nhất một quân cờ trên sa bàn trước khi vào trận!');
      return;
    }

    // Tạo đối tượng TacticalFormation giả lập độc lập
    const sandboxFormation: TacticalFormation = {
      id: `sandbox_form_${Date.now()}`,
      name: saveNameInput.trim() || 'Nghĩa Binh Thao Diễn',
      cityId: 'lam_son',
      rows: 32,
      cols: 32,
      grid,
      assignedGeneralIds: ['le_loi'],
      commanderGeneralId: 'le_loi',
      status: 'stationed',
      createdAt: Date.now(),
      totalTroops: stats.total,
      totalWeapons: stats.total,
      totalHorses: stats.counts.cavalry || 0,
      totalElephants: stats.counts.elephant || 0,
      totalFoodCarried: 500,
    };

    startSandboxBattle({
      formation: sandboxFormation,
      mingTroops: Math.max(1, mingTroops),
      battleName: `Thao Diễn Chiến Trận`,
      locationName: 'Căn Cứ Lam Sơn',
      mapCol: 445,
      mapRow: 506,
    });

    setBattleTesterOpen(false);
  };

  if (!isBattleTesterOpen) return null;

  
  return (
    <div className="fixed inset-0 z-[2800] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 select-none font-serif text-[#261304]">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#fbf6ea] border-2 border-[#5c3417] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#f5ecda] border-b border-[#8c6b44]/40">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-[#8c2d19] text-amber-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Swords size={14} />
              <span>Tester Combat Sandbox</span>
            </span>
            <h2 className="text-base font-black text-[#8c2d19] tracking-wide">
              Diễn Võ Trường — Bảng Thao Diễn Chiến Trận Độc Lập
            </h2>
            <span className="text-xs text-stone-500 italic">
              (Tự do xây dựng & lưu đội hình, tùy biến địch và địa hình không ảnh hưởng cốt truyện)
            </span>
          </div>

          <button
            onClick={() => setBattleTesterOpen(false)}
            className="text-[#6e4927] hover:text-[#261304] p-1 rounded hover:bg-[#8c6b44]/15 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* NỘI DUNG CHÍNH (2 CỘT) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto overflow-x-hidden p-4 gap-4 bg-[#f8f2e2]">
          
          {/* CỘT TRÁI: SA BÀN 32x32 & QUẢN LÝ ĐỘI HÌNH (56%) */}
          <div className="flex-[56] flex flex-col gap-2.5 bg-[#f3e7cf] p-3 rounded-lg border border-[#8c6b44]/35">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#15803d]" />
                <span className="font-bold text-sm text-[#15803d]">Bố Trận Đạo Quân Lam Sơn</span>
                <span className="text-xs font-bold text-[#8c2d19]">({stats.total} quân)</span>
              </div>

              {/* Nút Xóa Sạch */}
              <button
                onClick={handleClearGrid}
                className="text-xs text-stone-600 hover:text-red-700 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-stone-300/50 cursor-pointer"
                title="Xóa trắng toàn bộ sa bàn"
              >
                <RotateCcw size={12} />
                <span>Xóa sạch lưới</span>
              </button>
            </div>

            {/* HÀNG NÚT ĐỘI HÌNH MẪU DỰNG SẴN */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-stone-600 font-bold flex items-center gap-1">
                <Sparkles size={12} className="text-amber-600" /> Mẫu nhanh:
              </span>
              <button
                onClick={() => loadPresetFormation('70_scout')}
                className="px-2 py-0.5 rounded bg-[#15803d]/15 hover:bg-[#15803d]/25 text-[#15803d] border border-[#15803d]/40 font-bold cursor-pointer"
              >
                Tiên Phong (70 quân - 1x)
              </button>
              <button
                onClick={() => loadPresetFormation('500_infantry')}
                className="px-2 py-0.5 rounded bg-blue-700/15 hover:bg-blue-700/25 text-blue-900 border border-blue-700/40 font-bold cursor-pointer"
              >
                Phục Kích (500 quân - 1x)
              </button>
              <button
                onClick={() => loadPresetFormation('1500_x10')}
                className="px-2 py-0.5 rounded bg-amber-700/15 hover:bg-amber-700/25 text-amber-900 border border-amber-700/40 font-bold cursor-pointer"
              >
                Thập Binh (1500 quân - 10x)
              </button>
              <button
                onClick={() => loadPresetFormation('cavalry_rush')}
                className="px-2 py-0.5 rounded bg-purple-700/15 hover:bg-purple-700/25 text-purple-900 border border-purple-700/40 font-bold cursor-pointer"
              >
                Thiết Kỵ Xung Phong
              </button>
            </div>

            {/* KHAY CHỌN BINH CHỦNG & MULTIPLIER */}
            <div className="flex flex-wrap items-center justify-between gap-1 bg-[#ede0c4] p-1.5 rounded border border-[#8c6b44]/25 text-xs">
              <div className="flex items-center gap-1">
                {(['swordsman', 'spearman', 'archer', 'cavalry', 'elephant', 'supply_cart', 'general', 'eraser'] as const).map(tool => {
                  const label = tool === 'swordsman' ? 'Đao' :
                                tool === 'spearman' ? 'Giáo' :
                                tool === 'archer' ? 'Cung' :
                                tool === 'cavalry' ? 'Kỵ' :
                                tool === 'elephant' ? 'Tượng' :
                                tool === 'supply_cart' ? 'Lương' :
                                tool === 'general' ? '★ Tướng' : '🧹 Tẩy';
                  const active = selectedTool === tool;
                  return (
                    <button
                      key={tool}
                      onClick={() => setSelectedTool(tool)}
                      className={`px-2 py-1 rounded font-bold cursor-pointer transition ${
                        active 
                          ? 'bg-[#8c2d19] text-amber-100 shadow-sm' 
                          : 'bg-[#fbf6ea] text-stone-700 hover:bg-[#8c6b44]/20 border border-[#8c6b44]/30'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tỉ lệ quân cờ */}
              <div className="flex items-center gap-1 bg-[#fbf6ea] p-0.5 rounded border border-[#8c6b44]/30">
                <button
                  onClick={() => setMultiplier(1)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                    multiplier === 1 ? 'bg-[#15803d] text-amber-100' : 'text-stone-600'
                  }`}
                  title="Mỗi ô đại diện cho 1 người lính"
                >
                  ×1
                </button>
                <button
                  onClick={() => setMultiplier(10)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                    multiplier === 10 ? 'bg-amber-600 text-stone-950 font-black' : 'text-stone-600'
                  }`}
                  title="Mỗi ô đại diện cho 10 người lính (Cấp Thập Đội)"
                >
                  ×10
                </button>
              </div>
            </div>

            {/* LƯỚI SA BÀN 32x32 CANVAS CONTAINER */}
            <div className="flex justify-center p-1 bg-[#e0d0b0] rounded border border-[#8c6b44]/40 overflow-hidden">
              <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
                className="relative grid grid-cols-32 border border-[#6b5134] bg-[#ebd8b7] shadow-inner cursor-crosshair select-none"
                style={{
                  width: '320px',
                  height: '320px',
                  gridTemplateColumns: 'repeat(32, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(32, minmax(0, 1fr))',
                }}
              >
                {grid.map((rowArr, rIdx) => 
                  rowArr.map((cell, cIdx) => {
                    const isGen = cell?.type === 'general';
                    const isCart = cell?.type === 'supply_cart';
                    const is10x = cell?.multiplier && cell.multiplier > 1;

                    return (
                      <div
                        key={`${rIdx}_${cIdx}`}
                        className={`relative border-[0.5px] border-[#8c6b44]/20 flex items-center justify-center pointer-events-none ${
                          cell ? (cell.type === 'swordsman' ? 'bg-red-600/30' :
                                  cell.type === 'spearman' ? 'bg-amber-600/30' :
                                  cell.type === 'archer' ? 'bg-blue-600/30' :
                                  cell.type === 'cavalry' ? 'bg-purple-600/30' :
                                  cell.type === 'elephant' ? 'bg-emerald-700/40' :
                                  isCart ? 'bg-amber-400/40' : 'bg-yellow-400/50') : ''
                        }`}
                      >
                        {cell && (
                          <span className={`text-[7px] font-black leading-none ${
                            isGen ? 'text-amber-800' : is10x ? 'text-amber-900 font-bold' : 'text-stone-800'
                          }`}>
                            {isGen ? '★' :
                             cell.type === 'archer' ? 'C' :
                             cell.type === 'spearman' ? 'G' :
                             cell.type === 'cavalry' ? 'K' :
                             cell.type === 'elephant' ? 'T' :
                             isCart ? 'L' : 'Đ'}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* THỐNG KÊ QUÂN SỐ TỨC THỜI */}
            <div className="flex flex-wrap items-center justify-between text-xs text-stone-700 px-1 font-bold">
              <span>Đao: {stats.counts.swordsman}</span>
              <span>Giáo: {stats.counts.spearman}</span>
              <span>Cung: {stats.counts.archer}</span>
              <span>Kỵ: {stats.counts.cavalry}</span>
              <span>Tượng: {stats.counts.elephant}</span>
              <span>Lương: {stats.counts.supply_cart}</span>
              <span>Tướng: {stats.counts.general}</span>
            </div>

            {/* QUẢN LÝ LƯU & NẠP ĐỘI HÌNH TESTER */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[#8c6b44]/30 text-xs">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={saveNameInput}
                  onChange={(e) => setSaveNameInput(e.target.value)}
                  placeholder="Nhập tên đội hình test..."
                  className="flex-1 px-2.5 py-1 rounded bg-[#fbf6ea] border border-[#8c6b44]/40 font-bold text-stone-800"
                />
                <button
                  onClick={handleSaveCurrentFormation}
                  className="px-3 py-1 rounded bg-[#15803d] hover:bg-[#15803d]/90 text-amber-100 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Save size={13} />
                  <span>Lưu Đội Hình</span>
                </button>
              </div>

              {/* Danh sách đã lưu */}
              {savedList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 max-h-20 overflow-y-auto pt-1">
                  <span className="text-stone-500 font-bold flex items-center gap-1">
                    <Bookmark size={11} /> Đã lưu:
                  </span>
                  {savedList.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#fbf6ea] border border-[#8c6b44]/30 text-[11px]"
                    >
                      <button
                        onClick={() => handleLoadSavedFormation(item)}
                        className="font-bold text-[#8c2d19] hover:underline cursor-pointer"
                        title={`Nạp đội hình ${item.name}`}
                      >
                        {item.name} ({item.totalTroops}q)
                      </button>
                      <button
                        onClick={() => handleDeleteSavedFormation(item.id, item.name)}
                        className="text-stone-400 hover:text-red-700 cursor-pointer ml-1"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: QUÂN MINH & ĐỊA HÌNH & NÚT CHIẾN ĐẤU (44%) */}
          <div className="flex-[44] flex flex-col justify-between gap-3 bg-[#f3e7cf] p-4 rounded-lg border border-[#8c6b44]/35">
            
            {/* 1. TÙY CHỈNH LỰC LƯỢNG QUÂN MINH */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#8c2d19]">Lực Lượng Quân Minh Đối Đầu</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#8c2d19]/15 text-[#8c2d19] font-bold">
                  {mingTroops >= 15000 ? '100x (Đại Chiến Trăm Nghìn)' : mingTroops >= 800 ? '10x (Chiến Trận Vạn Quân)' : '1x (Tiểu Trận Nghìn Quân)'}
                </span>
              </div>

              {/* Ô nhập số lượng */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-600 font-bold">Quân số:</span>
                <input
                  type="number"
                  min={1}
                  max={200000}
                  value={mingTroops}
                  onChange={(e) => setMingTroops(Math.max(1, parseInt(e.target.value) || 0))}
                  className="flex-1 px-3 py-1.5 rounded bg-[#fbf6ea] border border-[#8c6b44]/50 text-base font-black text-[#8c2d19]"
                />
                <span className="text-xs text-stone-600 font-bold">binh sĩ</span>
              </div>

              {/* Nút chọn nhanh quân số kinh điển */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '70 quân', val: 70 },
                  { label: '480 quân (Yên Định)', val: 480 },
                  { label: '2.500 quân (Tây Đô)', val: 2494 },
                  { label: '10.000 quân', val: 10000 },
                  { label: '100.000 quân', val: 100000 },
                ].map(p => (
                  <button
                    key={p.val}
                    onClick={() => setMingTroops(p.val)}
                    className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition ${
                      mingTroops === p.val 
                        ? 'bg-[#8c2d19] text-amber-100' 
                        : 'bg-[#fbf6ea] text-stone-700 hover:bg-[#8c6b44]/20 border border-[#8c6b44]/30'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>



            {/* 3. TỔNG KẾT & NÚT VÀO TRẬN NGAY */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#8c6b44]/30">
              <div className="bg-[#ede0c4] p-2.5 rounded-lg border border-[#8c6b44]/30 text-xs flex flex-col gap-1">
                <div className="flex justify-between font-bold">
                  <span className="text-[#15803d]">Nghĩa quân: {stats.total} binh sĩ</span>
                  <span className="text-[#8c2d19]">Quân Minh: {mingTroops} binh sĩ</span>
                </div>
                <div className="text-[11px] text-stone-600">
                  Chiến địa: <strong>Căn Cứ Lam Sơn</strong> • Khởi phát ngay không tốn thời gian hành quân!
                </div>
              </div>

              {/* NÚT BẮT ĐẦU CHIẾN ĐẤU */}
              <button
                onClick={handleStartBattle}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8c2d19] to-[#b91c1c] hover:from-[#732514] hover:to-[#991b1b] text-amber-100 font-serif font-black text-base flex items-center justify-center gap-2 shadow-xl border-2 border-amber-400/80 cursor-pointer transition transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Swords size={20} className="text-amber-300 animate-pulse" />
                <span>VÀO CHIẾN TRẬN NGAY (0 GIÂY)</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
