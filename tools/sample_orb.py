from PIL import Image
import numpy as np

img = Image.open('scratch/orb_thumb.png').convert('RGB')
w, h = img.size

# The orb is on the right side of the thumbnail, roughly X: 700 to 1180, Y: 150 to 650
# Let's find the orb bounding box and sample its radial gradient
arr = np.array(img)
# Sample across horizontal diameter of the orb
orb_center_x = 940
orb_center_y = 400

print("Orb Horizontal Cross-Section (X from 720 to 1160 at Y=400):")
for x in range(720, 1160, 20):
    r, g, b = arr[orb_center_y, x]
    print(f"X={x:4d}: RGB=({r:3d}, {g:3d}, {b:3d}) HEX=#{r:02x}{g:02x}{b:02x}")

print("\nOrb Vertical Cross-Section (Y from 200 to 620 at X=940):")
for y in range(200, 620, 20):
    r, g, b = arr[y, orb_center_x]
    print(f"Y={y:4d}: RGB=({r:3d}, {g:3d}, {b:3d}) HEX=#{r:02x}{g:02x}{b:02x}")
