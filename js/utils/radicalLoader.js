/**
 * Radical Loader Utility
 * Loads and manages radical data for Chinese characters
 * Provides lookup functions for finding radicals in characters
 * Supports word-radical decomposition for the Word Composer game
 */

import { parseCSV } from './csvLoader.js';

export class RadicalLoader {
    constructor() {
        this.radicalsCache = {}; // Cache loaded radicals by language
        this.wordRadicalsCache = {}; // Cache word-to-radical mappings
        this.vocabularyCache = {}; // Cache vocabulary words by language/level
        this.wordDecomposition = {}; // Cache explicit word decompositions from CSV
        this.radicalVariants = this.buildVariantMap(); // Map of radical variants
    }

    /**
     * Build a map of radical variants (simplified forms used as components)
     * Maps variant forms to their main radical
     */
    buildVariantMap() {
        return {
            // Common radical variants (component form -> main radical)
            '亻': '人',  // person (side form)
            '刂': '刀',  // knife (side form)
            '氵': '水',  // water (side form)
            '灬': '火',  // fire (bottom form)
            '扌': '手',  // hand (side form)
            '忄': '心',  // heart (side form)
            '⺗': '心',  // heart (bottom form)
            '犭': '犬',  // dog (side form)
            '牜': '牛',  // cow (side form)
            '礻': '示',  // altar/spirit (side form)
            '衤': '衣',  // clothes (side form)
            '纟': '糸',  // silk (side form)
            '钅': '金',  // gold/metal (side form)
            '饣': '食',  // eat (side form)
            '讠': '言',  // speech (side form)
            '⺮': '竹',  // bamboo (top form)
            '⺶': '羊',  // sheep (top form)
            '罒': '网',  // net (top form)
            '⺲': '网',  // net (variant)
            '⺼': '月',  // meat/moon (side form)
            '爫': '爪',  // claw (top form)
            '王': '玉',  // jade (when used as radical)
            '⻊': '足',  // foot (side form)
            '⻏': '邑',  // city (right side) or mound (left side)
        };
    }

    /**
     * Load radicals metadata for a specific language
     * 
     * radicals.csv is built from vocabulary files and contains:
     * - Official Kangxi 214 radicals (Set: 'kangxi_214')
     * - Variant forms (Set: 'variant')
     * - Other character components (Set: 'component')
     * 
     * Each entry has a 'Levels' field indicating which vocabulary levels use it.
     * 
     * @param {string} languagePath - Language folder (e.g., 'chinese')
     * @returns {Promise<Array>} Array of radical objects with metadata
     */
    async loadRadicals(languagePath = 'chinese') {
        const cacheKey = languagePath;
        if (this.radicalsCache[cacheKey]) {
            return this.radicalsCache[cacheKey];
        }
        try {
            const filePath = `data/languages/${languagePath}/radicals/radicals.csv`;
            const response = await fetch(filePath);
            
            if (!response.ok) {
                console.warn(`[RadicalLoader] Failed to load radicals.csv from ${filePath} (HTTP ${response.status}). Attempting to synthesize radicals list from word-radical mappings as a fallback.`);

                // Fallback: if we have previously built word->radicals mappings for this language,
                // synthesize a minimal radicals dataset from the components used in vocabulary CSVs.
                const mapping = this.wordRadicalsCache[cacheKey];
                if (mapping && Object.keys(mapping).length > 0) {
                    const set = new Set();
                    const levelsMap = {}; // track levels where each radical is used

                    Object.values(mapping).forEach(entry => {
                        (entry.radicals || []).forEach(r => {
                            set.add(r);
                            if (!levelsMap[r]) levelsMap[r] = new Set();
                            (entry.levels || new Set()).forEach(l => levelsMap[r].add(l));
                        });
                    });

                    const synthesized = Array.from(set).map(rad => ({
                        Radical: rad,
                        Pinyin: '',
                        Meaning: '',
                        Description: '',
                        Set: 'synthesized',
                        Levels: Array.from(levelsMap[rad] || []).join(',') || ''
                    }));

                    console.log(`[RadicalLoader] Synthesized ${synthesized.length} radicals from word decomposition for ${languagePath}`);
                    this.radicalsCache[cacheKey] = synthesized;
                    return synthesized;
                }

                return [];
            }
            
            const text = await response.text();
            const data = parseCSV(text);
            
            console.log(`[RadicalLoader] Loaded ${data.length} radicals/components from ${filePath}`);
            
            // Log the set breakdown for debugging
            const kangxi = data.filter(r => r.Set === 'kangxi_214').length;
            const variants = data.filter(r => r.Set === 'variant').length;
            const components = data.filter(r => r.Set === 'component').length;
            console.log(`[RadicalLoader] Breakdown: ${kangxi} Kangxi, ${variants} variants, ${components} components`);
            
            this.radicalsCache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error(`[RadicalLoader] Error loading radicals for ${languagePath}:`, error);
            return [];
        }
    }

