#!/usr/bin/env python3
"""
Build radicals.csv from vocabulary files.

This script:
1. Extracts all unique radicals from the Radicals column in basic.csv, intermediate.csv, advanced.csv
2. Looks up metadata from radicals_214.csv (official Kangxi radicals)
3. Creates a sorted radicals.csv containing ONLY radicals actually used in vocabulary
4. Adds traditional forms and cross-language notes where applicable

The radicals_214.csv remains the official untouched Kangxi reference.
The generated radicals.csv is a subset tailored to this vocabulary set.
"""

import csv
import os
from collections import defaultdict

# Traditional character mappings for simplified radicals
# Format: simplified -> (traditional, notes)
TRADITIONAL_FORMS = {
    '讠': ('言', 'speech radical'),
    '钅': ('金', 'metal radical'),
    '饣': ('食', 'food radical'),
    '纟': ('糸', 'silk radical'),
    '车': ('車', 'cart/vehicle'),
    '贝': ('貝', 'shell/money'),
    '见': ('見', 'see'),
    '门': ('門', 'gate/door'),
    '马': ('馬', 'horse'),
    '鱼': ('魚', 'fish'),
    '鸟': ('鳥', 'bird'),
    '齿': ('齒', 'tooth'),
    '龙': ('龍', 'dragon'),
    '龟': ('龜', 'turtle'),
    '页': ('頁', 'page/leaf'),
    '风': ('風', 'wind'),
    '飞': ('飛', 'fly'),
    '长': ('長', 'long'),
    '韦': ('韋', 'tanned leather'),
    '麦': ('麥', 'wheat'),
    '黄': ('黃', 'yellow'),
    '齐': ('齊', 'even/neat'),
    '辶': ('辵', 'walk/move'),
}

# Variant forms that map to main 214 radicals
VARIANT_TO_MAIN = {
    '亻': '人',  # person side form
    '刂': '刀',  # knife side form
    '氵': '水',  # water side form
    '灬': '火',  # fire bottom form
    '扌': '手',  # hand side form
    '忄': '心',  # heart side form
    '犭': '犬',  # dog side form
    '礻': '示',  # altar side form
    '衤': '衣',  # clothes side form
    '纟': '糸',  # silk side form
    '钅': '金',  # metal side form
    '饣': '食',  # food side form
    '讠': '言',  # speech side form
    '阝': '阜',  # mound/city side form (can be 阜 or 邑)
    '罒': '网',  # net top form
    '⺮': '竹',  # bamboo top form
    '⺶': '羊',  # sheep top form
    '⺼': '月',  # meat/moon side form
    '爫': '爪',  # claw top form
    '⻊': '足',  # foot side form
}

