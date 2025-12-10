"""
Test script to validate radical and word data consistency.
Checks that:
1. All radicals used in vocabulary CSVs exist in radicals.csv
2. Words are properly extracted from vocabulary CSVs
3. Radical compositions match expected format
"""
import csv
import os
from collections import defaultdict

# Set working directory
os.chdir('D:/teach/LANGUAGES/chinese/100-Janulus-matrix/chinese-matrix-lenguage-learn/web_v3')

def load_radicals():
    """Load all radicals from radicals.csv"""
    radicals = {}
    with open('data/languages/chinese/radicals/radicals.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            radicals[row['Radical']] = {
                'pinyin': row.get('Pinyin', ''),
                'description': row.get('Description', ''),
                'meaning': row.get('Meaning', '')
            }
    return radicals

def load_vocabulary(level):
    """Load vocabulary from a level CSV"""
    words = []
    filepath = f'data/languages/chinese/{level}.csv'
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row.get('Word', '')
            radicals_str = row.get('Radicals', '')
            radicals = [r.strip() for r in radicals_str.split('+') if r.strip()]
            words.append({
                'word': word,
                'pinyin': row.get('Pinyin', ''),
                'english': row.get('English', ''),
                'radicals': radicals,
                'level': level
            })
    return words

def main():
    print("=" * 60)
    print("RADICAL AND VOCABULARY DATA VALIDATION")
    print("=" * 60)
    
    # Load radicals
    radicals = load_radicals()
    print(f"\n✓ Loaded {len(radicals)} radicals from radicals.csv")
    
    # Load all vocabulary
    all_words = []
    for level in ['basic', 'intermediate', 'advanced']:
        words = load_vocabulary(level)
        all_words.extend(words)
        print(f"✓ Loaded {len(words)} words from {level}.csv")
    
    print(f"\n✓ Total vocabulary: {len(all_words)} words")
    
    # Check for missing radicals
    print("\n" + "-" * 60)
    print("RADICAL COVERAGE CHECK")
    print("-" * 60)
    
    used_radicals = set()
    missing_radicals = defaultdict(list)
    
    for word_data in all_words:
        for radical in word_data['radicals']:
            used_radicals.add(radical)
            if radical not in radicals:
                missing_radicals[radical].append(word_data['word'])
    
    print(f"\nRadicals in vocabulary CSVs: {len(used_radicals)}")
    print(f"Radicals in radicals.csv: {len(radicals)}")
    
    if missing_radicals:
        print(f"\n⚠ WARNING: {len(missing_radicals)} radicals used in vocabulary but NOT in radicals.csv:")
        for rad, words in sorted(missing_radicals.items())[:20]:
            print(f"  '{rad}' - used in: {', '.join(words[:3])}")
        if len(missing_radicals) > 20:
            print(f"  ... and {len(missing_radicals) - 20} more")
    else:
        print("\n✓ All radicals in vocabulary exist in radicals.csv (100% coverage)")
    
    # Check word compositions
    print("\n" + "-" * 60)
    print("WORD COMPOSITION STATS")
    print("-" * 60)
    
    composition_counts = defaultdict(int)
    composable_words = []
    
    for word_data in all_words:
        count = len(word_data['radicals'])
        composition_counts[count] += 1
        if count >= 2:
            # Check if all radicals exist in radicals.csv
            all_radicals_exist = all(r in radicals for r in word_data['radicals'])
            if all_radicals_exist:
                composable_words.append(word_data)
    
    print("\nWords by radical count:")
    for count in sorted(composition_counts.keys()):
        print(f"  {count} radical(s): {composition_counts[count]} words")
    
    print(f"\nComposable words (2+ radicals, all in radicals.csv): {len(composable_words)}")
    
    # Sample composable words
    print("\nSample composable words:")
    for word in composable_words[:10]:
        rad_str = ' + '.join(word['radicals'])
        print(f"  {word['word']} ({word['pinyin']}) = {rad_str}")
    
    # Check for duplicate words
    print("\n" + "-" * 60)
    print("DUPLICATE CHECK")
    print("-" * 60)
    
    word_counts = defaultdict(list)
    for word_data in all_words:
        word_counts[word_data['word']].append(word_data['level'])
    
    duplicates = {w: levels for w, levels in word_counts.items() if len(levels) > 1}
    if duplicates:
        print(f"\n⚠ {len(duplicates)} words appear in multiple levels:")
        for word, levels in list(duplicates.items())[:10]:
            print(f"  '{word}' in: {', '.join(levels)}")
    else:
        print("\n✓ No duplicate words across levels")
    
    print("\n" + "=" * 60)
    print("VALIDATION COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    main()
