export function parseCSV(csvText) {
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

export function groupVocabByCategory(vocabList) {
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

/**
 * Group vocabulary by both Category and Level
 * Useful for displaying merged multi-level vocabularies
 * @param {Array} vocabList - List of vocabulary items
 * @returns {Object} Object with grouped data: { byCategory: {...}, byLevel: {...}, categoryOrder: [...] }
 */
export function groupVocabByLevelAndCategory(vocabList) {
    const byCategory = {};
    const byLevel = {};
    const categoryOrder = [];
    
    vocabList.forEach(word => {
        const level = (word.Level || 'unknown').toLowerCase();
        const category = word.Category;
        
        // Group by category
        if (!byCategory[category]) {
            byCategory[category] = [];
            categoryOrder.push(category);
        }
        byCategory[category].push(word);
        
        // Group by level
        if (!byLevel[level]) {
            byLevel[level] = {};
        }
        if (!byLevel[level][category]) {
            byLevel[level][category] = [];
        }
        byLevel[level][category].push(word);
    });
    
    return { byCategory, byLevel, categoryOrder };
}

/**
 * Filter vocabulary by level
 * @param {Array} vocabList - List of vocabulary items
 * @param {string|Array} levels - Level(s) to filter by (e.g., 'basic' or ['basic', 'intermediate'])
 * @returns {Array} Filtered vocabulary list
 */
export function filterVocabByLevel(vocabList, levels) {
    const levelArray = Array.isArray(levels) ? levels.map(l => l.toLowerCase()) : [levels.toLowerCase()];
    return vocabList.filter(item => {
        const itemLevel = (item.Level || '').toLowerCase();
        return levelArray.includes(itemLevel);
    });
}

export function getCategoryConfig(configList) {
    const config = {};
    configList.forEach(cat => {
        config[cat.Category] = {
            description: cat.Description || '',
            color: cat.ColorCode || '#007AFF'
        };
    });
    return config;
}

export async function loadMatrixIndex() {
    const response = await fetch('data/matrix_index.json');
    return response.json();
}

export async function loadMatrix(filename) {
    // Handle null, missing, or literal 'null'/'undefined' filename values
    if (typeof filename !== 'string' || filename.trim() === '' || filename === 'null' || filename === 'undefined') {
        throw new Error('Invalid filename provided to loadMatrix. Use languageLoader for merged matrices or provide a proper CSV filename.');
    }
    
    const response = await fetch(`data/${filename}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch data/${filename}: HTTP ${response.status}`);
    }
    const text = await response.text();
    const data = parseCSV(text);
    
    // Determine level from filename (e.g., 'chinese_basic.csv' -> 'basic')
    // Be defensive: ensure filename is a string and contains expected parts before manipulating it.
    const safeFilename = String(filename);
    // Extract base filename (e.g., 'chinese_basic.csv' or 'basic.csv' or 'languages/spanish/basic.csv')
    const baseName = safeFilename.split('/').pop();
    // Remove the extension and split on common separators to infer the level name
    const baseNoExt = baseName.replace(/\.csv$/i, '').toLowerCase();
    const parts = baseNoExt.split(/[_-]/);
    const inferredLevel = parts[parts.length - 1];

    // Normalize any existing Level values and set inferred level when missing
    data.forEach(word => {
        if (word.Level) {
            // normalize values like 'Basic' -> 'basic', keep underscored forms
            word.Level = word.Level.trim().toLowerCase().replace(/\s+/g, '_');
        } else {
            word.Level = inferredLevel;
        }
    });
    
    return data;
}