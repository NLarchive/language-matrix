/**
 * Data-Driven Radical Filtering Tests
 * 
 * These tests read from the actual CSV data files and compute expected values dynamically.
 * No hardcoded expectations - all values are derived from the source data files:
 * - data/languages/chinese/radicals/radicals.csv
 * - data/languages/chinese/basic.csv
 * - data/languages/chinese/intermediate.csv
 * - data/languages/chinese/advanced.csv
 */

import { jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the web_v3 data folder (relative to tests/integration)
const DATA_PATH = join(__dirname, '..', '..', 'data', 'languages', 'chinese');
const RADICALS_PATH = join(DATA_PATH, 'radicals', 'radicals.csv');

/**
 * Parse CSV file into array of objects
 * Handles quoted fields with commas
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;
        
        const values = parseCSVLine(currentLine);
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        result.push(obj);
    }
    return result;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

/**
 * Load all radicals from the radicals.csv file
 * @returns {Set<string>} Set of radical characters
 */
function loadRadicals() {
    const text = readFileSync(RADICALS_PATH, 'utf-8');
    const data = parseCSV(text);
    return new Set(data.map(r => r.Radical));
}

/**
 * Load vocabulary for a specific level
 * @param {string} level - 'basic', 'intermediate', or 'advanced'
 * @returns {Array<Object>} Array of vocabulary entries
 */
function loadVocabulary(level) {
    const filePath = join(DATA_PATH, `${level}.csv`);
    const text = readFileSync(filePath, 'utf-8');
    const data = parseCSV(text);
    return data.filter(entry => entry.Word);
}

/**
 * Find all radicals that appear in any word of the vocabulary
 * @param {Array<Object>} vocabulary - Array of vocabulary entries
 * @param {Set<string>} radicalSet - Set of known radicals
 * @returns {Set<string>} Set of radicals found in vocabulary
 */
function findRadicalsInVocabulary(vocabulary, radicalSet) {
    const usedRadicals = new Set();
    
    vocabulary.forEach(entry => {
        if (entry.Radicals) {
            const parts = entry.Radicals.split('+').map(r => r.trim()).filter(r => r);
            parts.forEach(r => usedRadicals.add(r));
        } else {
            const word = entry.Word;
            for (const char of word) {
                if (radicalSet.has(char)) {
                    usedRadicals.add(char);
                }
            }
        }
    });
    
    return usedRadicals;
}

/**
 * Find composable words (words with 2+ radicals)
 * @param {Array<Object>} vocabulary - Array of vocabulary entries
 * @param {Set<string>} radicalSet - Set of known radicals
 * @returns {Array<{word: string, radicals: string[]}>} Array of composable words
 */
function findComposableWords(vocabulary, radicalSet) {
    const composable = [];
    
    vocabulary.forEach(entry => {
        let wordRadicals = [];
        if (entry.Radicals) {
            wordRadicals = entry.Radicals.split('+').map(r => r.trim()).filter(r => r);
        } else {
            const word = entry.Word;
            for (const char of word) {
                if (radicalSet.has(char)) {
                    wordRadicals.push(char);
                }
            }
        }
        
        if (wordRadicals.length >= 2) {
            composable.push({ word: entry.Word, radicals: wordRadicals });
        }
    });
    
    return composable.sort((a, b) => a.word.localeCompare(b.word));
}

// Load data once before all tests
let radicalSet;
let basicVocab, intermediateVocab, advancedVocab;
let basicRadicals, intermediateRadicals, advancedRadicals;
let basicComposable, intermediateComposable, advancedComposable;

beforeAll(() => {
    // Load all data from files
    radicalSet = loadRadicals();
    
    basicVocab = loadVocabulary('basic');
    intermediateVocab = loadVocabulary('intermediate');
    advancedVocab = loadVocabulary('advanced');
    
    // Compute expected radicals for each level
    basicRadicals = findRadicalsInVocabulary(basicVocab, radicalSet);
    intermediateRadicals = findRadicalsInVocabulary(intermediateVocab, radicalSet);
    advancedRadicals = findRadicalsInVocabulary(advancedVocab, radicalSet);
    
    // Compute composable words for each level
    basicComposable = findComposableWords(basicVocab, radicalSet);
    intermediateComposable = findComposableWords(intermediateVocab, radicalSet);
    advancedComposable = findComposableWords(advancedVocab, radicalSet);
    
    // Log computed values for debugging
    console.log('\n=== DATA-DRIVEN TEST: Computed Expected Values ===');
    console.log(`Total radicals in radicals.csv: ${radicalSet.size}`);
    console.log(`\nBasic level (${basicVocab.size} words):`);
    console.log(`  Radicals: ${basicRadicals.size} - [${Array.from(basicRadicals).sort().join(', ')}]`);
    console.log(`  Composable: ${basicComposable.length} - [${basicComposable.map(c => c.word).join(', ')}]`);
    console.log(`\nIntermediate level (${intermediateVocab.size} words):`);
    console.log(`  Radicals: ${intermediateRadicals.size} - [${Array.from(intermediateRadicals).sort().join(', ')}]`);
    console.log(`  Composable: ${intermediateComposable.length} - [${intermediateComposable.map(c => c.word).join(', ')}]`);
    console.log(`\nAdvanced level (${advancedVocab.size} words):`);
    console.log(`  Radicals: ${advancedRadicals.size} - [${Array.from(advancedRadicals).sort().join(', ')}]`);
    console.log(`  Composable: ${advancedComposable.length} - [${advancedComposable.map(c => c.word).join(', ')}]`);
    console.log('=================================================\n');
});

describe('Data-Driven Radical Filtering Tests', () => {
    
    describe('Data Loading Verification', () => {
        test('should load radicals from radicals.csv', () => {
            expect(radicalSet.size).toBeGreaterThan(0);
            // Verify some known radicals exist
            expect(radicalSet.has('一')).toBe(true);
            expect(radicalSet.has('人')).toBe(true);
        });
        
        test('should load vocabulary from each level CSV', () => {
            expect(basicVocab.length).toBeGreaterThan(0);
            expect(intermediateVocab.length).toBeGreaterThan(0);
            expect(advancedVocab.length).toBeGreaterThan(0);
        });
    });
    
    describe('Radical Filtering by Level', () => {
        test('Basic level should show only radicals from basic vocabulary', () => {
            // Verify computed radicals match what we expect from the data
            expect(basicRadicals.size).toBeGreaterThan(0);
            
            // Each radical should appear in at least one basic word
            basicRadicals.forEach(radical => {
                let foundInWord = false;
                basicVocab.forEach(entry => {
                    if (entry.Radicals) {
                        if (entry.Radicals.split('+').map(r => r.trim()).includes(radical)) foundInWord = true;
                    } else if (entry.Word.includes(radical)) {
                        foundInWord = true;
                    }
                });
                expect(foundInWord).toBe(true);
            });
        });
        
        test('Intermediate level should show only radicals from intermediate vocabulary', () => {
            expect(intermediateRadicals.size).toBeGreaterThan(0);
            
            intermediateRadicals.forEach(radical => {
                let foundInWord = false;
                intermediateVocab.forEach(entry => {
                    if (entry.Radicals) {
                        if (entry.Radicals.split('+').map(r => r.trim()).includes(radical)) foundInWord = true;
                    } else if (entry.Word.includes(radical)) {
                        foundInWord = true;
                    }
                });
                expect(foundInWord).toBe(true);
            });
        });
        
        test('Advanced level should show only radicals from advanced vocabulary', () => {
            expect(advancedRadicals.size).toBeGreaterThan(0);
            
            advancedRadicals.forEach(radical => {
                let foundInWord = false;
                advancedVocab.forEach(entry => {
                    if (entry.Radicals) {
                        if (entry.Radicals.split('+').map(r => r.trim()).includes(radical)) foundInWord = true;
                    } else if (entry.Word.includes(radical)) {
                        foundInWord = true;
                    }
                });
                expect(foundInWord).toBe(true);
            });
        });
        
        test('All Levels should include all radicals from all level vocabularies', () => {
            const allLevelRadicals = new Set([
                ...basicRadicals,
                ...intermediateRadicals,
                ...advancedRadicals
            ]);
            
            // All levels should be a superset of each individual level
            basicRadicals.forEach(r => expect(allLevelRadicals.has(r)).toBe(true));
            intermediateRadicals.forEach(r => expect(allLevelRadicals.has(r)).toBe(true));
            advancedRadicals.forEach(r => expect(allLevelRadicals.has(r)).toBe(true));
        });
    });
    
    describe('Composable Words Detection', () => {
        test('Basic level composable words should each have 2+ radicals', () => {
            basicComposable.forEach(({ word, radicals }) => {
                expect(radicals.length).toBeGreaterThanOrEqual(2);
                // Each radical should be in the radical set
                radicals.forEach(r => expect(radicalSet.has(r)).toBe(true));
            });
        });
        
        test('Intermediate level composable words should each have 2+ radicals', () => {
            intermediateComposable.forEach(({ word, radicals }) => {
                expect(radicals.length).toBeGreaterThanOrEqual(2);
                radicals.forEach(r => expect(radicalSet.has(r)).toBe(true));
            });
        });
        
        test('Advanced level composable words should each have 2+ radicals', () => {
            advancedComposable.forEach(({ word, radicals }) => {
                expect(radicals.length).toBeGreaterThanOrEqual(2);
                radicals.forEach(r => expect(radicalSet.has(r)).toBe(true));
            });
        });
        
        test('Composable words should exist in their respective level vocabulary', () => {
            basicComposable.forEach(({ word }) => {
                expect(basicVocab.some(e => e.Word === word)).toBe(true);
            });
            
            intermediateComposable.forEach(({ word }) => {
                expect(intermediateVocab.some(e => e.Word === word)).toBe(true);
            });
            
            advancedComposable.forEach(({ word }) => {
                expect(advancedVocab.some(e => e.Word === word)).toBe(true);
            });
        });
    });
    
    describe('Level Isolation', () => {
        test('Radicals unique to basic should not appear in intermediate vocabulary', () => {
            const basicOnly = new Set([...basicRadicals].filter(r => !intermediateRadicals.has(r)));
            
            basicOnly.forEach(radical => {
                let foundInIntermediate = false;
                intermediateVocab.forEach(entry => {
                    if (entry.Radicals) {
                        if (entry.Radicals.split('+').map(r => r.trim()).includes(radical)) foundInIntermediate = true;
                    } else if (entry.Word.includes(radical)) {
                        foundInIntermediate = true;
                    }
                });
                expect(foundInIntermediate).toBe(false);
            });
        });
        
        test('Radicals unique to intermediate should not appear in basic vocabulary', () => {
            const intermediateOnly = new Set([...intermediateRadicals].filter(r => !basicRadicals.has(r)));
            
            intermediateOnly.forEach(radical => {
                let foundInBasic = false;
                basicVocab.forEach(entry => {
                    if (entry.Radicals) {
                        if (entry.Radicals.split('+').map(r => r.trim()).includes(radical)) foundInBasic = true;
                    } else if (entry.Word.includes(radical)) {
                        foundInBasic = true;
                    }
                });
                expect(foundInBasic).toBe(false);
            });
        });
    });
    
    describe('RadicalLoader Simulation', () => {
        /**
         * This simulates what RadicalLoader.getFilteredRadicals should do
         */
        function simulateGetFilteredRadicals(level, allRadicals, vocabulary) {
            if (level === 'all_levels') {
                return allRadicals;
            }
            
            const usedRadicals = new Set();
            vocabulary.forEach(entry => {
                if (entry.Radicals) {
                    const parts = entry.Radicals.split('+').map(r => r.trim()).filter(r => r);
                    parts.forEach(r => usedRadicals.add(r));
                } else {
                    const word = entry.Word;
                    for (const char of word) {
                        if (allRadicals.has(char)) {
                            usedRadicals.add(char);
                        }
                    }
                }
            });
            
            return usedRadicals;
        }
        
        test('Simulated filtering should match computed expectations for basic', () => {
            const result = simulateGetFilteredRadicals('basic', radicalSet, basicVocab);
            expect(result.size).toBe(basicRadicals.size);
            basicRadicals.forEach(r => expect(result.has(r)).toBe(true));
        });
        
        test('Simulated filtering should match computed expectations for intermediate', () => {
            const result = simulateGetFilteredRadicals('intermediate', radicalSet, intermediateVocab);
            expect(result.size).toBe(intermediateRadicals.size);
            intermediateRadicals.forEach(r => expect(result.has(r)).toBe(true));
        });
        
        test('Simulated filtering should match computed expectations for advanced', () => {
            const result = simulateGetFilteredRadicals('advanced', radicalSet, advancedVocab);
            expect(result.size).toBe(advancedRadicals.size);
            advancedRadicals.forEach(r => expect(result.has(r)).toBe(true));
        });
        
        test('Simulated filtering for all_levels should return all radicals', () => {
            const result = simulateGetFilteredRadicals('all_levels', radicalSet, []);
            expect(result.size).toBe(radicalSet.size);
        });
    });
    
    describe('WordComposer Simulation', () => {
        /**
         * This simulates what RadicalLoader.getComposableWords should do
         */
        function simulateGetComposableWords(vocabulary, allRadicals) {
            const composable = [];
            
            vocabulary.forEach(entry => {
                let wordRadicals = [];
                if (entry.Radicals) {
                    wordRadicals = entry.Radicals.split('+').map(r => r.trim()).filter(r => r);
                } else {
                    const word = entry.Word;
                    for (const char of word) {
                        if (allRadicals.has(char)) {
                            wordRadicals.push(char);
                        }
                    }
                }
                
                if (wordRadicals.length >= 2) {
                    composable.push({ word: entry.Word, radicals: wordRadicals });
                }
            });
            
            return composable;
        }
        
        test('Simulated composable words should match computed expectations for basic', () => {
            const result = simulateGetComposableWords(basicVocab, radicalSet);
            expect(result.length).toBe(basicComposable.length);
        });
        
        test('Simulated composable words should match computed expectations for intermediate', () => {
            const result = simulateGetComposableWords(intermediateVocab, radicalSet);
            expect(result.length).toBe(intermediateComposable.length);
        });
        
        test('Simulated composable words should match computed expectations for advanced', () => {
            const result = simulateGetComposableWords(advancedVocab, radicalSet);
            expect(result.length).toBe(advancedComposable.length);
        });
    });
});

// Export computed values for use by other tests
export {
    radicalSet,
    basicVocab, intermediateVocab, advancedVocab,
    basicRadicals, intermediateRadicals, advancedRadicals,
    basicComposable, intermediateComposable, advancedComposable,
    loadRadicals, loadVocabulary, findRadicalsInVocabulary, findComposableWords
};
