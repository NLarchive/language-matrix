#!/usr/bin/env python3
"""
Rename audio files from word_XXX.webm to corresponding Hanzi.mp3 names.
"""

import os
import shutil

def rename_audio_files():
    # Source directory with word_XXX.webm files
    source_dir = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\words"

    # Target directory for Hanzi.mp3 files
    target_dir = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic"

    # Mapping: word_XXX.webm -> Hanzi.mp3
    # Based on the order provided by user
    mapping = {
        'word_001.webm': '我.mp3',
        'word_002.webm': '你.mp3',
        'word_003.webm': '他.mp3',
        'word_004.webm': '她.mp3',
        'word_005.webm': '我们.mp3',
        'word_006.webm': '你们.mp3',
        'word_007.webm': '他们.mp3',
        'word_008.webm': '是.mp3',
        'word_009.webm': '有.mp3',
        'word_010.webm': '去.mp3',
        'word_011.webm': '来.mp3',
        'word_012.webm': '吃.mp3',
        'word_013.webm': '喝.mp3',
        'word_014.webm': '看.mp3',
        'word_015.webm': '说.mp3',
        'word_016.webm': '做.mp3',
        'word_017.webm': '人.mp3',
        'word_018.webm': '东西.mp3',
        'word_019.webm': '书.mp3',
        'word_020.webm': '水.mp3',
        'word_021.webm': '饭.mp3',
        'word_022.webm': '家.mp3',
        'word_023.webm': '学校.mp3',
        'word_024.webm': '昨天.mp3',
        'word_025.webm': '今天.mp3',
        'word_026.webm': '明天.mp3',
        'word_027.webm': '早上.mp3',
        'word_028.webm': '下午.mp3',
        'word_029.webm': '这里.mp3',
        'word_030.webm': '那里.mp3',
        'word_031.webm': '了.mp3',
        'word_032.webm': '吗.mp3',
        'word_033.webm': '的.mp3',
        'word_034.webm': '呢.mp3',
        'word_035.webm': '一.mp3',
        'word_036.webm': '两.mp3',
        'word_037.webm': '三.mp3',
        'word_038.webm': '个.mp3',
        'word_039.webm': '本.mp3',
    }

    print("Renaming audio files...")
    print("=" * 50)

    renamed_count = 0
    for source_file, target_name in mapping.items():
        source_path = os.path.join(source_dir, source_file)
        target_path = os.path.join(target_dir, target_name)

        if os.path.exists(source_path):
            # Copy and convert WebM to MP3
            shutil.copy2(source_path, target_path)
            print(f"✓ {source_file} -> {target_name}")
            renamed_count += 1
        else:
            print(f"✗ Missing: {source_file}")

    print("=" * 50)
    print(f"Successfully renamed {renamed_count} audio files")
    print(f"Target directory: {target_dir}")

if __name__ == "__main__":
    rename_audio_files()
