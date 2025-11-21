/**
 * URL 驗證輔助函數測試
 */

import {
  isValidImageUrl,
  extractFilenameFromUrl,
  isImageContentType,
  normalizeImageUrl,
} from '@/utils/url-validation';

describe('isValidImageUrl', () => {
  it('should accept valid HTTP image URLs', () => {
    expect(isValidImageUrl('http://example.com/image.jpg')).toBe(true);
    expect(isValidImageUrl('http://example.com/photo.png')).toBe(true);
    expect(isValidImageUrl('http://example.com/pic.gif')).toBe(true);
  });

  it('should accept valid HTTPS image URLs', () => {
    expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    expect(isValidImageUrl('https://example.com/photo.webp')).toBe(true);
  });

  it('should accept various image extensions', () => {
    expect(isValidImageUrl('https://example.com/img.jpeg')).toBe(true);
    expect(isValidImageUrl('https://example.com/img.png')).toBe(true);
    expect(isValidImageUrl('https://example.com/img.gif')).toBe(true);
    expect(isValidImageUrl('https://example.com/img.webp')).toBe(true);
    expect(isValidImageUrl('https://example.com/img.svg')).toBe(true);
    expect(isValidImageUrl('https://example.com/img.bmp')).toBe(true);
    expect(isValidImageUrl('https://example.com/img.ico')).toBe(true);
    expect(isValidImageUrl('https://example.com/img.avif')).toBe(true);
  });

  it('should be case insensitive for extensions', () => {
    expect(isValidImageUrl('https://example.com/image.JPG')).toBe(true);
    expect(isValidImageUrl('https://example.com/image.PNG')).toBe(true);
    expect(isValidImageUrl('https://example.com/image.Jpeg')).toBe(true);
  });

  it('should reject non-HTTP(S) protocols', () => {
    expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
    expect(isValidImageUrl('file:///path/to/image.jpg')).toBe(false);
    expect(isValidImageUrl('data:image/png;base64,abc123')).toBe(false);
  });

  it('should reject URLs without image extensions', () => {
    expect(isValidImageUrl('https://example.com/')).toBe(false);
    expect(isValidImageUrl('https://example.com/page')).toBe(false);
    expect(isValidImageUrl('https://example.com/file.txt')).toBe(false);
    expect(isValidImageUrl('https://example.com/file.pdf')).toBe(false);
  });

  it('should reject invalid URL formats', () => {
    expect(isValidImageUrl('not-a-url')).toBe(false);
    expect(isValidImageUrl('example.com/image.jpg')).toBe(false);
    expect(isValidImageUrl('')).toBe(false);
  });

  it('should handle URLs with query parameters', () => {
    expect(
      isValidImageUrl('https://example.com/image.jpg?size=large&quality=high')
    ).toBe(true);
  });

  it('should handle URLs with fragments', () => {
    expect(isValidImageUrl('https://example.com/image.jpg#section')).toBe(
      true
    );
  });
});

describe('extractFilenameFromUrl', () => {
  it('should extract filename from simple URLs', () => {
    expect(extractFilenameFromUrl('https://example.com/image.jpg')).toBe(
      'image.jpg'
    );
    expect(extractFilenameFromUrl('https://example.com/photo.png')).toBe(
      'photo.png'
    );
  });

  it('should extract filename from nested paths', () => {
    expect(
      extractFilenameFromUrl('https://example.com/path/to/image.jpg')
    ).toBe('image.jpg');
    expect(
      extractFilenameFromUrl('https://example.com/a/b/c/d/photo.png')
    ).toBe('photo.png');
  });

  it('should handle URLs with query parameters', () => {
    expect(
      extractFilenameFromUrl('https://example.com/image.jpg?size=large')
    ).toBe('image.jpg');
  });

  it('should handle URL-encoded filenames', () => {
    expect(
      extractFilenameFromUrl('https://example.com/%E5%9C%96%E7%89%87.jpg')
    ).toBe('圖片.jpg');
  });

  it('should return "untitled" for URLs without filename', () => {
    expect(extractFilenameFromUrl('https://example.com/')).toBe('untitled');
    expect(extractFilenameFromUrl('https://example.com')).toBe('untitled');
  });

  it('should return "untitled" for invalid URLs', () => {
    expect(extractFilenameFromUrl('not-a-url')).toBe('untitled');
    expect(extractFilenameFromUrl('')).toBe('untitled');
  });
});

describe('isImageContentType', () => {
  it('should accept valid image content types', () => {
    expect(isImageContentType('image/jpeg')).toBe(true);
    expect(isImageContentType('image/jpg')).toBe(true);
    expect(isImageContentType('image/png')).toBe(true);
    expect(isImageContentType('image/gif')).toBe(true);
    expect(isImageContentType('image/webp')).toBe(true);
    expect(isImageContentType('image/svg+xml')).toBe(true);
    expect(isImageContentType('image/bmp')).toBe(true);
  });

  it('should handle content types with parameters', () => {
    expect(isImageContentType('image/jpeg; charset=utf-8')).toBe(true);
    expect(isImageContentType('image/png; quality=high')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isImageContentType('Image/JPEG')).toBe(true);
    expect(isImageContentType('IMAGE/PNG')).toBe(true);
  });

  it('should reject non-image content types', () => {
    expect(isImageContentType('text/html')).toBe(false);
    expect(isImageContentType('application/json')).toBe(false);
    expect(isImageContentType('video/mp4')).toBe(false);
  });

  it('should reject undefined or empty content types', () => {
    expect(isImageContentType(undefined)).toBe(false);
    expect(isImageContentType('')).toBe(false);
  });
});

describe('normalizeImageUrl', () => {
  it('should remove tracking parameters', () => {
    const url = 'https://example.com/image.jpg?utm_source=google&utm_medium=cpc';
    const normalized = normalizeImageUrl(url);
    expect(normalized).toBe('https://example.com/image.jpg');
  });

  it('should remove multiple tracking parameters', () => {
    const url =
      'https://example.com/image.jpg?utm_source=google&utm_medium=cpc&utm_campaign=test&fbclid=abc123';
    const normalized = normalizeImageUrl(url);
    expect(normalized).toBe('https://example.com/image.jpg');
  });

  it('should preserve non-tracking parameters', () => {
    const url = 'https://example.com/image.jpg?size=large&quality=high';
    const normalized = normalizeImageUrl(url);
    expect(normalized).toContain('size=large');
    expect(normalized).toContain('quality=high');
  });

  it('should handle mixed tracking and non-tracking parameters', () => {
    const url =
      'https://example.com/image.jpg?size=large&utm_source=google&quality=high';
    const normalized = normalizeImageUrl(url);
    expect(normalized).toContain('size=large');
    expect(normalized).toContain('quality=high');
    expect(normalized).not.toContain('utm_source');
  });

  it('should handle URLs without query parameters', () => {
    const url = 'https://example.com/image.jpg';
    const normalized = normalizeImageUrl(url);
    expect(normalized).toBe(url);
  });

  it('should return original URL if parsing fails', () => {
    const invalidUrl = 'not-a-url';
    const normalized = normalizeImageUrl(invalidUrl);
    expect(normalized).toBe(invalidUrl);
  });
});
