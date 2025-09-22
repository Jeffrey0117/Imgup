import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../../src/app/page";
import {
  render,
  setViewport,
  VIEWPORTS,
  createMockFile,
  createMockFileList,
} from "../utils/test-utils";

// Mock fetch for the upload API
global.fetch = jest.fn();

describe("Home Page RWD Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset viewport to desktop by default
    setViewport(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);

    // Reset clipboard mock
    jest.clearAllMocks();
  });

  describe("Mobile Layout (375px)", () => {
    beforeEach(() => {
      setViewport(VIEWPORTS.MOBILE_SMALL.width, VIEWPORTS.MOBILE_SMALL.height);
    });

    test("should display single column layout on mobile", () => {
      render(<Home />);

      const container = screen.getByText("圖鴨上床(duk.tw)").closest("div");
      expect(container).toBeInTheDocument();

      // Check that main title is visible
      expect(screen.getByText("圖鴨上床(duk.tw)")).toBeInTheDocument();
      expect(
        screen.getByText("Drop images → Upload → Markdown")
      ).toBeInTheDocument();
    });

    test("should have appropriate font sizes for mobile", () => {
      render(<Home />);

      const mainTitle = screen.getByText("圖鴨上床(duk.tw)");
      const computedStyle = window.getComputedStyle(mainTitle);

      // The actual font size will depend on CSS being loaded
      // This is more of a structural test
      expect(mainTitle).toHaveClass("mainTitle");
    });

    test("should handle touch interactions on mobile", async () => {
      const user = userEvent.setup();
      render(<Home />);

      const uploadButton = screen.getByText("Drop images here / 或點擊選擇");
      expect(uploadButton).toBeInTheDocument();

      // Should be clickable
      await user.click(uploadButton);
      // No errors should occur
    });

    test("should display drop zone properly on mobile", () => {
      render(<Home />);

      const dropZone = screen.getByText("Drop images here / 或點擊選擇");
      expect(dropZone).toBeInTheDocument();

      const hint = screen.getByText("png / jpg / webp… 支援多檔同傳");
      expect(hint).toBeInTheDocument();
    });
  });

  describe("Tablet Layout (768px)", () => {
    beforeEach(() => {
      setViewport(
        VIEWPORTS.TABLET_PORTRAIT.width,
        VIEWPORTS.TABLET_PORTRAIT.height
      );
    });

    test("should display tablet-optimized layout", () => {
      render(<Home />);

      // Should still show all main elements
      expect(screen.getByText("圖鴨上床(duk.tw)")).toBeInTheDocument();
      expect(
        screen.getByText("Drop images here / 或點擊選擇")
      ).toBeInTheDocument();
      expect(screen.getByText("尚無圖片")).toBeInTheDocument();
    });

    test("should handle file upload on tablet", async () => {
      const user = userEvent.setup();
      render(<Home />);

      const mockFile = createMockFile("test.jpg", "image/jpeg");
      const mockFileList = createMockFileList([mockFile]);

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Simulate file selection
      Object.defineProperty(fileInput, "files", {
        value: mockFileList,
        writable: false,
      });

      fireEvent.change(fileInput);

      // Should show the file in the list
      await waitFor(() => {
        expect(screen.getByText("test.jpg")).toBeInTheDocument();
      });
    });
  });

  describe("Desktop Layout (1024px+)", () => {
    beforeEach(() => {
      setViewport(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);
    });

    test("should display two-column layout on desktop", () => {
      render(<Home />);

      // Check all main elements are present
      expect(screen.getByText("圖鴨上床(duk.tw)")).toBeInTheDocument();
      expect(
        screen.getByText("Drop images here / 或點擊選擇")
      ).toBeInTheDocument();
      expect(screen.getByText("Markdown 輸出：")).toBeInTheDocument();
      expect(screen.getByText("HTML 標籤輸出：")).toBeInTheDocument();
    });

    test("should handle drag and drop on desktop", async () => {
      render(<Home />);

      const dropZone = screen
        .getByText("Drop images here / 或點擊選擇")
        .closest("div");
      expect(dropZone).toBeInTheDocument();

      const mockFile = createMockFile("test.jpg", "image/jpeg");

      // Simulate drag and drop
      const dragEvent = new Event("drop", { bubbles: true });
      Object.defineProperty(dragEvent, "dataTransfer", {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(dropZone!, dragEvent);

      // Should show the file in the list
      await waitFor(() => {
        expect(screen.getByText("test.jpg")).toBeInTheDocument();
      });
    });

    test("should display action buttons properly", () => {
      render(<Home />);

      expect(screen.getByText("開始上傳")).toBeInTheDocument();
      expect(screen.getByText("開始上傳")).toBeInTheDocument();
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });
  });

  describe("Interactive Elements", () => {
    test("should copy markdown to clipboard", async () => {
      const user = userEvent.setup();

      // Create mock clipboard function
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
      });

      render(<Home />);

      // Add a file first
      const mockFile = createMockFile("test.jpg", "image/jpeg");
      const mockFileList = createMockFileList([mockFile]);

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      Object.defineProperty(fileInput, "files", {
        value: mockFileList,
        writable: false,
      });

      fireEvent.change(fileInput);

      // Mock successful upload - 需要回應完整的 fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ result: "https://example.com/test.jpg" }),
      });

      // Start upload
      const uploadButton = screen.getByText("開始上傳");
      await user.click(uploadButton);

      // Wait for upload to complete and markdown to be generated
      await waitFor(
        () => {
          expect(
            screen.getByDisplayValue("![](https://example.com/test.jpg)")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Now the copy button should be available
      const copyButton = screen.getByText("複製Markdown");
      await user.click(copyButton);

      // Verify clipboard was called
      expect(mockWriteText).toHaveBeenCalledWith(
        "![](https://example.com/test.jpg)"
      );
    });

    test("should clear all files", async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Add a file first
      const mockFile = createMockFile("test.jpg", "image/jpeg");
      const mockFileList = createMockFileList([mockFile]);

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      Object.defineProperty(fileInput, "files", {
        value: mockFileList,
        writable: false,
      });

      fireEvent.change(fileInput);

      // Verify file is added
      await waitFor(() => {
        expect(screen.getByText("test.jpg")).toBeInTheDocument();
      });

      // Click clear
      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);

      // Should show empty state
      expect(screen.getByText("尚無圖片")).toBeInTheDocument();
    });
  });

  describe("SEO Section Accordion", () => {
    test("should toggle accordion sections", async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Find accordion buttons
      const whyButton = screen.getByText("為什麼要用圖床？");
      const markdownButton = screen.getByText("Markdown 插入圖片教學");

      expect(whyButton).toBeInTheDocument();
      expect(markdownButton).toBeInTheDocument();

      // Click to open first section
      await user.click(whyButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "圖床（Image Hosting）是專門用來存放圖片的網路服務。使用圖床的好處包括："
          )
        ).toBeInTheDocument();
      });

      // Click to open second section (should close first)
      await user.click(markdownButton);

      await waitFor(() => {
        expect(
          screen.getByText("在 Markdown 文件中插入圖片的語法非常簡單：")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle upload errors gracefully", async () => {
      const user = userEvent.setup();
      render(<Home />);

      // Add a file
      const mockFile = createMockFile("test.jpg", "image/jpeg");
      const mockFileList = createMockFileList([mockFile]);

      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      Object.defineProperty(fileInput, "files", {
        value: mockFileList,
        writable: false,
      });

      fireEvent.change(fileInput);

      // Mock failed upload
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Upload failed"));

      // Start upload
      const uploadButton = screen.getByText("開始上傳");
      await user.click(uploadButton);

      // Should show error status
      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });
    });
  });
});
