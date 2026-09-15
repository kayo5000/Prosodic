import os
from PIL import Image

def generate_favicons():
    src_path = 'assets/images/prosodic-yellow-bars.png'
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source image {src_path} not found")
    
    src = Image.open(src_path)
    bbox = src.getbbox()
    bars_cropped = src.crop(bbox)
    
    os.makedirs('public', exist_ok=True)
    os.makedirs('public/assets/images', exist_ok=True)
    os.makedirs('assets/images', exist_ok=True)
    
    # 1. Master 512x512 transparent favicon
    size = 512
    fav512 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    target_h = int(size * 0.80)
    scale = target_h / bars_cropped.height
    target_w = int(bars_cropped.width * scale)
    
    bars_resized = bars_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    paste_x = (size - target_w) // 2
    paste_y = (size - target_h) // 2
    fav512.paste(bars_resized, (paste_x, paste_y), bars_resized)
    
    fav512.save('public/favicon.png', 'PNG')
    fav512.save('public/favicon-512x512.png', 'PNG')
    fav512.save('assets/images/favicon.png', 'PNG')
    fav512.save('public/assets/images/favicon.png', 'PNG')
    
    # 2. 16x16 and 32x32 PNG favicons
    fav32 = fav512.resize((32, 32), Image.Resampling.LANCZOS)
    fav32.save('public/favicon-32x32.png', 'PNG')
    
    fav16 = fav512.resize((16, 16), Image.Resampling.LANCZOS)
    fav16.save('public/favicon-16x16.png', 'PNG')
    
    # 3. Multi-size ICO
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    fav512.save('public/favicon.ico', format='ICO', sizes=ico_sizes)
    
    # 4. Apple Touch Icon (180x180) - iOS Safari standard with dark void background for high contrast
    apple_size = 180
    apple_icon = Image.new('RGBA', (apple_size, apple_size), (4, 4, 7, 255))
    target_apple_h = int(apple_size * 0.68)
    scale_apple = target_apple_h / bars_cropped.height
    target_apple_w = int(bars_cropped.width * scale_apple)
    
    bars_apple = bars_cropped.resize((target_apple_w, target_apple_h), Image.Resampling.LANCZOS)
    apple_paste_x = (apple_size - target_apple_w) // 2
    apple_paste_y = (apple_size - target_apple_h) // 2
    apple_icon.paste(bars_apple, (apple_paste_x, apple_paste_y), bars_apple)
    
    apple_icon.save('public/apple-touch-icon.png', 'PNG')
    apple_icon.save('public/apple-touch-icon-precomposed.png', 'PNG')
    apple_icon.save('public/apple-icon.png', 'PNG')
    
    # 5. Master 1024x1024 app icon
    icon_size = 1024
    app_icon = Image.new('RGBA', (icon_size, icon_size), (4, 4, 7, 255))
    target_icon_h = int(icon_size * 0.60)
    scale_icon = target_icon_h / bars_cropped.height
    target_icon_w = int(bars_cropped.width * scale_icon)
    
    bars_icon_resized = bars_cropped.resize((target_icon_w, target_icon_h), Image.Resampling.LANCZOS)
    icon_paste_x = (icon_size - target_icon_w) // 2
    icon_paste_y = (icon_size - target_icon_h) // 2
    app_icon.paste(bars_icon_resized, (icon_paste_x, icon_paste_y), bars_icon_resized)
    app_icon.convert('RGB').save('assets/images/icon.png', 'PNG')
    
    print("[SUCCESS] Full favicon & Apple Touch Icon suite generated!")

if __name__ == '__main__':
    generate_favicons()
