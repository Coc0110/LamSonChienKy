import type { General } from '../../types';

import { le_loi } from './le_loi';
import { le_lai } from './le_lai';
import { le_than } from './le_than';
import { le_sat } from './le_sat';
import { trinh_kha } from './trinh_kha';
import { luu_nhan_chu } from './luu_nhan_chu';
import { dinh_le } from './dinh_le';
import { le_van_an } from './le_van_an';
import { le_van_linh } from './le_van_linh';
import { bui_quoc_hung } from './bui_quoc_hung';
import { truong_loi } from './truong_loi';
import { le_lieu } from './le_lieu';
import { truong_chien } from './truong_chien';
import { le_ninh } from './le_ninh';
import { le_hiem } from './le_hiem';
import { vu_uy } from './vu_uy';
import { dinh_lan } from './dinh_lan';
import { le_hoi } from './le_hoi';
import { le_thach } from './le_thach';
import { ly_trien } from './ly_trien';
import { nguyen_xi } from './nguyen_xi';
import { le_khoi } from './le_khoi';
import { dinh_liet } from './dinh_liet';
import { le_ngan } from './le_ngan';
import { bui_bi } from './bui_bi';
import { pham_ngoc } from './pham_ngoc';
import { le_boi } from './le_boi';
import { le_linh } from './le_linh';
import { dao_boi } from './dao_boi';
import { trinh_tuan } from './trinh_tuan';
import { nguyen_ly } from './nguyen_ly';
import { le_canh_quan } from './le_canh_quan';
import { ly_cot } from './ly_cot';
import { pham_cuong } from './pham_cuong';
import { nguyen_loi } from './nguyen_loi';
import { trinh_loi } from './trinh_loi';
import { nguyen_trai } from './nguyen_trai';
import { nguyen_chich } from './nguyen_chich';
import { pham_van_xao } from './pham_van_xao';
import { do_bi } from './do_bi';
import { le_luu } from './le_luu';
import { tran_nguyen_han } from './tran_nguyen_han';
import { cam_banh } from './cam_banh';
import { cam_quy } from './cam_quy';
import { cam_lan } from './cam_lan';
import { tran_luu } from './tran_luu';

// Xuất từng tướng riêng biệt để có thể import trực tiếp khi cần
export {
  le_loi,
  le_lai,
  le_than,
  le_sat,
  trinh_kha,
  luu_nhan_chu,
  dinh_le,
  le_van_an,
  le_van_linh,
  bui_quoc_hung,
  truong_loi,
  le_lieu,
  truong_chien,
  le_ninh,
  le_hiem,
  vu_uy,
  dinh_lan,
  le_hoi,
  le_thach,
  ly_trien,
  nguyen_xi,
  le_khoi,
  dinh_liet,
  le_ngan,
  bui_bi,
  pham_ngoc,
  le_boi,
  le_linh,
  dao_boi,
  trinh_tuan,
  nguyen_ly,
  le_canh_quan,
  ly_cot,
  pham_cuong,
  nguyen_loi,
  trinh_loi,
  nguyen_trai,
  nguyen_chich,
  pham_van_xao,
  do_bi,
  le_luu,
  tran_nguyen_han,
  cam_banh,
  cam_quy,
  cam_lan,
  tran_luu,
};

// Danh sách toàn bộ 46 danh tướng Lam Sơn
export const ALL_GENERALS: General[] = [
  le_loi,
  le_lai,
  le_than,
  le_sat,
  trinh_kha,
  luu_nhan_chu,
  dinh_le,
  le_van_an,
  le_van_linh,
  bui_quoc_hung,
  truong_loi,
  le_lieu,
  truong_chien,
  le_ninh,
  le_hiem,
  vu_uy,
  dinh_lan,
  le_hoi,
  le_thach,
  ly_trien,
  nguyen_xi,
  le_khoi,
  dinh_liet,
  le_ngan,
  bui_bi,
  pham_ngoc,
  le_boi,
  le_linh,
  dao_boi,
  trinh_tuan,
  nguyen_ly,
  le_canh_quan,
  ly_cot,
  pham_cuong,
  nguyen_loi,
  trinh_loi,
  nguyen_trai,
  nguyen_chich,
  pham_van_xao,
  do_bi,
  le_luu,
  tran_nguyen_han,
  cam_banh,
  cam_quy,
  cam_lan,
  tran_luu,
];

export const INITIAL_GENERALS: General[] = ALL_GENERALS;
