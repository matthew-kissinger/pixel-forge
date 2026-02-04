import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for React Flow
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock scrollTo
Element.prototype.scrollTo = () => {};

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = () => ({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 100,
  x: 0,
  y: 0,
  toJSON: () => {},
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock global Image constructor for test environment
class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  src: string = '';
  width: number = 100;
  height: number = 100;
  naturalWidth: number = 100;
  naturalHeight: number = 100;

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

// Mock canvas and context for test environment
class MockCanvasRenderingContext2D {
  canvas: MockHTMLCanvasElement;
  fillStyle: string = '';
  strokeStyle: string = '';
  lineWidth: number = 1;

  constructor(canvas: MockHTMLCanvasElement) {
    this.canvas = canvas;
  }

  fillRect(_x: number, _y: number, _w: number, _h: number) {}
  clearRect(_x: number, _y: number, _w: number, _h: number) {}
  strokeRect(_x: number, _y: number, _w: number, _h: number) {}
  drawImage(..._args: any[]) {}
  getImageData(_x: number, _y: number, w: number, h: number) {
    return {
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    };
  }
  putImageData(_imageData: any, _x: number, _y: number) {}
  scale(_x: number, _y: number) {}
  rotate(_angle: number) {}
  translate(_x: number, _y: number) {}
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  moveTo(_x: number, _y: number) {}
  lineTo(_x: number, _y: number) {}
  arc(_x: number, _y: number, _r: number, _start: number, _end: number) {}
  fill() {}
  stroke() {}
}

class MockHTMLCanvasElement {
  width: number = 100;
  height: number = 100;
  private ctx: MockCanvasRenderingContext2D;

  constructor() {
    this.ctx = new MockCanvasRenderingContext2D(this);
  }

  getContext(contextType: string) {
    if (contextType === '2d') {
      return this.ctx;
    }
    return null;
  }

  toDataURL(_type?: string, _quality?: number): string {
    // Return minimal 1x1 PNG data URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  }
}

// @ts-expect-error - Set Image on all possible globals
if (typeof window !== 'undefined') {
  window.Image = MockImage as any;
}
if (typeof global !== 'undefined') {
  global.Image = MockImage as any;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Image = MockImage as any;
}

// Mock document.createElement for canvas
const originalCreateElement = document.createElement.bind(document);
document.createElement = function (tagName: string) {
  if (tagName === 'canvas') {
    return new MockHTMLCanvasElement() as any;
  }
  return originalCreateElement(tagName);
};
