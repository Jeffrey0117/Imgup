jest.mock("next/server", () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    json: jest.fn((data, options) => {
      const response = new Response(JSON.stringify(data), {
        status: options?.status || 200,
        headers: options?.headers || {},
      });
      return response;
    }),
    redirect: jest.fn((url, options) => ({
      status: options?.status || 302,
      headers: {
        get: jest.fn((name) => {
          if (name === 'location') return url.toString();
          return null;
        }),
      },
    })),
  },
}));

import {
  EnhancedImageAccess,
  MemoryCacheProvider,
  ImageMapping,
  ImageAccessRequest,
} from '@/lib/unified-access';

describe('Smart Route with Extension and Password', () => {
  let cacheProvider: MemoryCacheProvider;
  let unifiedAccess: EnhancedImageAccess;
  
  const mockMapping: ImageMapping = {
    id: 'abc123',
    url: 'https://example.com/image.jpg',
    filename: 'test.jpg',
    fileExtension: 'jpg',
    createdAt: new Date(),
    password: 'hashed_password',
  };

  const mockMappingNoPassword: ImageMapping = {
    id: 'xyz789',
    url: 'https://example.com/image2.jpg',
    filename: 'test2.jpg',
    fileExtension: 'jpg',
    createdAt: new Date(),
  };

  beforeEach(() => {
    cacheProvider = new MemoryCacheProvider();
    const dataProvider = async (hash: string) => {
      if (hash === 'abc123') return mockMapping;
      if (hash === 'xyz789') return mockMappingNoPassword;
      return null;
    };
    unifiedAccess = new EnhancedImageAccess(cacheProvider, dataProvider);
  });

  describe('SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD enabled', () => {
    beforeEach(() => {
      process.env.SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD = 'true';
    });

    afterEach(() => {
      delete process.env.SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD;
    });

    it('should redirect to preview page for browser navigation with extension and password', async () => {
      const request: ImageAccessRequest = {
        hash: 'abc123.jpg',
        headers: {
          'accept': 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      const response = await unifiedAccess.accessImage(request);
      
      expect(response.type).toBe('redirect');
      expect(response.url).toContain('/p');
    });

    it('should proxy image for img tag request with extension and password', async () => {
      const request: ImageAccessRequest = {
        hash: 'abc123.jpg',
        headers: {
          'accept': 'image/webp,image/apng,image/*',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      const response = await unifiedAccess.accessImage(request);
      
      expect(response.type).toBe('proxy');
      expect(response.url).toBe(mockMapping.url);
    });

    it('should proxy image for extension without password', async () => {
      const request: ImageAccessRequest = {
        hash: 'xyz789.jpg',
        headers: {
          'accept': 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      const response = await unifiedAccess.accessImage(request);
      
      expect(response.type).toBe('redirect');
      expect(response.url).toContain('/p');
    });
  });

  describe('SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD disabled', () => {
    beforeEach(() => {
      process.env.SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD = 'false';
    });

    afterEach(() => {
      delete process.env.SMART_ROUTE_REDIRECT_EXT_WITH_PASSWORD;
    });

    it('should maintain current behavior - redirect to preview for browser navigation', async () => {
      const request: ImageAccessRequest = {
        hash: 'abc123.jpg',
        headers: {
          'accept': 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      const response = await unifiedAccess.accessImage(request);
      
      expect(response.type).toBe('redirect');
      expect(response.url).toContain('/p');
    });

    it('should proxy image for img tag request', async () => {
      const request: ImageAccessRequest = {
        hash: 'abc123.jpg',
        headers: {
          'accept': 'image/webp,image/apng,image/*',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      const response = await unifiedAccess.accessImage(request);
      
      expect(response.type).toBe('proxy');
      expect(response.url).toBe(mockMapping.url);
    });
  });
});