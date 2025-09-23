import "@testing-library/jest-dom";

// Mock Next.js Response, Request, and Headers
global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || '';
    this.headers = new Headers();
    this.ok = this.status >= 200 && this.status < 300;

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }

  clone() {
    return this;
  }
};

global.Request = class Request {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
  }
};

global.Headers = class Headers {
  constructor(init = {}) {
    this._headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this._headers.set(key.toLowerCase(), value);
      });
    }
  }

  get(name) {
    return this._headers.get(name.toLowerCase()) || null;
  }

  set(name, value) {
    this._headers.set(name.toLowerCase(), value);
  }

  has(name) {
    return this._headers.has(name.toLowerCase());
  }

  forEach(callback) {
    this._headers.forEach((value, key) => callback(value, key));
  }
};

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock crypto.randomUUID for tests
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substr(2, 9),
  },
});

// Mock URL.createObjectURL
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: jest.fn(() => "mocked-object-url"),
});

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve("")),
  },
  writable: true,
  configurable: true,
});

// Also mock for global
global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve("")),
  },
};