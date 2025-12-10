import csv

def extract_hanzi_from_csv(file_path):
    """Extract Chinese characters (Hanzi) from the Word column of a CSV file."""
    hanzi_list = []
    with open(file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if 'Word' in row and row['Word'].strip():
                hanzi_list.append(row['Word'].strip())
    return hanzi_list

# Extract Hanzi from each level
basic_hanzi = extract_hanzi_from_csv(r'd:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\data\chinese_basic.csv')
intermediate_hanzi = extract_hanzi_from_csv(r'd:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\data\chinese_intermediate.csv')
advanced_hanzi = extract_hanzi_from_csv(r'd:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\data\chinese_advanced.csv')

print("=== BASIC LEVEL HANZI ===")
print(f"Total words: {len(basic_hanzi)}")
print("Words:", ", ".join(basic_hanzi))
print()

print("=== INTERMEDIATE LEVEL HANZI ===")
print(f"Total words: {len(intermediate_hanzi)}")
print("Words:", ", ".join(intermediate_hanzi))
print()

print("=== ADVANCED LEVEL HANZI ===")
print(f"Total words: {len(advanced_hanzi)}")
print("Words:", ", ".join(advanced_hanzi))
print()

print("=== SUMMARY ===")
print(f"Basic: {len(basic_hanzi)} words")
print(f"Intermediate: {len(intermediate_hanzi)} words")
print(f"Advanced: {len(advanced_hanzi)} words")
print(f"Total: {len(basic_hanzi) + len(intermediate_hanzi) + len(advanced_hanzi)} words")