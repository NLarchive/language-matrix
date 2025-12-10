# Janulus Matrix - Multi-Language Learning System
https://nlarchive.github.io/language-matrix/

[![CI](https://github.com/NLarchive/language-matrix/workflows/CI/badge.svg)](https://github.com/NLarchive/language-matrix/actions)

A progressive web application (PWA) for learning **Chinese, Japanese, and Korean** vocabulary with interactive matrix selection, radical/component decomposition, word composition games, and integrated audio playback. Designed for offline-first functionality with comprehensive caching for educational deployment.

## Quick Start

**Live Demo**: https://nlarchive.github.io/language-matrix/

**Features at a Glance**:
- 🗣️ **3 Languages**: Chinese (Mandarin), Japanese (Hiragana+Kanji), Korean (Hangul)
- 📚 **567 Words**: 64-72 words per language across 3 proficiency levels
- 🎮 **Word Composer Game**: Drag-and-drop word building from radicals/components
- 🔊 **100% Audio Coverage**: 567 TTS audio files (MP3)
- 📱 **Offline-First PWA**: Works completely offline after first load
- 🎨 **Interactive Matrix**: Color-coded by grammar categories
- ♿ **Accessible**: Touch-friendly, keyboard shortcuts, high contrast

## Features

### Core Functionality
- **Interactive Vocabulary Matrix**: Select words from organized categories across three proficiency levels
  - **Chinese (Mandarin)**
    - Basic (HSK 1-2): 64 words
    - Intermediate (HSK 3-4): 72 words
    - Advanced (HSK 5-6): 65 words
  - **Japanese (Hiragana + Kanji)**
    - Basic: 60 words
    - Intermediate: 66 words
    - Advanced: 61 words
  - **Korean (Hangul)**
    - Basic: 53 words
    - Intermediate: 64 words
    - Advanced: 62 words
- **Sentence Generation**: Creates sentences combining selected words with native script, romanization, and English translations
- **Color-Coded Display**: Each word in sentences is colored by grammatical category for visual learning
- **Audio Playback**: Sequential audio playback of selected words with automatic synchronization
- **Multilingual Display**: Native characters, Pinyin/Romanization, and English translations

### Offline & Caching
- **Service Worker**: Complete offline functionality with intelligent request routing
  - Cache-first for audio files (minimize network usage)
  - Stale-while-revalidate for data files (quick load with background updates)
  - Network-first for HTML (always get latest content)
- **Three-Layer Caching Architecture**:
  1. **Memory Cache**: Instant retrieval for recently accessed audio
  2. **Cache API**: Browser-level persistent storage (30-day expiration)
  3. **Network Fallback**: Original content with 30-second timeout
- **IndexedDB Integration**: Optional persistent storage for extended sessions
- **Cache Management UI**: Access via `Ctrl+Shift+C` to view/clear cached audio

### Mobile & Accessibility
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **High Contrast**: Automatic text color calculation for optimal readability on category headers
- **Touch-Friendly UI**: Large tap targets and swipe-friendly interactions
- **PWA Support**: Installable on home screen (iOS/Android)
- **Keyboard Shortcuts**: 
  - `Ctrl+Shift+C`: Open cache management console
  - `Escape`: Clear selection and sentence display

## Technical Architecture

### Stack
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **Caching**: Service Workers, Cache API, IndexedDB
- **Data Format**: CSV for vocabulary, JSON for configuration
- **Audio Format**: MP3 128kbps (normalized at -0.5 to -0.6 dBFS)

### File Structure
```
web_v3/
├── index.html                    # Main application entry
├── favicon.svg                   # PWA icon
├── service-worker.js             # Offline support & caching (340+ lines)
├── css/
│   ├── style.css                # Main layout styles
│   └── matrix_table.css          # Matrix table styling
├── js/
│   ├── main.js                  # Application bootstrap (152 lines)
│   ├── components/
│   │   ├── MatrixTableBuilder.js # Renders vocabulary matrix
│   │   └── SentenceDisplay.js    # Displays and plays sentences
│   └── utils/
│       ├── csvLoader.js          # CSV parsing & vocabulary loading
│       ├── audioCache.js         # Three-layer audio caching
│       └── cacheManager.js       # Cache management utilities
├── data/
│   ├── chinese_basic.csv         # 39 basic-level words
│   ├── chinese_intermediate.csv  # 63 intermediate-level words
│   ├── chinese_advanced.csv      # 62 advanced-level words
│   ├── categories_config.csv     # Category metadata & styling
│   ├── matrix_index.json         # Matrix definitions
│   └── vocab.csv                 # Consolidated vocabulary reference
└── assets/
    └── audio/
        ├── basic/                # 39 MP3 files (hanzi.mp3)
        ├── intermediate/         # 63 MP3 files
        └── advanced/             # 62 MP3 files
```

### Cache Strategy Details

**Audio Files** (`/assets/audio/`)
- Strategy: Cache-first with background updates
- Cache Name: `janulus-audio-v1`
- Path Matching: Flexible (handles with/without leading slashes)
- Size Limit: ~1.74 MB for 164 files
- Expiration: 30 days (Cache API)

**Static Assets** (CSS, JS, SVG)
- Strategy: Cache-first with network fallback
- Cache Name: `janulus-matrix-v1`
- Caching: On service worker install
- Update: Service worker detects new versions every 60 seconds

**Data Files** (CSV, JSON)
- Strategy: Stale-while-revalidate
- Returns cached version immediately, updates in background
- Ensures latest content while maintaining responsiveness

**HTML Pages**
- Strategy: Network-first with cache fallback
- Always attempts to fetch latest HTML
- Falls back to cached version if offline

### Service Worker Versioning

The service worker uses semantic versioning for cache management:
- Cache names include version (e.g., `janulus-matrix-v1`, `janulus-audio-v1`)
- Old versioned caches are automatically deleted on activation
- Supports multiple simultaneous versions (important for distributed deployments)

## Installation & Setup

### Requirements
- HTTPS connection (required for service workers)
- Modern browser with Service Worker support
  - Chrome 40+
  - Firefox 44+
  - Safari 11.1+
  - Edge 17+

### Deployment Steps

#### 1. On Shared Hosting (nlarchive.com)

```bash
# Upload directory structure
# Target: /public_html/learn/chinese/web_v3/

# All files must be served from HTTPS
# Verify: https://nlarchive.com/learn/chinese/web_v3/
```

#### 2. HTTPS Configuration

Service Workers require HTTPS. Verify your hosting supports:
- SSL/TLS certificate (Let's Encrypt recommended)
- HTTPS redirect from HTTP
- Proper CORS headers if needed

```nginx
# Example Nginx configuration
server {
    listen 443 ssl http2;
    server_name nlarchive.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Force HTTPS for all requests
    location /learn/chinese/web_v3/ {
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 3. Directory Permissions

```bash
# Set proper permissions for web files
chmod 755 /public_html/learn/chinese/web_v3/
chmod 644 /public_html/learn/chinese/web_v3/*
chmod 644 /public_html/learn/chinese/web_v3/data/*
chmod 644 /public_html/learn/chinese/web_v3/assets/audio/*/*
```

#### 4. Verification Checklist

```
✓ Service worker file present: service-worker.js
✓ Audio files present: assets/audio/{basic,intermediate,advanced}/*.mp3
✓ Data files present: data/*.csv, data/*.json
✓ HTTPS enabled on domain
✓ Service worker registered in browser DevTools
✓ Audio caching working (check Application > Cache Storage)
```

## Usage

### Basic Operation
1. Open application in browser: `https://nlarchive.com/learn/chinese/web_v3/`
2. Select proficiency level from dropdown (Basic/Intermediate/Advanced)
3. Click words in matrix to build a sentence
4. View Chinese/Pinyin/English translation below
5. Click word buttons to play audio pronunciation

### Cache Management
- **View Cache**: Press `Ctrl+Shift+C` to open cache console
- **Clear Audio Cache**: Removes cached audio files (downloads on next playback)
- **Clear All Cache**: Resets application cache completely
- **Cache Size**: Shows total audio file count and storage used

### Offline Mode
1. Once audio files are cached, application works fully offline
2. To trigger offline mode for testing:
   - DevTools > Application > Service Workers
   - Check "Offline" checkbox
   - Application continues to function

## Troubleshooting

### Service Worker Won't Register
**Issue**: "Service Worker registration failed"
- **Solution**: Verify HTTPS is enabled. Service Workers only work over HTTPS.
- **Verification**: Check address bar for padlock icon

### Audio Files Not Playing
**Issue**: Silence or 503 errors in console
- **Solution 1**: Check audio file exists: `assets/audio/{level}/{hanzi}.mp3`
- **Solution 2**: Clear cache: `Ctrl+Shift+C` → "Clear All Cache"
- **Solution 3**: Verify browser allows audio autoplay (settings required)

### Cache Not Building
**Issue**: Files not appearing in DevTools > Cache Storage
- **Solution 1**: Refresh page and wait 5-10 seconds
- **Solution 2**: Check if browser cache quota exceeded
- **Solution 3**: Check console for errors: `F12` → Console tab

### Slow Load Times
**Issue**: Initial page load takes 10+ seconds
- **Expected**: First load caches all assets. Subsequent loads are instant.
- **Solution**: Ensure stable internet connection for initial load

### Matrix Doesn't Load
**Issue**: "Failed to load matrix" error
- **Solution 1**: Verify CSV files in `data/` directory
- **Solution 2**: Check browser console for specific error message
- **Solution 3**: Clear browser cache and reload

## Performance Metrics

### Load Times
- **First Load**: 3-5 seconds (caching all assets)
- **Subsequent Loads**: <500ms (from cache)
- **Offline Mode**: <100ms (memory cache)

### Storage Usage
- **Total Audio**: 1.74 MB (164 files × ~10.6 KB average)
- **Static Assets**: ~200 KB
- **Data Files**: ~50 KB
- **Total**: ~2 MB (well within typical 50-100 MB quota)

### Browser Compatibility
| Browser | Version | Service Worker | Cache API | IndexedDB |
|---------|---------|---|---|---|
| Chrome | 40+ | ✓ | ✓ | ✓ |
| Firefox | 44+ | ✓ | ✓ | ✓ |
| Safari | 11.1+ | ✓ | ✓ | ✓ |
| Edge | 17+ | ✓ | ✓ | ✓ |
| iOS Safari | 11.3+ | ✓ | ✓ | ✓ |
| Chrome Mobile | 40+ | ✓ | ✓ | ✓ |

## API Reference

### Window API (Global Objects)

#### window.audioCache
Audio caching utility with three-layer fallback
```javascript
// Get audio blob for a word
const blob = await window.audioCache.getAudio('assets/audio/basic/你.mp3', 'basic');

// Preload entire level
await window.audioCache.preloadLevel('basic', hanziArray);

// Get cache statistics
const stats = await window.audioCache.getCacheStats();
```

#### Service Worker Message API
```javascript
// Get current version
navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });

// Clear audio cache
navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUDIO_CACHE' });

// Clear all caches
navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL_CACHE' });

// Get cache size
navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_SIZE' });
```

## Development & Maintenance

### Adding New Vocabulary
1. Add entries to appropriate CSV file:
   - `data/chinese_basic.csv`
   - `data/chinese_intermediate.csv`
   - `data/chinese_advanced.csv`
2. Place audio file: `assets/audio/{level}/{hanzi}.mp3`
3. Update `data/matrix_index.json` if adding new categories
4. Service worker will automatically cache new files

### Updating Cache Strategy
Edit `service-worker.js`:
- Modify `cacheFirst()`, `networkFirst()`, `staleWhileRevalidate()` for different behavior
- Update `STATIC_ASSETS` array when adding new files
- Increment `CACHE_VERSION` for forcing cache refresh

### Testing Offline Functionality
```javascript
// In browser console:
// 1. View registered service worker
navigator.serviceWorker.getRegistrations();

// 2. Trigger offline mode
// DevTools > Application > Service Workers > Check "Offline"

// 3. Clear specific cache
caches.delete('janulus-audio-v1');

// 4. List all cached URLs
caches.keys().then(names => {
    names.forEach(name => {
        caches.open(name).then(cache => {
            cache.keys().then(requests => {
                console.log(name, requests);
            });
        });
    });
});
```

## Deployment Checklist

- [ ] HTTPS enabled on target domain
- [ ] All 164 audio files present in `assets/audio/`
- [ ] All CSV and JSON files present in `data/`
- [ ] `service-worker.js` registered successfully
- [ ] Cache API working (DevTools > Cache Storage shows entries)
- [ ] Audio playback functional for all three levels
- [ ] Matrix renders without errors
- [ ] Offline mode tested (DevTools > Offline)
- [ ] Mobile responsiveness verified
- [ ] Keyboard shortcuts working (`Ctrl+Shift+C`)
- [ ] No console errors on initial load

## Browser Support Summary

✓ **Fully Supported**: Chrome, Firefox, Safari 11.1+, Edge 17+
⚠️ **Limited Support**: IE 11 (no Service Workers)
✓ **Mobile**: iOS 11.3+, Android 5+

## License & Attribution

Educational tool for Chinese language learning. Audio files created via text-to-speech processing and normalized for consistent playback.

## Development

### CSV Schema Validation

The project includes automated validation for CSV data files to ensure schema compliance. This runs automatically in CI and can be run locally.

#### Running Locally
```bash
# Validate all CSV files against schema
node tools/validate-csv-schema.js
```

#### Fixing Schema Violations
If validation fails:
1. Check the error messages for specific issues (missing columns, invalid headers)
2. Edit the affected CSV files in `data/languages/` or `data/`
3. Ensure headers match the canonical schema in `data/csv-schema.json`
4. Re-run validation: `node tools/validate-csv-schema.js`

#### In Pull Requests
- CI will automatically validate CSV schema on push/PR
- If validation fails, the PR cannot be merged
- Fix locally and push again, or request help from maintainers

#### Adding New Languages/Data
When adding new CSV files:
1. Ensure headers match `data/csv-schema.json`
2. Test locally: `node tools/validate-csv-schema.js`
3. Commit and push to trigger CI validation

## Support & Feedback

For issues, feature requests, or improvements:
1. Check troubleshooting section above
2. Verify all files present and HTTPS enabled
3. Clear cache and perform full page reload
4. Check browser console for specific error messages

## Version History

**v1.0.0** (Production Release)
- Complete offline functionality with Service Workers
- Three-layer caching architecture (Memory → Cache API → Network)
- Support for 164 audio files across 3 proficiency levels
- Interactive vocabulary matrix with sentence generation
- Mobile PWA support
- Production-ready error handling and logging
- Comprehensive deployment documentation

---

**Last Updated**: 2024
**Status**: Production Ready ✓
