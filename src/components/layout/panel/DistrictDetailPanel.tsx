import React from 'react';
import { X } from 'lucide-react';
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
    <div className="relative flex flex-col h-full bg-transparent text-[#2c1d11]">
      {/* Header Địa Hạt Huyện: Không khung viền, không đường kẻ, không icon, không tọa độ */}
      <div className="relative z-10 px-6 pt-5 pb-1 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {hasLamSonBase && !hasMingBase ? (
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#991b1b]">
                ★ Lam Sơn kiểm soát
              </span>
            ) : hasMingBase ? (
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#1e3a8a]">
                ◆ Quân Minh khống chế
              </span>
            ) : (
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#5c3c1e]">
                ▲ Vùng Trung Lập
              </span>
            )}
            <span className="text-xs font-serif font-bold text-[#754f2a]">
              • {district.chau}
            </span>
          </div>

          <h1 className="font-serif font-bold text-[#261304] text-2xl md:text-3xl tracking-wide leading-tight">
            Huyện {district.name}
          </h1>
        </div>

        <button 
          onClick={onClose}
          className="p-1 text-[#593922] hover:text-[#8c2d19] transition ml-2 shrink-0 cursor-pointer"
          title="Đóng Quân Thư Địa Hạt"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nội dung chi tiết Địa Hạt: Thuần chữ trên giấy cổ, tinh giản tối đa */}
      <div className="relative z-10 px-6 py-3 overflow-y-auto space-y-3.5 no-scrollbar flex-1 pb-14">
        
        {/* 1. Lịch sử & Bối cảnh địa bàn */}
        <div>
          <div className="text-xs font-serif font-bold text-[#8c2d19] uppercase tracking-wider mb-1">
            Hình Thế Bản Địa
          </div>
          <p className="text-xs leading-relaxed text-[#3d2714] font-serif italic">
            "{lore.desc}"
          </p>
        </div>

        {/* 2. Chỉ số Địa Bàn: Nét chữ thường thanh mảnh, không in đậm */}
        <div className="space-y-1.5 text-xs text-[#3d2714] font-serif">
          <div>
            <span className="font-serif font-bold text-[#452b14]">Dân chúng: </span>
            <span className="font-serif text-[#2a1708]">{lore.pop.toLocaleString()} nhân khẩu</span>
          </div>

          <div>
            <span className="font-serif font-bold text-[#452b14]">Lòng dân: </span>
            <span className="font-serif text-[#991b1b]">{lore.support}%</span>
          </div>

          <div>
            <span className="font-serif font-bold text-[#452b14]">Địa thế: </span>
            <span className="font-serif text-[#3d2714]">{lore.terrain}</span>
          </div>
        </div>

        {/* 3. CĂN CỨ & ĐỒN TRẠI QUÂN SỰ TRÊN ĐỊA BÀN */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-serif font-bold text-[#69421f] uppercase tracking-wider">
            Căn Cứ Quân Sự Trong Huyện ({basesInDistrict.length})
          </div>

          {basesInDistrict.length === 0 ? (
            <div className="py-2 text-xs text-[#735032] font-serif">
              <p className="italic">Hiện chưa có căn cứ hay đồn trại nào đóng quân trên địa hạt này.</p>
              {lamSonBases.length > 0 && (
                <button
                  onClick={() => setBaseRelocateMode({ baseId: lamSonBases[0].id })}
                  className="relative group mt-2.5 px-4 py-1.5 inline-flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <img
                    src="/ink_stroke_1.png"
                    alt="Vết mực"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                  />
                  <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Di dời Căn cứ về huyện này
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {basesInDistrict.map(b => {
                const isLamSon = b.faction === 'lam_son';
                const isMing = b.faction === 'ming';

                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <img
                        src={b.type === 'city' ? '/icons/structure_city.png' : '/icons/structure_camp.png'}
                        alt={b.type === 'city' ? 'Thành' : 'Doanh'}
                        className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                      />
                      <div>
                        <div className="font-serif font-bold text-sm text-[#261304]">
                          {b.name}
                        </div>
                        <div className="text-xs text-[#6e4927] mt-0.5 flex items-center gap-1.5 font-serif">
                          <span>{isLamSon ? '★ Bản Doanh Nghĩa Quân' : isMing ? '◆ Đồn Binh Quân Minh' : 'Cứ điểm trung lập'}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-[#8c2d19]">{b.troops.toLocaleString()} binh</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => selectBase(b.id)}
                      className="relative group px-3.5 py-1.5 min-w-[105px] h-[32px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                      title="Mở bảng chỉ huy căn cứ này"
                    >
                      <img
                        src="/ink_stroke_1.png"
                        alt="Vết mực"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                      />
                      <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        Vào Căn Cứ
                      </span>
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
