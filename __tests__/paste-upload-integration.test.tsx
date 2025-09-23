import { screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "../src/app/page";
import {
  render,
  createMockFile,
} from "./utils/test-utils";

// Mock fetch for the upload API
global.fetch = jest.fn();

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid'),
  },
});

describe("Paste Upload Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful upload response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({
        result: "test-hash",
        extension: ".png",
        originalUrl: "https://example.com/test.png"
      }),
    });
  });

  test("should handle paste upload from clipboard and complete full upload flow", async () => {
    render(<Home />);

    // Verify PasteUpload component is rendered
    expect(screen.getByText("💡 提示：按下")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+V")).toBeInTheDocument();

    // Create mock file for paste event
    const mockFile = createMockFile("pasted-image.png", "image/png");

    // Create mock clipboard data
    const mockClipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => mockFile,
        },
      ],
    };

    // Trigger paste event
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    // Wait for file to be added to queue
    await waitFor(() => {
      expect(screen.getByText("pasted-image.png")).toBeInTheDocument();
    });

    // Verify file appears in queue
    expect(screen.getByText("Queued")).toBeInTheDocument();

    // Verify toast notification shows
    await waitFor(() => {
      expect(screen.getByText("已添加 1 張圖片")).toBeInTheDocument();
    });

    // Click upload button
    const uploadButton = screen.getByText("開始上傳");
    fireEvent.click(uploadButton);

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByText("OK")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify short URL is generated and displayed
    await waitFor(() => {
      const shortUrlElement = screen.getByText("test-hash.png");
      expect(shortUrlElement).toBeInTheDocument();
    });

    // Verify clipboard was called for auto-copy
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/test-hash.png`
      );
    });

    // Verify success toast
    await waitFor(() => {
      expect(screen.getByText("圖片上傳成功！短網址已自動複製到剪貼簿")).toBeInTheDocument();
    });
  });

  test("should handle multiple images pasted from clipboard", async () => {
    render(<Home />);

    // Create multiple mock files
    const mockFiles = [
      createMockFile("image1.png", "image/png"),
      createMockFile("image2.jpg", "image/jpeg"),
      createMockFile("image3.webp", "image/webp"),
    ];

    // Create mock clipboard data with multiple images
    const mockClipboardData = {
      items: mockFiles.map(file => ({
        type: file.type,
        getAsFile: () => file,
      })),
    };

    // Trigger paste event
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    // Wait for all files to be added
    await waitFor(() => {
      expect(screen.getByText("image1.png")).toBeInTheDocument();
      expect(screen.getByText("image2.jpg")).toBeInTheDocument();
      expect(screen.getByText("image3.webp")).toBeInTheDocument();
    });

    // Verify toast shows correct count
    await waitFor(() => {
      expect(screen.getByText("已添加 3 張圖片")).toBeInTheDocument();
    });
  });

  test("should filter out non-image files from mixed clipboard content", async () => {
    render(<Home />);

    // Create mixed content
    const mockImageFile = createMockFile("image.png", "image/png");
    const mockTextFile = new File(['text content'], 'document.txt', { type: 'text/plain' });

    const mockClipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => mockImageFile,
        },
        {
          type: 'text/plain',
          getAsFile: () => mockTextFile,
        },
      ],
    };

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    // Only image file should be added
    await waitFor(() => {
      expect(screen.getByText("image.png")).toBeInTheDocument();
    });

    // Text file should not appear
    expect(screen.queryByText("document.txt")).not.toBeInTheDocument();

    // Toast should show 1 image added
    await waitFor(() => {
      expect(screen.getByText("已添加 1 張圖片")).toBeInTheDocument();
    });
  });

  test("should reject oversized files from clipboard", async () => {
    render(<Home />);

    // Create oversized file (21MB)
    const largeFile = new File(['x'.repeat(21 * 1024 * 1024)], 'large.png', { type: 'image/png' });

    const mockClipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => largeFile,
        },
      ],
    };

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    // Wait a bit to ensure no file is added
    await new Promise(resolve => setTimeout(resolve, 100));

    // No files should be added
    expect(screen.getByText("尚無圖片")).toBeInTheDocument();

    // No toast should appear for file addition
    expect(screen.queryByText(/已添加/)).not.toBeInTheDocument();
  });

  test("should not handle paste events when uploading is in progress", async () => {
    render(<Home />);

    // First add a file normally
    const mockFile1 = createMockFile("normal.png", "image/png");
    const mockFileList = Object.create(FileList.prototype);
    Object.defineProperty(mockFileList, "length", { value: 1 });
    Object.defineProperty(mockFileList, 0, { value: mockFile1 });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, "files", {
      value: mockFileList,
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText("normal.png")).toBeInTheDocument();
    });

    // Start upload (this will set isUploading to true)
    fireEvent.click(screen.getByText("開始上傳"));

    // Now try to paste another image
    const mockFile2 = createMockFile("pasted.png", "image/png");
    const mockClipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => mockFile2,
        },
      ],
    };

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Only the original file should be present
    expect(screen.getByText("normal.png")).toBeInTheDocument();
    expect(screen.queryByText("pasted.png")).not.toBeInTheDocument();
  });

  test("should handle clipboard auto-copy failure gracefully", async () => {
    // Mock clipboard failure
    const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
    });

    render(<Home />);

    // Add and upload a file
    const mockFile = createMockFile("test.png", "image/png");
    const mockFileList = Object.create(FileList.prototype);
    Object.defineProperty(mockFileList, "length", { value: 1 });
    Object.defineProperty(mockFileList, 0, { value: mockFile });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, "files", {
      value: mockFileList,
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("開始上傳"));

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByText("OK")).toBeInTheDocument();
    });

    // Verify fallback success message appears
    await waitFor(() => {
      expect(screen.getByText("圖片上傳成功！請手動複製短網址")).toBeInTheDocument();
    });
  });

  test("should maintain paste functionality across different viewports", async () => {
    // Test on mobile viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
    window.dispatchEvent(new Event("resize"));

    render(<Home />);

    // Verify paste hint is still visible on mobile
    expect(screen.getByText("💡 提示：按下")).toBeInTheDocument();

    // Test paste functionality on mobile
    const mockFile = createMockFile("mobile-paste.png", "image/png");
    const mockClipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => mockFile,
        },
      ],
    };

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    await waitFor(() => {
      expect(screen.getByText("mobile-paste.png")).toBeInTheDocument();
    });
  });
});