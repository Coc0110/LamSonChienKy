import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CityPopulationModal } from './panel/CityPopulationModal';
import { DistrictDetailPanel } from './panel/DistrictDetailPanel';
import { BuildPaperPanel } from './panel/BuildPaperPanel';
import { BaseDetailContent } from './panel/BaseDetailContent';

export const LeftPanel: React.FC = React.memo(() => {
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectionType = useUIStore(state => state.selectionType);
  const selectCity = useUIStore(state => state.selectCity);
  const marchDrawMode = useUIStore(state => state.marchDrawMode);
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const resources = useGameStore(state => state.resources);
  const startTraining = useGameStore(state => state.startTraining);
  const cancelTraining = useGameStore(state => state.cancelTraining);

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

  const isTrainingOpen = activeModal === 'training';
  const targetCityForTraining = (selectedCity && selectedCity.faction === 'lam_son') ? selectedCity : activeLamSonBase;
  const trainingGenerals = useMemo(
    () => unlockedGenerals.filter(g => g.locationId === targetCityForTraining?.id),
    [unlockedGenerals, targetCityForTraining]
  );

  // Khi đang trong chế độ vẽ đường hành quân, ẩn hoàn toàn bảng thông tin tỉnh/căn cứ bên trái
  if (marchDrawMode) {
    return null;
  }

  return (
    <>
      {/* THÔNG TIN CHI TIẾT BẢN DOANH & ĐỊA HẠT ĐANG CHỌN */}
      {selectedCityId && (
        <div 
          className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-24 md:left-[98px] z-30 md:w-[410px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
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
            />
          ) : null}
        </div>
      )}

      {/* 3. TỜ GIẤY CÔNG TRÌNH XÂY DỰNG */}
      <BuildPaperPanel
        activeLamSonBase={activeLamSonBase}
        selectedCity={selectedCity || null}
      />

      {/* 4. MODAL ĐIỀU CHỈNH DÂN SỐ & THAO LUYỆN NGHĨA BINH */}
      {isTrainingOpen && targetCityForTraining && (
        <CityPopulationModal
          city={targetCityForTraining}
          generals={trainingGenerals}
          weaponsAvailable={resources.weapons}
          onClose={() => setActiveModal(null)}
          onStartTraining={startTraining}
          onCancelTraining={cancelTraining}
        />
      )}
    </>
  );
});

LeftPanel.displayName = 'LeftPanel';
