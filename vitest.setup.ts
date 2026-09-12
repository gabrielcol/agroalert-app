import "@testing-library/jest-dom/vitest";

// jsdom lacks ResizeObserver, which Radix ScrollArea and the signature pad rely
// on. Provide a no-op implementation so components render in unit tests.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
