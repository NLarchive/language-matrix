import { parseCSV, groupVocabByCategory, getCategoryConfig, loadMatrixIndex, loadMatrix } from './utils/csvLoader.js';
import { languageLoader } from './utils/languageLoader.js';
import { MatrixTableBuilder } from './components/MatrixTableBuilder.js';
import { SentenceDisplay } from './components/SentenceDisplay.js';
import { audioCache } from './utils/audioCache.js';

class JanulusMatrixApp {
    constructor() {
        this.matrixIndex = [];
        this.currentMatrix = null;
        this.currentLevel = 'basic'; // Track current matrix level
        this.currentLanguage = 'chinese'; // Track current language
        this.categoryConfig = {};
        this.sentenceDisplay = null;
        this.matrixBuilder = null;
        this.audioCache = audioCache;
    }

    async init() {
        // Expose audioCache globally for use in other modules
        window.audioCache = this.audioCache;
        
        // Register service worker for offline support and caching
        await this.registerServiceWorker();
        // Initialize display component
        this.sentenceDisplay = new SentenceDisplay(
            'sentence-chinese', 
            'sentence-pinyin', 
            'sentence-english',
            () => this.currentLevel // Pass callback to get current level
        );
        // Set language callback for audio paths
        this.sentenceDisplay.setCurrentLanguageCallback(() => this.currentLanguage);
        
        // Initialize matrix builder
        this.matrixBuilder = new MatrixTableBuilder('matrix-container', 
            (selectedWords, categoryOrder) => {
                this.sentenceDisplay.update(selectedWords, categoryOrder);
            }
        );

        try {
            // Load matrix index and category config
            const [matrixIndex, configResponse] = await Promise.all([
                loadMatrixIndex(),
                fetch('data/categories_config.csv')
            ]);
            
            // Normalize matrix index: treat literal 'null'/'undefined' strings as actual null
            this.matrixIndex = matrixIndex.map(mi => {
                if (mi && (mi.file === 'null' || mi.file === 'undefined')) {
                    console.warn(`[JanulusMatrixApp] Normalizing matrix_index entry '${mi.id}': converting file string '${mi.file}' to null`);
                    mi.file = null;
                }
                return mi;
            });

            // Validate loaded matrix index entries and surface misconfigurations early
            const invalidEntries = this.matrixIndex.filter(mi => {
                if (!mi) return true;
                // merged matrices must declare includeLevels
                if (mi.type === 'merged') {
                    return !Array.isArray(mi.includeLevels) || mi.includeLevels.length === 0;
                }
                // single file matrices must provide a valid filename
                if (!mi.file || typeof mi.file !== 'string' || mi.file.trim() === '' || mi.file === 'null' || mi.file === 'undefined') {
                    return true;
                }
                return false;
            });

            if (invalidEntries.length > 0) {
                console.warn('[JanulusMatrixApp] Found misconfigured matrix_index.json entries:', invalidEntries.map(e => e && e.id));
                // keep going — but the error will be thrown when attempting to load an invalid matrix.
            }
            const configText = await configResponse.text();
            this.categoryConfig = getCategoryConfig(parseCSV(configText));
            
            // Set category config for sentence display
            this.sentenceDisplay.setCategoryConfig(this.categoryConfig);
            
            // Populate matrix selector (only show matrices that actually exist on disk)
            await this.populateMatrixSelector();
            
            // Load first matrix by default
            if (this.matrixIndex.length > 0) {
                await this.loadSelectedMatrix(this.matrixIndex[0].id);
            }
            
            // Bind events
            this.bindEvents();
            
        } catch (error) {
            console.error("Failed to initialize:", error);
            this.showError(error.message);
        }
    }

    /**
     * Get language folder path from language code
     * @param {string} languageCode - ISO language code (e.g., 'zh-CN', 'es-ES')
     * @returns {string} Language folder name
     */
    getLanguagePathFromCode(languageCode) {
        const languageMap = {
            'zh-CN': 'chinese',
            'zh-TW': 'chinese',
            'es-ES': 'spanish',
            'es-MX': 'spanish',
            'fr-FR': 'french',
            'de-DE': 'german',
            'ja-JP': 'japanese',
            'ko-KR': 'korean',
            'en-US': 'english',
            'en-GB': 'english'
        };
        return languageMap[languageCode] || languageCode.split('-')[0].toLowerCase();
    }

