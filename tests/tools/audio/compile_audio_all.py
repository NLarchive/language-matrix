import os
import shutil

# Source directories
source_dirs = ['basic', 'intermediate', 'advanced']
base_path = 'assets/audio'
dest_dir = os.path.join(base_path, 'all')

# Create destination directory if it doesn't exist
os.makedirs(dest_dir, exist_ok=True)

# Copy all mp3 files from source directories to dest_dir
for src_dir in source_dirs:
    src_path = os.path.join(base_path, src_dir)
    if os.path.exists(src_path):
        for file in os.listdir(src_path):
            if file.endswith('.mp3'):
                src_file = os.path.join(src_path, file)
                dest_file = os.path.join(dest_dir, file)
                shutil.copy2(src_file, dest_file)
                print(f"Copied {src_file} to {dest_file}")

print("Audio compilation for 'all' levels completed.")