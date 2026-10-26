import React from 'react';
import { 
  MapPin, 
  Users, 
  Heart, 
  Mountain, 
  Wheat, 
  Castle, 
  Compass, 
  X,
  ChevronRight,
  Truck
} from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import districtData from '../../../data/districtPolygons.json';
import { pointInPolygon } from '../../../utils/mapGeo';
import type { DistrictInfo } from '../../../types/map';

interface DistrictDetailPanelProps {
  districtId: string;
  onClose: () => void;
}

// Dữ liệu mô tả địa hạt lịch sử và sản vật các huyện Thanh Hóa thế kỷ XV
const DISTRICT_LORE: Record<string, { desc: string; terrain: string; produce: string; pop: number; support: number }> = {
  lam_son: {
    desc: 'Cái nôi khởi phát khởi nghĩa Bình Ngô. Đất đai phì nhiêu kẹp giữa sông Lương Giang và núi rừng Lam Sơn hiểm trở.',
    terrain: 'Rừng rậm, gò đồi và thung lũng lúa nước',
    produce: 'Lúa thơm, gỗ lim, thú rừng, thảo dược',
    pop: 18500,
    support: 98,
  },
  chi_linh: {
    desc: 'Dãy núi hiểm trở bậc nhất phía Tây, ba lần nghĩa quân nếm mật nằm gai, mai phục cầm chân vạn quân giặc.',
    terrain: 'Núi cao trùng điệp, vách đá, rừng nguyên sinh',
    produce: 'Quặng sắt, gỗ quý, măng rừng, củ mài',
    pop: 6200,
    support: 95,
  },
  tay_do: {
    desc: 'Kinh đô nhà Hồ thuở trước, thành quách đá đồ sộ. Hiện là sào huyệt đầu não đồn trú vạn quân tinh nhuệ của tướng Minh Lương Nhữ.',
    terrain: 'Đồng bằng phù sa, sông Mã bao quanh hiểm yếu',
    produce: 'Lúa gạo dồi dào, vũ khí rèn đúc, vải vóc',
    pop: 54000,
    support: 45,
  },
  quan_du: {
    desc: 'Cửa ải án ngữ thượng lưu sông Mã, chốt chặn giao thương giữa biên thùy Ai Lao và vùng đồng bằng Châu Ái.',
    terrain: 'Thung lũng ven sông, núi đồi xen kẽ',
    produce: 'Ngựa chiến, quặng đồng, ngô sắn',
    pop: 14200,
    support: 60,
  },
  luong_giang: {
    desc: 'Vựa lúa cổ trù phú dọc sông Chu. Nơi tụ họp hào kiệt bốn phương tìm về dâng cờ tụ nghĩa dưới trướng Bình Định Vương.',
    terrain: 'Đồng bằng châu thổ màu mỡ',
    produce: 'Lúa nước 2 vụ, trâu bò cày cấy, cá tôm',
    pop: 32000,
    support: 88,
  },
  dong_son: {
    desc: 'Trung tâm Châu Cửu Chân, trù phú sầm uất. Đồn lũy giặc Minh lập dày đặc để thu vét thuế khóa của dân bản xứ.',
    terrain: 'Đồng bằng màu mỡ và đồi sót đá vôi',
    produce: 'Đồng đúc, lúa mùa, muối mặn, đồ gốm',
    pop: 41000,
    support: 52,
  },
  nong_cong: {
    desc: 'Địa hạt cửa ngõ phương Nam kết nối Thanh Hóa với Nghệ An. Dân phong thuần hậu, hướng về độc lập dân tộc.',
    terrain: 'Đồng trũng, kênh rạch và bãi đầm',
    produce: 'Lúa chiêm, mía đường, chiếu cói',
    pop: 28000,
    support: 75,
  },
  ha_trung: {
    desc: 'Vùng sông Lạch Bạng đổ ra vịnh Bắc Bộ. Nơi thuyền bè vận lương giặc Minh tấp nập cập bến.',
    terrain: 'Vùng đầm lầy và cửa biển',
    produce: 'Muối hột, cá khô, hải sản, gỗ đóng thuyền',
    pop: 26000,
    support: 58,
  },
};

