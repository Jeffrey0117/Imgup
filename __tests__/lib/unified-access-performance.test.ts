import {
  MemoryCacheProvider,
  RedisCacheProvider,
  MockCacheProvider,
  UnifiedImageAccess,
  type ImageMapping,
  type ImageAccessRequest
} from '../../src/lib/unified-access';

// Mock 資料提供者
const mockDataProvider = async (hash: string): Promise<ImageMapping | null> => {
  if (hash === 'test123') {
    return {
      id: 'test123',
      url: 'https://example.com/test.jpg',
      filename: 'test.jpg',
      fileExtension: 'jpg',
      createdAt: new Date(),
      shortUrl: 'https://short.url/test123'
    };
  }
  return null;
};

describe('效能和基準測試', () => {
  const testMapping: ImageMapping = {
    id: 'perf123',
    url: 'https://example.com/perf.jpg',
    filename: 'perf.jpg',
    fileExtension: 'jpg',
    createdAt: new Date(),
    shortUrl: 'https://short.url/perf123'
  };

  const testRequest: ImageAccessRequest = {
    hash: 'perf123',
    headers: {
      accept: 'image/jpeg',
      'user-agent': 'Mozilla/5.0 (Test Browser)'
    }
  };

  describe('快取效能測試', () => {
    test('MemoryCacheProvider 基本操作效能', async () => {
      const provider = new MemoryCacheProvider();
      const startTime = Date.now();

      // 設定操作
      for (let i = 0; i < 1000; i++) {
        await provider.set(`key-${i}`, {
          ...testMapping,
          id: `id-${i}`,
          url: `https://example.com/test-${i}.jpg`
        });
      }

      // 讀取操作
      for (let i = 0; i < 1000; i++) {
        await provider.get(`key-${i}`);
      }

      // 檢查存在性
      for (let i = 0; i < 100; i++) {
        await provider.exists(`key-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`MemoryCacheProvider 效能測試完成，耗時: ${duration}ms`);
      expect(duration).toBeLessThan(500); // 應該在 500ms 以內完成
    });

    test('MockCacheProvider 基本操作效能', async () => {
      const provider = new MockCacheProvider();
      const startTime = Date.now();

      // 設定操作
      for (let i = 0; i < 1000; i++) {
        await provider.set(`key-${i}`, {
          ...testMapping,
          id: `id-${i}`,
          url: `https://example.com/test-${i}.jpg`
        });
      }

      // 讀取操作
      for (let i = 0; i < 1000; i++) {
        await provider.get(`key-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`MockCacheProvider 效能測試完成，耗時: ${duration}ms`);
      expect(duration).toBeLessThan(300); // Mock 應該更快
    });

    test('快取命中率測試', async () => {
      const provider = new MemoryCacheProvider();
      let hits = 0;
      let misses = 0;

      // 先預熱快取
      for (let i = 0; i < 100; i++) {
        await provider.set(`key-${i}`, {
          ...testMapping,
          id: `id-${i}`
        });
      }

      // 模擬請求模式：80% 命中，20% 錯過
      for (let i = 0; i < 1000; i++) {
        const key = i < 800 ? `key-${i % 100}` : `key-${i}`;
        const result = await provider.get(key);
        if (result) {
          hits++;
        } else {
          misses++;
        }
      }

      const hitRate = hits / (hits + misses);
      console.log(`快取命中率: ${(hitRate * 100).toFixed(2)}%`);

      expect(hitRate).toBeGreaterThan(0.7); // 命中率應該大於 70%
    });
  });

  describe('UnifiedImageAccess 整合效能測試', () => {
    test('完整請求流程效能', async () => {
      const cacheProvider = new MemoryCacheProvider();
      const access = new UnifiedImageAccess(cacheProvider, mockDataProvider);

      const startTime = Date.now();

      // 模擬 100 個並發請求
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const request = {
          ...testRequest,
          hash: i === 0 ? 'test123' : `hash${i}` // 只有第一個會命中
        };
        promises.push(access.accessImage(request));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`UnifiedImageAccess 整合測試完成，耗時: ${duration}ms，平均: ${duration / 100}ms/請求`);

      // 至少一個請求應該成功
      const successCount = results.filter(r => r.type !== 'error').length;
      expect(successCount).toBeGreaterThan(0);

      // 效能檢查：100 個請求應該在 2 秒內完成
      expect(duration).toBeLessThan(2000);
    });

    test('快取預熱效能', async () => {
      const cacheProvider = new MemoryCacheProvider();
      const access = new UnifiedImageAccess(cacheProvider, mockDataProvider);

      // 預熱快取
      const warmUpStart = Date.now();
      await access.accessImage(testRequest); // 第一次請求會填充快取
      const warmUpTime = Date.now() - warmUpStart;

      // 測試快取命中效能
      const cachedStart = Date.now();
      for (let i = 0; i < 100; i++) {
        await access.accessImage(testRequest);
      }
      const cachedTime = Date.now() - cachedStart;

      console.log(`快取預熱時間: ${warmUpTime}ms`);
      console.log(`快取命中平均時間: ${cachedTime / 100}ms/請求`);

      // 快取命中應該比預熱快得多
      expect(cachedTime / 100).toBeLessThan(warmUpTime * 0.5);
    });
  });

  describe('記憶體使用測試', () => {
    test('MemoryCacheProvider 記憶體使用量', async () => {
      const provider = new MemoryCacheProvider();

      // 記錄初始狀態
      const initialSize = (provider as any).cache.size;

      // 添加大量資料
      const largeData = [];
      for (let i = 0; i < 10000; i++) {
        const mapping = {
          ...testMapping,
          id: `large-${i}`,
          filename: `test-file-${i}.jpg`,
          url: `https://example.com/test-${i}.jpg`
        };
        largeData.push(mapping);
        await provider.set(`key-${i}`, mapping);
      }

      const finalSize = (provider as any).cache.size;
      console.log(`MemoryCacheProvider 儲存了 ${finalSize - initialSize} 個項目`);

      expect(finalSize - initialSize).toBe(10000);

      // 清理測試
      await provider.clear();
      expect((provider as any).cache.size).toBe(0);
    });

    test('MockCacheProvider 輔助方法', () => {
      const provider = new MockCacheProvider();

      expect(provider.getCacheSize()).toBe(0);
      expect(provider.getAllKeys()).toEqual([]);

      provider.set('test1', testMapping);
      provider.set('test2', testMapping);

      expect(provider.getCacheSize()).toBe(2);
      expect(provider.getAllKeys()).toContain('test1');
      expect(provider.getAllKeys()).toContain('test2');
    });
  });

  describe('邊界情況和壓力測試', () => {
    test('處理特殊鍵值', async () => {
      const provider = new MemoryCacheProvider();
      const specialKeys = [
        '',
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        '123numeric',
        'mixed123Keys',
        'key/with/slashes',
        'key?with=query',
        'key#with#hash',
        'unicode鍵',
        'emoji🚀key'
      ];

      // 測試特殊鍵的設定和獲取
      for (const key of specialKeys) {
        const testValue = { ...testMapping, id: key };
        await provider.set(key, testValue);
        const result = await provider.get(key);
        expect(result?.id).toBe(key);
      }

      console.log('特殊鍵測試通過');
    });

    test('處理大型物件', async () => {
      const provider = new MemoryCacheProvider();

      // 建立大型物件
      const largeMapping: ImageMapping = {
        ...testMapping,
        filename: 'a'.repeat(10000), // 10KB 字串
        url: 'https://example.com/' + 'b'.repeat(10000)
      };

      await provider.set('large-key', largeMapping);
      const result = await provider.get('large-key');

      expect(result?.filename.length).toBe(10000);
      expect(result?.url.length).toBe(10034); // URL + 域名長度
    });

    test('並發操作測試', async () => {
      const provider = new MemoryCacheProvider();

      // 同時執行多個操作
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(
          provider.set(`concurrent-${i}`, {
            ...testMapping,
            id: `concurrent-${i}`
          })
        );
      }

      await Promise.all(operations);

      // 驗證所有操作都成功
      for (let i = 0; i < 100; i++) {
        const result = await provider.get(`concurrent-${i}`);
        expect(result?.id).toBe(`concurrent-${i}`);
      }

      console.log('並發操作測試通過');
    });
  });

  describe('錯誤處理和恢復測試', () => {
    test('RedisCacheProvider 降級處理', async () => {
      // Mock Redis 連接失敗
      const originalCreateClient = jest.requireMock('redis').createClient;
      originalCreateClient.mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: jest.fn(),
        get: jest.fn(),
        setEx: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        keys: jest.fn(),
        ping: jest.fn(),
        info: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
      }));

      const provider = new RedisCacheProvider();

      // 這些操作應該不會拋出錯誤，而是優雅降級
      await expect(provider.get('test-key')).resolves.toBeNull();
      await expect(provider.set('test-key', testMapping)).resolves.toBeUndefined();
      await expect(provider.exists('test-key')).resolves.toBe(false);
      await expect(provider.delete('test-key')).resolves.toBeUndefined();
      await expect(provider.clear()).resolves.toBeUndefined();

      console.log('Redis 降級處理測試通過');
    });

    test('UnifiedImageAccess 錯誤恢復', async () => {
      const cacheProvider = new MemoryCacheProvider();

      // Mock 一個總是失敗的資料提供者
      const failingDataProvider = async (): Promise<ImageMapping | null> => {
        throw new Error('Database connection failed');
      };

      const access = new UnifiedImageAccess(cacheProvider, failingDataProvider);

      const response = await access.accessImage(testRequest);

      // 應該返回重定向而不是拋出錯誤
      expect(response.type).toBe('redirect');
      expect(response.statusCode).toBe(302);

      console.log('錯誤恢復測試通過');
    });
  });
});