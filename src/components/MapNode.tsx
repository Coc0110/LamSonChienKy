import React, { useState, useEffect, useRef } from 'react';
import { Tent, Castle, Mountain } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import type { NodeType, Faction } from '../types';

interface MapNodeProps {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  faction: Faction;
  troops: number;
  selected?: boolean;
}

export const MapNode: React.FC<MapNodeProps> = ({ 
  id, name, type, x, y, faction, troops, selected 
}) => {
  const factionColors = {
    lam_son: 'bg-red-700 border-red-300 text-red-100',
    ming: 'bg-blue-800 border-blue-400 text-blue-100',
    neutral: 'bg-stone-600 border-stone-400 text-stone-200'
  };

  const Icon = type === 'city' ? Castle : type === 'chokepoint' ? Mountain : Tent;
  
  const isEditMode = useUIStore(state => state.isEditMode);
  const selectCity = useUIStore(state => state.selectCity);
  const updateCityPosition = useGameStore(state => state.updateCityPosition);
  
  const [isDragging, setIsDragging] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isEditMode || !nodeRef.current) return;
      
      const mapContainer = nodeRef.current.parentElement;
      if (!mapContainer) return;
      
      const rect = mapContainer.getBoundingClientRect();
      let newX = ((e.clientX - rect.left) / rect.width) * 100;
      let newY = ((e.clientY - rect.top) / rect.height) * 100;
      
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));
      
      updateCityPosition(id, Math.round(newX * 100) / 100, Math.round(newY * 100) / 100);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isEditMode, id, updateCityPosition]);

  return (
    <div 
      ref={nodeRef}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group z-20 ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onMouseDown={(e) => {
        if (isEditMode) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }
      }}
      onClick={() => {
        if (!isEditMode) selectCity(id);
      }}
    >
      <div className={`
        relative rounded-full border-2 flex items-center justify-center shadow-lg transition-transform
        ${type === 'city' ? 'w-10 h-10' : 'w-8 h-8'}
        ${factionColors[faction]}
        ${selected && !isEditMode ? 'scale-125 ring-4 ring-amber-400' : isEditMode ? 'hover:scale-110 ring-2 ring-white/50' : 'group-hover:scale-110'}
        ${isDragging ? 'scale-125 opacity-80' : ''}
      `}>
        <Icon size={type === 'city' ? 20 : 16} />
        
        {troops > 0 && !isEditMode && (
          <div className="absolute -top-3 -right-3 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-stone-600 font-sans">
            {troops > 1000 ? `${(troops/1000).toFixed(1)}k` : troops}
          </div>
        )}
      </div>
      
      <div className={`
        mt-1 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap drop-shadow-md pointer-events-none
        ${selected && !isEditMode ? 'bg-amber-900/90 text-amber-100' : 'bg-black/60 text-stone-200'}
        ${!isEditMode && 'group-hover:bg-amber-900/80 group-hover:text-amber-100'}
      `}>
        {name}
      </div>
    </div>
  );
};
