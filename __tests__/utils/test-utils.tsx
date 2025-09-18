import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

// Custom render function that can be extended with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { ...options });

// Helper function to simulate different viewport sizes
export const setViewport = (width: number, height: number = 800) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });

  // Trigger resize event
  window.dispatchEvent(new Event("resize"));
};

// Helper to create mock file
export const createMockFile = (name = "test.jpg", type = "image/jpeg") => {
  return new File([""], name, { type });
};

// Helper to create mock FileList
export const createMockFileList = (files: File[]) => {
  const fileList = Object.create(FileList.prototype);
  Object.defineProperty(fileList, "length", { value: files.length });
  files.forEach((file, index) => {
    Object.defineProperty(fileList, index, { value: file });
  });
  return fileList as FileList;
};

// Viewport presets based on common devices
export const VIEWPORTS = {
  MOBILE_SMALL: { width: 375, height: 667 }, // iPhone SE
  MOBILE: { width: 480, height: 854 }, // Standard mobile
  TABLET_PORTRAIT: { width: 768, height: 1024 }, // iPad portrait
  TABLET_LANDSCAPE: { width: 1024, height: 768 }, // iPad landscape
  DESKTOP: { width: 1280, height: 800 }, // Desktop
  DESKTOP_LARGE: { width: 1440, height: 900 }, // Large desktop
};

// re-export everything
export * from "@testing-library/react";
export { customRender as render };

// Dummy test to satisfy Jest requirement
describe("Test Utils", () => {
  test("should export utility functions", () => {
    expect(setViewport).toBeDefined();
    expect(createMockFile).toBeDefined();
    expect(createMockFileList).toBeDefined();
    expect(VIEWPORTS).toBeDefined();
  });
});
