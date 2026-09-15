import os
from PIL import Image

def generate_favicons():
    # Source master yellow bars
    src_path = 'assets/images/prosodic-yellow-bars.png'
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source image {src_path} not found")
    
    src = Image.open(src_path)
    bbox = src.getbbox()
    bars_cropped = src.crop(bbox)
    
    # 1. Generate transparent 512x512 favicon
    size = 512
    fav = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    target_h = int(size * 0.82)
    scale = target_h / bars_cropped.height
    target_w = int(bars_cropped.width * scale)
    
    bars_resized = bars_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    paste_x = (size - target_w) // 2
    paste_y = (size - target_h) // 2
    
    fav.paste(bars_resized, (paste_x, paste_y), bars_resized)
    
    # Ensure public folder exists
    os.makedirs('public', exist_ok=True)
    os.makedirs('assets/images', exist_ok=True)
    
    fav.save('assets/images/favicon.png', 'PNG')
    fav.save('public/favicon.png', 'PNG')
    
    # Save multi-size favicon.ico
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    fav.save('public/favicon.ico', format='ICO', sizes=ico_sizes)
    
    # 2. Also generate a 1024x1024 app icon with obsidian background and the bars
    icon_size = 1024
    app_icon = Image.new('RGBA', (icon_size, icon_size), (4, 4, 7, 255)) # #040407 obsidian void
    target_icon_h = int(icon_size * 0.60)
    scale_icon = target_icon_h / bars_cropped.height
    target_icon_w = int(bars_cropped.width * scale_icon)
    
    bars_icon_resized = bars_cropped.resize((target_icon_w, target_icon_h), Image.Resampling.LANCZOS)
    icon_paste_x = (icon_size - target_icon_w) // 2
    icon_paste_y = (icon_size - target_icon_h) // 2
    
    app_icon.paste(bars_icon_resized, (icon_paste_x, icon_paste_y), bars_icon_resized)
    app_icon.convert('RGB').save('assets/images/icon.png', 'PNG')
    
    print("[SUCCESS] Generated favicon.png, public/favicon.png, public/favicon.ico, and icon.png with the Prosodic Yellow Bars!")

if __name__ == '__main__':
    generate_favicons()
