#!/usr/bin/env python3
"""
Split WebM audio by silence using built-in Python modules.
This version attempts to use pydub with fallbacks.
"""

import os
import sys
import subprocess
from pathlib import Path

def install_ffmpeg_portable():
    """
    Download and set up a portable FFmpeg if not available.
    """
    ffmpeg_path = os.path.join(os.environ.get('USERPROFILE'), '.local', 'ffmpeg.exe')
    
    if os.path.exists(ffmpeg_path):
        print(f"FFmpeg found at: {ffmpeg_path}")
        return ffmpeg_path
    
    print("Attempting to download portable FFmpeg...")
    try:
        # Create directory
        ffmpeg_dir = os.path.dirname(ffmpeg_path)
        os.makedirs(ffmpeg_dir, exist_ok=True)
        
        # Download from a reliable source
        url = "https://github.com/vot/ffmpeg-windows-build/releases/download/latest/ffmpeg.exe"
        print(f"Downloading from: {url}")
        
        import urllib.request
        urllib.request.urlretrieve(url, ffmpeg_path)
        print(f"✓ FFmpeg installed at: {ffmpeg_path}")
        return ffmpeg_path
    except Exception as e:
        print(f"Could not download FFmpeg: {e}")
        return None

def split_audio_silence_detector(audio_path, output_dir):
    """
    Main function to split audio by silence detection.
    """
    
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 70)
    print("AUDIO SPLITTING BY SILENCE DETECTION")
    print("=" * 70)
    print(f"\nInput: {audio_path}")
    print(f"Output: {output_dir}\n")
    
    # Try importing pydub
    try:
        from pydub import AudioSegment
        from pydub.silence import detect_nonsilent
        print("✓ pydub is available")
    except ImportError:
        print("✗ pydub not found")
        return False
    
    # Check for FFmpeg
    ffmpeg_available = subprocess.run(['where', 'ffmpeg'], 
                                     capture_output=True).returncode == 0
    
    if not ffmpeg_available:
        print("⚠ FFmpeg not found in PATH")
        ffmpeg_path = install_ffmpeg_portable()
        if not ffmpeg_path:
            print("\n✗ Cannot proceed without FFmpeg. Please install FFmpeg manually:")
            print("  Option 1: Chocolatey (admin): choco install ffmpeg")
            print("  Option 2: Winget: winget install Gyan.FFmpeg")
            print("  Option 3: Manual: https://ffmpeg.org/download.html")
            return False
    else:
        print("✓ FFmpeg is available")
    
    try:
        print(f"\nLoading audio: {audio_path}")
        audio = AudioSegment.from_file(audio_path)
        print(f"✓ Audio loaded: {len(audio)}ms, {audio.channels}ch, {audio.frame_rate}Hz")
        
        print("\nDetecting silence...")
        segments = detect_nonsilent(
            audio,
            min_silence_len=300,
            silence_thresh=-40,
            seek_step=10
        )
        
        print(f"✓ Detected {len(segments)} words\n")
        print("Splitting audio...")
        
        for idx, (start, end) in enumerate(segments, 1):
            # Add padding
            start_padded = max(0, start - 50)
            end_padded = min(len(audio), end + 50)
            segment = audio[start_padded:end_padded]
            
            # Save
            output_file = os.path.join(output_dir, f"word_{idx:03d}.webm")
            segment.export(output_file, format="webm", bitrate="128k")
            
            duration = end_padded - start_padded
            print(f"  {idx:3d}. {duration:4d}ms  word_{idx:03d}.webm")
        
        print(f"\n✓ Success! Split audio into {len(segments)} files")
        print(f"  Location: {output_dir}")
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    audio_file = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\basic-hanzi-list-audio.webm"
    output_dir = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio\basic\words"
    
    if not os.path.exists(audio_file):
        print(f"✗ File not found: {audio_file}")
        return 1
    
    success = split_audio_silence_detector(audio_file, output_dir)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