export const DistrictDetailPanel: React.FC<DistrictDetailPanelProps> = ({ districtId, onClose }) => {
  const cities = useGameStore(state => state.cities);
  const selectBase = useUIStore(state => state.selectBase);
  const setBaseRelocateMode = useUIStore(state => state.setBaseRelocateMode);

  // Lấy dữ liệu huyện từ districtPolygons
  const defaultDistricts: DistrictInfo[] = (districtData as any).districts || [];
  const district = defaultDistricts.find(d => d.id === districtId);

  if (!district) {
    return null;
  }

  // Tra cứu các Căn cứ / Đồn trại đóng trên địa bàn huyện này
  const basesInDistrict = cities.filter(c => {
    if (c.districtId === district.id) return true;
    if (c.id === district.id) return true;
    return pointInPolygon(c.x, c.y, district.polygon);
  });

  // Xác định phe kiểm soát địa bàn
  const hasLamSonBase = basesInDistrict.some(b => b.faction === 'lam_son' && (b.hasBase || b.troops > 0));
  const hasMingBase = basesInDistrict.some(b => b.faction === 'ming' && b.troops > 0);

  const controlStatus = hasLamSonBase && !hasMingBase
    ? { title: 'Nghĩa Quân Giải Phóng', color: 'text-amber-800 bg-amber-100 border-amber-500/70', badge: '★ Lam Sơn kiểm soát' }
    : hasMingBase
    ? { title: 'Giặc Minh Chiếm Đóng', color: 'text-blue-900 bg-blue-100 border-blue-600/70', badge: '◆ Quân Minh khống chế' }
    : { title: 'Bản Làng Tự Trị', color: 'text-stone-800 bg-stone-200 border-stone-400', badge: '▲ Vùng Trung Lập' };

  // Dữ liệu mô tả bổ trợ
  const lore = DISTRICT_LORE[district.id] || {
    desc: `Địa hạt ${district.name} thuộc ${district.chau}, địa thế trọng yếu trong thế trận công thủ toàn cục xứ Thanh Hoa.`,
    terrain: 'Đồng bằng xen lẫn gò đồi',
    produce: 'Lúa ngô, lâm sản, gia súc',
    pop: 22000,
    support: hasLamSonBase ? 85 : 55,
  };

  // Tìm căn cứ Lam Sơn đầu tiên nếu muốn di dời
  const lamSonBases = cities.filter(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp'));

  return (
    <div className="relative flex flex-col h-full bg-[#f4ede1] text-[#2c1d11]">
      {/* Header Địa Hạt Huyện */}
      <div className="relative z-10 px-4 pt-3.5 pb-2.5 border-b border-[#c2a67e]/80 flex items-start justify-between bg-[#ebdcc2]/60">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-serif font-black uppercase tracking-wider border shadow-xs ${controlStatus.color}`}>
              {controlStatus.badge}
            </span>
            <span className="text-xs font-serif font-bold text-[#754f2a]">
              • {district.chau}
            </span>
          </div>

          <h1 className="font-serif font-black text-[#261304] text-2xl md:text-3xl tracking-wide leading-tight">
            Huyện {district.name}
          </h1>

          <div className="flex items-center gap-2 text-xs font-sans text-[#66462c] font-bold mt-0.5">
            <MapPin size={13} className="text-[#8c2d19]" />
            <span>Địa hạt hành chính Thanh Hóa TK XV</span>
            <span>•</span>
            <span>Tọa độ tâm: {district.center[0].toFixed(1)}°, {district.center[1].toFixed(1)}°</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#d8c29d]/70 text-[#593922] transition ml-2 shrink-0 cursor-pointer"
          title="Đóng Quân Thư Địa Hạt"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nội dung chi tiết Địa Hạt */}
      <div className="relative z-10 p-4 overflow-y-auto space-y-3.5 no-scrollbar flex-1">
        
        {/* 1. Lịch sử & Bối cảnh địa bàn */}
        <div className="p-3 rounded-lg bg-[#faf5eb] border border-[#d2bea0] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#8c2d19] uppercase tracking-wider mb-1.5">
            <Compass size={14} />
            <span>Hình Thế Bản Địa</span>
          </div>
          <p className="text-xs leading-relaxed text-[#402a16] font-serif italic">
            "{lore.desc}"
          </p>
        </div>

        {/* 2. Chỉ số Địa Bàn: Dân Cư & Lòng Dân */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg bg-[#faf5eb] border border-[#d2bea0] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#704d2e]">
              <Users size={14} className="text-[#8c2d19]" />
              <span>Dân chúng bản hạt</span>
            </div>
            <div className="mt-1 font-sans font-bold text-xl text-[#2a1708]">
              {lore.pop.toLocaleString()}
              <span className="text-xs font-normal text-[#6b4725] ml-1">nhân khẩu</span>
            </div>
            <div className="text-[10px] text-[#855e38] mt-0.5">Dân cư địa phương sinh sống</div>
          </div>

          <div className="p-3 rounded-lg bg-[#faf5eb] border border-[#d2bea0] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#704d2e]">
              <Heart size={14} className="text-[#b91c1c]" />
              <span>Lòng dân ủng hộ</span>
            </div>
            <div className="mt-1 font-sans font-bold text-xl text-[#b91c1c]">
              {lore.support}%
            </div>
            <div className="text-[10px] text-[#855e38] mt-0.5">Mức độ hướng về khởi nghĩa</div>
          </div>
        </div>

        {/* 3. Địa thế tự nhiên & Sản vật */}
        <div className="p-3 rounded-lg bg-[#faf5eb] border border-[#d2bea0] shadow-xs space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <Mountain size={15} className="text-[#654321] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#452b14]">Địa thế: </span>
              <span className="text-[#593922]">{lore.terrain}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs border-t border-[#e2d2bb] pt-2">
            <Wheat size={15} className="text-[#854d0e] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#452b14]">Sản vật & Tiếp tế: </span>
              <span className="text-[#593922]">{lore.produce}</span>
            </div>
          </div>
        </div>

        {/* 4. CĂN CỨ & ĐỒN TRẠI QUÂN SỰ TRÊN ĐỊA BÀN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-serif font-black text-[#69421f] uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Castle size={14} className="text-[#8c2d19]" />
              <span>Căn Cứ Quân Sự Trong Huyện ({basesInDistrict.length})</span>
            </div>
          </div>

          {basesInDistrict.length === 0 ? (
            <div className="p-3.5 rounded-lg bg-[#f0e4d0]/60 border border-dashed border-[#be9e77] text-center text-xs text-[#735032]">
              <p>Hiện chưa có căn cứ hay đồn trại nào đóng quân trên địa hạt này.</p>
              {lamSonBases.length > 0 && (
                <button
                  onClick={() => setBaseRelocateMode({ baseId: lamSonBases[0].id })}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#8c2d19] text-[#fbebd0] font-serif font-bold hover:bg-[#a8351e] transition shadow-xs cursor-pointer"
                >
                  <Truck size={14} />
                  <span>Di dời Căn cứ về huyện này</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {basesInDistrict.map(b => {
                const isLamSon = b.faction === 'lam_son';
                const isMing = b.faction === 'ming';

                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-lg border shadow-xs transition flex items-center justify-between ${
                      isLamSon 
                        ? 'bg-[#fdf9f2] border-amber-500/80 hover:border-red-600' 
                        : isMing
                        ? 'bg-[#f0f4fd] border-blue-400 hover:border-blue-600'
                        : 'bg-[#faf6ee] border-[#cbb18d]'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${isLamSon ? 'bg-red-600 animate-pulse' : isMing ? 'bg-blue-600' : 'bg-stone-500'}`} />
                        <span className="font-serif font-bold text-sm text-[#261304]">{b.name}</span>
                      </div>
                      <div className="text-xs text-[#6e4927] mt-0.5 flex items-center gap-2">
                        <span>{isLamSon ? '★ Bản Doanh Nghĩa Quân' : isMing ? '◆ Đồn Binh Quân Minh' : 'Cứ điểm trung lập'}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-[#8c2d19]">{b.troops.toLocaleString()} binh</span>
                      </div>
                    </div>

                    <button
                      onClick={() => selectBase(b.id)}
                      className="px-2.5 py-1.5 rounded bg-[#8c2d19] hover:bg-[#a63721] text-[#fbebd0] text-xs font-serif font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                      title="Mở bảng chỉ huy căn cứ này"
                    >
                      <span>Vào Căn Cứ</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
