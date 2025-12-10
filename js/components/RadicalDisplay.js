/**
 * Radical Display Component - Merged Version
 * Shows radical information organized by stroke count
 * Includes integrated word composer game for building words from radicals
 * Single unified interface with radical reference and interactive word builder
 */

import { WordComposer } from './WordComposer.js';

export class RadicalDisplay {
    constructor(containerId, radicalLoader = null) {
        this.container = document.getElementById(containerId);
        this.radicalLoader = radicalLoader;
        this.currentLanguage = 'chinese';
        this.currentLevel = 'basic';
        this.radicals = [];
        this.wordComposer = null;
    }

    /**
     * Set the radical loader instance
     * @param {RadicalLoader} loader - RadicalLoader instance
     */
    setRadicalLoader(loader) {
        this.radicalLoader = loader;
    }

    /**
     * Set current language for loading radicals
     * @param {string} language - Language path (e.g., 'chinese')
     */
    setLanguage(language) {
        this.currentLanguage = language;
    }

    /**
     * Set current level for word composer and re-render radical reference
     * @param {string} level - Level ('basic', 'intermediate', 'advanced', 'all_levels')
     */
    setLevel(level) {
        console.log(`[RadicalDisplay.setLevel] Setting level to: ${level}`);
        this.currentLevel = level;
        if (this.wordComposer) {
            this.wordComposer.setLevel(level);
        }
        // Only re-render if we have radicals loaded (not during initial load)
        if (this.radicals && this.radicals.length > 0) {
            console.log(`[RadicalDisplay.setLevel] Re-rendering radical reference for level ${level}`);
            // Re-render radical reference to show only radicals for this level
            this.renderRadicalReference().then(radicalRefHtml => {
                const radicalRefSection = this.container?.querySelector('.radical-reference-section');
                if (radicalRefSection) {
                    radicalRefSection.innerHTML = radicalRefHtml;
                    // Re-add click handlers for new radical cards
                    this.container?.querySelectorAll('.radical-card').forEach(card => {
                        card.addEventListener('click', () => {
                            const radicalChar = card.dataset.radical;
                            const radical = this.radicals.find(r => r.Radical === radicalChar);
                            if (radical) {
                                this.showRadicalDetail(radical);
                            }
                        });
                    });
                }
            });
        } else {
            console.warn(`[RadicalDisplay.setLevel] Cannot re-render - no radicals loaded yet`);
        }
    }

