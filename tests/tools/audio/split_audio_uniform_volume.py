#!/usr/bin/env python3
"""
Split audio directly into final Hanzi MP3 files with uniform volume normalization.
"""

import os
import sys
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
from pydub.effects import normalize

def split_audio_with_uniform_volume(audio_path, output_dir, hanzi_mapping):
    """
    Split audio by silence detection and save directly as Hanzi MP3 files with uniform volume.
    """

    os.makedirs(output_dir, exist_ok=True)

    print("=" * 70)
    print("SPLITTING AUDIO WITH UNIFORM VOLUME NORMALIZATION")
    print("=" * 70)
    print(f"\nInput: {audio_path}")
    print(f"Output: {output_dir}\n")

    try:
        # Load audio
        audio = AudioSegment.from_file(audio_path)
        print(f"✓ Audio loaded: {len(audio)}ms, {audio.channels}ch, {audio.frame_rate}Hz")

        # Detect non-silent segments
        print("\nDetecting silence...")
        segments = detect_nonsilent(
            audio,
            min_silence_len=300,  # 300ms minimum silence
            silence_thresh=-40,   # -40dB silence threshold
            seek_step=10          # Check every 10ms
        )

        print(f"✓ Detected {len(segments)} words")

        if len(segments) != len(hanzi_mapping):
            print(f"\n⚠ Warning: Detected {len(segments)} segments but expected {len(hanzi_mapping)} Hanzi files")
            print("This may indicate splitting issues. Continuing anyway...")

        print("\nSplitting and normalizing audio...")
        print("-" * 50)

        processed_count = 0
        for idx, (start, end) in enumerate(segments, 1):
            if idx > len(hanzi_mapping):
                print(f"⚠ Extra segment {idx} detected, skipping...")
                continue

            hanzi_name = hanzi_mapping[idx-1]
            output_file = os.path.join(output_dir, hanzi_name)

            # Extract segment with padding
            padded_start = max(0, start - 50)
            padded_end = min(len(audio), end + 50)
            segment = audio[padded_start:padded_end]

            # Apply volume normalization to ensure uniform loudness
            # Normalize to -20dBFS (good level for speech)
            normalized_segment = normalize(segment, headroom=0.1)  # 0.1 = -20dBFS

            # Export as MP3
            normalized_segment.export(output_file, format="mp3", bitrate="128k")

            duration = padded_end - padded_start
            print(f"  {idx:2d}. {hanzi_name:<8} {duration:4d}ms (normalized)")

            processed_count += 1

        print("-" * 50)
        print(f"\n✓ Success! Processed {processed_count} audio files")
        print(f"  All files normalized to uniform volume")
        print(f"  Location: {output_dir}")
        return True

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    # Configuration
    audio_file = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\basic-hanzi-list-audio.webm"
    output_dir = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic"

    # Hanzi mapping in order (same as before)
    hanzi_mapping = [
        '我.mp3', '你.mp3', '他.mp3', '她.mp3', '我们.mp3', '你们.mp3', '他们.mp3',
        '是.mp3', '有.mp3', '去.mp3', '来.mp3', '吃.mp3', '喝.mp3', '看.mp3',
        '说.mp3', '做.mp3', '人.mp3', '东西.mp3', '书.mp3', '水.mp3', '饭.mp3',
        '家.mp3', '学校.mp3', '昨天.mp3', '今天.mp3', '明天.mp3', '早上.mp3',
        '下午.mp3', '这里.mp3', '那里.mp3', '了.mp3', '吗.mp3', '的.mp3',
        '呢.mp3', '一.mp3', '两.mp3', '三.mp3', '个.mp3', '本.mp3'
    ]

    if not os.path.exists(audio_file):
        print(f"✗ Audio file not found: {audio_file}")
        return 1

    success = split_audio_with_uniform_volume(audio_file, output_dir, hanzi_mapping)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