    async populateMatrixSelector() {
        const select = document.getElementById('matrix-select');
        select.innerHTML = '';

        for (const matrix of this.matrixIndex) {
            try {
                const available = await languageLoader.isMatrixAvailable(matrix);
                if (!available) {
                    console.warn(`[JanulusMatrixApp] Skipping unavailable matrix ${matrix.id}`);
                    continue;
                }

                const option = document.createElement('option');
                option.value = matrix.id;
                option.textContent = matrix.name;
                select.appendChild(option);
            } catch (e) {
                console.warn('[JanulusMatrixApp] Error checking availability for matrix', matrix.id, e);
            }
        }

        // If nothing added, show a friendly placeholder option
        if (select.children.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No matrices available';
            select.appendChild(option);
        }
    }

    async loadSelectedMatrix(matrixId) {
        const matrixInfo = this.matrixIndex.find(m => m.id === matrixId);
        if (!matrixInfo) return;
        
        // Show loading state
        document.getElementById('matrix-container').innerHTML = 
            '<div class="loading">Loading matrix</div>';
        
        try {
            let vocabList;
            
            // Check if this is a merged/all-levels matrix
            if (matrixInfo.type === 'merged' && Array.isArray(matrixInfo.includeLevels) && matrixInfo.includeLevels.length > 0) {
                // Load all specified levels dynamically
                // Use languagePath from config, or derive from language code
                const languagePath = matrixInfo.languagePath || this.getLanguagePathFromCode(matrixInfo.language);
                console.log(`[JanulusMatrixApp] Loading merged matrix for ${languagePath} with levels:`, matrixInfo.includeLevels);
                vocabList = await languageLoader.loadAllLevels(
                    languagePath,
                    matrixInfo.includeLevels,
                    {
                        sortBy: 'level',
                        orderLevel: matrixInfo.includeLevels
                    }
                );
            } else if (matrixInfo.file && typeof matrixInfo.file === 'string' && matrixInfo.file !== 'null' && matrixInfo.file !== 'undefined') {
                // Load single level CSV file
                vocabList = await loadMatrix(matrixInfo.file);
            } else {
                // Misconfigured matrix entry: file is missing or invalid
                throw new Error(`Matrix entry '${matrixInfo.id}' is missing a valid 'file' or 'includeLevels' configuration.`);
            }
            
            const vocabData = groupVocabByCategory(vocabList);
            
            // Update current level and inform audio system
            this.currentLevel = matrixInfo.level;
            this.currentLanguage = matrixInfo.languagePath || this.getLanguagePathFromCode(matrixInfo.language);
            if (window.audioCache) {
                window.audioCache.setCurrentLevel(matrixInfo.level);
                if (typeof window.audioCache.setCurrentLanguage === 'function') {
                    window.audioCache.setCurrentLanguage(this.currentLanguage);
                }
            }
            
            // Render the matrix with language info for audio paths
            this.matrixBuilder.render(vocabData, this.categoryConfig, matrixInfo.level, this.currentLanguage);
            
            // Clear sentence display
            this.sentenceDisplay.clear();
            
        } catch (error) {
            console.error("Failed to load matrix:", error);
            this.showError(`Failed to load ${matrixInfo.name}`);
        }
    }

    bindEvents() {
        // Matrix selector change
        document.getElementById('matrix-select').addEventListener('change', (e) => {
            this.loadSelectedMatrix(e.target.value);
        });
        
        // Play sentence button
        document.getElementById('play-sentence-btn').addEventListener('click', () => {
            this.sentenceDisplay.playSentence();
        });
        
        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.matrixBuilder.clearSelection();
            this.sentenceDisplay.clear();
        });
    }

    showError(message) {
        document.getElementById('matrix-container').innerHTML = `
            <div style="text-align:center; padding: 40px; color: #dc3545;">
                <p style="font-size: 18px; margin-bottom: 12px;">⚠️ Error</p>
                <p>${message}</p>
                <p style="margin-top: 12px; color: #6c757d; font-size: 14px;">
                    Make sure you're running this on a local server.
                </p>
            </div>
        `;
    }

    /**
     * Register service worker for offline support and caching
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./service-worker.js');
                console.log('[App] Service Worker registered:', registration);
                
                // Check for updates periodically
                setInterval(() => {
                    registration.update().catch(error => {
                        console.warn('[App] Service Worker update check failed:', error);
                    });
                }, 60000); // Check every minute
                
            } catch (error) {
                console.warn('[App] Service Worker registration failed:', error);
            }
        }
    }
}
// Export the class for unit tests
export { JanulusMatrixApp };

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new JanulusMatrixApp();
    app.init();
});