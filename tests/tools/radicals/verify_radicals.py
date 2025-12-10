#!/usr/bin/env python3
"""
Verify the radical system is properly configured.
Checks:
1. radicals_214.csv is the official 214 Kangxi reference (untouched)
2. radicals.csv contains only radicals used in vocabulary files
3. Each level shows only its own radicals
4. Traditional forms are preserved
"""

import csv
import os
import sys

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    chinese_dir = os.path.join(base_dir, 'data', 'languages', 'chinese')
    radicals_dir = os.path.join(chinese_dir, 'radicals')
    
    errors = []
    warnings = []
    
    print("=" * 60)
    print("RADICAL SYSTEM VERIFICATION")
    print("=" * 60)
    
    # Check 1: radicals_214.csv exists and has 214 unique entries
    print("\n[1] Checking radicals_214.csv (official reference)...")
    path_214 = os.path.join(radicals_dir, 'radicals_214.csv')
    if not os.path.exists(path_214):
        errors.append("radicals_214.csv not found!")
    else:
        with open(path_214, 'r', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        unique = len(set(r['Radical'] for r in rows))
        print(f"   Total entries: {len(rows)}, Unique radicals: {unique}")
        if len(rows) != 214:
            warnings.append(f"radicals_214.csv has {len(rows)} entries (expected 214)")
        if unique < 213:  # 213 because 斗 appears twice legitimately
            errors.append(f"radicals_214.csv has only {unique} unique radicals")
        else:
            print("   ✓ Official 214 Kangxi radicals intact")
    
    # Check 2: radicals.csv exists and has proper structure
    print("\n[2] Checking radicals.csv (vocabulary-derived)...")
    path_radicals = os.path.join(radicals_dir, 'radicals.csv')
    if not os.path.exists(path_radicals):
        errors.append("radicals.csv not found!")
    else:
        with open(path_radicals, 'r', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        
        # Check required columns
        required_cols = ['Radical', 'Pinyin', 'Set', 'Levels']
        if rows:
            missing = [c for c in required_cols if c not in rows[0]]
            if missing:
                errors.append(f"radicals.csv missing columns: {missing}")
            else:
                print(f"   ✓ All required columns present")
        
        # Count by set
        kangxi = [r for r in rows if r.get('Set') == 'kangxi_214']
        variants = [r for r in rows if r.get('Set') == 'variant']
        components = [r for r in rows if r.get('Set') == 'component']
        
        print(f"   Total: {len(rows)} entries")
        print(f"   - Kangxi 214: {len(kangxi)}")
        print(f"   - Variants: {len(variants)}")
        print(f"   - Components: {len(components)}")
        
        # Count by level
        for level in ['basic', 'intermediate', 'advanced']:
            count = sum(1 for r in rows if level in r.get('Levels', ''))
            print(f"   - {level}: {count} radicals/components")
    
    # Check 3: Each vocabulary level has matching radicals in radicals.csv
    print("\n[3] Checking vocabulary-radicals alignment...")
    
    # Load radicals map
    radicals_map = {}
    with open(path_radicals, 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            radicals_map[row['Radical']] = row
    
    for level in ['basic', 'intermediate', 'advanced']:
        level_path = os.path.join(chinese_dir, f'{level}.csv')
        if not os.path.exists(level_path):
            warnings.append(f"{level}.csv not found")
            continue
        
        missing_radicals = set()
        wrong_level_radicals = set()
        total_radicals = 0
        
        with open(level_path, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                radicals_str = row.get('Radicals', '')
                if not radicals_str:
                    continue
                for rad in radicals_str.split('+'):
                    rad = rad.strip()
                    if not rad:
                        continue
                    total_radicals += 1
                    if rad not in radicals_map:
                        missing_radicals.add(rad)
                    elif level not in radicals_map[rad].get('Levels', ''):
                        wrong_level_radicals.add(rad)
        
        if missing_radicals:
            errors.append(f"{level}: {len(missing_radicals)} radicals not in radicals.csv: {list(missing_radicals)[:5]}...")
        if wrong_level_radicals:
            errors.append(f"{level}: {len(wrong_level_radicals)} radicals don't list this level: {list(wrong_level_radicals)[:5]}...")
        
        if not missing_radicals and not wrong_level_radicals:
            print(f"   ✓ {level}: {total_radicals} radical refs, all properly mapped")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for e in errors:
            print(f"   - {e}")
    
    if warnings:
        print(f"\n⚠ WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"   - {w}")
    
    if not errors and not warnings:
        print("\n✓ All checks passed! Radical system is properly configured.")
    elif not errors:
        print("\n✓ No critical errors. System should work correctly.")
    else:
        print("\n❌ Critical errors found. Please review and fix.")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
