/**
 * ============================================================================
 * TỆP QUẢN LÝ TIÊU ĐỀ, ĐẦU MỤC & NỘI DUNG GIAO DIỆN (UI TEXT / STRINGS)
 * ============================================================================
 * Bạn có thể tự do chỉnh sửa, rút ngắn hoặc đổi tên các đầu mục, tiêu đề,
 * nút bấm và nội dung hiển thị trong tệp này theo đúng ý đồ của mình.
 */

export const UI_TEXT = {
  // --------------------------------------------------------------------------
  // 1. THANH LỆNH ĐIỀU HÀNH BÊN TRÁI (LEFT BAR)
  // --------------------------------------------------------------------------
  leftDock: {
    // Tiêu đề các nhóm lệnh nhỏ
    groups: {
      military: 'Quân Vụ',
      domestic: 'Nội Chính',
      intelligence: 'Quân Cơ',
    },
    // 9 nút bấm điều hành
    buttons: {
      army: {
        label: 'Bố Trận',
        tooltip: 'Sa bàn bày binh bố trận',
      },
      training: {
        label: 'Thao Luyện',
        tooltip: 'Huấn luyện tân binh',
      },
      scout: {
        label: 'Do Thám',
        tooltip: 'Cử quân do thám',
      },
      farms: {
        label: 'Đồn Điền',
        tooltip: 'Quản lý đồn điền, mùa vụ',
      },
      forges: {
        label: 'Lò Rèn',
        tooltip: 'Rèn đúc khí giới',
      },
      build: {
        label: 'Xây Dựng',
        tooltip: 'Quy hoạch công trình',
      },
      market: {
        label: 'Chợ Huyện',
        tooltip: 'Giao thương mua bán tại chợ các huyện',
      },
      refugees: {
        label: 'Lưu Dân',
        tooltip: 'Đón tiếp dân tị nạn',
      },
      generals: {
        label: 'Thẻ Tướng',
        tooltip: 'Bảng danh tướng',
      },
      military_book: {
        label: 'Quân Thư',
        tooltip: 'Tin tức & Công văn quân sự',
      },
    },
  },

  // --------------------------------------------------------------------------
  // 2. BẢNG BỐ TRẬN & QUÂN LỰC (ARMY OVERVIEW)
  // --------------------------------------------------------------------------
  armyPanel: {
    title: 'Bố Trận & Binh Lực',
    subtitle: 'Quản lý các đạo quân và lộ trình tác chiến',
    stats: {
      totalArmies: 'Đạo quân',
      totalTroops: 'Tổng binh lực',
      supplies: 'Khí giới & Lương',
    },
    openTacticalGridBtn: 'Biên Chế Đạo Quân',
    openTacticalGridTooltip: 'Chọn tướng và kéo số lượng từng binh chủng',
    sectionTitle: 'Các Đạo Quân',
    emptyText: 'Chưa có đạo quân nào được biên chế.',
    commanderLabel: 'Chủ tướng:',
    unassignedCommander: 'Chưa chỉ định',
    actions: {
      drawRoute: 'Vẽ Đường',
      drawRouteTooltip: 'Vẽ lộ trình hành quân trên bản đồ',
      tacticalGrid: 'Biên Chế',
      tacticalGridTooltip: 'Mở bảng biên chế đạo quân',
      locate: 'Định vị',
    },
    createFormationBtn: 'Lập Đạo Quân Mới',
  },

  // --------------------------------------------------------------------------
  // 3. BẢNG TÌNH BÁO DO THÁM (SCOUT OVERVIEW)
  // --------------------------------------------------------------------------
  scoutPanel: {
    title: 'Tình Báo Do Thám',
    stats: {
      scouted: 'Đã do thám:',
      laborers: 'Tráng phu rảnh:',
    },
    sectionTitle: 'Danh sách Do Thám',
    emptyText: 'Chưa do thám thành trì nào.',
    emptySubtext: 'Chọn một đồn lũy quân Minh trên bản đồ để phái thám mã.',
    badges: {
      stationed: (count: number) => `Đã cắm chốt ${count} thám mã`,
      traveling: (count: number, days: number) => `Đang tới (${count} thám mã • còn ~${days} ngày)`,
      unknown: 'Chưa rõ tình báo',
    },
    labels: {
      troops: 'Quân đồn trú:',
      suspicion: 'Độ nghi ngờ:',
    },
    actions: {
      recall: 'Rút về',
      recallTooltip: 'Rút 1 thám mã hồi doanh',
      dispatchMore: '+ Phái Thêm',
      dispatch: '+ Phái Do Thám',
      locate: 'Định vị',
    },
    travelingSectionTitle: 'Đội Thám Mã Đang Di Chuyển',
    footerTip: '',
  },

  // --------------------------------------------------------------------------
  // 4. BẢNG ĐỒN ĐIỀN (FARMS OVERVIEW)
  // --------------------------------------------------------------------------
  farmsPanel: {
    title: 'Quản Lý Đồn Điền',
    subtitle: '',
    stats: {
      nextSeason: 'Vụ mùa hiện tại:',
      expectedYield: 'Sản lượng ước tính:',
      workers: 'Nông đinh canh tác:',
    },
    sectionTitle: 'Danh Sách Khu Ruộng',
    emptyText: 'Chưa có khu ruộng đồn điền nào.',
    actions: {
      decreaseWorker: 'Bớt 1 nông đinh',
      increaseWorker: 'Thêm 1 nông đinh',
      locate: 'Định vị',
      buildNew: '+ Khai Hoang Ruộng Mới',
    },
  },

  // --------------------------------------------------------------------------
  // 5. BẢNG LÒ RÈN (FORGES OVERVIEW)
  // --------------------------------------------------------------------------
  forgesPanel: {
    title: 'Quản Lý Lò Rèn',
    subtitle: '',
    stats: {
      totalForges: 'Lò rèn:',
      activeForging: 'Đang rèn:',
      smiths: 'Thợ rèn:',
    },
    sectionTitle: 'Danh Sách Lò Rèn',
    emptyText: 'Chưa xây dựng lò rèn nào.',
    actions: {
      orderForge: 'Hạ Lệnh Rèn',
      locate: 'Định vị',
      buildNew: '+ Dựng Lò Rèn Mới',
    },
  },

  // --------------------------------------------------------------------------
  // 6. BẢNG THAO LUYỆN (TRAINING & POPULATION)
  // --------------------------------------------------------------------------
  trainingPanel: {
    title: (cityName: string) => `Thao Luyện — ${cityName}`,
    subtitle: (total: number) => `Tổng nhân khẩu: ${total} người`,
    combatTroops: 'Nghĩa Binh',
    idleLaborers: 'Rảnh rỗi',
    farmingLaborers: 'Nông đinh',
    forgingLaborers: 'Rèn đúc',
    unfit: 'Lão, Ấu',
    startTrainingBtn: 'Thao Luyện Nghĩa Binh',
    cancelTrainingBtn: 'Hủy bỏ đợt thao luyện',
  },

  // --------------------------------------------------------------------------
  // 7. BẢNG LƯU DÂN (REFUGEE INTAKE)
  // --------------------------------------------------------------------------
  refugeesPanel: {
    title: 'Danh Sách Lưu Dân',
    capacity: (free: number, max: number) => `Trại còn trống: ${free}/${max} chỗ`,
    granary: (food: number) => `Kho lương: ${food} thạch`,
    emptyText: 'Hiện không có toán lưu dân nào xin quy phụ.',
    actions: {
      acceptAll: 'Nhận Toàn Bộ',
      acceptAbleOnly: 'Chỉ Nhận Tráng Đinh',
      reject: 'Từ Chối',
    },
  },

  // --------------------------------------------------------------------------
  // 8. BẢNG QUÂN THƯ (MILITARY BOOK)
  // --------------------------------------------------------------------------
  militaryBook: {
    title: 'Quân Thư',
    tabs: {
      bases: 'Bản Doanh',
      districts: 'Địa Hạt',
      notices: 'Quân Báo',
    },
    emptyNotices: 'Bờ cõi thanh bình, chưa có tin quân báo mới.',
  },

  // --------------------------------------------------------------------------
  // 9. BẢNG XÂY DỰNG (BUILD PANEL)
  // --------------------------------------------------------------------------
  buildPanel: {
    title: 'Công Trình Xây Dựng',
    structures: {
      camp: { name: 'Căn Cứ', desc: 'Doanh Trại' },
      farm: { name: 'Đồn Điền', desc: 'Ruộng Lúa' },
      forge: { name: 'Lò Rèn', desc: 'Xưởng Đúc' },
    },
  },

  // --------------------------------------------------------------------------
  // 10. THANH TRÊN (TOP BAR)
  // --------------------------------------------------------------------------
  topBar: {
    food: 'Lương:',
    gold: 'Ngân khố:',
    timeModes: {
      pause: 'Ngưng',
      day: 'Ngày',
      hour: 'Giờ',
    },
  },
};