# Common components that are not official radicals but appear frequently
# Complete dictionary with Pinyin and meaning for all components used in vocabulary
COMMON_COMPONENTS = {
    # Basic stroke-like components
    '乀': ('fú', 'left-falling stroke'),
    '乂': ('yì', 'to mow; to cut'),
    '乍': ('zhà', 'suddenly; at first'),
    '乎': ('hū', 'question particle'),
    '乚': ('yǐ', 'hidden; second'),
    '乞': ('qǐ', 'to beg'),
    '乡': ('xiāng', 'village; countryside'),
    
    # Common character components A-Z
    '也': ('yě', 'also; too'),
    '了': ('le', 'completed action marker'),
    '于': ('yú', 'at; in; to'),
    '为': ('wèi', 'for; to be'),
    '上': ('shàng', 'up; above'),
    '下': ('xià', 'down; below'),
    '不': ('bù', 'not; no'),
    '丁': ('dīng', 'male adult; nail'),
    '三': ('sān', 'three'),
    '东': ('dōng', 'east'),
    '中': ('zhōng', 'middle; center'),
    '交': ('jiāo', 'to hand over; to intersect'),
    '亥': ('hài', '12th earthly branch'),
    '今': ('jīn', 'now; today'),
    '从': ('cóng', 'from; to follow'),
    '仑': ('lún', 'logical; arrange'),
    '以': ('yǐ', 'by means of; because'),
    '任': ('rèn', 'to appoint; responsibility'),
    '何': ('hé', 'what; which'),
    '作': ('zuò', 'to do; to make'),
    '候': ('hòu', 'to wait; time'),
    '倠': ('suī', 'name component'),
    '兄': ('xiōng', 'elder brother'),
    '兑': ('duì', 'to exchange'),
    '全': ('quán', 'whole; complete'),
    '共': ('gòng', 'together; common'),
    '其': ('qí', 'his; her; its'),
    '刃': ('rèn', 'blade; edge'),
    '分': ('fēn', 'to divide; minute'),
    '前': ('qián', 'front; before'),
    '勺': ('sháo', 'spoon; ladle'),
    '午': ('wǔ', 'noon'),
    '原': ('yuán', 'origin; source'),
    '反': ('fǎn', 'opposite; to return'),
    '取': ('qǔ', 'to take; to fetch'),
    '司': ('sī', 'to manage; department'),
    '后': ('hòu', 'after; behind'),
    '因': ('yīn', 'because; cause'),
    '在': ('zài', 'at; in'),
    '壬': ('rén', '9th heavenly stem'),
    '夬': ('guài', 'to part; to decide'),
    '天': ('tiān', 'sky; day'),
    '头': ('tóu', 'head'),
    '完': ('wán', 'complete; finish'),
    '实': ('shí', 'real; solid'),
    '对': ('duì', 'correct; pair'),
    '导': ('dǎo', 'to guide; to lead'),
    '尔': ('ěr', 'you (archaic)'),
    '尼': ('ní', 'Buddhist nun'),
    '尽': ('jìn', 'to exhaust; to the utmost'),
    '已': ('yǐ', 'already'),
    '巴': ('bā', 'hope; tail'),
    '常': ('cháng', 'often; common'),
    '当': ('dāng', 'to be; act as'),
    '往': ('wǎng', 'to go; towards'),
    '必': ('bì', 'must; certainly'),
    '时': ('shí', 'time; hour'),
    '是': ('shì', 'is; to be'),
    '正': ('zhèng', 'upright; correct'),
    '此': ('cǐ', 'this; these'),
    '每': ('měi', 'every'),
    '关': ('guān', 'shut; pass'),
    '故': ('gù', 'therefore; reason'),
    '斩': ('zhǎn', 'to chop; to behead'),
    '断': ('duàn', 'to break; to judge'),
    '旦': ('dàn', 'dawn; day'),
    '早': ('zǎo', 'early; morning'),
    '明': ('míng', 'bright; clear'),
    '显': ('xiǎn', 'to show; obvious'),
    '景': ('jǐng', 'scenery; view'),
    '曷': ('hé', 'why; how'),
    '最': ('zuì', 'most; -est'),
    '有': ('yǒu', 'to have'),
    '本': ('běn', 'root; origin; book classifier'),
    '束': ('shù', 'bundle; to bind'),
    '析': ('xī', 'to analyze'),
    '果': ('guǒ', 'fruit; result'),
    '标': ('biāo', 'mark; sign'),
    '根': ('gēn', 'root; basis'),
    '法': ('fǎ', 'law; method'),
    '点': ('diǎn', 'dot; point'),
    '然': ('rán', 'correct; so'),
    '王': ('wáng', 'king'),
    '现': ('xiàn', 'appear; present'),
    '由': ('yóu', 'from; due to'),
    '电': ('diàn', 'electricity'),
    '相': ('xiāng', 'mutual'),
    '确': ('què', 'true; certain'),
    '程': ('chéng', 'journey; procedure'),
    '管': ('guǎn', 'tube; to manage'),
    '系': ('xì', 'system; to tie'),
    '终': ('zhōng', 'end; finally'),
    '经': ('jīng', 'to pass through; scripture'),
    '结': ('jié', 'to tie; result'),
    '脑': ('nǎo', 'brain'),
    '获': ('huò', 'to obtain'),
    '表': ('biǎo', 'surface; to express'),
    '观': ('guān', 'to view; concept'),
    '解': ('jiě', 'to untie; to explain'),
    '言': ('yán', 'speech; word'),
    '证': ('zhèng', 'to prove; evidence'),
    '责': ('zé', 'duty; to blame'),
    '通': ('tōng', 'to pass through'),
    '邦': ('bāng', 'nation; country'),
    '采': ('cǎi', 'to pick; to gather'),
    '释': ('shì', 'to explain; to release'),
    '除': ('chú', 'to remove; except'),
    '随': ('suí', 'to follow'),
    '须': ('xū', 'must; beard'),
    '验': ('yàn', 'to examine; to test'),
    
    # Additional common components from vocabulary
    '个': ('gè', 'general classifier'),
    '么': ('me', 'suffix'),
    '井': ('jǐng', 'well'),
    '元': ('yuán', 'currency unit; first'),
    '云': ('yún', 'cloud'),
    '五': ('wǔ', 'five'),
    '六': ('liù', 'six'),
    '七': ('qī', 'seven'),
    '九': ('jiǔ', 'nine'),
    '办': ('bàn', 'to do; manage'),
    '去': ('qù', 'to go'),
    '友': ('yǒu', 'friend'),
    '发': ('fā', 'send; emit'),
    '只': ('zhǐ', 'only'),
    '可': ('kě', 'can; able'),
    '台': ('tái', 'platform'),
    '合': ('hé', 'combine; fit'),
    '同': ('tóng', 'same; together'),
    '名': ('míng', 'name'),
    '回': ('huí', 'return'),
    '多': ('duō', 'many; much'),
    '太': ('tài', 'too; very'),
    '少': ('shǎo', 'few; little'),
    '平': ('píng', 'flat; level'),
    '开': ('kāi', 'open; start'),
    '才': ('cái', 'talent; just now'),
    '找': ('zhǎo', 'look for'),
    '把': ('bǎ', 'grasp; hold'),
    '来': ('lái', 'come'),
    '样': ('yàng', 'appearance; shape'),
    '次': ('cì', 'time; order'),
    '比': ('bǐ', 'compare'),
    '的': ('de', 'possessive particle'),
    '真': ('zhēn', 'real; true'),
    '着': ('zhe', 'aspect marker'),
    '种': ('zhǒng', 'kind; type'),
    '空': ('kōng', 'empty; air'),
    '第': ('dì', 'prefix for ordinal numbers'),
    '等': ('děng', 'wait; class'),
    '给': ('gěi', 'give'),
    '美': ('měi', 'beautiful'),
    '老': ('lǎo', 'old'),
    '而': ('ér', 'and; but'),
    '能': ('néng', 'can; be able'),
    '自': ('zì', 'self'),
    '西': ('xī', 'west'),
    '要': ('yào', 'want; need'),
    '认': ('rèn', 'recognize'),
    '话': ('huà', 'word; speech'),
    '说': ('shuō', 'speak; say'),
    '象': ('xiàng', 'elephant; image'),
    '起': ('qǐ', 'rise; start'),
    '车': ('chē', 'car; vehicle'),
    '边': ('biān', 'side; edge'),
    '过': ('guò', 'pass; cross'),
    '还': ('hái', 'still; yet'),
    '进': ('jìn', 'enter'),
    '道': ('dào', 'way; path'),
    '那': ('nà', 'that'),
    '里': ('lǐ', 'inside'),
    '重': ('zhòng', 'heavy'),
    '间': ('jiān', 'between; room'),
    '难': ('nán', 'difficult'),
    '面': ('miàn', 'face; surface'),
    '高': ('gāo', 'high; tall'),
}

