import { parseCSV, groupVocabByCategory, getCategoryConfig, loadMatrixIndex, loadMatrix } from './utils/csvLoader.js';
import { MatrixTableBuilder } from './components/MatrixTableBuilder.js';
import { SentenceDisplay } from './components/SentenceDisplay.js';
import { audioCache } from './utils/audioCache.js';

class JanulusMatrixApp {
    constructor() {
        this.matrixIndex = [];
        this.currentMatrix = null;
        this.currentLevel = 'basic'; // Track current matrix level
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
            
            this.matrixIndex = matrixIndex;
            const configText = await configResponse.text();
            this.categoryConfig = getCategoryConfig(parseCSV(configText));
            
            // Set category config for sentence display
            this.sentenceDisplay.setCategoryConfig(this.categoryConfig);
            
            // Populate matrix selector
            this.populateMatrixSelector();
            
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

    populateMatrixSelector() {
        const select = document.getElementById('matrix-select');
        select.innerHTML = '';
        
        this.matrixIndex.forEach(matrix => {
            const option = document.createElement('option');
            option.value = matrix.id;
            option.textContent = matrix.name;
            select.appendChild(option);
        });
    }

    async loadSelectedMatrix(matrixId) {
        const matrixInfo = this.matrixIndex.find(m => m.id === matrixId);
        if (!matrixInfo) return;
        
        // Show loading state
        document.getElementById('matrix-container').innerHTML = 
            '<div class="loading">Loading matrix</div>';
        
        try {
            const vocabList = await loadMatrix(matrixInfo.file);
            const vocabData = groupVocabByCategory(vocabList);
            
            // Update current level and inform audio system
            this.currentLevel = matrixInfo.level;
            if (window.audioCache) {
                window.audioCache.setCurrentLevel(matrixInfo.level);
            }
            
            // Render the matrix
            this.matrixBuilder.render(vocabData, this.categoryConfig, matrixInfo.level);
            
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new JanulusMatrixApp();
    app.init();
});