import {
  MemoryCacheProvider,
  RedisCacheProvider,
  MockCacheProvider,
  type ImageMapping
} from '../../src/lib/unified-access';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('memory:0'),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
  })),
}));

describe('快取提供者測試', () => {
  const testMapping: ImageMapping = {
    id: 'test123',
    url: 'https://example.com/test.jpg',
    filename: 'test.jpg',
    fileExtension: 'jpg',
    createdAt: new Date(),
    shortUrl: 'https://short.url/test123'
  };

  const testMappingWithExpiry: ImageMapping = {
    ...testMapping,
    expiresAt: new Date(Date.now() + 3600000) // 1小時後過期
  };

  describe('MemoryCacheProvider', () => {
    let provider: MemoryCacheProvider;

    beforeEach(() => {
      provider = new MemoryCacheProvider();
    });

    test('應該能設定和獲取快取資料', async () => {
      await provider.set('test-key', testMapping);
      const result = await provider.get('test-key');

      expect(result).toEqual(testMapping);
    });

    test('獲取不存在的鍵應該返回 null', async () => {
      const result = await provider.get('nonexistent');
      expect(result).toBeNull();
    });

    test('應該能檢查鍵是否存在', async () => {
      await provider.set('test-key', testMapping);
      expect(await provider.exists('test-key')).toBe(true);
      expect(await provider.exists('nonexistent')).toBe(false);
    });

    test('應該能刪除快取資料', async () => {
      await provider.set('test-key', testMapping);
      expect(await provider.exists('test-key')).toBe(true);

      await provider.delete('test-key');
      expect(await provider.exists('test-key')).toBe(false);
    });

    test('應該能清除所有快取', async () => {
      await provider.set('key1', testMapping);
      await provider.set('key2', testMapping);
      expect(await provider.exists('key1')).toBe(true);
      expect(await provider.exists('key2')).toBe(true);

      await provider.clear();
      expect(await provider.exists('key1')).toBe(false);
      expect(await provider.exists('key2')).toBe(false);
    });

    test('應該能處理有 TTL 的快取', async () => {
      const expiredMapping = {
        ...testMapping,
        expiresAt: new Date(Date.now() - 1000) // 已經過期
      };

      await provider.set('expired-key', expiredMapping);
      const result = await provider.get('expired-key');

      // 過期的資料應該被自動清除並返回 null
      expect(result).toBeNull();
    });
  });

  describe('RedisCacheProvider', () => {
    let provider: RedisCacheProvider;
    let mockClient: any;

    beforeEach(() => {
      // 重置所有 mock
      jest.clearAllMocks();

      // 建立新的 provider
      provider = new RedisCacheProvider({
        url: 'redis://localhost:6379',
        keyPrefix: 'test:',
        defaultTTL: 3600
      });

      // 獲取 mock client
      mockClient = (provider as any).client;
    });

    test('應該使用正確的設定建立 Redis 客戶端', () => {
      const { createClient } = require('redis');
      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        password: undefined,
        database: 0,
        socket: {
          connectTimeout: 60000,
          commandTimeout: 5000,
          lazyConnect: true,
        },
        retry_strategy: expect.any(Function)
      });
    });

    test('應該能設定和獲取快取資料', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify(testMapping));
      mockClient.setEx.mockResolvedValue('OK');

      await provider.set('test-key', testMapping);
      expect(mockClient.setEx).toHaveBeenCalledWith('test:test-key', 3600, JSON.stringify(testMapping));

      const result = await provider.get('test-key');
      expect(result).toEqual(testMapping);
      expect(mockClient.get).toHaveBeenCalledWith('test:test-key');
    });

    test('當 Redis 不可用時應該優雅降級', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));
      mockClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.get('test-key');
      expect(result).toBeNull();

      // 即使設定失敗也不應該拋出錯誤
      await expect(provider.set('test-key', testMapping)).resolves.toBeUndefined();
    });

    test('應該能檢查鍵是否存在', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await provider.exists('test-key');
      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('test:test-key');
    });

    test('應該能刪除快取資料', async () => {
      mockClient.del.mockResolvedValue(1);

      await provider.delete('test-key');
      expect(mockClient.del).toHaveBeenCalledWith('test:test-key');
    });

    test('應該能清除所有快取', async () => {
      mockClient.keys.mockResolvedValue(['test:key1', 'test:key2']);
      mockClient.del.mockResolvedValue(2);

      await provider.clear();
      expect(mockClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockClient.del).toHaveBeenCalledWith(['test:key1', 'test:key2']);
    });

    test('ping 應該正常工作', async () => {
      const result = await provider.ping();
      expect(result).toBe(true);
      expect(mockClient.ping).toHaveBeenCalled();
    });
  });

  describe('MockCacheProvider', () => {
    let provider: MockCacheProvider;

    beforeEach(() => {
      provider = new MockCacheProvider();
    });

    test('應該能設定和獲取快取資料', async () => {
      await provider.set('test-key', testMapping);
      const result = await provider.get('test-key');

      expect(result).toEqual(testMapping);
    });

    test('應該能檢查鍵是否存在', async () => {
      await provider.set('test-key', testMapping);
      expect(await provider.exists('test-key')).toBe(true);
      expect(await provider.exists('nonexistent')).toBe(false);
    });

    test('應該能刪除快取資料', async () => {
      await provider.set('test-key', testMapping);
      expect(await provider.exists('test-key')).toBe(true);

      await provider.delete('test-key');
      expect(await provider.exists('test-key')).toBe(false);
    });

    test('應該能清除所有快取', async () => {
      await provider.set('key1', testMapping);
      await provider.set('key2', testMapping);
      expect(await provider.exists('key1')).toBe(true);
      expect(await provider.exists('key2')).toBe(true);

      await provider.clear();
      expect(await provider.exists('key1')).toBe(false);
      expect(await provider.exists('key2')).toBe(false);
    });

    test('應該提供測試輔助方法', () => {
      expect(provider.getCacheSize()).toBe(0);

      provider.set('key1', testMapping);
      provider.set('key2', testMapping);

      expect(provider.getCacheSize()).toBe(2);
      expect(provider.getAllKeys()).toEqual(['key1', 'key2']);
    });
  });

  describe('跨提供者一致性測試', () => {
    const providers = [
      { name: 'MemoryCacheProvider', instance: new MemoryCacheProvider() },
      { name: 'MockCacheProvider', instance: new MockCacheProvider() },
    ];

    providers.forEach(({ name, instance: provider }) => {
      describe(name, () => {
        test('應該實現 CacheProvider 介面', async () => {
          // 測試基本操作
          await provider.set('consistency-test', testMapping);
          const result = await provider.get('consistency-test');
          expect(result).toEqual(testMapping);

          expect(await provider.exists('consistency-test')).toBe(true);
          await provider.delete('consistency-test');
          expect(await provider.exists('consistency-test')).toBe(false);

          await provider.clear();
        });

        test('應該正確處理邊界情況', async () => {
          // 空鍵
          await provider.set('', testMapping);
          expect(await provider.get('')).toEqual(testMapping);

          // 特殊字元鍵
          const specialKey = 'test-key_with.special.chars';
          await provider.set(specialKey, testMapping);
          expect(await provider.get(specialKey)).toEqual(testMapping);

          // Unicode 鍵
          const unicodeKey = '測試鍵';
          await provider.set(unicodeKey, testMapping);
          expect(await provider.get(unicodeKey)).toEqual(testMapping);
        });
      });
    });
  });

  describe('效能和壓力測試', () => {
    test('MemoryCacheProvider 應該能處理大量資料', async () => {
      const provider = new MemoryCacheProvider();
      const promises: Promise<void>[] = [];

      // 同時設定 1000 個鍵
      for (let i = 0; i < 1000; i++) {
        promises.push(provider.set(`key-${i}`, {
          ...testMapping,
          id: `id-${i}`,
          url: `https://example.com/test-${i}.jpg`
        }));
      }

      await Promise.all(promises);

      // 驗證所有鍵都存在
      for (let i = 0; i < 100; i++) { // 只檢查前 100 個以節省時間
        expect(await provider.exists(`key-${i}`)).toBe(true);
      }
    });

    test('應該能處理大型物件', async () => {
      const provider = new MemoryCacheProvider();
      const largeMapping: ImageMapping = {
        ...testMapping,
        filename: 'a'.repeat(10000), // 10KB 的檔案名
        url: 'https://example.com/' + 'a'.repeat(10000)
      };

      await provider.set('large-key', largeMapping);
      const result = await provider.get('large-key');

      expect(result).toEqual(largeMapping);
    });
  });
});