    /**
     * Get radical information by radical character
     * @param {string} radical - The radical character
     * @param {string} languagePath - Language folder (e.g., 'chinese')
     * @returns {Object|null} Radical object or null
     */
    getRadicalInfo(radical, languagePath = 'chinese') {
        const radicals = this.radicalsCache[languagePath] || [];
        
        // Direct match
        let info = radicals.find(r => r.Radical === radical);
        if (info) return info;
        
        // Check if it's a variant
        const mainRadical = this.radicalVariants[radical];
        if (mainRadical) {
            info = radicals.find(r => r.Radical === mainRadical);
            if (info) return { ...info, isVariant: true, variantOf: mainRadical };
        }
        
        return null;
    }

    /**
     * Find all radicals that might be in a character
     * This is a simplified lookup - checks if character contains known radicals
     * Iterates through each character in a word and matches against known radicals
     * Allows duplicate radicals (e.g., '林' -> ['木', '木'])
     * @param {string} character - Chinese character or word to analyze
     * @param {string} languagePath - Language folder
     * @param {boolean} useFallback - If true, attempt character-level matching when no explicit decomposition found
     * @returns {Array} Array of matching radical objects
     */
    findRadicalsInCharacter(character, languagePath = 'chinese', useFallback = false) {
        const radicals = this.radicalsCache[languagePath] || [];
        const found = [];

        if (!radicals || radicals.length === 0) {
            return [];
        }

        // Check explicit decomposition first (from CSV data)
        if (this.wordDecomposition && this.wordDecomposition[character]) {
            const components = this.wordDecomposition[character];
            components.forEach(comp => {
                const matchingRadical = radicals.find(r => r.Radical === comp);
                if (matchingRadical) {
                    found.push({ ...matchingRadical, position: 'component' });
                }
            });
            
            if (found.length > 0) {
                return found;
            }
        }

        // FALLBACK MODE: Attempt character-level matching when no explicit decomposition
        // This checks if individual characters in the word exist as radicals in radicals.csv
        if (useFallback && character.length > 0) {
            // Check each character in the word
            for (const char of character) {
                // Direct match - is this character a known radical?
                let matchingRadical = radicals.find(r => r.Radical === char);
                
                if (matchingRadical) {
                    found.push({ ...matchingRadical, position: 'character-match' });
                    continue;
                }
                
                // Check if it's a variant radical
                const mainRadical = this.radicalVariants[char];
                if (mainRadical) {
                    matchingRadical = radicals.find(r => r.Radical === mainRadical);
                    if (matchingRadical) {
                        found.push({ 
                            ...matchingRadical, 
                            position: 'variant-match',
                            isVariant: true,
                            variantOf: mainRadical
                        });
                    }
                }
            }
            
            if (found.length > 0) {
                return found;
            }
        }

        // STRICT MODE: Only use explicit decomposition from CSV
        // If no decomposition is found in the data, return empty array.
        // This enforces the requirement that all radical data must come from the 'Radicals' column.
        
        return found;
    }

