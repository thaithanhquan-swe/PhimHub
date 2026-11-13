import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
  }),
});

if (typeof window !== "undefined" && !window.PointerEvent) {
  // @ts-expect-error polyfill for jsdom
  window.PointerEvent = window.MouseEvent;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
