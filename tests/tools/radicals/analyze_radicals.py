#!/usr/bin/env python
# -*- coding: utf-8 -*-

import csv

# Load radicals
radicals = set()
with open('data/languages/chinese/radicals/radicals.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        radicals.add(row['Radical'])

print('Total radicals loaded: {}'.format(len(radicals)))

# Check each level
for level in ['basic', 'intermediate', 'advanced']:
    filepath = 'data/languages/chinese/{}.csv'.format(level)
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        level_words = set()
        level_chars = set()
        for row in reader:
            word = row['Word']
            level_words.add(word)
            for c in word:
                level_chars.add(c)
    
    level_radicals = sorted([c for c in level_chars if c in radicals])
    print('\n{} level:'.format(level.upper()))
    print('  Total words: {}'.format(len(level_words)))
    print('  Unique characters in words: {}'.format(len(level_chars)))
    print('  Characters that are radicals: {}'.format(len(level_radicals)))
    print('  Radical list: {}'.format(' '.join(level_radicals)))
