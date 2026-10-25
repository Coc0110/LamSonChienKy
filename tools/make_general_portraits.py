"""Chuyển tranh vẽ mực nền trắng của các vị tướng thành PNG chỉ giữ nét ĐEN (phần trắng trong suốt) để khắc lên thẻ đồng."""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

OPEN = 2  # nét mảnh hơn số px này (nét đan đổ bóng) sẽ bị lược bỏ
UP = r'C:\Users\WIN\.gemini\antigravity\brain\9b567884-abee-4c82-ab2f-cc0c301d47c9\.user_uploaded'
SRC = {
    'trinh_kha': 'media_1792917683637_45c7da46.jpg',
    'le_sat': 'media_1792918839285_d7a02d37.jpg',
    'luu_nhan_chu': 'media_1792917695068_a5aed9f0.jpg',
    'dinh_le': 'media_1792917915264_b3186a31.png',
    'le_than': 'media_1792918221042_beb9b4f0.png',
}
INK = np.array([22, 11, 5], np.float32)
CREAM = np.array([238, 218, 182], np.float32)


def process(key, fn):
    im = Image.open(f'{UP}\\{fn}').convert('L')
    g = np.asarray(im, np.float32)
    nonbg = g < 215  # nét mực / vùng tối
    # bỏ chữ thư pháp: chỉ giữ cụm nét mực lớn nhất (nhân vật + vũ khí)
    cl, n = ndi.label(ndi.binary_dilation(nonbg, iterations=7))
    sizes = ndi.sum(np.ones_like(cl), cl, range(1, n + 1))
    keep = ndi.binary_dilation(cl == (1 + int(np.argmax(sizes))), iterations=3)
    # chỉ khắc phần ĐEN: độ trong suốt tỉ lệ với độ đậm của nét mực, phần trắng hoàn toàn trong suốt
    # lược bỏ nét đan đổ bóng: phép 'opening' trên độ đậm xóa các nét mảnh (<~3px), chỉ giữ đường viền & mảng đen lớn
    d = 255.0 - g
    d = ndi.grey_opening(d, size=(OPEN, OPEN))
    d = ndi.gaussian_filter(d, 0.7)
    x = np.clip((d - 60.0) / 90.0, 0, 1)
    ink = x * x * (3 - 2 * x)
    ink = ink * keep
    rgb = np.broadcast_to(INK, g.shape + (3,))
    out = np.dstack([rgb.astype(np.uint8), (ink * 255).astype(np.uint8)])
    img = Image.fromarray(out, 'RGBA')
    img = img.crop(img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
    if img.height < 900:
        k = 900 / img.height
        img = img.resize((round(img.width * k), 900), Image.LANCZOS)
    img.save(f'public/generals/{key}.png', optimize=True)
    print(key, img.size)


import sys
for k, f in SRC.items():
    if len(sys.argv) > 1 and k not in sys.argv[1:]:
        continue
    process(k, f)
