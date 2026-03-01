/**
 * Jest Setup File
 * Configures mocks and global setup for all tests
 */

import 'fake-indexeddb/auto';

// Mock Service Worker
global.ServiceWorkerRegistration = class {
    constructor() {
        this.installing = null;
        this.waiting = null;
        this.active = null;
        this.scope = '';
    }
    update() { return Promise.resolve(); }
};

// Mock navigator.serviceWorker - basic setup, Jest mocks added in tests
Object.defineProperty(global.navigator, 'serviceWorker', {
    value: {
        register: () => Promise.resolve(new ServiceWorkerRegistration()),
        ready: Promise.resolve(new ServiceWorkerRegistration()),
        controller: null,
        getRegistrations: () => Promise.resolve([]),
        addEventListener: () => {},
        removeEventListener: () => {}
    },
    writable: true
});

// Mock caches API - basic setup
global.caches = {
    open: () => Promise.resolve({
        match: () => Promise.resolve(null),
        put: () => Promise.resolve(undefined),
        delete: () => Promise.resolve(true),
        keys: () => Promise.resolve([])
    }),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: () => Promise.resolve(null)
};

// Mock Request and Response classes for Service Worker testing
global.Request = class {
    constructor(url, options = {}) {
        this.url = url;
        this.method = options.method || 'GET';
        this.headers = options.headers || {};
        this.mode = options.mode || 'cors';
        this.cache = options.cache || 'default';
    }
    clone() {
        return new Request(this.url, {
            method: this.method,
            headers: this.headers,
            mode: this.mode,
            cache: this.cache
        });
    }
};

global.Response = class {
    constructor(body, options = {}) {
        this.body = body;
        this.ok = options.ok !== false;
        this.status = options.status || 200;
        this.statusText = options.statusText || 'OK';
        this.headers = options.headers || {};
        this.type = options.type || 'basic';
    }
    blob() {
        return Promise.resolve(new Blob([this.body], { type: 'application/octet-stream' }));
    }
    json() {
        return Promise.resolve(JSON.parse(this.body || '{}'));
    }
    text() {
        return Promise.resolve(this.body || '');
    }
    clone() {
        return new Response(this.body, {
            ok: this.ok,
            status: this.status,
            statusText: this.statusText,
            headers: this.headers,
            type: this.type
        });
    }
};

// Mock fetch - basic setup
global.fetch = () => Promise.resolve({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(['test'], { type: 'audio/mpeg' })),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    clone: function() { return this; }
});

// Mock Audio
global.Audio = class {
    constructor(src) {
        this.src = src;
        this.paused = true;
        this.currentTime = 0;
        this.duration = 1;
        this.volume = 1;
        this.onended = null;
        this.onerror = null;
        this.oncanplaythrough = null;
    }
    play() { 
        this.paused = false;
        return Promise.resolve(); 
    }
    pause() { 
        this.paused = true; 
    }
    load() {}
    addEventListener(event, handler) {
        if (event === 'ended') this.onended = handler;
        if (event === 'error') this.onerror = handler;
        if (event === 'canplaythrough') this.oncanplaythrough = handler;
    }
    removeEventListener() {}
};

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = (blob) => 'blob:mock-url';
global.URL.revokeObjectURL = () => {};

// Mock console methods for cleaner test output (optional)
// Uncomment to suppress console output during tests
// global.console = {
//     ...console,
//     log: jest.fn(),
//     info: jest.fn(),
//     warn: jest.fn(),
//     error: jest.fn()
// };

// Clean up after each test
afterEach(() => {
    // Reset any global state if needed
});
