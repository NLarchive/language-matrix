import { JanulusMatrixApp } from '../../js/main.js';

// Mock CSV loader and languageLoader used by main
jest.mock('../../js/utils/csvLoader.js', () => ({
    loadMatrixIndex: jest.fn(),
    loadMatrix: jest.fn()
}));

jest.mock('../../js/utils/languageLoader.js', () => ({
    languageLoader: {
        loadAllLevels: jest.fn()
    }
}));

import { loadMatrix } from '../../js/utils/csvLoader.js';
import { languageLoader } from '../../js/utils/languageLoader.js';

describe('JanulusMatrixApp loadSelectedMatrix', () => {
    let app;

    beforeEach(() => {
        // Provide a minimal DOM container the MatrixTableBuilder and SentenceDisplay use
        document.body.innerHTML = `
            <div id="matrix-container"></div>
            <select id="matrix-select"></select>
            <div id="sentence-chinese"></div>
            <div id="sentence-pinyin"></div>
            <div id="sentence-english"></div>
        `;

        app = new JanulusMatrixApp();
        // Replace matrixBuilder and sentenceDisplay with simple mocks to avoid DOM issues
        app.matrixBuilder = { render: jest.fn(), clearSelection: jest.fn() };
        app.sentenceDisplay = { update: jest.fn(), clear: jest.fn(), setCurrentLanguageCallback: jest.fn(), setCategoryConfig: jest.fn() };
    });

    test('throws for misconfigured single-file matrix with null file', async () => {
        const badMatrix = {
            id: 'broken_matrix',
            name: 'Broken',
            file: null,
            language: 'en-US'
        };

        app.matrixIndex = [badMatrix];

        await expect(app.loadSelectedMatrix('broken_matrix')).rejects.toThrow(/missing a valid 'file' or 'includeLevels'/i);
    });

    test('loads merged matrix via languageLoader when type=merged and includeLevels present', async () => {
        const mergedMatrix = {
            id: 'merged_1',
            name: 'Merged Test',
            file: null,
            language: 'en-US',
            languagePath: 'english',
            type: 'merged',
            includeLevels: ['basic', 'intermediate']
        };

        languageLoader.loadAllLevels.mockResolvedValue([{ Category: 'Pronoun', Word: 'I', Level: 'basic' }]);

        app.matrixIndex = [mergedMatrix];

        await expect(app.loadSelectedMatrix('merged_1')).resolves.not.toThrow();
        expect(languageLoader.loadAllLevels).toHaveBeenCalledWith('english', ['basic', 'intermediate'], expect.any(Object));
    });

    test('filterAvailableMatrices keeps only entries with available CSVs or merged data', async () => {
        app = new JanulusMatrixApp();

        // Mock fetch: chinese file exists, spanish file missing
        global.fetch = jest.fn((path, opts) => {
            if (path === 'data/chinese_basic.csv') {
                if (opts && opts.method === 'HEAD') return Promise.resolve({ ok: true, status: 200 });
                return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('Category,Word\nPronoun,我') });
            }
            // anything else - not found
            return Promise.resolve({ ok: false, status: 404 });
        });

        const entries = [
            { id: 'exists', file: 'chinese_basic.csv' },
            { id: 'missing', file: 'languages/spanish/basic.csv' }
        ];

        const filtered = await app.filterAvailableMatrices(entries);
        expect(Array.isArray(filtered)).toBe(true);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('exists');
    });

    test('filterAvailableMatrices keeps merged entries only when languageLoader has data', async () => {
        app = new JanulusMatrixApp();

        const mergedMatrix = {
            id: 'merged_ok',
            type: 'merged',
            includeLevels: ['basic'],
            languagePath: 'english'
        };

        // languageLoader.loadAllLevels returns data => should be included
        languageLoader.loadAllLevels.mockResolvedValueOnce([{ Category: 'Pronoun', Word: 'I' }]);
        let filtered = await app.filterAvailableMatrices([mergedMatrix]);
        expect(filtered).toHaveLength(1);

        // languageLoader.loadAllLevels returns empty => excluded
        languageLoader.loadAllLevels.mockResolvedValueOnce([]);
        filtered = await app.filterAvailableMatrices([mergedMatrix]);
        expect(filtered).toHaveLength(0);
    });
});
