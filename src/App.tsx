import { useEffect, lazy, Suspense, useRef, useMemo } from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { WorldMap } from './components/map/WorldMap';
import { ParchmentToastContainer } from './components/common/ParchmentToastContainer';
import { ParchmentConfirmModal } from './components/common/ParchmentConfirmModal';
import { EndgameModal } from './components/common/EndgameModal';
import { RefugeeIntakeModal } from './components/common/RefugeeIntakeModal';
import { TimelineWheelScrubber } from './components/layout/topbar/TimelineWheelScrubber';
import { LeftCommandDock } from './components/layout/LeftCommandDock';
import { FarmsOverviewModal } from './components/layout/panel/FarmsOverviewModal';
import { ForgesOverviewModal } from './components/layout/panel/ForgesOverviewModal';
import { MilitaryBookPanel } from './components/layout/panel/MilitaryBookPanel';
import { Region3DOverlay } from './components/region/Region3DOverlay';
import { Ambush3DModal } from './components/region/Ambush3DModal';
import { Defense3DModal } from './components/region/Defense3DModal';
import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';

// Code-splitting modal danh tướng có kích thước lớn để tăng tốc tải trang
const GeneralsModal = lazy(() => import('./components/generals/GeneralsModal').then(m => ({ default: m.GeneralsModal })));

