import csv
import os

# Define the input files and their corresponding levels
files_and_levels = [
    ('chinese_basic.csv', 'Basic'),
    ('chinese_intermediate.csv', 'Intermediate'),
    ('chinese_advanced.csv', 'Advanced')
]

# Output file
output_file = 'chinese_all_levels.csv'

# Read and merge the CSVs
merged_data = []
for file, level in files_and_levels:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                row['Level'] = level
                merged_data.append(row)

# Sort the merged data: first by Level (Basic, Intermediate, Advanced), then by Category, then by Word
level_order = {'Basic': 1, 'Intermediate': 2, 'Advanced': 3}
merged_data.sort(key=lambda x: (level_order.get(x['Level'], 4), x['Category'], x['Word']))

# Write to output CSV
if merged_data:
    fieldnames = ['Level', 'Category', 'Word', 'Pinyin', 'English', 'POS', 'Role', 'Common_Usage', 'Example_Phrase']
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(merged_data)
    print(f"Merged CSV created: {output_file}")
else:
    print("No data to merge.")