    /**
     * Get all radicals grouped by stroke count
     * Dynamically extracts stroke counts from the StrokeCount column in radicals.csv
     * Falls back to 'unknown' if StrokeCount column is missing
     * @param {string} languagePath - Language folder
     * @returns {Object} Radicals grouped by stroke count (numeric keys or 'unknown')
     */
    getRadicalsGroupedByStroke(languagePath = 'chinese') {
        const radicals = this.radicalsCache[languagePath] || [];
        const grouped = {};
        
        radicals.forEach(radical => {
            // Dynamically extract stroke count from StrokeCount column
            // Falls back to 'unknown' if column doesn't exist or is empty
            let strokes = radical.StrokeCount;
            
            if (!strokes) {
                strokes = 'unknown';
            } else {
                // Convert to number if it's numeric, keep as string if not
                const strokeNum = parseInt(strokes, 10);
                strokes = isNaN(strokeNum) ? 'unknown' : strokeNum;
            }
            
            if (!grouped[strokes]) {
                grouped[strokes] = [];
            }
            grouped[strokes].push(radical);
        });

        return grouped;
    }

    /**
     * Clear cache
     * @param {string} languagePath - Optional language to clear, clears all if not specified
     */
    clearCache(languagePath = null) {
        if (languagePath) {
            delete this.radicalsCache[languagePath];
            delete this.wordRadicalsCache[languagePath];
        } else {
            this.radicalsCache = {};
            this.wordRadicalsCache = {};
        }
    }

    /**
     * Build word-radical mappings from level vocabulary files
     * Loads all level CSVs and extracts radical decomposition data from the Radicals column
     * @param {string} languagePath - Language folder (e.g., 'chinese')
     * @returns {Promise<Object>} Object mapping words to their radicals
     */
    async buildWordRadicalsFromLevels(languagePath = 'chinese') {
        const cacheKey = languagePath;
        
        if (this.wordRadicalsCache[cacheKey]) {
            console.log(`[RadicalLoader] === USING CACHED buildWordRadicalsFromLevels for ${languagePath} ===`);
            return this.wordRadicalsCache[cacheKey];
        }
        
        try {
            console.log(`[RadicalLoader] === STARTING buildWordRadicalsFromLevels for ${languagePath} ===`);
            const mapping = {};
            const levels = ['basic', 'intermediate', 'advanced'];
            
            // Load each level's vocabulary CSV directly
            for (const level of levels) {
                console.log(`[RadicalLoader.buildWordRadicalsFromLevels] Processing level: ${level}`);
                
                try {
                    const filePath = `data/languages/${languagePath}/${level}.csv`;
                    const response = await fetch(filePath);
                    
                    if (!response.ok) {
                        console.warn(`[RadicalLoader] No vocabulary file found at ${filePath} (HTTP ${response.status})`);
                        continue;
                    }
                    
                    const text = await response.text();
                    const data = parseCSV(text);
                    
                    // Extract word-radical mappings from CSV
                    // Support both 'Radicals' column (Chinese) and 'Components' column (Japanese/Korean)
                    data.forEach(entry => {
                        const word = entry.Word ? entry.Word.trim() : null;
                        const radicalsStr = (entry.Radicals || entry.Components || '').trim();
                        
                        if (word && radicalsStr) {
                            // Split by '+' to get individual radicals/components
                            const radicalsList = radicalsStr.split('+').map(r => r.trim()).filter(r => r);
                            
                            if (radicalsList.length > 0) {
                                if (!mapping[word]) {
                                    mapping[word] = {
                                        radicals: radicalsList,
                                        meanings: [],
                                        levels: new Set([level])
                                    };
                                } else {
                                    // Word already exists - add this level
                                    mapping[word].levels.add(level);
                                }
                                
                                // Cache the decomposition as well
                                this.wordDecomposition[word] = radicalsList;
                            }
                        }
                    });
                    
                    console.log(`[RadicalLoader] Loaded radicals for ${Object.keys(mapping).length} words from ${level} level`);
                } catch (error) {
                    console.error(`[RadicalLoader] Error processing ${level} level for ${languagePath}:`, error);
                }
            }
            
            console.log(`[RadicalLoader] Built ${Object.keys(mapping).length} word-radical mappings from level vocabularies`);
            
            // Debug: Check what's in the mapping for composable words
            const composableInMapping = Object.entries(mapping)
                .filter(([word, data]) => data.radicals.length >= 2)
                .map(([word, data]) => ({
                    word,
                    radicalCount: data.radicals.length,
                    radicals: data.radicals,
                    levels: Array.from(data.levels || [])
                }));
            console.log(`[RadicalLoader] Composable words in mapping (2+ radicals): ${composableInMapping.length}`, composableInMapping.slice(0, 10));
            
            this.wordRadicalsCache[cacheKey] = mapping;
            return mapping;
        } catch (error) {
            console.error(`[RadicalLoader] Error building word-radical mappings for ${languagePath}:`, error);
            return {};
        }
    }

