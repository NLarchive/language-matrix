#!/usr/bin/env python3
"""
Add StrokeCount column to radical CSV files
Maps hardcoded stroke counts from radicalLoader.js to CSV columns
Enables dynamic extraction of stroke counts instead of hardcoding them
"""

import csv
import os

# Stroke count mapping from radicalLoader.js
STROKE_COUNTS = {
    '一': 1, '丨': 1, '丶': 1, '丿': 1, '乙': 1, '亅': 1,
    '二': 2, '亠': 2, '人': 2, '儿': 2, '入': 2, '八': 2, '冂': 2, '冖': 2, '冫': 2, '几': 2, '凵': 2, '刀': 2, '力': 2, '勹': 2, '匕': 2, '匚': 2, '匸': 2, '十': 2, '卜': 2, '卩': 2, '厂': 2, '厶': 2, '又': 2,
    '口': 3, '囗': 3, '土': 3, '士': 3, '夂': 3, '夊': 3, '夕': 3, '大': 3, '女': 3, '子': 3, '宀': 3, '寸': 3, '小': 3, '尢': 3, '尸': 3, '屮': 3, '山': 3, '巛': 3, '工': 3, '己': 3, '巾': 3, '干': 3, '幺': 3, '广': 3, '廴': 3, '廾': 3, '弋': 3, '弓': 3, '彐': 3, '彡': 3, '彳': 3, '门': 3, '马': 3, '飞': 3, '辶': 3,
    '心': 4, '戈': 4, '户': 4, '手': 4, '支': 4, '攵': 4, '文': 4, '斗': 4, '斤': 4, '方': 4, '无': 4, '日': 4, '曰': 4, '月': 4, '木': 4, '欠': 4, '止': 4, '歹': 4, '殳': 4, '毋': 4, '比': 4, '毛': 4, '氏': 4, '气': 4, '水': 4, '火': 4, '爪': 4, '父': 4, '爻': 4, '爿': 4, '片': 4, '牙': 4, '牛': 4, '犬': 4, '贝': 4, '见': 4, '车': 4, '长': 4, '风': 4,
    '玄': 5, '玉': 5, '瓜': 5, '瓦': 5, '甘': 5, '生': 5, '用': 5, '田': 5, '疋': 5, '疒': 5, '癶': 5, '白': 5, '皮': 5, '皿': 5, '目': 5, '矛': 5, '矢': 5, '石': 5, '示': 5, '禸': 5, '禾': 5, '穴': 5, '立': 5, '鸟': 5, '龙': 5,
    '竹': 6, '米': 6, '糸': 6, '缶': 6, '网': 6, '羊': 6, '羽': 6, '老': 6, '而': 6, '耒': 6, '耳': 6, '聿': 6, '肉': 6, '臣': 6, '自': 6, '至': 6, '臼': 6, '舌': 6, '舛': 6, '舟': 6, '艮': 6, '色': 6, '艹': 6, '虍': 6, '虫': 6, '血': 6, '行': 6, '衣': 6, '襾': 6, '页': 6,
    '角': 7, '谷': 7, '豆': 7, '豕': 7, '豸': 7, '赤': 7, '走': 7, '足': 7, '身': 7, '辛': 7, '辰': 7, '邑': 7, '酉': 7, '釆': 7, '里': 7, '龟': 7,
    '金': 8, '阜': 8, '隶': 8, '隹': 8, '雨': 8, '青': 8, '非': 8, '鱼': 8,
    '面': 9, '革': 9, '韦': 9, '韭': 9, '音': 9, '首': 9, '香': 9, '食': 9,
    '马': 10, '骨': 10, '高': 10, '髟': 10, '斗': 10, '鬯': 10, '鬲': 10, '鬼': 10,
    '鱼': 11, '鸟': 11, '卤': 11, '鹿': 11, '麦': 11, '麻': 11,
    '黄': 12, '黍': 12, '黑': 12, '黹': 12,
    '黾': 13, '鼎': 13, '鼓': 13, '鼠': 13,
    '鼻': 14,
    '齐': 14, '齿': 15,
    '龙': 16, '龟': 16, '龠': 17
}

def add_stroke_count_column(input_file, output_file):
    """
    Add StrokeCount column to radical CSV file
    Inserts after Radical column for easy reference
    """
    rows = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        # Insert StrokeCount after Radical column
        new_fieldnames = []
        inserted = False
        for field in fieldnames:
            new_fieldnames.append(field)
            if field == 'Radical' and not inserted:
                new_fieldnames.insert(len(new_fieldnames) - 1, 'StrokeCount')
                inserted = True
        
        # Actually, let's just append it at the end to avoid complex insertions
        new_fieldnames = fieldnames + ['StrokeCount']
        
        for row in reader:
            radical = row.get('Radical', '')
            stroke_count = STROKE_COUNTS.get(radical, 'unknown')
            row['StrokeCount'] = str(stroke_count)
            rows.append(row)
    
    # Write to output file
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=new_fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✓ Added StrokeCount column to {output_file}")
    print(f"  Total radicals: {len(rows)}")
    
    # Print summary
    stroke_stats = {}
    for row in rows:
        sc = row['StrokeCount']
        stroke_stats[sc] = stroke_stats.get(sc, 0) + 1
    
    print(f"  Stroke count distribution:")
    for sc in sorted(stroke_stats.keys(), key=lambda x: int(x) if x != 'unknown' else 999):
        print(f"    {sc} strokes: {stroke_stats[sc]} radicals")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_path = os.path.join(script_dir, '..', 'data', 'languages', 'chinese', 'radicals')
    
    # Process radicals.csv
    radicals_file = os.path.join(base_path, 'radicals.csv')
    if os.path.exists(radicals_file):
        add_stroke_count_column(radicals_file, radicals_file)
    else:
        print(f"✗ File not found: {radicals_file}")
    
    # Process radicals_214.csv
    radicals_214_file = os.path.join(base_path, 'radicals_214.csv')
    if os.path.exists(radicals_214_file):
        add_stroke_count_column(radicals_214_file, radicals_214_file)
    else:
        print(f"✗ File not found: {radicals_214_file}")

if __name__ == '__main__':
    main()
