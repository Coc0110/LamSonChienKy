from PIL import Image, ImageOps, ImageEnhance

# Target dimensions for TimePanel: 250 x 50
TARGET_W = 250
TARGET_H = 50

sheet = Image.open('C:/Users/WIN/.gemini/antigravity/brain/9b567884-abee-4c82-ab2f-cc0c301d47c9/.user_uploaded/media_1791764804795.jpg')

# 1. PROCESS FROST (BĂNG 1 & BĂNG 2)
# Băng 1: (6, 12, 166, 305) -> Top-Left has gorgeous frost fern dendrites
b1 = sheet.crop((6, 12, 166, 305))
# Băng 2: (176, 12, 336, 305) -> Encrusted frost borders
b2 = sheet.crop((176, 12, 336, 305))

# Create horizontal frost card
frost_card = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))

# Left corner frost from B1 (top-left fern: 0 to 110, 0 to 110)
b1_tl = b1.crop((0, 0, 110, 110)).resize((75, 50), Image.Resampling.LANCZOS).convert('RGBA')

# Right corner frost: flip B1 horizontally
b1_tr = ImageOps.mirror(b1_tl)

# Paste corners
frost_card.paste(b1_tl, (0, 0))
frost_card.paste(b1_tr, (TARGET_W - 75, 0))

# Top rim from B2
b2_top = b2.crop((20, 0, 140, 40)).resize((TARGET_W - 100, 18), Image.Resampling.LANCZOS).convert('RGBA')
frost_card.paste(b2_top, (50, 0))

# Bottom rim from B2
b2_bottom = ImageOps.flip(b2_top).resize((TARGET_W - 120, 14), Image.Resampling.LANCZOS)
frost_card.paste(b2_bottom, (60, TARGET_H - 14))

# Convert dark pixels to transparent for frost_card
frost_pixels = frost_card.getdata()
new_frost = []
for r, g, b, a in frost_pixels:
    brightness = max(r, g, b)
    if brightness < 32:
        new_frost.append((r, g, b, 0))
    elif brightness < 65:
        alpha = int((brightness - 32) / 33.0 * 200)
        new_frost.append((r, g, b, alpha))
    else:
        alpha = min(255, int((brightness - 32) / 160.0 * 255))
        new_frost.append((r, g, b, alpha))

frost_card.putdata(new_frost)
frost_card.save('public/frost_texture_card.png')
print('frost_texture_card.png created successfully')

# 2. PROCESS FIRE (LỬA 1 & LỬA 5 & LỬA 4)
# Lửa 1: (6, 350, 166, 638) -> Burnt edge with glowing ember crack
l1 = sheet.crop((6, 350, 166, 638))
# Lửa 5: (686, 350, 846, 638) -> Burnt edge with intense glowing fissure
l5 = sheet.crop((686, 350, 846, 638))
# Lửa 4: (516, 350, 676, 638) -> Floating embers
l4 = sheet.crop((516, 350, 676, 638))

fire_card = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))

# Left edge: burnt crack from L1
l1_patch = l1.crop((0, 20, 90, 160)).resize((70, 50), Image.Resampling.LANCZOS).convert('RGBA')
fire_card.paste(l1_patch, (0, 0))

# Right edge: intense burnt fissure from L5
l5_patch = ImageOps.mirror(l5.crop((0, 30, 90, 170)).resize((75, 50), Image.Resampling.LANCZOS).convert('RGBA'))
fire_card.paste(l5_patch, (TARGET_W - 75, 0))

# Top edge thin burnt seam from L5
l5_top = l5.crop((0, 10, 80, 50)).resize((TARGET_W - 110, 12), Image.Resampling.LANCZOS).convert('RGBA')
fire_card.paste(l5_top, (55, 0))

# Convert dark empty areas to transparent
fire_pixels = fire_card.getdata()
new_fire = []
for r, g, b, a in fire_pixels:
    # Embers have high Red and warmth: r > 50 and r > b*1.2
    # Burnt ash is dark brown: r ~ 40-70, g ~ 20-40, b ~ 10-25
    # Empty black/dark checkered: r,g,b all < 28 and r ≈ g ≈ b
    brightness = max(r, g, b)
    is_neutral_dark = (abs(r - g) < 8 and abs(g - b) < 8 and brightness < 32)
    if is_neutral_dark or brightness < 24:
        new_fire.append((r, g, b, 0))
    elif brightness < 45 and abs(r - g) < 10:
        alpha = int((brightness - 24) / 21.0 * 150)
        new_fire.append((r, g, b, alpha))
    else:
        # Retain ash & embers with good opacity
        alpha = min(255, int(brightness * 1.3))
        new_fire.append((r, g, b, alpha))

fire_card.putdata(new_fire)
fire_card.save('public/fire_texture_card.png')
print('fire_texture_card.png created successfully')
