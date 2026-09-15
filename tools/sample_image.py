from PIL import Image
import numpy as np

img = Image.open(r'C:/Users/bsfka/.gemini/antigravity/brain/0a36d100-9ebc-4420-bea3-8670293e047d/.user_uploaded/media_1788314687563.png').convert('RGB')
w, h = img.size

# Sample along vertical center of the frame (around x=250)
print(f"Image dimensions: {w}x{h}")
samples = []
for y in range(30, h-30, 40):
    r, g, b = img.getpixel((250, y))
    hex_col = f"#{r:02x}{g:02x}{b:02x}"
    print(f"Y={y:3d}: RGB=({r:3d}, {g:3d}, {b:3d}) HEX={hex_col}")