    /**
     * Render merged radicals interface with word composer at top
     * @param {Array} radicals - Array of radical objects
     */
    async render(radicals) {
        this.radicals = radicals || [];
        console.log(`[RadicalDisplay.render] Rendering with ${this.radicals.length} radicals, level=${this.currentLevel}`);
        
        if (!this.container) return;
        
        // Create main merged layout
        const radicalRefHtml = await this.renderRadicalReference();
        let html = `
            <div class="radicals-section-merged">
                <!-- Word Composer Canvas at Top -->
                <div class="word-composer-section"><div id="word-composer-container"></div></div>
                
                <!-- Radical Reference Below -->
                <div class="radical-reference-section">
                    ${radicalRefHtml}
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Add click handlers for radical cards to show details
        this.container.querySelectorAll('.radical-card').forEach(card => {
            card.addEventListener('click', () => {
                const radicalChar = card.dataset.radical;
                const radical = this.radicals.find(r => r.Radical === radicalChar);
                if (radical) {
                    this.showRadicalDetail(radical);
                }
            });
        });
        
        // Initialize word composer for all languages (use radicalLoader fallbacks if radicals.csv missing)
        this.initWordComposer();
    }

    /**
     * Render the radical reference grid below word composer
     */
    async renderRadicalReference() {
        // Get radicals filtered by current level
        const filteredRadicals = await this.getFilteredRadicals();
        const debugMsg = `[RadicalDisplay.renderRadicalReference] Got ${filteredRadicals.length} filtered radicals for level ${this.currentLevel}`;
        console.log(debugMsg);
        
        if (!filteredRadicals || filteredRadicals.length === 0) {
            console.warn(`[RadicalDisplay.renderRadicalReference] No radicals found for level ${this.currentLevel}`);
            return `
                <div class="no-data">
                    <p>No radicals available for this level.</p>
                    <p class="no-data-hint">Try selecting a different level or "All Levels".</p>
                    <p style="font-size: 12px; color: #999; margin-top: 10px;">${debugMsg}</p>
                </div>
            `;
        }

        // Group by stroke count using radicalLoader if available
        let grouped;
        if (this.radicalLoader) {
            // Get grouped radicals and filter by our filtered set
            const allGrouped = this.radicalLoader.getRadicalsGroupedByStroke(this.currentLanguage);
            grouped = {};
            const filteredSet = new Set(filteredRadicals.map(r => r.Radical));
            
            Object.entries(allGrouped).forEach(([strokeCount, radicals]) => {
                const filtered = radicals.filter(r => filteredSet.has(r.Radical));
                if (filtered.length > 0) {
                    grouped[strokeCount] = filtered;
                }
            });
        } else {
            grouped = { 'All': filteredRadicals };
        }

        // Sort stroke counts numerically
        const sortedGroups = Object.keys(grouped)
            .sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (isNaN(numA)) return 1;
                if (isNaN(numB)) return -1;
                return numA - numB;
            });

        let html = `
            <div class="radical-reference-title">📚 Radical Reference Library (${this.currentLevel === 'all_levels' ? 'All Levels' : this.currentLevel.charAt(0).toUpperCase() + this.currentLevel.slice(1)})</div>
            <div class="radicals-grid">
        `;
        
        sortedGroups.forEach(strokeCount => {
            const strokeLabel = strokeCount === 'other' ? 'Other' : `${strokeCount} Stroke${strokeCount !== '1' ? 's' : ''}`;
            
            html += `
                <div class="stroke-group">
                    <h3 class="stroke-count">${strokeLabel}</h3>
                    <div class="radicals-list">
            `;
            
            grouped[strokeCount].forEach(radical => {
                html += this.createRadicalCard(radical);
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Get radicals filtered by current level
     * 
     * radicals.csv now includes a 'Levels' column that lists which vocabulary
     * levels use each radical (e.g., 'basic,intermediate').
     * 
     * For 'all_levels': Return all radicals from radicals.csv
     * For specific levels: Return radicals where 'Levels' includes that level
     */
    async getFilteredRadicals() {
        // Ensure we have radicals loaded from radicals.csv
        if (!this.radicals || this.radicals.length === 0) {
            console.warn(`[RadicalDisplay.getFilteredRadicals] No radicals loaded yet`);
            return [];
        }

        // If 'all_levels', show all radicals
        if (this.currentLevel === 'all_levels') {
            console.log(`[RadicalDisplay.getFilteredRadicals] Level is 'all_levels' - returning all ${this.radicals.length} radicals`);
            return this.radicals;
        }
        
        // Filter by the Levels column in radicals.csv
        const filtered = this.radicals.filter(r => {
            const levels = (r.Levels || '').split(',').map(l => l.trim());
            return levels.includes(this.currentLevel);
        });
        
        console.log(`[RadicalDisplay.getFilteredRadicals] Level '${this.currentLevel}': ${filtered.length} radicals`);
        return filtered;
    }

    /**
     * Initialize the Word Composer game integrated at top
     */
    async initWordComposer() {
        const composerContainer = this.container.querySelector('#word-composer-container');
        if (!composerContainer || !this.radicalLoader) return;
        
        this.wordComposer = new WordComposer('word-composer-container', this.radicalLoader);
        await this.wordComposer.init(this.currentLanguage, this.currentLevel);
    }

    /**
     * Create a radical card HTML - clickable for more info, draggable for composer
     * @param {Object} radical - Radical object
     * @returns {string} HTML string
     */
    createRadicalCard(radical) {
        const meaning = radical.Meaning || '';
        const shortMeaning = meaning.length > 20 ? meaning.substring(0, 20) + '...' : meaning;
        
        return `
            <div class="radical-card" draggable="true" data-radical="${radical.Radical}" title="${meaning}">
                <div class="radical-character">${radical.Radical}</div>
                <div class="radical-pinyin">${radical.Pinyin || radical.Reading || radical.Romanization || ''}</div>
                <div class="radical-meaning">${shortMeaning}</div>
            </div>
        `;
    }

    /**
     * Show detailed information about a radical in modal
     * @param {Object} radical - Radical object
     */
    showRadicalDetail(radical) {
        const modal = document.getElementById('word-modal');
        const modalContent = document.getElementById('modal-content');
        
        if (!modal || !modalContent) {
            console.warn('[RadicalDisplay] Modal not found');
            return;
        }

        // Build set label
        let setLabel = 'Official Kangxi Radical';
        if (radical.Set === 'variant') {
            setLabel = `Variant Form${radical.MainRadical ? ' of ' + radical.MainRadical : ''}`;
        } else if (radical.Set === 'component') {
            setLabel = 'Character Component';
        }
        
        // Traditional form display
        const traditionalHtml = (radical.Traditional && radical.Traditional !== radical.Radical) 
            ? `<div class="detail-item">
                    <span class="detail-label">Traditional:</span>
                    <span class="detail-value">${radical.Traditional}</span>
               </div>` 
            : '';

        modalContent.innerHTML = `
            <div class="radical-detail">
                <div class="radical-detail-char">${radical.Radical}</div>
                <div class="radical-detail-pinyin">${radical.Pinyin || radical.Reading || radical.Romanization || ''}</div>
                <div class="radical-set-badge ${radical.Set || 'unknown'}">${setLabel}</div>
                
                <div class="radical-detail-info">
                    <div class="detail-item">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${radical.Description || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Meaning:</span>
                        <span class="detail-value">${radical.Meaning || 'N/A'}</span>
                    </div>
                    ${traditionalHtml}
                    <div class="detail-item">
                        <span class="detail-label">Used in levels:</span>
                        <span class="detail-value">${radical.Levels || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="radical-usage-hint">
                    <p>${radical.Set === 'kangxi_214' 
                        ? 'This is an official Kangxi radical. Look for it as a component when learning new characters!' 
                        : radical.Set === 'variant'
                        ? 'This is a variant form used when the radical appears as a component in characters.'
                        : 'This character component is used in word decomposition for learning purposes.'}</p>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        
        // Close modal handlers
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    /**
     * Clear the display
     */
    clear() {
        this.container.innerHTML = '<div class="loading">Loading radicals</div>';
    }
}
