"""
Integration test to validate word-radical relationships between vocabulary CSVs and radicals.csv
Tests that:
1. Words in each level's vocabulary are correctly linked to radicals
2. All radicals used in Word Composer exist in radicals.csv
3. Level filtering works correctly
"""
import csv
import os
from collections import defaultdict

# Set working directory
os.chdir('D:/teach/LANGUAGES/chinese/100-Janulus-matrix/chinese-matrix-lenguage-learn/web_v3')

def load_radicals_csv():
    """Load radicals from radicals.csv"""
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

def load_level_vocabulary(level):
    """Load vocabulary from a level CSV"""
    words = {}
    filepath = f'data/languages/chinese/{level}.csv'
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row.get('Word', '')
            radicals_str = row.get('Radicals', '')
            radicals = [r.strip() for r in radicals_str.split('+') if r.strip()]
            words[word] = {
                'pinyin': row.get('Pinyin', ''),
                'english': row.get('English', ''),
                'radicals': radicals,
                'level': level
            }
    return words

def test_level_filtering():
    """Test that each level only shows its own words and radicals"""
    print("\n" + "=" * 60)
    print("TEST: LEVEL FILTERING")
    print("=" * 60)
    
    radicals_csv = load_radicals_csv()
    all_levels = ['basic', 'intermediate', 'advanced']
    
    for level in all_levels:
        level_vocab = load_level_vocabulary(level)
        level_radicals = set()
        composable_count = 0
        
        for word, data in level_vocab.items():
            for r in data['radicals']:
                level_radicals.add(r)
            
            # Check composable words (2+ radicals, all in radicals.csv)
            if len(data['radicals']) >= 2:
                all_exist = all(r in radicals_csv for r in data['radicals'])
                if all_exist:
                    composable_count += 1
        
        # Verify all radicals exist in radicals.csv
        missing = [r for r in level_radicals if r not in radicals_csv]
        
        print(f"\n{level.upper()} LEVEL:")
        print(f"  Words: {len(level_vocab)}")
        print(f"  Unique radicals used: {len(level_radicals)}")
        print(f"  Composable words (2+ radicals): {composable_count}")
        print(f"  Missing radicals: {len(missing)} {'⚠' if missing else '✓'}")
        if missing:
            print(f"    {missing[:10]}")

def test_all_levels_mode():
    """Test that 'all_levels' mode correctly combines all levels"""
    print("\n" + "=" * 60)
    print("TEST: ALL_LEVELS MODE")
    print("=" * 60)
    
    radicals_csv = load_radicals_csv()
    all_words = {}
    all_radicals = set()
    
    for level in ['basic', 'intermediate', 'advanced']:
        level_vocab = load_level_vocabulary(level)
        for word, data in level_vocab.items():
            if word not in all_words:
                all_words[word] = data
            for r in data['radicals']:
                all_radicals.add(r)
    
    # Count composable words
    composable = [w for w, d in all_words.items() 
                  if len(d['radicals']) >= 2 and all(r in radicals_csv for r in d['radicals'])]
    
    print(f"\nALL LEVELS COMBINED:")
    print(f"  Total unique words: {len(all_words)}")
    print(f"  Total unique radicals used: {len(all_radicals)}")
    print(f"  Total composable words: {len(composable)}")
    print(f"  Radicals in radicals.csv: {len(radicals_csv)}")
    
    # Show some sample composable words
    print(f"\nSample composable words:")
    for word in list(composable)[:5]:
        d = all_words[word]
        print(f"  {word} ({d['pinyin']}) = {' + '.join(d['radicals'])} [{d['level']}]")

def test_word_composer_requirements():
    """Test that WordComposer will have valid data"""
    print("\n" + "=" * 60)
    print("TEST: WORD COMPOSER REQUIREMENTS")
    print("=" * 60)
    
    radicals_csv = load_radicals_csv()
    
    for level in ['basic', 'intermediate', 'advanced', 'all_levels']:
        print(f"\n{level.upper()}:")
        
        if level == 'all_levels':
            vocab = {}
            for l in ['basic', 'intermediate', 'advanced']:
                vocab.update(load_level_vocabulary(l))
        else:
            vocab = load_level_vocabulary(level)
        
        # WordComposer requirements:
        # 1. Word must have 2+ radicals
        # 2. ALL radicals must exist in radicals.csv
        
        valid_words = []
        invalid_words = []
        
        for word, data in vocab.items():
            if len(data['radicals']) >= 2:
                missing = [r for r in data['radicals'] if r not in radicals_csv]
                if not missing:
                    valid_words.append(word)
                else:
                    invalid_words.append((word, missing))
        
        print(f"  Valid for WordComposer: {len(valid_words)}")
        print(f"  Invalid (missing radicals): {len(invalid_words)}")
        
        if invalid_words:
            print(f"  Example invalid words:")
            for w, missing in invalid_words[:3]:
                print(f"    '{w}' missing: {missing}")

def test_radical_reference_section():
    """Test what radicals should appear in the radical reference section per level"""
    print("\n" + "=" * 60)
    print("TEST: RADICAL REFERENCE SECTION")
    print("=" * 60)
    
    radicals_csv = load_radicals_csv()
    
    for level in ['basic', 'intermediate', 'advanced']:
        vocab = load_level_vocabulary(level)
        
        # Collect radicals used in this level's words
        # Only include radicals that exist in radicals.csv
        level_radicals = set()
        for word, data in vocab.items():
            for r in data['radicals']:
                if r in radicals_csv:
                    level_radicals.add(r)
        
        print(f"\n{level.upper()} LEVEL:")
        print(f"  Radicals to display: {len(level_radicals)}")
        print(f"  Sample: {list(level_radicals)[:10]}")

def main():
    print("=" * 60)
    print("INTEGRATION TEST: WORD-RADICAL RELATIONSHIPS")
    print("=" * 60)
    
    test_level_filtering()
    test_all_levels_mode()
    test_word_composer_requirements()
    test_radical_reference_section()
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    main()