function App() {
  const isPaused = useGameStore(state => state.isPaused);
  const timeMode = useGameStore(state => state.timeMode);
  const setTimeMode = useGameStore(state => state.setTimeMode);
  const enterAutoPause = useGameStore(state => state.enterAutoPause);
  const exitAutoPause = useGameStore(state => state.exitAutoPause);
  const isWarMode = useGameStore(state => state.isWarMode);
  const canhHour = useGameStore(state => state.canhHour);
  const tick = useGameStore(state => state.tick);
  const tickCanh = useGameStore(state => state.tickCanh);
  const stepArmies = useGameStore(state => state.stepArmies);
  const stepScoutMissions = useGameStore(state => state.stepScoutMissions);
  const formations = useGameStore(state => state.formations);
  const activeAmbushBattle = useGameStore(state => state.activeAmbushBattle);
  const resolveAmbush3D = useGameStore(state => state.resolveAmbush3D);
  const activeDefenseBattle = useGameStore(state => state.activeDefenseBattle);
  const resolveDefense3D = useGameStore(state => state.resolveDefense3D);
  const pendingMingRaid = useGameStore(state => state.pendingMingRaid);
  const chooseMingRaidResponse = useGameStore(state => state.chooseMingRaidResponse);
  const retreatAmbushToDefense = useGameStore(state => state.retreatAmbushToDefense);
  const evacuationDaysRemaining = useGameStore(state => state.evacuationDaysRemaining);
  const performEvacuationAction = useGameStore(state => state.performEvacuationAction);

  // Trạng thái các giao diện "không trên dòng thời gian"
  const activeModal = useUIStore(state => state.activeModal);
  const placementMode = useUIStore(state => state.placementMode);
  const baseRelocateMode = useUIStore(state => state.baseRelocateMode);
  const selectedStructureModal = useUIStore(state => state.selectedStructureModal);
  const activeForgeModalStructureId = useUIStore(state => state.activeForgeModalStructureId);
  const isMilitaryBookOpen = useUIStore(state => state.isMilitaryBookOpen);
  const activeRegion3D = useUIStore(state => state.activeRegion3D);

  // Tự động ngưng thời gian khi mở các chế độ toàn màn hình không xem bản đồ
  // (xây dựng ô lưới, di dời căn cứ, xem danh tướng toàn màn hình, sa bàn 32x32)
  const isOutOfTime = Boolean(
    placementMode ||
    baseRelocateMode ||
    activeModal === 'generals' ||
    activeModal === 'tactical_grid' ||
    selectedStructureModal ||
    activeForgeModalStructureId
  );

  const prevOutOfTimeRef = useRef(false);

  useEffect(() => {
    const wasOutOfTime = prevOutOfTimeRef.current;
    if (!wasOutOfTime && isOutOfTime) {
      enterAutoPause();
    } else if (wasOutOfTime && !isOutOfTime) {
      exitAutoPause();
    }
    prevOutOfTimeRef.current = isOutOfTime;
  }, [isOutOfTime, enterAutoPause, exitAutoPause]);

  // Tự động chuyển sang Chế độ Giờ khi có đạo quân xuất trận (marching / retreating, không tính cắm trại)
  const hasActiveMarching = useMemo(() => {
    return formations.some(f => (f.status === 'marching' || f.status === 'retreating') && Boolean(f.marchOrder));
  }, [formations]);

  const prevMarchingRef = useRef(false);

  useEffect(() => {
    if (hasActiveMarching && !prevMarchingRef.current) {
      if (timeMode !== 'hour' && timeMode !== 'pause') {
        setTimeMode('hour');
      }
    }
    prevMarchingRef.current = hasActiveMarching;
  }, [hasActiveMarching, timeMode, setTimeMode]);

  // Vòng lặp thời gian:
  // - Chế độ Giờ: Mỗi 5000ms trôi qua 1 Canh Giờ (12 canh = 60 giây = 1 phút/ngày)
  // - Chế độ Ngày: Mỗi 1000ms trôi qua 1 Ngày
  useEffect(() => {
    if (isPaused) return;

    if (timeMode === 'hour' || isWarMode) {
      const intervalId = setInterval(() => {
        tickCanh();
      }, 5000);
      return () => clearInterval(intervalId);
    } else {
      const intervalId = setInterval(() => { 
        tick(); 
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isPaused, timeMode, isWarMode, tick, tickCanh]);

  // Vòng lặp bước đi mượt mà của đạo quân (đồng bộ tốc độ theo Canh Giờ khi ở Chế độ Giờ)
  // Ban đêm (3 Canh nửa đêm: Giờ Tý index 0, Sửu 1, Dần 2 -> từ 23:00 đến 05:00 sáng):
  // Nghĩa quân tạm hạ trại nghỉ ngơi qua đêm, bắt đầu hành quân lại vào bình minh (Giờ Mão 05:00)
  useEffect(() => {
    if (isPaused) return;

    const isHourMode = timeMode === 'hour' || isWarMode;
    const isNightTime = isHourMode && (canhHour >= 0 && canhHour <= 2);
    if (isNightTime) return; // Tạm dừng bước chân hành quân khi đêm xuống để hạ trại nghỉ ngơi (3 canh: Tý, Sửu, Dần)

    const stepMs = 50; // Tần số 20 FPS cho bước di chuyển mượt mà
    // Nếu ở Chế độ Giờ: 5 giây thực = 1 canh giờ => 60 giây = 1 ngày
    // Nếu ở Chế độ Ngày: 1 giây thực = 1 ngày
    const dayFractionPerSec = isHourMode ? (1 / 60) : 1;
    const deltaDays = (stepMs / 1000) * dayFractionPerSec;

    const armyInterval = setInterval(() => {
      stepArmies(deltaDays);
      stepScoutMissions(deltaDays);
    }, stepMs);
    return () => clearInterval(armyInterval);
  }, [isPaused, timeMode, isWarMode, canhHour, stepArmies, stepScoutMissions]);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-stone-950 select-none">
      <WorldMap />
      <TopBar />
      <TimelineWheelScrubber />
      <LeftPanel />
      {activeRegion3D && <LeftCommandDock />}
      <Suspense fallback={null}>
        <GeneralsModal />
      </Suspense>
      <FarmsOverviewModal />
      <ForgesOverviewModal />
      {isMilitaryBookOpen && <MilitaryBookPanel />}
      <ParchmentToastContainer />
      <ParchmentConfirmModal />
      <RefugeeIntakeModal />
      <EndgameModal />
      <Region3DOverlay />
      {evacuationDaysRemaining > 0 && (
        <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-[2600] rounded-2xl border-2 border-[#8c2d19] bg-[#f4ecd8]/95 px-4 py-3 shadow-2xl font-serif text-[#2a1708] flex flex-col sm:flex-row items-center gap-3">
          <div className="text-xs font-bold">
            <span className="text-[#8c2d19] font-black">Trại Dã Chiến Chí Linh</span> · Còn {evacuationDaysRemaining} ngày trước khi trở về căn cứ
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => performEvacuationAction('forage')}
              className="rounded bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800 cursor-pointer"
            >
              Săn bắt (+75 Lương)
            </button>
            <button
              onClick={() => performEvacuationAction('skirmish')}
              className="rounded bg-[#8c2d19] px-2.5 py-1.5 text-[11px] font-bold text-[#fff3db] hover:bg-[#6e1e0d] cursor-pointer"
            >
              Tập kích (+30V, +8 Kiếm)
            </button>
            <button
              onClick={() => performEvacuationAction('rest')}
              className="rounded bg-[#8c5828] px-2.5 py-1.5 text-[11px] font-bold text-[#fff3db] hover:bg-[#6e421a] cursor-pointer"
            >
              Chỉnh đốn (+10% Sĩ khí)
            </button>
          </div>
        </div>
      )}
      {pendingMingRaid && (
        <div className="fixed inset-0 z-[2700] flex items-center justify-center bg-black/65 p-4 font-serif">
          <div className="w-full max-w-lg rounded-2xl border-4 border-[#8c2d19] bg-[#f4ecd8] p-6 text-[#2a1708] shadow-2xl">
            <h3 className="text-xl font-black text-[#8c2d19]">
              Giặc Minh Xuất Binh Dẹp Loạn!
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-stone-800">
              Độ nghi ngờ đã chạm ngưỡng báo động! <strong>{pendingMingRaid.enemyTroops.toLocaleString()} quân Minh</strong> từ <strong>{pendingMingRaid.sourceName}</strong> đang kéo tới đánh <strong>{pendingMingRaid.cityName}</strong>. Hãy chọn đối sách:
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => chooseMingRaidResponse('ambush')}
                className="w-full rounded-xl border border-[#8c2d19]/40 bg-[#8c2d19] p-3 text-left text-[#fff3db] hover:bg-[#6e1e0d] cursor-pointer shadow"
              >
                <div className="text-sm font-black">1. Nghênh Chiến Ngoài Thành (3D)</div>
                <div className="text-[11px] opacity-90">Đánh chặn từ xa để giữ nguyên vẹn công trình. Có thể rút về cố thủ nếu thất thế.</div>
              </button>
              <button
                onClick={() => chooseMingRaidResponse('defense')}
                className="w-full rounded-xl border border-[#8c5828]/40 bg-[#8c5828] p-3 text-left text-[#fff3db] hover:bg-[#6e421a] cursor-pointer shadow"
              >
                <div className="text-sm font-black">2. Cố Thủ Trong Căn Cứ (3D)</div>
                <div className="text-[11px] opacity-90">Tận dụng Tường, Cổng, Chông bẫy. Công trình bị đánh sẽ hư hại cần sửa chữa &amp; nghi ngờ về sau tăng nhanh hơn.</div>
              </button>
              <button
                onClick={() => chooseMingRaidResponse('evacuate')}
                className="w-full rounded-xl border border-stone-700/40 bg-stone-800 p-3 text-left text-stone-100 hover:bg-stone-900 cursor-pointer shadow"
              >
                <div className="text-sm font-black">3. Rút Lui Bỏ Căn Cứ (Sơ tán 10 ngày lên Chí Linh)</div>
                <div className="text-[11px] opacity-90">Bảo toàn quân lực, chịu phá hủy nặng công trình &amp; mất 40% lương thực. Hoạt động du kích trong lúc chờ trở về.</div>
              </button>
            </div>
          </div>
        </div>
      )}
      {activeAmbushBattle && (
        <Ambush3DModal
          initialState={activeAmbushBattle}
          onComplete={resolveAmbush3D}
          onRetreatToDefense={retreatAmbushToDefense}
        />
      )}
      {activeDefenseBattle && (
        <Defense3DModal
          initialState={activeDefenseBattle}
          onComplete={resolveDefense3D}
        />
      )}
    </div>
  );
}

export default App;
