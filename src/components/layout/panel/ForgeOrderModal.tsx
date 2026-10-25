import React, { useState } from 'react';
import { X, Hammer, ShieldAlert, Clock, Coins, Users, Flame } from 'lucide-react';
import type { WeaponCraftType, PlacedStructure } from '../../../types';
import { useGameStore } from '../../../store/gameStore';

interface ForgeOrderModalProps {
  structure: PlacedStructure;
  idleLaborers: number;
  goldAvailable: number;
  onClose: () => void;
}

export const ForgeOrderModal: React.FC<ForgeOrderModalProps> = ({
  structure,
  idleLaborers,
  goldAvailable,
  onClose,
}) => {
  const startForgeOrder = useGameStore(state => state.startForgeOrder);

  const [weaponType, setWeaponType] = useState<WeaponCraftType>('spear');
  const [quantity, setQuantity] = useState<number>(30);
  const [smiths, setSmiths] = useState<number>(Math.min(10, Math.max(1, idleLaborers)));

  const costPerItem = weaponType === 'spear' ? 1.0 : weaponType === 'sword' ? 2.0 : 1.5;
  const totalGold = Math.ceil(quantity * costPerItem);
  const workFactor = weaponType === 'spear' ? 1.0 : weaponType === 'sword' ? 1.8 : 1.4;
  const totalDays = Math.max(4, Math.ceil((quantity * workFactor * 1.5) / smiths));

  const isQuietTerrain = structure.terrain === 'mountain' || structure.terrain === 'forest';
  const canAffordGold = goldAvailable >= totalGold;
  const canAffordSmiths = idleLaborers >= smiths;
  const canStart = canAffordGold && canAffordSmiths;

  const handleStart = () => {
    if (!canStart) return;
    const res = startForgeOrder(structure.id, {
      weaponType,
      quantity,
      smiths,
    });
    if (res.success) {
      alert(res.message);
      onClose();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#1e130a] border-2 border-[#8a5d35] rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#2f1b0e] via-[#3a2010] to-[#2f1b0e] border-b border-[#7a4c25] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-950 border border-orange-600/80 flex items-center justify-center text-orange-400">
              <Flame size={18} />
            </div>
            <div>
              <h3 className="font-serif font-black text-amber-200 text-base leading-tight">
                Lệnh Đúc Khí Giới: {structure.name}
              </h3>
              <p className="text-[11px] text-stone-400">
                Địa hình: <strong className="text-amber-300 capitalize">{structure.terrain}</strong> • {isQuietTerrain ? 'Rừng núi tiêu âm tốt' : 'Đồng bằng dễ gây chú ý'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* 1. Chọn loại vũ khí */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-2">
              1. Chọn Loại Khí Giới Muốn Rèn:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Giáo mác */}
              <button
                type="button"
                onClick={() => setWeaponType('spear')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  weaponType === 'spear'
                    ? 'bg-amber-950/80 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-[#29170b] border-stone-700 hover:border-amber-700'
                }`}
              >
                <div className="text-lg">🔱</div>
                <div className="mt-2 font-serif font-bold text-xs text-[#f5ebd7]">Giáo Mác</div>
                <div className="text-[10px] text-amber-400/90 font-mono">1.0 Vàng / cây</div>
              </button>

              {/* Kiếm thép */}
              <button
                type="button"
                onClick={() => setWeaponType('sword')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  weaponType === 'sword'
                    ? 'bg-amber-950/80 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-[#29170b] border-stone-700 hover:border-amber-700'
                }`}
              >
                <div className="text-lg">⚔️</div>
                <div className="mt-2 font-serif font-bold text-xs text-[#f5ebd7]">Kiếm Thép</div>
                <div className="text-[10px] text-amber-400/90 font-mono">2.0 Vàng / thanh</div>
              </button>

              {/* Nỏ tiễn */}
              <button
                type="button"
                onClick={() => setWeaponType('crossbow')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  weaponType === 'crossbow'
                    ? 'bg-amber-950/80 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-[#29170b] border-stone-700 hover:border-amber-700'
                }`}
              >
                <div className="text-lg">🏹</div>
                <div className="mt-2 font-serif font-bold text-xs text-[#f5ebd7]">Nỏ Ngắm</div>
                <div className="text-[10px] text-amber-400/90 font-mono">1.5 Vàng / bộ</div>
              </button>
            </div>
          </div>

          {/* 2. Chọn số lượng */}
          <div className="bg-[#29170b] border border-[#7a4c25] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-300">Số Lượng Rèn Đúc:</span>
              <span className="font-mono font-black text-amber-300 text-sm">{quantity} chiếc</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>10 chiếc</span>
              <span>50 chiếc</span>
              <span>100 chiếc</span>
            </div>
          </div>

          {/* 3. Cử thợ rèn */}
          <div className="bg-[#29170b] border border-[#7a4c25] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-300 flex items-center gap-1.5">
                <Users size={14} className="text-amber-400" />
                Cử Thợ Rèn (Trích từ Tráng Phu rảnh):
              </span>
              <span className="font-mono font-black text-sky-300 text-sm">
                {smiths} thợ rèn <span className="text-stone-400 font-normal">/ {idleLaborers} rảnh</span>
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.min(15, Math.max(1, idleLaborers))}
              step={1}
              value={smiths}
              onChange={(e) => setSmiths(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>1 thợ</span>
              <span>Càng nhiều thợ, rèn càng nhanh</span>
              <span>Tối đa {Math.min(15, idleLaborers)} thợ</span>
            </div>
          </div>

          {/* Tóm tắt chi phí & thời gian */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
              canAffordGold ? 'bg-amber-950/40 border-amber-700/60' : 'bg-red-950/50 border-red-500'
            }`}>
              <Coins size={16} className={canAffordGold ? 'text-amber-400' : 'text-red-400'} />
              <div>
                <div className="text-[10px] text-stone-400">Tiêu hao Ngân khố:</div>
                <div className="font-mono font-bold text-amber-300">
                  {totalGold} Vàng <span className="text-[10px] text-stone-400">({goldAvailable} có)</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-700 flex items-center gap-2">
              <Clock size={16} className="text-sky-400" />
              <div>
                <div className="text-[10px] text-stone-400">Thời gian thi công:</div>
                <div className="font-mono font-bold text-sky-300">{totalDays} ngày</div>
              </div>
            </div>
          </div>

          {/* Cảnh báo độ nghi ngờ */}
          <div className={`p-2.5 rounded-lg border text-[11px] leading-tight flex items-start gap-2 ${
            isQuietTerrain
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : 'bg-orange-950/50 border-orange-700/70 text-orange-300'
          }`}>
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
            <span>
              {isQuietTerrain
                ? 'Lò rèn nằm sâu trong rừng núi: tiếng búa và khói lò bị che chắn, mức gây nghi ngờ quân Minh rất thấp.'
                : 'Lưu ý: Lò rèn ở đồng bằng, khói lửa dễ làm thám mã giặc Minh để ý (độ nghi ngờ tăng nhanh hơn).'
              }
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#150d06] border-t border-[#7a4c25] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            Hủy Bỏ
          </button>
          
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer ${
              canStart
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
            }`}
          >
            <Hammer size={14} />
            <span>Nổi Lửa Rèn Đúc ({totalGold} V)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
