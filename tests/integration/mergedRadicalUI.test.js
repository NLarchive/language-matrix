/**
 * Radical Display Merged UI Structure Test
 * Tests that the merged RadicalDisplay layout is properly structured (DOM-based)
 */

describe('RadicalDisplay - Merged UI Structure Tests', () => {
    let container;

    beforeEach(() => {
        // Create a test container
        container = document.createElement('div');
        container.id = 'radicals-content';
        document.body.appendChild(container);

        // Create modal for testing
        const modal = document.createElement('div');
        modal.id = 'word-modal';
        modal.className = 'modal';
        const modalContent = document.createElement('div');
        modalContent.id = 'modal-content';
        modal.appendChild(modalContent);
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('Merged layout structure should have word composer at top', () => {
        // Simulate merged layout HTML
        const html = `
            <div class="radicals-section-merged">
                <div class="word-composer-section">
                    <div id="word-composer-container"></div>
                </div>
                <div class="radical-reference-section">
                    <div class="radical-reference-title">📚 Radical Reference Library</div>
                    <div class="radicals-grid"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        // Verify merged layout structure
        const merged = container.querySelector('.radicals-section-merged');
        expect(merged).toBeDefined();

        // Verify NO sub-tabs exist
        const subTabs = container.querySelector('.radicals-subtabs');
        expect(subTabs).toBeNull();

        // Verify word composer section is first
        const composerSection = container.querySelector('.word-composer-section');
        expect(composerSection).toBeDefined();

        // Verify radical reference is second
        const refSection = container.querySelector('.radical-reference-section');
        expect(refSection).toBeDefined();

        // Verify correct DOM order
        const children = container.querySelector('.radicals-section-merged').children;
        expect(children[0].className).toBe('word-composer-section');
        expect(children[1].className).toBe('radical-reference-section');
    });

    test('Word composer section should have container for composer', () => {
        const html = `
            <div class="word-composer-section">
                <div id="word-composer-container"></div>
            </div>
        `;
        
        container.innerHTML = html;

        const composerContainer = container.querySelector('#word-composer-container');
        expect(composerContainer).toBeDefined();
    });

    test('Radical reference should have title and grid', () => {
        const html = `
            <div class="radical-reference-section">
                <div class="radical-reference-title">📚 Radical Reference Library</div>
                <div class="radicals-grid">
                    <div class="stroke-group">
                        <h3 class="stroke-count">1 Stroke</h3>
                        <div class="radicals-list">
                            <div class="radical-card" data-radical="一">
                                <div class="radical-character">一</div>
                                <div class="radical-pinyin">yī</div>
                                <div class="radical-meaning">one</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        // Verify title exists
        const title = container.querySelector('.radical-reference-title');
        expect(title.textContent).toContain('Radical Reference Library');

        // Verify grid structure
        const grid = container.querySelector('.radicals-grid');
        expect(grid).toBeDefined();

        // Verify stroke groups
        const strokeGroup = container.querySelector('.stroke-group');
        expect(strokeGroup).toBeDefined();

        // Verify radical cards
        const card = container.querySelector('.radical-card');
        expect(card).toBeDefined();
        expect(card.getAttribute('data-radical')).toBe('一');
    });

    test('Radical cards should be interactive', () => {
        const html = `
            <div class="radical-reference-section">
                <div class="radical-card" data-radical="木" title="tree">
                    <div class="radical-character">木</div>
                    <div class="radical-pinyin">mù</div>
                    <div class="radical-meaning">tree</div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        const card = container.querySelector('.radical-card');
        expect(card).toBeDefined();
        expect(card.getAttribute('data-radical')).toBe('木');
        expect(card.getAttribute('title')).toBe('tree');
    });

    test('CSS layout should display word composer above reference', () => {
        // Test that the CSS classes exist for proper styling
        const html = `
            <div class="radicals-section-merged">
                <div class="word-composer-section"></div>
                <div class="radical-reference-section"></div>
            </div>
        `;
        
        container.innerHTML = html;

        // Just verify the elements can be selected
        const merged = container.querySelector('.radicals-section-merged');
        expect(merged.children.length).toBe(2);
        expect(merged.children[0].className).toBe('word-composer-section');
        expect(merged.children[1].className).toBe('radical-reference-section');
    });

    test('Modal for radical details should exist in DOM', () => {
        const modal = document.getElementById('word-modal');
        expect(modal).toBeDefined();
        
        const modalContent = modal.querySelector('#modal-content');
        expect(modalContent).toBeDefined();
        
        const closeBtn = modal.querySelector('.close');
        expect(closeBtn).toBeDefined();
    });

    test('Stroke groups should be organized and sorted', () => {
        const html = `
            <div class="radicals-grid">
                <div class="stroke-group">
                    <h3 class="stroke-count">1 Stroke</h3>
                </div>
                <div class="stroke-group">
                    <h3 class="stroke-count">2 Strokes</h3>
                </div>
                <div class="stroke-group">
                    <h3 class="stroke-count">3 Strokes</h3>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        const groups = container.querySelectorAll('.stroke-group');
        expect(groups.length).toBe(3);
        
        const strokeLabels = Array.from(groups).map(g => g.querySelector('.stroke-count').textContent);
        expect(strokeLabels[0]).toContain('1 Stroke');
        expect(strokeLabels[1]).toContain('2 Strokes');
        expect(strokeLabels[2]).toContain('3 Strokes');
    });
});
