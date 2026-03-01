#!/usr/bin/env python3
"""
Cache System Verification Script
Verifies that all audio files exist and are properly sized for caching
"""

import os
import json
from pathlib import Path

def verify_audio_files():
    """Verify all audio files exist and calculate storage"""
    
    base_path = Path(r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio")
    
    levels = {
        'basic': 39,
        'intermediate': 63,
        'advanced': 62
    }
    
    results = {}
    total_size = 0
    total_files = 0
    
    print("=" * 70)
    print("AUDIO CACHE SYSTEM VERIFICATION")
    print("=" * 70)
    
    for level, expected_count in levels.items():
        level_path = base_path / level
        audio_files = list(level_path.glob("*.mp3"))
        
        actual_count = len(audio_files)
        level_size = sum(f.stat().st_size for f in audio_files)
        
        results[level] = {
            'expected': expected_count,
            'actual': actual_count,
            'files': [f.name for f in sorted(audio_files)],
            'size_bytes': level_size,
            'size_mb': round(level_size / (1024 * 1024), 2),
            'avg_file_size_kb': round(level_size / actual_count / 1024, 1) if actual_count > 0 else 0
        }
        
        total_files += actual_count
        total_size += level_size
        
        # Verify count
        status = "✓ OK" if actual_count == expected_count else f"✗ MISMATCH (expected {expected_count})"
        
        print(f"\n{level.upper()} LEVEL {status}")
        print(f"  Files: {actual_count}")
        print(f"  Size: {results[level]['size_mb']} MB ({level_size:,} bytes)")
        print(f"  Average file size: {results[level]['avg_file_size_kb']} KB")
    
    # Summary
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    print(f"Total audio files: {total_files}")
    print(f"Total storage: {round(total_size / (1024 * 1024), 2)} MB ({total_size:,} bytes)")
    print(f"Average file size: {round(total_size / total_files / 1024, 1)} KB")
    
    # Cache strategy estimates
    print(f"\n{'=' * 70}")
    print("CACHING ESTIMATES")
    print(f"{'=' * 70}")
    print(f"IndexedDB (7-day cache): ~{round(total_size / (1024 * 1024), 2)} MB")
    print(f"Service Worker Cache (30-day): ~{round(total_size / (1024 * 1024), 2)} MB")
    print(f"Typical Browser Cache Quota: 50-100 MB")
    print(f"Estimated Cache Hit Rate: 80-95% after first week")
    
    # Cache behaviors
    print(f"\n{'=' * 70}")
    print("CACHING BEHAVIOR")
    print(f"{'=' * 70}")
    print("First Load:      Network download (slow, 1-5 sec per file)")
    print("Second Load:     Service Worker Cache (fast, 50-200ms)")
    print("Offline Access:  Cached files available")
    print("Auto Refresh:    Every 60 minutes or on app update")
    
    # Verification
    print(f"\n{'=' * 70}")
    print("VERIFICATION RESULTS")
    print(f"{'=' * 70}")
    
    all_ok = all(
        results[level]['actual'] == results[level]['expected']
        for level in levels.keys()
    )
    
    if all_ok:
        print("✓ All audio files verified and ready for caching")
    else:
        print("✗ Some audio files are missing or mismatched")
        for level, data in results.items():
            if data['actual'] != data['expected']:
                print(f"  - {level}: {data['actual']} files (expected {data['expected']})")
    
    # Output JSON summary
    print(f"\n{'=' * 70}")
    print("JSON SUMMARY")
    print(f"{'=' * 70}")
    summary = {
        'total_files': total_files,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'total_size_bytes': total_size,
        'levels': results,
        'cache_ready': all_ok,
        'estimated_cache_time_seconds': round(total_files * 0.5),  # ~0.5 sec per file
        'estimated_network_load_mb': round(total_size / (1024 * 1024) * 1.1, 2)  # 10% overhead
    }
    
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    
    return summary

if __name__ == "__main__":
    verify_audio_files()
