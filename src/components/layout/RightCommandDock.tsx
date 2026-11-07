import React from 'react';
import { Dumbbell, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

export const RightCommandDock: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const toggleBuildPaper = useUIStore(state => state.toggleBuildPaper);
  const isMilitaryBookOpen = useUIStore(state => state.isMilitaryBookOpen);
  const toggleMilitaryBook = useUIStore(state => state.toggleMilitaryBook);
  const marchDrawMode = useUIStore(state => state.marchDrawMode);

  const pendingRefugees = useGameStore(state => state.pendingRefugees || []);
  const openRefugeeModal = useGameStore(state => state.openRefugeeModal);
  const isRefugeeModalOpen = useGameStore(state => state.isRefugeeModalOpen);
  const militaryNotices = useGameStore(state => state.militaryNotices || []);

  const pendingRefugeesCount = pendingRefugees.filter(w => !w.departed && (w.daysRemaining ?? 0) > 0).length;
  const unreadNoticesCount = militaryNotices.filter(n => !n.read).length;

  // Khi đang vẽ đường hành quân, tạm ẩn thanh bên phải để không vướng tầm nhìn
  if (marchDrawMode) return null;

  return (
    <aside
      className="fixed right-2.5 top-[82px] z-[2500] pointer-events-auto select-none flex flex-col items-center"
      aria-label="Thanh Lệnh Quân Lam Sơn"
    >
      <div className="relative p-1.5 flex flex-col items-center gap-1 bg-[#23140a]/92 border border-[#8c6b44]/70 rounded-xl shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-xs">
        {/* Tiêu đề thanh lệnh nhỏ gọn */}
        <div className="text-[9.5px] font-serif font-black tracking-widest uppercase text-[#fef2d6]/80 pb-1 border-b border-[#8c6b44]/35 w-full text-center">
          Quân Lệnh
        </div>

        {/* NHÓM 1: QUÂN VỤ */}
        <div className="flex flex-col gap-1 w-full items-center">
          {/* 1. Bố Trận */}
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'army' ? null : 'army')}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              activeModal === 'army' ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Mở Sa Bàn Bố Trận (Quản lý các đạo quân & sắp xếp binh chủng)"
          >
            {activeModal === 'army' && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <img
              src="/icons/flag.png"
              alt="Bố Trận"
              className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            />
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              activeModal === 'army' ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Bố Trận
            </span>
          </button>

          {/* 2. Thao Luyện */}
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'training' ? null : 'training')}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              activeModal === 'training' ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Mở Bảng Thao Luyện (Huấn luyện tráng phu thành nghĩa binh)"
          >
            {activeModal === 'training' && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <div className="relative z-10 w-6 h-6 flex items-center justify-center text-amber-300">
              <Dumbbell size={19} />
            </div>
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              activeModal === 'training' ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Thao Luyện
            </span>
          </button>

          {/* 3. Hành Quân */}
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'march' ? null : 'march')}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              activeModal === 'march' ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Tổng Quản Hành Quân (Danh sách các đạo quân và đội thám mã ngoài thực địa)"
          >
            {activeModal === 'march' && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <img
              src="/troops/cavalry.png"
              alt="Hành Quân"
              className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            />
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              activeModal === 'march' ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Hành Quân
            </span>
          </button>
        </div>

        {/* Phân cách */}
        <div className="w-10 h-px bg-[#8c6b44]/40 my-0.5" />

        {/* NHÓM 2: NỘI CHÍNH & HẬU CẦN */}
        <div className="flex flex-col gap-1 w-full items-center">
          {/* 4. Đồn Điền */}
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'farms' ? null : 'farms')}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              activeModal === 'farms' ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Tổng Quản Đồn Điền (Tiến độ mùa vụ & phân bổ nông đinh canh tác)"
          >
            {activeModal === 'farms' && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <img
              src="/icons/structure_farm.png"
              alt="Đồn Điền"
              className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            />
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              activeModal === 'farms' ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Đồn Điền
            </span>
          </button>

          {/* 5. Lò Rèn */}
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'forges' ? null : 'forges')}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              activeModal === 'forges' ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Tổng Quản Lò Rèn (Đúc kiếm giáo, cung nỏ & giáp trụ)"
          >
            {activeModal === 'forges' && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <img
              src="/icons/structure_forge.png"
              alt="Lò Rèn"
              className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            />
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              activeModal === 'forges' ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Lò Rèn
            </span>
          </button>

          {/* 6. Xây Dựng */}
          <button
            type="button"
            onClick={toggleBuildPaper}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              isBuildPaperOpen ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Khai Hoang Xây Dựng (Dựng căn cứ, lập ruộng mới, dựng lò rèn)"
          >
            {isBuildPaperOpen && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <img
              src="/icons/structure_camp.png"
              alt="Xây Dựng"
              className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            />
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              isBuildPaperOpen ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Xây Dựng
            </span>
          </button>
        </div>

        {/* Phân cách */}
        <div className="w-10 h-px bg-[#8c6b44]/40 my-0.5" />

        {/* NHÓM 3: NHÂN SỰ & QUÂN BÁO */}
        <div className="flex flex-col gap-1 w-full items-center">
          {/* 7. Lưu Dân */}
          <button
            type="button"
            onClick={() => openRefugeeModal()}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              isRefugeeModalOpen ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Tiếp Nhận Lưu Dân (Xem các đoàn lánh nạn đang chờ trước cổng trại)"
          >
            {isRefugeeModalOpen && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <div className="relative z-10 w-6 h-6 flex items-center justify-center text-emerald-400">
              <Users size={19} />
              {pendingRefugeesCount > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-[17px] h-4 px-1 bg-[#8c2d19] text-[#fff3db] border border-[#fef08a] rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-md animate-pulse">
                  {pendingRefugeesCount}
                </span>
              )}
            </div>
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              isRefugeeModalOpen ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Lưu Dân
            </span>
          </button>

          {/* 8. Thẻ Tướng */}
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'generals' ? null : 'generals')}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              activeModal === 'generals' ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Lệnh Bài Danh Tướng Lam Sơn"
          >
            {activeModal === 'generals' && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <img
              src="/icons/general_token.png"
              alt="Thẻ Tướng"
              className="relative z-10 w-6 h-6 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            />
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              activeModal === 'generals' ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Thẻ Tướng
            </span>
          </button>

          {/* 9. Quân Thư */}
          <button
            type="button"
            onClick={toggleMilitaryBook}
            className={`relative w-[62px] h-[52px] rounded flex flex-col items-center justify-center p-0.5 transition-transform cursor-pointer ${
              isMilitaryBookOpen ? 'scale-105' : 'hover:scale-105 active:scale-95'
            }`}
            title="Quân Thư (Chiến báo, biến cố mùa màng & tình báo giặc Minh)"
          >
            {isMilitaryBookOpen && (
              <img
                src="/ink_stroke_red.png"
                alt="Đang mở"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            )}
            <div className="relative z-10 w-6 h-6 flex items-center justify-center">
              <img
                src="/icons/scroll.png"
                alt="Quân Thư"
                className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              />
              {unreadNoticesCount > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-[17px] h-4 px-1 bg-[#8c2d19] text-[#fff3db] border border-[#fef08a] rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-md animate-pulse">
                  {unreadNoticesCount}
                </span>
              )}
            </div>
            <span className={`relative z-10 font-serif font-black text-[10px] leading-tight ${
              isMilitaryBookOpen ? 'text-[#fcf4e4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#fef2d6]/85'
            }`}>
              Quân Thư
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
});

RightCommandDock.displayName = 'RightCommandDock';
