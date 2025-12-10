#!/usr/bin/env python3
"""Find radicals with missing data in radicals.csv and rebuild"""
import csv
import os
import sys

# Add tools directory to path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(base_dir, 'tools'))

# Import and run the build script
from build_radicals_from_vocab import main as build_main

print("Rebuilding radicals.csv...")
build_main()

# Load radicals.csv and find entries with empty Pinyin
radicals_path = os.path.join(base_dir, 'data', 'languages', 'chinese', 'radicals', 'radicals.csv')

print('\n=== Checking for radicals still missing Pinyin ===')
with open(radicals_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    missing = []
    for row in reader:
        if not row.get('Pinyin', '').strip():
            missing.append(row)
            print(f"  {row['Radical']} - {row['Description']} - Levels: {row['Levels']}")
    
    if missing:
        print(f"\nTotal: {len(missing)} radicals still missing Pinyin data")
    else:
        print("\nAll radicals now have complete Pinyin data!")
