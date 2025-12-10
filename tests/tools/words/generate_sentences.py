import csv
import random

# Function to load the matrix from CSV
def load_matrix(filename):
    matrix = {}
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            category = row['Category']
            if category not in matrix:
                matrix[category] = []
            matrix[category].append(row)
    return matrix

# Function to generate a simple sentence: Time + Subject + Verb + Object + Particle
def generate_sentence(matrix):
    time = random.choice(matrix.get('Time', []))['Word'] if 'Time' in matrix else ''
    subject = random.choice(matrix.get('Pronoun', []))['Word']
    verb = random.choice(matrix.get('Verb', []))['Word']
    obj = random.choice(matrix.get('Noun', []))['Word']
    particle = random.choice(matrix.get('Particle', []))['Word'] if random.random() > 0.5 else ''
    sentence = f"{time} {subject} {verb} {obj}{particle}".strip()
    return sentence

# Function to create Janulus matrix for a sentence (simplified tokenization)
def create_janulus_matrix(sentence, matrix_data):
    tokens = sentence.split()
    janulus_matrix = []
    for idx, token in enumerate(tokens, 1):
        # Find matching word in matrix
        word_info = None
        for category, words in matrix_data.items():
            for word in words:
                if word['Word'] == token:
                    word_info = word
                    break
            if word_info:
                break
        if word_info:
            row = {
                'idx': idx,
                'token': token,
                'pos': word_info['POS'],
                'role': word_info['Role'],
                'category': word_info['Category'],
                'pinyin': word_info.get('Pinyin', ''),
                'english': word_info.get('English', '')
            }
            janulus_matrix.append(row)
    return janulus_matrix

# Main
if __name__ == "__main__":
    matrix_file = 'chinese_basic_grammar_matrix.csv'
    matrix = load_matrix(matrix_file)

    # Generate 5 example sentences and their matrices
    for i in range(5):
        sentence = generate_sentence(matrix)
        print(f"Sentence {i+1}: {sentence}")
        janulus = create_janulus_matrix(sentence, matrix)
        print("Janulus Matrix:")
        print("| idx | token | pos | role | category | pinyin | english |")
        print("|-----|-------|-----|------|----------|--------|---------|")
        for row in janulus:
            print(f"| {row['idx']} | {row['token']} | {row['pos']} | {row['role']} | {row['category']} | {row['pinyin']} | {row['english']} |")
        print("\n")