import math
import requests
from PIL import Image
import os
from io import BytesIO

def deg2num(lat_deg, lon_deg, zoom):
  lat_rad = math.radians(lat_deg)
  n = 2.0 ** zoom
  xtile = int((lon_deg + 180.0) / 360.0 * n)
  ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
  return (xtile, ytile)

def download_tiles():
    z = 11
    # Bounding box: Da Nang to North Vietnam
    lat_min, lat_max = 16.0, 23.5
    lng_min, lng_max = 102.0, 108.0

    x_min, y_max = deg2num(lat_min, lng_min, z)
    x_max, y_min = deg2num(lat_max, lng_max, z)
    
    print(f"X range: {x_min} to {x_max}")
    print(f"Y range: {y_min} to {y_max}")

    width_tiles = x_max - x_min + 1
    height_tiles = y_max - y_min + 1
    total_tiles = width_tiles * height_tiles

    print(f"Downloading {total_tiles} tiles. This might take a few minutes...")

    tile_width, tile_height = 256, 256
    full_img = Image.new('RGB', (width_tiles * tile_width, height_tiles * tile_height))

    downloaded = 0
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    img = Image.open(BytesIO(response.content))
                    px = (x - x_min) * tile_width
                    py = (y - y_min) * tile_height
                    full_img.paste(img, (px, py))
                    downloaded += 1
                    if downloaded % 50 == 0:
                        print(f"Progress: {downloaded}/{total_tiles}")
            except Exception as e:
                print(f"Failed {url}: {e}")

    output_path = 'vietnam_full_map_reference.jpg'
    # Use quality=85 to reduce file size for such a massive image
    full_img.save(output_path, quality=85)
    print(f"Saved massive map to {output_path}")

if __name__ == '__main__':
    download_tiles()
