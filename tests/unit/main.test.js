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
});
