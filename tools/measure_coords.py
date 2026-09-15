from PIL import Image
import numpy as np

img = Image.open(r'C:/Users/bsfka/.gemini/antigravity/brain/0a36d100-9ebc-4420-bea3-8670293e047d/.user_uploaded/media_1788314687563.png').convert('RGB')
arr = np.array(img)

# Find red line pixels (High R, low G, low B)
red_mask = (arr[:, :, 0] > 180) & (arr[:, :, 1] < 80) & (arr[:, :, 2] < 80)
red_coords = np.argwhere(red_mask)

if len(red_coords) > 0:
    min_y, min_x = red_coords.min(axis=0)
    max_y, max_x = red_coords.max(axis=0)
    print(f"Red vertical line X: {min_x} to {max_x} (avg X: {red_coords[:, 1].mean():.1f})")
    print(f"Red vertical line Y: {min_y} to {max_y}")

# Find outer blue frame boundary
blue_mask = (arr[:, :, 2] > 200) & (arr[:, :, 0] < 100) & (arr[:, :, 1] < 150)
blue_coords = np.argwhere(blue_mask)
if len(blue_coords) > 0:
    min_y_b, min_x_b = blue_coords.min(axis=0)
    max_y_b, max_x_b = blue_coords.max(axis=0)
    print(f"Blue Frame X: {min_x_b} to {max_x_b} (width: {max_x_b - min_x_b})")
    print(f"Blue Frame Y: {min_y_b} to {max_y_b} (height: {max_y_b - min_y_b})")
