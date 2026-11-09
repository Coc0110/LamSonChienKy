import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Play, Pause, ShieldAlert } from 'lucide-react';
import type { BattlefieldState, BattlefieldTile, BattlefieldUnit } from '../../types/battlefield';
import { BattlefieldRow } from './BattlefieldRow';
import { BattlefieldInspectorBar } from './BattlefieldInspectorBar';

interface BattlefieldModalProps {
  battleState: BattlefieldState;
  onTick: () => void;
  onRetreat: () => void;
  onClose: () => void;
}

export const BattlefieldModal: React.FC<BattlefieldModalProps> = ({
  battleState,
  onTick,
  onRetreat,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [hoveredCoord, setHoveredCoord] = useState<{ col: number; row: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Kích thước ô hiển thị phù hợp với màn hình ngang
  // 96 cột x 12.5px = 1200px
  const cellSize = 12.5;

  // Lấy đơn vị và ô đang trỏ chuột
  const hoveredTile: BattlefieldTile | null = useMemo(() => {
    if (!hoveredCoord) return null;
    return battleState.grid.tiles[hoveredCoord.row]?.[hoveredCoord.col] || null;
  }, [hoveredCoord, battleState.grid]);

  const hoveredUnit: BattlefieldUnit | null = useMemo(() => {
    if (!hoveredCoord) return null;
    return battleState.units.find(
      u => u.col === hoveredCoord.col && u.row === hoveredCoord.row && u.status !== 'eliminated'
    ) || null;
  }, [hoveredCoord, battleState.units]);

  // Vòng lặp giao tranh tự động
  useEffect(() => {
    if (!isPlaying || battleState.phase !== 'in_progress') return;

    const intervalMs = speed === 5 ? 250 : speed === 2 ? 600 : 1200;
    const timer = setInterval(() => {
      onTick();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, battleState.phase, onTick]);

  // CONTAINER EVENT DELEGATION O(1) theo GEMINI.md
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (col >= 0 && col < 96 && row >= 0 && row < 32) {
      setHoveredCoord(prev => {
        if (prev?.col === col && prev?.row === row) return prev;
        return { col, row };
      });
    } else {
      setHoveredCoord(null);
    }
  }, [cellSize]);

  const handlePointerLeave = useCallback(() => {
    setHoveredCoord(null);
  }, []);

  // Tổng quân số còn sống
  const lamSonLiving = battleState.units.filter(u => u.faction === 'lam_son' && u.status !== 'eliminated');
  const mingLiving = battleState.units.filter(u => u.faction === 'ming' && u.status !== 'eliminated');

  const totalLamSonNow = lamSonLiving.reduce((acc, u) => acc + u.soldiersCount, 0);
  const totalMingNow = mingLiving.reduce((acc, u) => acc + u.soldiersCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-xs select-none">
      {/* Khung Bàn Cờ Màn Hình Ngang Tỷ Lệ 16:9 */}
      <div className="relative w-full max-w-7xl bg-[#fbf6ea] border-2 border-[#5c3417] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#261304] font-serif">
        
        {/* HEADER CHIẾN TRẬN */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#f5ecda] border-b border-[#8c6b44]/40">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-[#8c2d19] text-amber-100 text-xs font-bold uppercase tracking-wider">
              {battleState.scale} ({battleState.scale === '100x' ? 'Đại Chiến Trăm Nghìn Quân' : battleState.scale === '10x' ? 'Chiến Trận Vạn Quân' : 'Tiểu Trận Nghìn Quân'})
            </span>
            <h2 className="text-base font-black text-[#8c2d19] tracking-wide">
              {battleState.battleName} — {battleState.locationName}
            </h2>
            <span className="text-xs text-[#704d2e]">
              Canh {Math.ceil(battleState.turn / 3)} (Lượt {battleState.turn}/{battleState.maxTurns})
            </span>
          </div>

          {/* Thanh tương quan Sĩ Khí & Quân Số */}
          <div className="flex items-center gap-6 text-xs">
            {/* Lam Sơn */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#15803d]">Nghĩa Quân: {totalLamSonNow} người</span>
              <div className="w-24 h-2.5 rounded-full bg-stone-300 overflow-hidden border border-[#8c6b44]/30">
                <div 
                  className="h-full bg-[#15803d] transition-all duration-300"
                  style={{ width: `${battleState.lamSonMorale}%` }}
                />
              </div>
              <span className="text-[11px] text-stone-600">{battleState.lamSonMorale}%</span>
            </div>

            {/* Quân Minh */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#8c2d19]">Quân Minh: {totalMingNow} người</span>
              <div className="w-24 h-2.5 rounded-full bg-stone-300 overflow-hidden border border-[#8c6b44]/30">
                <div 
                  className="h-full bg-[#8c2d19] transition-all duration-300"
                  style={{ width: `${battleState.mingMorale}%` }}
                />
              </div>
              <span className="text-[11px] text-stone-600">{battleState.mingMorale}%</span>
            </div>

            <button
              onClick={onClose}
              className="text-[#6e4927] hover:text-[#261304] p-1 rounded hover:bg-[#8c6b44]/15 transition cursor-pointer"
              title="Đóng bảng chiến trận"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* THÂN BÀN CỜ 96 CỘT x 32 HÀNG */}
        <div className="relative p-3 bg-[#e8dcbe] flex justify-center overflow-x-auto no-scrollbar">
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className="relative border border-[#6b5134] shadow-inner select-none cursor-crosshair"
            style={{
              width: `${96 * cellSize}px`,
              height: `${32 * cellSize}px`,
            }}
          >
            {/* Nhãn phân khu 3 vùng */}
            <div className="absolute top-1 left-2 text-[10px] font-bold text-[#15803d]/70 pointer-events-none uppercase">
              Cánh Tả (Bố Phòng Lam Sơn)
            </div>
            <div className="absolute top-1 left-[42%] text-[10px] font-bold text-[#704d2e]/70 pointer-events-none uppercase">
              Trung Lộ (Hiểm Địa Thắt Nút)
            </div>
            <div className="absolute top-1 right-2 text-[10px] font-bold text-[#8c2d19]/70 pointer-events-none uppercase">
              Cánh Hữu (Quân Minh Tiến Công)
            </div>

            {/* Render 32 hàng bọc Row-Level Memo */}
            {battleState.grid.tiles.map((rowTiles, rIdx) => {
              const rowUnits = battleState.units.filter(u => u.row === rIdx && u.status !== 'eliminated');
              return (
                <BattlefieldRow
                  key={rIdx}
                  rowIndex={rIdx}
                  tiles={rowTiles}
                  rowUnits={rowUnits}
                  cellSize={cellSize}
                />
              );
            })}

            {/* HỘP PREVIEW NỔI DUY NHẤT (Single Floating Ghost Box) */}
            {hoveredCoord && (
              <div
                className="absolute border-2 border-amber-400 pointer-events-none z-30 ring-1 ring-amber-600"
                style={{
                  left: `${hoveredCoord.col * cellSize}px`,
                  top: `${hoveredCoord.row * cellSize}px`,
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                }}
              />
            )}
          </div>
        </div>

        {/* THANH INSPECTOR BAR THỜI GIAN THỰC */}
        <BattlefieldInspectorBar
          hoveredTile={hoveredTile}
          hoveredUnit={hoveredUnit}
        />

        {/* FOOTER ĐIỀU KHIỂN & NHẬT KÝ CHIẾN TRƯỜNG */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#f5ecda] border-t border-[#8c6b44]/40 text-xs">
          {/* Cụm điều khiển nhịp chiến trận */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 rounded-lg bg-[#8c6b44]/20 hover:bg-[#8c6b44]/35 font-bold flex items-center gap-1.5 cursor-pointer text-[#261304] transition"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Tạm Dừng' : 'Tiếp Tục'}</span>
            </button>

            <button
              onClick={() => onTick()}
              disabled={isPlaying}
              className={`px-3 py-1.5 rounded-lg font-bold border transition ${
                isPlaying 
                  ? 'bg-stone-300 text-stone-500 border-stone-400 cursor-not-allowed' 
                  : 'bg-[#8c6b44]/15 hover:bg-[#8c6b44]/25 text-[#261304] border-[#8c6b44]/40 cursor-pointer'
              }`}
            >
              Thực Thi 1 Lượt
            </button>

            {/* Nút chỉnh tốc độ */}
            <div className="flex items-center gap-1 border border-[#8c6b44]/30 rounded-lg p-0.5 bg-[#fdfaf3]">
              {[1, 2, 5].map(spd => (
                <button
                  key={spd}
                  onClick={() => setSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                    speed === spd ? 'bg-[#8c2d19] text-amber-100' : 'text-[#704d2e] hover:bg-[#8c6b44]/15'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Nút khẩn cấp: Rút quân */}
            <button
              onClick={onRetreat}
              className="px-3 py-1.5 rounded-lg bg-amber-800/15 hover:bg-amber-800/25 text-[#8c2d19] font-bold flex items-center gap-1 border border-[#8c2d19]/40 cursor-pointer transition ml-2"
            >
              <ShieldAlert size={14} />
              <span>Thu Quân Rút Lui</span>
            </button>
          </div>

          {/* Dòng tóm tắt nhật ký mới nhất */}
          <div className="flex-1 max-w-lg truncate text-[11px] text-[#704d2e] italic text-right px-4">
            {battleState.logs[0]?.message || 'Đôi bên đang dàn trận thế giằng co...'}
          </div>
        </div>

      </div>
    </div>
  );
};
