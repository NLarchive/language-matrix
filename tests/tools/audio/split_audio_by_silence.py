#!/usr/bin/env python3
"""
Split audio file by silence detection.
Detects silence between words and splits the audio accordingly.
Saves each word as a separate file in a dedicated folder.
"""

import os
import sys
from pathlib import Path
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

def split_audio_by_silence(audio_path, output_dir, silence_thresh_db=-40, min_silence_duration=300):
    """
    Split audio by detecting silence between words.
    
    Args:
        audio_path: Path to input audio file
        output_dir: Directory to save split audio files
        silence_thresh_db: Silence threshold in dB (lower = quieter threshold)
        min_silence_duration: Minimum silence duration in ms to trigger split
    """
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Load audio
    print(f"Loading audio: {audio_path}")
    try:
        audio = AudioSegment.from_file(audio_path)
    except Exception as e:
        print(f"Error loading audio file: {e}")
        print("Note: Make sure FFmpeg is installed on your system for WebM support")
        raise
    
    print(f"Audio loaded: {len(audio)}ms, {audio.channels} channels, {audio.frame_rate}Hz")
    
    # Detect non-silent chunks
    # This detects where audio is above the silence threshold
    nonsilent_segments = detect_nonsilent(
        audio, 
        min_duration_ms=100,  # Minimum word duration
        silence_thresh=silence_thresh_db,
        seek_step=10  # Check every 10ms
    )
    
    print(f"Detected {len(nonsilent_segments)} potential words/segments")
    
    # Extract and save each segment
    for idx, (start_ms, end_ms) in enumerate(nonsilent_segments, 1):
        # Add small padding to avoid cutting off words
        padded_start = max(0, start_ms - 50)
        padded_end = min(len(audio), end_ms + 50)
        segment = audio[padded_start:padded_end]
        
        # Export as WebM (keeping original format)
        output_file = os.path.join(output_dir, f"word_{idx:03d}.webm")
        segment.export(output_file, format="webm", bitrate="128k")
        
        duration_ms = padded_end - padded_start
        print(f"  Word {idx:3d}: {duration_ms:4d}ms -> {output_file}")
    
    print(f"\nSuccessfully split audio into {len(nonsilent_segments)} files")
    print(f"Output directory: {output_dir}")
    
    return len(nonsilent_segments)

def main():
    # Configuration
    audio_file = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\basic-hanzi-list-audio.webm"
    output_dir = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\words"
    
    # Silence detection parameters
    # Adjust these if split quality isn't good:
    # - Lower silence_thresh_db = more sensitive (splits more easily)
    # - Higher silence_thresh_db = less sensitive (requires more silence)
    silence_threshold = -40  # dB
    min_silence = 300  # milliseconds
    
    if not os.path.exists(audio_file):
        print(f"Error: Audio file not found: {audio_file}")
        sys.exit(1)
    
    print("=" * 70)
    print("AUDIO SPLITTING BY SILENCE DETECTION")
    print("=" * 70)
    
    try:
        count = split_audio_by_silence(
            audio_file, 
            output_dir,
            silence_thresh_db=silence_threshold,
            min_silence_duration=min_silence
        )
        print("\n" + "=" * 70)
        print("✓ Success! Audio split complete")
        print("=" * 70)
    except Exception as e:
        print(f"\nError during splitting: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