def get_script_dir():
    return os.path.dirname(os.path.abspath(__file__))

def load_radicals_214(base_dir):
    """Load the official 214 Kangxi radicals."""
    path = os.path.join(base_dir, 'data', 'languages', 'chinese', 'radicals', 'radicals_214.csv')
    radicals = {}
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rad = row['Radical']
            # Handle duplicates (like 斗) by keeping first occurrence
            if rad not in radicals:
                radicals[rad] = {
                    'Radical': rad,
                    'Pinyin': row['Pinyin'],
                    'Description': row['Description'],
                    'Meaning': row['Meaning'],
                    'Set': 'kangxi_214'
                }
    print(f"Loaded {len(radicals)} unique radicals from radicals_214.csv")
    return radicals

def extract_radicals_from_vocab(base_dir):
    """Extract all radicals used in vocabulary files, tracking which levels use them.
       Also builds a lookup of vocabulary words to their pinyin/meaning."""
    vocab_dir = os.path.join(base_dir, 'data', 'languages', 'chinese')
    levels = ['basic', 'intermediate', 'advanced']
    
    radical_usage = defaultdict(lambda: {'count': 0, 'levels': set(), 'words': []})
    vocab_lookup = {}
    
    for level in levels:
        filepath = os.path.join(vocab_dir, f'{level}.csv')
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row.get('Word', '')
                pinyin = row.get('Pinyin', '')
                english = row.get('English', '')
                radicals_str = row.get('Radicals', '')
                
                # Store vocab info for lookup
                if word and word not in vocab_lookup:
                    vocab_lookup[word] = {'Pinyin': pinyin, 'Meaning': english}
                
                if not radicals_str:
                    continue
                    
                # Split by '+' to get individual radicals
                for rad in radicals_str.split('+'):
                    rad = rad.strip()
                    if rad:
                        radical_usage[rad]['count'] += 1
                        radical_usage[rad]['levels'].add(level)
                        if len(radical_usage[rad]['words']) < 5:  # Keep first 5 example words
                            radical_usage[rad]['words'].append(word)
    
    print(f"Found {len(radical_usage)} unique radical entries in vocabulary")
    return dict(radical_usage), vocab_lookup

