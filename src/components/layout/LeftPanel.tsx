import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CityPopulationModal } from './panel/CityPopulationModal';
import { DistrictDetailPanel } from './panel/DistrictDetailPanel';
import { MilitaryBookPanel } from './panel/MilitaryBookPanel';
import { BuildPaperPanel } from './panel/BuildPaperPanel';
import { BaseDetailContent } from './panel/BaseDetailContent';

export const LeftPanel: React.FC = React.memo(() => {
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectionType = useUIStore(state => state.selectionType);
  const selectCity = useUIStore(state => state.selectCity);
  const isListOpen = useUIStore(state => state.isMilitaryBookOpen);

  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const resources = useGameStore(state => state.resources);
  const startTraining = useGameStore(state => state.startTraining);
  const cancelTraining = useGameStore(state => state.cancelTraining);

  const [isPopulationModalOpen, setIsPopulationModalOpen] = useState(false);

  const selectedCity = useMemo(() => cities.find(c => c.id === selectedCityId), [cities, selectedCityId]);
  const unlockedGenerals = useMemo(() => generals.filter(g => g.unlocked), [generals]);
  const stationedGenerals = useMemo(
    () => unlockedGenerals.filter(g => g.locationId === selectedCityId),
    [unlockedGenerals, selectedCityId]
  );

  const lamSonBases = useMemo(
    () => cities.filter(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp')),
    [cities]
  );
  const lamSonBasesCount = lamSonBases.length;
  const activeLamSonBase = useMemo(
    () => (selectedCity && selectedCity.faction === 'lam_son') ? selectedCity : (lamSonBases[0] || cities.find(c => c.faction === 'lam_son')),
    [selectedCity, lamSonBases, cities]
  );

  return (
    <>
      {/* 1. QUÂN THƯ DANH SÁCH BẢN DOANH & ĐỊA HẠT */}
      {isListOpen && <MilitaryBookPanel />}

      {/* 2. CHIẾN THƯ CHI TIẾT (KHI KHÔNG MỞ QUÂN THƯ) */}
      {!isListOpen && selectedCityId && (
        <div 
          className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-24 md:left-6 z-30 md:w-[410px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
        >
          <img
            src="/parchment_torn_panel.png"
            alt="Giấy sứt mẻ tự nhiên"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            draggable={false}
          />

          {selectionType === 'district' ? (
            <DistrictDetailPanel districtId={selectedCityId} onClose={() => selectCity(null)} />
          ) : selectedCity ? (
            <BaseDetailContent
              selectedCity={selectedCity}
              stationedGenerals={stationedGenerals}
              lamSonBasesCount={lamSonBasesCount}
              onOpenPopulationModal={() => setIsPopulationModalOpen(true)}
            />
          ) : null}
        </div>
      )}

      {/* 3. TỜ GIẤY CÔNG TRÌNH XÂY DỰNG */}
      {activeLamSonBase && (
        <BuildPaperPanel
          activeLamSonBase={activeLamSonBase}
          selectedCity={selectedCity || null}
        />
      )}

      {/* 4. MODAL ĐIỀU CHỈNH DÂN SỐ & THAO LUYỆN NGHĨA BINH */}
      {isPopulationModalOpen && selectedCity && (
        <CityPopulationModal
          city={selectedCity}
          generals={stationedGenerals}
          weaponsAvailable={resources.weapons}
          onClose={() => setIsPopulationModalOpen(false)}
          onStartTraining={startTraining}
          onCancelTraining={cancelTraining}
        />
      )}
    </>
  );
});

LeftPanel.displayName = 'LeftPanel';
