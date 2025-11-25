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