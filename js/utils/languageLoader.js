/**
 * Language Loader Utility
 * Dynamically discovers and loads language levels from language folders
 * Supports reading individual levels or merging all levels together
 */

import { parseCSV, groupVocabByCategory } from './csvLoader.js';

export class LanguageLoader {
    constructor() {
        this.languageCache = {}; // Cache loaded languages
        this.levelCache = {}; // Cache individual levels
    }

    /**
     * Discover all available languages by scanning the data folder
     * Returns a list of language configurations
     * @returns {Promise<Array>} Array of language objects with available levels
     */
    async discoverLanguages() {
        try {
            // Fetch the data folder structure via matrix_index
            const response = await fetch('data/matrix_index.json');
            const matrices = await response.json();
            
            // Group by language
            const languages = {};
            
            matrices.forEach(matrix => {
                const lang = matrix.language || 'zh-CN';
                if (!languages[lang]) {
                    languages[lang] = {
                        code: lang,
                        name: this.getLanguageName(lang),
                        levels: [],
                        files: []
                    };
                }
                languages[lang].levels.push({
                    level: matrix.level,
                    id: matrix.id,
                    name: matrix.name,
                    file: matrix.file
                });
                languages[lang].files.push(matrix.file);
            });
            
            return Object.values(languages);
        } catch (error) {
            console.error('[LanguageLoader] Error discovering languages:', error);
            return [];
        }
    }

    /**
     * Get human-readable language name from language code
     * @param {string} code - Language code (e.g., 'zh-CN', 'en-US')
     * @returns {string} Language name
     */
    getLanguageName(code) {
        const names = {
            'zh-CN': 'Chinese (Simplified)',
            'zh-TW': 'Chinese (Traditional)',
            'en-US': 'English',
            'en-GB': 'English (British)',
            'es-ES': 'Spanish',
            'fr-FR': 'French',
            'de-DE': 'German',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean'
        };
        return names[code] || code;
    }

    /**
     * Load a single language level
     * @param {string} languagePath - Language folder (e.g., 'chinese')
     * @param {string} level - Level name (e.g., 'basic', 'intermediate', 'advanced')
     * @returns {Promise<Array>} Array of vocabulary items with Level field
     */
    async loadLevel(languagePath, level) {
        const cacheKey = `${languagePath}-${level}`;
        
        if (this.levelCache[cacheKey]) {
            return this.levelCache[cacheKey];
        }
        
        try {
            // Try common file naming conventions - support both old and new paths
            const fileNames = [
                // New organized structure: data/languages/chinese/basic.csv
                `data/languages/${languagePath}/${level}.csv`,
                // Old structure: data/chinese/basic.csv
                `data/${languagePath}/${level}.csv`,
                // Old structure: data/chinese_basic.csv
                `data/${languagePath}_${level}.csv`,
                // Alternative: data/chinese-basic.csv
                `data/${languagePath}-${level}.csv`,
                // Just level: data/basic.csv
                `data/${level}.csv`
            ];
            
            let data = null;
            let usedPath = null;
            
            for (const filePath of fileNames) {
                try {
                    const response = await fetch(filePath);
                    if (response.ok) {
                        const text = await response.text();
                        data = parseCSV(text);
                        usedPath = filePath;
                        console.log(`[LanguageLoader] Loaded ${languagePath}/${level} from ${filePath}`);
                        break;
                    }
                } catch (e) {
                    // Try next filename
                    continue;
                }
            }
            
            if (!data) {
                throw new Error(`No CSV file found for ${languagePath}/${level} in any expected location`);
            }
            
            // Ensure all items have Level field
            data.forEach(item => {
                if (!item.Level) {
                    item.Level = level;
                }
            });
            
            this.levelCache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error(`[LanguageLoader] Error loading ${languagePath}/${level}:`, error);
            return [];
        }
    }

    /**
     * Check whether a CSV file exists for a given languagePath and level
     * @param {string} languagePath
     * @param {string} level
     * @returns {Promise<boolean>} true if any of the candidate paths exists (response.ok)
     */
    async isLevelAvailable(languagePath, level) {
        try {
            const fileNames = [
                `data/languages/${languagePath}/${level}.csv`,
                `data/${languagePath}/${level}.csv`,
                `data/${languagePath}_${level}.csv`,
                `data/${languagePath}-${level}.csv`,
                `data/${level}.csv`
            ];

            for (const filePath of fileNames) {
                try {
                    const response = await fetch(filePath, { method: 'GET' });
                    if (response && response.ok) {
                        return true;
                    }
                } catch (e) {
                    // ignore and try next
                    continue;
                }
            }
            return false;
        } catch (error) {
            console.error('[LanguageLoader] isLevelAvailable error:', error);
            return false;
        }
    }

