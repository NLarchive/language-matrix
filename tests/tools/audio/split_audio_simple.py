#!/usr/bin/env python3
"""
Split audio file by silence detection (MP3 version).
First converts WebM to MP3, then detects silence and splits.
"""

import os
import subprocess
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

def split_audio_by_silence(audio_path, output_dir):
    """
    Split audio by detecting silence between words.
    """
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Loading audio: {audio_path}")
    
    # For WebM files, we need to export to MP3 first (pydub requirement for WebM)
    if audio_path.lower().endswith('.webm'):
        print("Converting WebM to MP3 for processing...")
        mp3_path = audio_path.replace('.webm', '_temp.mp3')
        try:
            # Try using ffmpeg command line
            cmd = f'ffmpeg -i "{audio_path}" -q:a 5 "{mp3_path}" -y 2>nul'
            result = subprocess.run(cmd, shell=True, capture_output=True)
            if not os.path.exists(mp3_path):
                # Fallback: try with pydub (requires ffmpeg but worth trying)
                audio = AudioSegment.from_file(audio_path)
                audio.export(mp3_path, format="mp3")
        except Exception as e:
            print(f"Error converting WebM: {e}")
            raise
    else:
        mp3_path = audio_path
    
    # Load the audio
    try:
        audio = AudioSegment.from_mp3(mp3_path)
    except:
        audio = AudioSegment.from_file(mp3_path)
    
    print(f"Audio loaded: {len(audio)}ms, {audio.channels} channels, {audio.frame_rate}Hz")
    
    # Detect non-silent chunks
    print("\nDetecting silence...")
    nonsilent_segments = detect_nonsilent(
        audio, 
        min_duration_ms=100,
        silence_thresh=-40,
        seek_step=10
    )
    
    print(f"Detected {len(nonsilent_segments)} words")
    print("\nSplitting audio...\n")
    
    # Extract and save each segment
    for idx, (start_ms, end_ms) in enumerate(nonsilent_segments, 1):
        # Add small padding to avoid cutting off words
        padded_start = max(0, start_ms - 50)
        padded_end = min(len(audio), end_ms + 50)
        segment = audio[padded_start:padded_end]
        
        # Export as WebM
        output_file = os.path.join(output_dir, f"word_{idx:03d}.webm")
        segment.export(output_file, format="webm", bitrate="128k")
        
        duration_ms = padded_end - padded_start
        print(f"  {idx:3d}. {duration_ms:4d}ms -> word_{idx:03d}.webm")
    
    # Clean up temp file
    if audio_path.lower().endswith('.webm') and os.path.exists(mp3_path):
        try:
            os.remove(mp3_path)
        except:
            pass
    
    print(f"\n✓ Successfully split into {len(nonsilent_segments)} words!")
    print(f"  Output: {output_dir}")
    
    return len(nonsilent_segments)

def main():
    audio_file = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\basic-hanzi-list-audio.webm"
    output_dir = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\words"
    
    if not os.path.exists(audio_file):
        print(f"Error: Audio file not found: {audio_file}")
        return 1
    
    print("=" * 70)
    print("AUDIO SPLITTING BY SILENCE DETECTION")
    print("=" * 70 + "\n")
    
    try:
        split_audio_by_silence(audio_file, output_dir)
        print("\n" + "=" * 70)
        print("✓ COMPLETE!")
        print("=" * 70)
        return 0
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
