import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
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
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // Filter out benign jsdom environmental warnings from test output
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("The width(0) and height(0) of chart should be greater than 0")
    ) {
      return;
    }
    origWarn(...args);
  };

  const origError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Not implemented: HTMLCanvasElement's getContext() method") ||
       args[0].includes("The width(0) and height(0) of chart should be greater than 0"))
    ) {
      return;
    }
    origError(...args);
  };
}
