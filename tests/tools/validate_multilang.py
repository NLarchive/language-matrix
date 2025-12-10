#!/usr/bin/env python3
"""
Multi-Language Integration Validation Script

Validates that all languages (Chinese, Japanese, Korean) are correctly
configured in the matrix system with proper CSV files, matrix_index.json
entries, and audio folder structure.

Usage:
    python validate_multilang.py
"""

import os
import sys
import json
import csv
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent
WEB_V3_DIR = SCRIPT_DIR.parent.parent  # Navigate up from tests/tools to web_v3
DATA_DIR = WEB_V3_DIR / "data"
AUDIO_DIR = WEB_V3_DIR / "assets" / "audio"

EXPECTED_LANGUAGES = {
    "chinese": {
        "code": "zh-CN",
        "levels": ["basic", "intermediate", "advanced"],
        "csv_columns": ["Category", "Word", "Pinyin", "English"],
        "audio_path_style": "chinese"
    },
    "japanese": {
        "code": "ja-JP",
        "levels": ["basic", "intermediate", "advanced"],
        "csv_columns": ["Category", "Word", "Reading", "Romanization", "English"],
        "audio_path_style": "Japanese"
    },
    "korean": {
        "code": "ko-KR",
        "levels": ["basic", "intermediate", "advanced"],
        "csv_columns": ["Category", "Word", "Romanization", "English"],
        "audio_path_style": "Korean"
    }
}


def load_matrix_index():
    """Load and parse matrix_index.json"""
    index_path = DATA_DIR / "matrix_index.json"
    if not index_path.exists():
        print(f"❌ matrix_index.json not found at {index_path}")
        return None
    
    with open(index_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_matrix_index(matrix_index):
    """Validate matrix_index.json has correct entries for all languages"""
    print("\n📋 Validating matrix_index.json...")
    errors = []
    
    for lang, config in EXPECTED_LANGUAGES.items():
        # Check for all_levels entry
        all_levels_id = f"{lang}_all_levels"
        all_levels_entry = next((e for e in matrix_index if e.get("id") == all_levels_id), None)
        
        if not all_levels_entry:
            errors.append(f"Missing merged entry: {all_levels_id}")
        else:
            if all_levels_entry.get("language") != config["code"]:
                errors.append(f"{all_levels_id}: wrong language code (expected {config['code']}, got {all_levels_entry.get('language')})")
            if all_levels_entry.get("type") != "merged":
                errors.append(f"{all_levels_id}: should have type='merged'")
            print(f"  ✓ {lang} all_levels entry found")
        
        # Check for each level
        for level in config["levels"]:
            level_id = f"{lang}_{level}"
            level_entry = next((e for e in matrix_index if e.get("id") == level_id), None)
            
            if not level_entry:
                errors.append(f"Missing entry: {level_id}")
            else:
                expected_file = f"languages/{lang}/{level}.csv"
                if level_entry.get("file") != expected_file:
                    errors.append(f"{level_id}: wrong file path (expected {expected_file})")
                if level_entry.get("languagePath") != lang:
                    errors.append(f"{level_id}: wrong languagePath (expected {lang})")
                print(f"  ✓ {lang}_{level} entry found")
    
    return errors


def validate_csv_files():
    """Validate CSV files exist and have correct structure"""
    print("\n📁 Validating CSV files...")
    errors = []
    word_counts = {}
    
    for lang, config in EXPECTED_LANGUAGES.items():
        lang_dir = DATA_DIR / "languages" / lang
        if not lang_dir.exists():
            errors.append(f"Missing language directory: {lang_dir}")
            continue
        
        word_counts[lang] = {}
        
        for level in config["levels"]:
            csv_path = lang_dir / f"{level}.csv"
            if not csv_path.exists():
                errors.append(f"Missing CSV: {csv_path}")
                continue
            
            try:
                with open(csv_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    
                    # Check required columns
                    if rows:
                        headers = rows[0].keys()
                        for required_col in config["csv_columns"]:
                            if required_col not in headers:
                                errors.append(f"{csv_path.name}: missing column '{required_col}'")
                    
                    word_counts[lang][level] = len(rows)
                    print(f"  ✓ {lang}/{level}.csv: {len(rows)} words")
                    
            except Exception as e:
                errors.append(f"Error reading {csv_path}: {e}")
    
    return errors, word_counts


def validate_audio_folders():
    """Validate audio folder structure exists"""
    print("\n🔊 Validating audio folder structure...")
    errors = []
    
    for lang, config in EXPECTED_LANGUAGES.items():
        audio_path = AUDIO_DIR / config["audio_path_style"]
        if not audio_path.exists():
            errors.append(f"Missing audio folder: {audio_path}")
            continue
        
        print(f"  ✓ {config['audio_path_style']}/ folder exists")
        
        for level in config["levels"]:
            level_path = audio_path / level
            if not level_path.exists():
                errors.append(f"Missing audio level folder: {level_path}")
            else:
                # Count audio files
                audio_files = list(level_path.glob("*.mp3"))
                print(f"    ✓ {level}/: {len(audio_files)} audio files")
    
    return errors


def compute_audio_coverage(word_counts):
    """Compute audio coverage percentage for each language/level"""
    print("\n📊 Audio Coverage Report:")
    
    for lang, config in EXPECTED_LANGUAGES.items():
        audio_path = AUDIO_DIR / config["audio_path_style"]
        print(f"\n  {lang.upper()}:")
        
        if lang not in word_counts:
            print("    (no word data)")
            continue
        
        for level in config["levels"]:
            level_path = audio_path / level
            audio_files = list(level_path.glob("*.mp3")) if level_path.exists() else []
            
            total_words = word_counts.get(lang, {}).get(level, 0)
            if total_words > 0:
                coverage = (len(audio_files) / total_words) * 100
                status = "✓" if coverage >= 95 else "⚠" if coverage >= 50 else "✗"
                print(f"    {status} {level}: {len(audio_files)}/{total_words} ({coverage:.1f}%)")
            else:
                print(f"    - {level}: no vocabulary data")


def main():
    print("=" * 60)
    print("  Multi-Language Integration Validation")
    print("=" * 60)
    
    all_errors = []
    
    # Load matrix index
    matrix_index = load_matrix_index()
    if matrix_index is None:
        sys.exit(1)
    
    # Validate matrix_index.json
    errors = validate_matrix_index(matrix_index)
    all_errors.extend(errors)
    
    # Validate CSV files
    errors, word_counts = validate_csv_files()
    all_errors.extend(errors)
    
    # Validate audio folders
    errors = validate_audio_folders()
    all_errors.extend(errors)
    
    # Compute coverage
    compute_audio_coverage(word_counts)
    
    # Summary
    print("\n" + "=" * 60)
    if all_errors:
        print(f"❌ Validation completed with {len(all_errors)} error(s):")
        for error in all_errors:
            print(f"   • {error}")
        sys.exit(1)
    else:
        print("✅ All validations passed!")
        print("\nLanguages ready for testing:")
        for lang, config in EXPECTED_LANGUAGES.items():
            print(f"  • {lang} ({config['code']})")
        sys.exit(0)


if __name__ == "__main__":
    main()