    /**
     * Load all levels for a language and merge them
     * @param {string} languagePath - Language folder (e.g., 'chinese')
     * @param {Array<string>} levels - Array of levels to load (e.g., ['basic', 'intermediate', 'advanced'])
     * @param {Object} options - Options for loading
     *   - sortBy: 'level' | 'category' | 'none' (default: 'level')
     *   - orderLevel: Array of levels in priority order
     * @returns {Promise<Array>} Merged and sorted array of all vocabulary
     */
    async loadAllLevels(languagePath, levels = ['basic', 'intermediate', 'advanced'], options = {}) {
        const cacheKey = `${languagePath}-all-${levels.join('-')}`;
        
        if (this.languageCache[cacheKey]) {
            return this.languageCache[cacheKey];
        }
        
        try {
            const allData = [];
            const levelOrder = options.orderLevel || levels;
            
            // Load each level
            for (const level of levels) {
                const levelData = await this.loadLevel(languagePath, level);
                allData.push(...levelData);
            }
            
            if (allData.length === 0) {
                throw new Error(`No vocabulary data found for ${languagePath}`);
            }
            
            // Sort if requested
            const sortBy = options.sortBy || 'level';
            if (sortBy === 'level') {
                allData.sort((a, b) => {
                    const levelA = levelOrder.indexOf(a.Level) ?? 999;
                    const levelB = levelOrder.indexOf(b.Level) ?? 999;
                    if (levelA !== levelB) return levelA - levelB;
                    // Secondary sort by category
                    if (a.Category !== b.Category) {
                        return a.Category.localeCompare(b.Category);
                    }
                    // Tertiary sort by word
                    return a.Word.localeCompare(b.Word);
                });
            } else if (sortBy === 'category') {
                allData.sort((a, b) => {
                    if (a.Category !== b.Category) {
                        return a.Category.localeCompare(b.Category);
                    }
                    const levelA = levelOrder.indexOf(a.Level) ?? 999;
                    const levelB = levelOrder.indexOf(b.Level) ?? 999;
                    return levelA - levelB;
                });
            }
            
            this.languageCache[cacheKey] = allData;
            return allData;
        } catch (error) {
            console.error(`[LanguageLoader] Error loading all levels for ${languagePath}:`, error);
            return [];
        }
    }

    /**
     * Get available levels for a language from the matrix index
     * @param {string} language - Language code (e.g., 'zh-CN')
     * @returns {Promise<Array>} Array of available levels
     */
    async getAvailableLevels(language) {
        try {
            const response = await fetch('data/matrix_index.json');
            const matrices = await response.json();
            
            const levels = matrices
                .filter(m => m.language === language)
                .map(m => m.level)
                .filter((v, i, a) => a.indexOf(v) === i); // unique
            
            return levels;
        } catch (error) {
            console.error('[LanguageLoader] Error getting available levels:', error);
            return [];
        }
    }

    /**
     * Check whether a matrix (entry from matrix_index) is available.
     * For merged matrices, require all includeLevels to be present (so 'All Levels' only shows when fully available).
     * For single-file matrices, check that the file exists under data/ or data/languages locations.
     * @param {Object} matrixInfo
     * @returns {Promise<boolean>} whether matrix is available
     */
    async isMatrixAvailable(matrixInfo) {
        try {
            if (!matrixInfo) return false;

            // merged: ensure all levels exist
            if (matrixInfo.type === 'merged' && Array.isArray(matrixInfo.includeLevels)) {
                const languagePath = matrixInfo.languagePath || (matrixInfo.language ? matrixInfo.language.split('-')[0] : 'chinese');
                // require every level present so 'all' matrix is meaningful
                for (const level of matrixInfo.includeLevels) {
                    const ok = await this.isLevelAvailable(languagePath, level);
                    if (!ok) return false;
                }
                return true;
            }

            // single file matrix
            if (matrixInfo.file && typeof matrixInfo.file === 'string') {
                const candidate = `data/${matrixInfo.file}`;
                try {
                    const resp = await fetch(candidate, { method: 'GET' });
                    return !!(resp && resp.ok);
                } catch (e) {
                    return false;
                }
            }

            // If no file and not merged, missing configuration
            return false;
        } catch (error) {
            console.error('[LanguageLoader] isMatrixAvailable error:', error);
            return false;
        }
    }

    /**
     * Clear cache to force reload
     * @param {string} cacheKey - Optional cache key to clear specific item
     */
    clearCache(cacheKey = null) {
        if (cacheKey) {
            delete this.languageCache[cacheKey];
            delete this.levelCache[cacheKey];
        } else {
            this.languageCache = {};
            this.levelCache = {};
        }
        console.log('[LanguageLoader] Cache cleared');
    }
}

// Create singleton instance
export const languageLoader = new LanguageLoader();