    /**
     * Load word-radical mappings for a specific language (deprecated - use buildWordRadicalsFromLevels)
     * @deprecated Use buildWordRadicalsFromLevels instead
     * @param {string} languagePath - Language folder (e.g., 'chinese')
     * @returns {Promise<Object>} Object mapping words to their radicals
     */
    async loadWordRadicals(languagePath = 'chinese') {
        console.warn('[RadicalLoader] loadWordRadicals is deprecated. Use buildWordRadicalsFromLevels instead.');
        return this.buildWordRadicalsFromLevels(languagePath);
    }

    /**
     * Load vocabulary words from a level-specific CSV file
     * @param {string} languagePath - Language folder (e.g., 'chinese')
     * @param {string} level - Level ('basic', 'intermediate', 'advanced')
     * @returns {Promise<Set<string>>} Set of vocabulary words for this level
     */
    async loadVocabulary(languagePath = 'chinese', level = 'basic') {
        const cacheKey = `${languagePath}/${level}`;
        
        if (this.vocabularyCache[cacheKey]) {
            console.log(`[RadicalLoader.loadVocabulary] Returning cached vocabulary for ${cacheKey}: ${this.vocabularyCache[cacheKey].size} words`);
            return this.vocabularyCache[cacheKey];
        }
        
        try {
            const filePath = `data/languages/${languagePath}/${level}.csv`;
            console.log(`[RadicalLoader.loadVocabulary] Loading vocabulary from ${filePath}`);
            
            const response = await fetch(filePath);
            if (!response.ok) {
                console.warn(`[RadicalLoader] No vocabulary file found at ${filePath} (HTTP ${response.status})`);
                return new Set();
            }
            
            const text = await response.text();
            const data = parseCSV(text);
            
            // Extract words from the Word column and populate decomposition cache
            const words = new Set();
            data.forEach(entry => {
                if (entry.Word) {
                    const word = entry.Word.trim();
                    words.add(word);
                    
                    // Store explicit decomposition if available
                    if (entry.Radicals) {
                        const radicals = entry.Radicals.split('+').map(r => r.trim()).filter(r => r);
                        if (radicals.length > 0) {
                            this.wordDecomposition[word] = radicals;
                        }
                    }
                }
            });
            
            console.log(`[RadicalLoader] Successfully loaded ${words.size} vocabulary words from ${filePath}`);
            console.log(`[RadicalLoader] Sample words: ${Array.from(words).slice(0, 5).join(', ')}`);
            
            this.vocabularyCache[cacheKey] = words;
            return words;
        } catch (error) {
            console.error(`[RadicalLoader] Error loading vocabulary for ${languagePath}/${level}:`, error);
            return new Set();
        }
    }

    /**
     * Get radicals for a specific word from the mapping
     * @param {string} word - The word to look up
     * @param {string} languagePath - Language folder
     * @returns {Object|null} Object with radicals array and meanings
     */
    getWordRadicals(word, languagePath = 'chinese') {
        const mapping = this.wordRadicalsCache[languagePath] || {};
        return mapping[word] || null;
    }

    /**
     * Get all words that can be formed from given radicals
     * @param {Array<string>} radicals - Array of radical characters
     * @param {string} languagePath - Language folder
     * @returns {Array} Array of words that use these radicals
     */
    findWordsWithRadicals(radicals, languagePath = 'chinese') {
        const mapping = this.wordRadicalsCache[languagePath] || {};
        const radicalSet = new Set(radicals);
        const matches = [];
        
        Object.entries(mapping).forEach(([word, data]) => {
            // Check if all word radicals are in the provided set
            const wordRadicalSet = new Set(data.radicals);
            const isMatch = data.radicals.every(r => radicalSet.has(r));
            if (isMatch) {
                matches.push({
                    word,
                    ...data,
                    exactMatch: data.radicals.length === radicals.length &&
                                radicals.every(r => wordRadicalSet.has(r))
                });
            }
        });
        
        return matches;
    }

