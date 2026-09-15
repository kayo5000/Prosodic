import os
import subprocess

ffmpeg_exe = r'C:\Users\bsfka\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
work_dir = r'C:\Users\bsfka\.gemini\antigravity\brain\ab773533-b63f-4592-b4dc-6d7797cc960d\scratch\final_intro_black'
os.makedirs(work_dir, exist_ok=True)

desktop_dir = r'C:\Users\bsfka\OneDrive\Desktop\Prosodic Beta'
prev_scratch = r'C:\Users\bsfka\.gemini\antigravity\brain\ab773533-b63f-4592-b4dc-6d7797cc960d\scratch\cut_segments_v2'

# 1. Seg 1 (Writer)
seg1_path = os.path.join(work_dir, 'seg1_writer.mp4')
cmd1 = [
    ffmpeg_exe, '-y',
    '-ss', '00:00:01.00',
    '-t', '00:00:03.00',
    '-i', os.path.join(desktop_dir, '20260913_181431000_iOS.MOV'),
    '-an',
    '-vf', 'scale=1012:1920,fade=t=in:st=0:d=0.75:color=black',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    seg1_path
]
print('Building Seg 1...')
subprocess.run(cmd1, check=True)

# 2. Seg 2 (Studio Energy)
seg2_path = os.path.join(work_dir, 'seg2_studio.mp4')
cmd2 = [
    ffmpeg_exe, '-y',
    '-ss', '00:00:00.60',
    '-t', '00:00:02.25',
    '-i', os.path.join(desktop_dir, '20260913_183848000_iOS.MOV'),
    '-an',
    '-vf', 'scale=1012:1920',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    seg2_path
]
print('Building Seg 2...')
subprocess.run(cmd2, check=True)

# 3. Seg 3 (Headphones fade to black)
seg3_path = os.path.join(work_dir, 'seg3_headphones.mp4')
headphones_src = os.path.join(prev_scratch, 'seg2_headphones.mp4')
cmd3 = [
    ffmpeg_exe, '-y',
    '-t', '00:00:02.75',
    '-i', headphones_src,
    '-an',
    '-vf', 'scale=1012:1920,fade=t=out:st=1.75:d=1.00:color=black',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    seg3_path
]
print('Building Seg 3...')
subprocess.run(cmd3, check=True)

# 4. Seg 4 (Pure Black)
seg4_path = os.path.join(work_dir, 'seg4_black.mp4')
cmd4 = [
    ffmpeg_exe, '-y',
    '-f', 'lavfi',
    '-i', 'color=c=black:s=1012x1920:r=30:d=3.00',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    seg4_path
]
print('Building Seg 4...')
subprocess.run(cmd4, check=True)

# 5. Concat
list_file = os.path.join(work_dir, 'concat.txt')
with open(list_file, 'w', encoding='utf-8') as f:
    for p in [seg1_path, seg2_path, seg3_path, seg4_path]:
        clean_p = p.replace('\\', '/')
        f.write(f"file '{clean_p}'\n")

out_final = r'c:\Users\bsfka\OneDrive\Documents\V1_Launch_Prosodic\assets\videos\intro-bg.mp4'
cmd_concat = [
    ffmpeg_exe, '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', list_file,
    '-c', 'copy',
    '-movflags', '+faststart',
    out_final
]
print('Concatenating final intro-bg.mp4...')
subprocess.run(cmd_concat, check=True)
print('Done! Final size:', os.path.getsize(out_final))
