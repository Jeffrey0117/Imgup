import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PasteUpload from '../../src/components/PasteUpload';

// Mock ClipboardEvent for testing
global.ClipboardEvent = class MockClipboardEvent extends Event {
  clipboardData: any;

  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict);
    this.clipboardData = eventInitDict?.clipboardData;
  }
};

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

describe('PasteUpload', () => {
  const mockOnImagePaste = jest.fn();

  beforeEach(() => {
    mockOnImagePaste.mockClear();
    jest.clearAllMocks();
  });

  it('renders paste hint with keyboard shortcut', () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    expect(screen.getByText('💡 提示：按下 Ctrl+V 貼上圖片即可快速上傳')).toBeInTheDocument();
  });

  it('handles paste event with valid image files', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    // Create mock file
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

    // Create mock clipboard data
    const mockClipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => mockFile,
        },
      ],
    };

    // Create paste event
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    // Trigger paste event on document
    fireEvent(document, pasteEvent);

    // Wait for the paste handler to process
    await waitFor(() => {
      expect(mockOnImagePaste).toHaveBeenCalledWith([mockFile]);
    });
  });

  it('filters out non-image files from clipboard', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    // Create mock clipboard data with mixed file types
    const mockImageFile = new File(['test'], 'test.png', { type: 'image/png' });
    const mockTextFile = new File(['text'], 'test.txt', { type: 'text/plain' });

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

    await waitFor(() => {
      expect(mockOnImagePaste).toHaveBeenCalledWith([mockImageFile]);
    });

    expect(mockOnImagePaste).toHaveBeenCalledTimes(1);
  });

  it('rejects files larger than 20MB', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    // Create mock file larger than 20MB
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

    // Wait a bit to ensure no callback is triggered
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnImagePaste).not.toHaveBeenCalled();
  });

  it('accepts multiple supported image formats', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    const formats = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp'];
    const mockFiles = formats.map(format =>
      new File(['test'], `test.${format}`, { type: `image/${format}` })
    );

    const mockClipboardData = {
      items: mockFiles.map(file => ({
        type: file.type,
        getAsFile: () => file,
      })),
    };

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    await waitFor(() => {
      expect(mockOnImagePaste).toHaveBeenCalledWith(mockFiles);
    });
  });

  it('rejects unsupported image formats', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    const mockFile = new File(['test'], 'test.svg', { type: 'image/svg+xml' });

    const mockClipboardData = {
      items: [
        {
          type: 'image/svg+xml',
          getAsFile: () => mockFile,
        },
      ],
    };

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnImagePaste).not.toHaveBeenCalled();
  });

  it('ignores paste events in input and textarea elements', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    // Create input element and focus it
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
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

    // Trigger paste on the input element
    fireEvent(input, pasteEvent);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnImagePaste).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });

  it('ignores paste events in contenteditable elements', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    // Create contenteditable element and focus it
    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();

    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
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

    fireEvent(div, pasteEvent);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnImagePaste).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(div);
  });

  it('does not handle paste events when disabled', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} disabled={true} />);

    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
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

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnImagePaste).not.toHaveBeenCalled();
  });

  it('handles empty clipboard data gracefully', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: null as any,
    });

    fireEvent(document, pasteEvent);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnImagePaste).not.toHaveBeenCalled();
  });

  it('handles clipboard with no items gracefully', async () => {
    render(<PasteUpload onImagePaste={mockOnImagePaste} />);

    const mockClipboardData = {
      items: [],
    };

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: mockClipboardData as any,
    });

    fireEvent(document, pasteEvent);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnImagePaste).not.toHaveBeenCalled();
  });
});