    /**
     * Get all words organized for the Word Composer game
     * Filters to words with 2+ radicals suitable for composition
     * Only includes words that exist in the vocabulary CSV for the level
     * AND where ALL radicals exist in radicals.csv (so they appear in the reference section)
     * @param {string} languagePath - Language folder
     * @param {string} level - Optional level filter ('basic', 'intermediate', 'advanced', 'all_levels')
     * @returns {Promise<Array>} Array of composable word objects
     */
    async getComposableWords(languagePath = 'chinese', level = null) {
        const mapping = this.wordRadicalsCache[languagePath] || {};
        const composable = [];
        
        // Load radicals.csv to get the set of available radicals
        const radicalsData = await this.loadRadicals(languagePath);
        const availableRadicals = new Set(radicalsData.map(r => r.Radical));
        console.log(`[RadicalLoader] Available radicals in radicals.csv: ${availableRadicals.size}`);
        
        // Load vocabulary for the specified level to verify words exist
        let vocabularyWords = null;
        if (level && level !== 'all_levels') {
            vocabularyWords = await this.loadVocabulary(languagePath, level);
            console.log(`[RadicalLoader] Filtering composable words by vocabulary: ${vocabularyWords.size} words in ${level}`);
        }
        
        Object.entries(mapping).forEach(([word, data]) => {
            // Only include words with 2+ radicals
            if (data.radicals.length >= 2) {
                // Check that ALL radicals of this word exist in radicals.csv
                const allRadicalsAvailable = data.radicals.every(r => availableRadicals.has(r));
                if (!allRadicalsAvailable) {
                    const missingRadicals = data.radicals.filter(r => !availableRadicals.has(r));
                    console.log(`[RadicalLoader] Word "${word}" skipped - missing radicals: ${missingRadicals.join(', ')}`);
                    return;
                }
                
                // Apply level filter if specified
                // Check if level is in the word's levels set, or if 'all_levels', include all
                let levelMatches = !level || level === 'all_levels' || (data.levels && data.levels.has(level));
                
                if (!levelMatches) {
                    return;
                }
                
                if (levelMatches) {
                    // If we have vocabulary loaded, only include words that exist in it
                    if (vocabularyWords && !vocabularyWords.has(word)) {
                        console.log(`[RadicalLoader] Word "${word}" not in vocabulary for ${level}`);
                        return; // Skip words not in vocabulary
                    }
                    
                    // Choose a best-fit single level for the word for audio lookup and gameplay.
                    // If a word belongs to multiple levels, prefer basic -> intermediate -> advanced.
                    let singleLevel = null;
                    try {
                        const levelOrder = ['basic', 'intermediate', 'advanced'];
                        if (data.levels && data.levels.size) {
                            for (const l of levelOrder) {
                                if (data.levels.has(l)) { singleLevel = l; break; }
                            }
                        }
                    } catch (e) { singleLevel = null; }

                    composable.push({
                        word,
                        radicals: data.radicals,
                        meanings: data.meanings,
                        levels: data.levels,
                        level: singleLevel,
                        difficulty: data.radicals.length // More radicals = harder
                    });
                }
            }
        });
        
        // Sort by difficulty, then alphabetically
        composable.sort((a, b) => {
            if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
            return a.word.localeCompare(b.word);
        });
        
        console.log(`[RadicalLoader] Found ${composable.length} composable words for ${languagePath}/${level} (all radicals verified in radicals.csv)`);
        return composable;
    }

    /**
     * Check if a sequence of radicals forms a valid word
     * @param {Array<string>} radicals - Ordered array of radicals
     * @param {string} languagePath - Language folder
     * @returns {Object|null} Word data if valid, null otherwise
     */
    checkWordComposition(radicals, languagePath = 'chinese') {
        const mapping = this.wordRadicalsCache[languagePath] || {};
        
        // Create a string key from radicals for comparison
        const radicalKey = radicals.join('+');
        
        for (const [word, data] of Object.entries(mapping)) {
            if (data.radicals.join('+') === radicalKey) {
                return { word, ...data, isExactMatch: true };
            }
        }
        
        return null;
    }
}

// Create singleton instance
export const radicalLoader = new RadicalLoader();
