# Janulus Matrix Test Suite

Comprehensive test suite for the Janulus Matrix Chinese Language Learning Application.

## 🧪 Test Structure

```
tests/
├── unit/                      # Unit tests for individual modules
│   ├── csvLoader.test.js      # CSV parsing and data loading
│   ├── audioCache.test.js     # 3-layer audio caching system
│   └── serviceWorker.test.js  # Service worker URL handling (CRITICAL)
├── integration/               # Integration tests
│   └── audioSystem.test.js    # Audio path resolution, data flow
├── e2e/                       # Playwright end-to-end tests
│   └── matrix.spec.js         # Full application flow tests
├── setup/
│   └── jest.setup.js          # Jest mocks and setup
├── package.json               # Test dependencies and scripts
└── playwright.config.js       # Playwright configuration
```

## 🚀 Quick Start

### Install Dependencies

```bash
cd tests
npm install
npx playwright install  # Install browser binaries for E2E tests
```

### Run Tests

```bash
# Run all unit and integration tests
npm test

# Run with watch mode (re-runs on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run E2E tests (requires local server)
npm run test:e2e

# Run E2E tests with browser visible
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run all tests (unit + integration + E2E)
npm run test:all
```

## 🐛 Bug Prevention

### URL Construction Bug (Fixed)

This test suite specifically prevents a critical bug that was found:

**The Bug:**
```javascript
// In service-worker.js handleAudioRequest()
const altRequest = new Request(url.origin + path);
// When path = "chinese-matrix/assets/audio/basic/我.mp3" (no leading slash)
// Result: "http://localhost:8000chinese-matrix/..." = INVALID URL!
```

**The Error:**
```
TypeError: Failed to construct 'Request': Failed to parse URL from 
http://localhost:8000chinese-matrix-lenguage-learn/web_v3/assets/audio/basic/呢.mp3
```

**The Fix:**
```javascript
const normalizedPath = path.startsWith('/') ? path : '/' + path;
const altRequest = new Request(url.origin + normalizedPath);
```

**Tests that prevent this:**
- `serviceWorker.test.js` - "Path Normalization" suite
- `audioCache.test.js` - "URL Construction Bug Prevention" suite
- `matrix.spec.js` - "Console Error Monitoring" E2E tests

## 📋 Test Categories

### Unit Tests

| File | What it tests |
|------|--------------|
| `csvLoader.test.js` | CSV parsing, vocabulary grouping, category config |
| `audioCache.test.js` | IndexedDB, Cache API, path normalization, timeout handling |
| `serviceWorker.test.js` | URL construction, caching strategies, Chinese character handling |

### Integration Tests

| File | What it tests |
|------|--------------|
| `audioSystem.test.js` | CSV → audio path mapping, sentence generation, cache consistency |

### E2E Tests

| Test Suite | What it tests |
|------------|--------------|
| Matrix Application | Page loading, level selection, matrix display |
| Word Selection | Clicking words, sentence display |
| Audio Functionality | Audio elements and playback |
| Offline Support | Service worker registration, cache population |
| Error Handling | Console errors, URL construction errors |

## 🔧 Configuration

### Jest Configuration

Located in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/setup/jest.setup.js"],
    "coverageThreshold": {
      "global": {
        "branches": 50,
        "functions": 50,
        "lines": 50,
        "statements": 50
      }
    }
  }
}
```

### Playwright Configuration

Located in `playwright.config.js`:

- Tests against Chromium, Firefox, and WebKit
- Runs local server automatically
- Screenshots on failure
- Trace collection on retry

## 📊 Coverage Report

After running `npm run test:coverage`, view the report:

- **Terminal**: Summary printed after tests
- **HTML**: Open `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info` for CI integration

## 🔄 Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./web_v3/tests
        run: npm ci
      
      - name: Run unit tests
        working-directory: ./web_v3/tests
        run: npm run test:coverage
      
      - name: Install Playwright browsers
        working-directory: ./web_v3/tests
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        working-directory: ./web_v3/tests
        run: npm run test:e2e
```

## 🧩 Adding New Tests

### Adding a Unit Test

1. Create file in `tests/unit/myModule.test.js`
2. Import the module to test
3. Write tests using Jest syntax

```javascript
describe('MyModule', () => {
    test('should do something', () => {
        expect(myFunction()).toBe(expectedValue);
    });
});
```

### Adding an E2E Test

1. Add to `tests/e2e/matrix.spec.js` or create new spec file
2. Use Playwright syntax

```javascript
test('should display correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.element')).toBeVisible();
});
```

## ⚠️ Important Notes

1. **ES Modules**: Tests use native ES modules. Run with `--experimental-vm-modules` flag (already configured in npm scripts).

2. **Browser APIs**: The setup file mocks browser APIs (fetch, caches, Audio, etc.) for unit tests.

3. **IndexedDB**: Uses `fake-indexeddb` for testing without a real browser.

4. **Chinese Characters**: Tests include Chinese character handling to ensure proper encoding.

5. **Path Normalization**: Multiple tests verify path normalization to prevent the URL construction bug.

## 📝 Troubleshooting

### "Cannot use import statement outside a module"
Ensure `"type": "module"` is in package.json and use the configured npm scripts.

### E2E tests failing to connect
Start the local server first, or ensure `webServer` in playwright.config.js is correct.

### IndexedDB errors in tests
Make sure `fake-indexeddb/auto` is imported before the module under test.
