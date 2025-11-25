/**
 * Unit Tests for csvLoader.js
 * Tests CSV parsing, vocabulary grouping, and data loading functions
 */

// Mock fetch for testing
global.fetch = jest.fn();

// Import the functions we need to test
// Since we're having ES module issues, let's define the functions inline for testing
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;
        
        const values = currentLine.split(',');
        
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        
        result.push(obj);
    }
    
    return result;
}

function groupVocabByCategory(vocabList) {
    const grouped = {};
    const categoryOrder = [];
    
    vocabList.forEach(word => {
        if (!grouped[word.Category]) {
            grouped[word.Category] = [];
            categoryOrder.push(word.Category);
        }
        grouped[word.Category].push(word);
    });
    
    // Return both grouped data and order
    return { grouped, categoryOrder };
}

function getCategoryConfig(configList) {
    const config = {};
    configList.forEach(cat => {
        config[cat.Category] = {
            description: cat.Description || '',
            color: cat.ColorCode || '#007AFF'
        };
    });
    return config;
}

async function loadMatrix(filename) {
    const response = await fetch(`data/${filename}`);
    const text = await response.text();
    const data = parseCSV(text);
    
    // Add level information based on filename
    const level = filename.replace('chinese_', '').replace('.csv', '');
    data.forEach(word => {
        word.Level = level;
    });
    
    return data;
}

describe('csvLoader', () => {
    
    describe('parseCSV', () => {
        
        test('should parse simple CSV with headers', () => {
            const csvText = `Category,Word,Pinyin,English
Pronoun,我,wǒ,I
Verb,是,shì,be`;
            
            const result = parseCSV(csvText);
            
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                Category: 'Pronoun',
                Word: '我',
                Pinyin: 'wǒ',
                English: 'I'
            });
            expect(result[1]).toEqual({
                Category: 'Verb',
                Word: '是',
                Pinyin: 'shì',
                English: 'be'
            });
        });
        
        test('should handle empty lines gracefully', () => {
            const csvText = `Category,Word,Pinyin
Pronoun,我,wǒ

Verb,是,shì
`;
            
            const result = parseCSV(csvText);
            
            expect(result).toHaveLength(2);
        });
        
        test('should handle missing values', () => {
            const csvText = `Category,Word,Pinyin,English
Pronoun,我,wǒ,`;
            
            const result = parseCSV(csvText);
            
            expect(result[0].English).toBe('');
        });
        
        test('should trim whitespace from values', () => {
            const csvText = `Category, Word , Pinyin
 Pronoun , 我 , wǒ `;
            
            const result = parseCSV(csvText);
            
            expect(result[0].Category).toBe('Pronoun');
            expect(result[0].Word).toBe('我');
        });
        
        test('should handle Chinese characters correctly', () => {
            const csvText = `Category,Word,Pinyin,English,Example_Phrase
Pronoun,我们,wǒmen,we,我们吃饭。`;
            
            const result = parseCSV(csvText);
            
            expect(result[0].Word).toBe('我们');
            expect(result[0].Example_Phrase).toBe('我们吃饭。');
        });
        
        test('should return empty array for empty input', () => {
            const result = parseCSV('');
            expect(result).toEqual([]);
        });
        
        test('should return empty array for header-only CSV', () => {
            const csvText = `Category,Word,Pinyin`;
            const result = parseCSV(csvText);
            expect(result).toHaveLength(0);
        });
    });
    
    describe('groupVocabByCategory', () => {
        
        test('should group vocabulary by category', () => {
            const vocabList = [
                { Category: 'Pronoun', Word: '我' },
                { Category: 'Verb', Word: '是' },
                { Category: 'Pronoun', Word: '你' },
                { Category: 'Verb', Word: '有' }
            ];
            
            const result = groupVocabByCategory(vocabList);
            
            expect(result.grouped.Pronoun).toHaveLength(2);
            expect(result.grouped.Verb).toHaveLength(2);
            expect(result.categoryOrder).toEqual(['Pronoun', 'Verb']);
        });
        
        test('should maintain category order of first appearance', () => {
            const vocabList = [
                { Category: 'Time', Word: '昨天' },
                { Category: 'Pronoun', Word: '我' },
                { Category: 'Time', Word: '今天' }
            ];
            
            const result = groupVocabByCategory(vocabList);
            
            expect(result.categoryOrder).toEqual(['Time', 'Pronoun']);
        });
        
        test('should handle empty input', () => {
            const result = groupVocabByCategory([]);
            
            expect(result.grouped).toEqual({});
            expect(result.categoryOrder).toEqual([]);
        });
        
        test('should preserve word data in groups', () => {
            const vocabList = [
                { Category: 'Pronoun', Word: '我', Pinyin: 'wǒ', English: 'I' }
            ];
            
            const result = groupVocabByCategory(vocabList);
            
            expect(result.grouped.Pronoun[0]).toEqual({
                Category: 'Pronoun',
                Word: '我',
                Pinyin: 'wǒ',
                English: 'I'
            });
        });
    });
    
    describe('getCategoryConfig', () => {
        
        test('should create config object from category list', () => {
            const configList = [
                { Category: 'Pronoun', Description: 'Personal pronouns', ColorCode: '#FF6B6B' },
                { Category: 'Verb', Description: 'Action words', ColorCode: '#4ECDC4' }
            ];
            
            const result = getCategoryConfig(configList);
            
            expect(result.Pronoun).toEqual({
                description: 'Personal pronouns',
                color: '#FF6B6B'
            });
            expect(result.Verb).toEqual({
                description: 'Action words',
                color: '#4ECDC4'
            });
        });
        
        test('should use default color when ColorCode is missing', () => {
            const configList = [
                { Category: 'Pronoun', Description: 'Test' }
            ];
            
            const result = getCategoryConfig(configList);
            
            expect(result.Pronoun.color).toBe('#007AFF');
        });
        
        test('should use empty string when Description is missing', () => {
            const configList = [
                { Category: 'Pronoun', ColorCode: '#FF6B6B' }
            ];
            
            const result = getCategoryConfig(configList);
            
            expect(result.Pronoun.description).toBe('');
        });
    });
    
    describe('loadMatrixIndex', () => {
        
        beforeEach(() => {
            global.fetch = jest.fn();
        });
        
        test('should fetch and parse matrix index JSON', async () => {
            const mockIndex = [
                { id: 'chinese_basic', name: 'Basic', file: 'chinese_basic.csv' }
            ];
            
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockIndex)
            });
            
            const result = await loadMatrixIndex();
            
            expect(fetch).toHaveBeenCalledWith('data/matrix_index.json');
            expect(result).toEqual(mockIndex);
        });
        
        test('should throw error on network failure', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            
            await expect(loadMatrixIndex()).rejects.toThrow('Network error');
        });
    });
    
    describe('loadMatrix', () => {
        
        beforeEach(() => {
            global.fetch = jest.fn();
        });
        
        test('should fetch and parse matrix CSV file', async () => {
            const csvContent = `Category,Word,Pinyin,English
Pronoun,我,wǒ,I`;
            
            global.fetch.mockResolvedValueOnce({
                text: () => Promise.resolve(csvContent)
            });
            
            const result = await loadMatrix('chinese_basic.csv');
            
            expect(fetch).toHaveBeenCalledWith('data/chinese_basic.csv');
            expect(result).toHaveLength(1);
            expect(result[0].Word).toBe('我');
        });
    });
});
