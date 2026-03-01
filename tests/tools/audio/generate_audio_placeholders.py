#!/usr/bin/env python3
"""
Auto-generate placeholder audio files for all Chinese tokens across all matrix files
"""

import csv
from pathlib import Path

def create_placeholder_audio():
    data_dir = Path(__file__).parent / 'data'
    audio_dir = Path(__file__).parent / 'assets' / 'audio'
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    # Minimal MP3 placeholder bytes
    minimal_mp3 = bytes([
        0xFF, 0xFB, 0x10, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
    ])
    
    created_count = 0
    all_words = set()
    
    # Find all CSV files with vocabulary
    vocab_files = list(data_dir.glob('chinese_*.csv'))
    
    for vocab_file in vocab_files:
        with open(vocab_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row.get('Word', '').strip()
                if word:
                    all_words.add(word)
    
    # Create audio files
    for word in all_words:
        safe_filename = word.replace(' ', '_').replace('/', '_')
        audio_file = audio_dir / f"{safe_filename}.mp3"
        
        if not audio_file.exists():
            with open(audio_file, 'wb') as f:
                f.write(minimal_mp3)
            created_count += 1
    
    print(f"Generated {created_count} new placeholder audio files")
    print(f"Total unique words: {len(all_words)}")

if __name__ == '__main__':
    create_placeholder_audio()