def build_custom_radicals(radicals_214, radical_usage, vocab_lookup):
    """Build custom radicals list with metadata."""
    custom_radicals = []
    
    for rad, usage in radical_usage.items():
        # Try to find metadata from official 214
        if rad in radicals_214:
            entry = radicals_214[rad].copy()
            entry['Levels'] = ','.join(sorted(usage['levels']))
            entry['UsageCount'] = usage['count']
            # Add traditional form if different
            if rad in TRADITIONAL_FORMS:
                trad, note = TRADITIONAL_FORMS[rad]
                entry['Traditional'] = trad
            else:
                entry['Traditional'] = rad
        elif rad in VARIANT_TO_MAIN:
            # It's a variant form - get metadata from main radical
            main_rad = VARIANT_TO_MAIN[rad]
            if main_rad in radicals_214:
                base = radicals_214[main_rad]
                entry = {
                    'Radical': rad,
                    'Pinyin': base['Pinyin'],
                    'Description': f"{base['Description']} (variant form)",
                    'Meaning': f"{base['Meaning']} (component form)",
                    'Set': 'variant',
                    'MainRadical': main_rad,
                    'Levels': ','.join(sorted(usage['levels'])),
                    'UsageCount': usage['count'],
                    'Traditional': rad  # Variants are typically already simplified forms
                }
            else:
                # Variant without 214 match
                entry = {
                    'Radical': rad,
                    'Pinyin': '',
                    'Description': f'variant of {main_rad}',
                    'Meaning': 'component form',
                    'Set': 'variant',
                    'MainRadical': main_rad,
                    'Levels': ','.join(sorted(usage['levels'])),
                    'UsageCount': usage['count'],
                    'Traditional': rad
                }
        else:
            # Not in 214 and not a known variant - might be a word component
            
            # Try to find in vocab_lookup
            pinyin = ''
            description = 'word component'
            meaning = 'character component (not official radical)'
            
            if rad in vocab_lookup:
                pinyin = vocab_lookup[rad]['Pinyin']
                meaning = vocab_lookup[rad]['Meaning']
                description = 'character component (also a word)'
            elif rad in COMMON_COMPONENTS:
                pinyin, meaning_text = COMMON_COMPONENTS[rad]
                meaning = meaning_text
                description = 'common character component'
            
            entry = {
                'Radical': rad,
                'Pinyin': pinyin,
                'Description': description,
                'Meaning': meaning,
                'Set': 'component',
                'Levels': ','.join(sorted(usage['levels'])),
                'UsageCount': usage['count'],
                'Traditional': rad
            }
        
        custom_radicals.append(entry)
    
    return custom_radicals

def sort_radicals(radicals):
    """Sort radicals by: Set (kangxi_214 first, then variant, then component), then by radical character."""
    set_order = {'kangxi_214': 0, 'variant': 1, 'component': 2}
    return sorted(radicals, key=lambda r: (set_order.get(r.get('Set', 'component'), 3), r['Radical']))

def write_radicals_csv(radicals, output_path):
    """Write the radicals to CSV."""
    fieldnames = ['Radical', 'Pinyin', 'Description', 'Meaning', 'Set', 'Traditional', 'Levels', 'UsageCount', 'MainRadical']
    
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for rad in radicals:
            writer.writerow(rad)
    
    print(f"Written {len(radicals)} radicals to {output_path}")

def print_summary(radicals):
    """Print summary statistics."""
    kangxi = [r for r in radicals if r.get('Set') == 'kangxi_214']
    variants = [r for r in radicals if r.get('Set') == 'variant']
    components = [r for r in radicals if r.get('Set') == 'component']
    
    print("\n=== SUMMARY ===")
    print(f"Total unique radicals/components in vocabulary: {len(radicals)}")
    print(f"  - Official Kangxi 214 radicals: {len(kangxi)}")
    print(f"  - Variant forms: {len(variants)}")
    print(f"  - Other components (not official radicals): {len(components)}")
    
    if components:
        print("\nComponents that are NOT official radicals (may need review in vocab CSVs):")
        for c in sorted(components, key=lambda x: -x.get('UsageCount', 0))[:20]:
            print(f"  {c['Radical']} (used {c.get('UsageCount', 0)} times in {c.get('Levels', '')})")

def main():
    script_dir = get_script_dir()
    base_dir = os.path.dirname(script_dir)
    
    print("Building radicals.csv from vocabulary files...")
    print(f"Base directory: {base_dir}")
    
    # Load official 214 for metadata lookup
    radicals_214 = load_radicals_214(base_dir)
    
    # Extract radicals from vocabulary
    radical_usage, vocab_lookup = extract_radicals_from_vocab(base_dir)
    
    # Build custom radicals list with metadata
    custom_radicals = build_custom_radicals(radicals_214, radical_usage, vocab_lookup)
    
    # Sort
    sorted_radicals = sort_radicals(custom_radicals)
    
    # Write output
    output_path = os.path.join(base_dir, 'data', 'languages', 'chinese', 'radicals', 'radicals.csv')
    write_radicals_csv(sorted_radicals, output_path)
    
    # Print summary
    print_summary(sorted_radicals)
    
    print("\nDone! radicals_214.csv remains unchanged as official reference.")

if __name__ == '__main__':
    main()
