import React from 'react';
import { X, Users, Wheat } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

export const Modals: React.FC = () => {
  const resources = useGameStore(state => state.resources);
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  if (!activeModal) return null;

  return (
    <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border-2 border-amber-900 rounded-lg p-6 max-w-lg w-full shadow-2xl relative">
        <button 
          onClick={() => setActiveModal(null)}
          className="absolute top-4 right-4 text-stone-400 hover:text-white transition"
        >
          <X size={24} />
        </button>
        
        {activeModal === 'army' && (
          <>
            <h2 className="text-2xl font-bold text-amber-500 mb-6 flex items-center gap-2 border-b border-stone-700 pb-2">
              <Users /> Tổng Quản Quân Lực
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-800 p-4 rounded border border-stone-700">
                <div className="text-stone-400 text-sm mb-1">Tổng Quân Số</div>
                <div className="text-2xl font-bold text-white">{Math.floor(resources.troops).toLocaleString()}</div>
              </div>
              <div className="bg-stone-800 p-4 rounded border border-stone-700">
                <div className="text-stone-400 text-sm mb-1">Chiến Mã (Ngựa)</div>
                <div className="text-2xl font-bold text-white">{Math.floor(resources.horses).toLocaleString()}</div>
              </div>
              <div className="bg-stone-800 p-4 rounded border border-stone-700">
                <div className="text-stone-400 text-sm mb-1">Tượng Binh (Voi)</div>
                <div className="text-2xl font-bold text-white">{Math.floor(resources.elephants).toLocaleString()}</div>
              </div>
            </div>
          </>
        )}

        {activeModal === 'supplies' && (
          <>
            <h2 className="text-2xl font-bold text-emerald-500 mb-6 flex items-center gap-2 border-b border-stone-700 pb-2">
              <Wheat /> Tổng Quản Quân Nhu
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-800 p-4 rounded border border-stone-700">
                <div className="text-stone-400 text-sm mb-1">Quân Lương</div>
                <div className={`text-2xl font-bold ${resources.food <= 0 ? 'text-red-500' : 'text-white'}`}>
                  {Math.floor(resources.food).toLocaleString()}
                </div>
              </div>
              <div className="bg-stone-800 p-4 rounded border border-stone-700">
                <div className="text-stone-400 text-sm mb-1">Binh Khí</div>
                <div className="text-2xl font-bold text-white">{Math.floor(resources.weapons).toLocaleString()}</div>
              </div>
              <div className="bg-stone-800 p-4 rounded border border-stone-700">
                <div className="text-stone-400 text-sm mb-1">Giáp - Quần Áo</div>
                <div className="text-2xl font-bold text-white">{Math.floor(resources.clothes).toLocaleString()}</div>
              </div>
              <div className="bg-stone-800 p-4 rounded border border-stone-700 relative overflow-hidden">
                <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-yellow-500/10 rounded-full blur-md"></div>
                <div className="text-stone-400 text-sm mb-1">Ngân Lượng (Vàng)</div>
                <div className="text-2xl font-bold text-yellow-500">{Math.floor(resources.gold).toLocaleString()}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
