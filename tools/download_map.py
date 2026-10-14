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
    # Bounding box: Thanh Hoa to Hanoi (approx Lat 19.5 to 21.5, Lng 104.5 to 106.5)
    lat_min, lat_max = 19.5, 21.5
    lng_min, lng_max = 104.5, 106.5

    x_min, y_max = deg2num(lat_min, lng_min, z) # Note: smaller lat -> larger Y
    x_max, y_min = deg2num(lat_max, lng_max, z)
    
    print(f"X range: {x_min} to {x_max}")
    print(f"Y range: {y_min} to {y_max}")

    width_tiles = x_max - x_min + 1
    height_tiles = y_max - y_min + 1

    print(f"Downloading {width_tiles * height_tiles} tiles...")

    tile_width, tile_height = 256, 256
    full_img = Image.new('RGB', (width_tiles * tile_width, height_tiles * tile_height))

    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            print(f"Fetching {url}")
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    img = Image.open(BytesIO(response.content))
                    px = (x - x_min) * tile_width
                    py = (y - y_min) * tile_height
                    full_img.paste(img, (px, py))
            except Exception as e:
                print(f"Failed {url}: {e}")

    output_path = 'thanh_hoa_map_reference.jpg'
    full_img.save(output_path, quality=90)
    print(f"Saved map to {output_path}")

if __name__ == '__main__':
    download_tiles()
