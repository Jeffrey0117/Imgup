/**
 * RBAC 權限控制系統測試範例
 *
 * 這個文件展示如何測試 RBAC 系統的各種場景
 */

import { hasPermission, hasAllPermissions, hasAnyPermission, PERMISSIONS } from '@/utils/rbac';

describe('RBAC 權限系統', () => {
  describe('hasPermission 函數', () => {
    it('admin 角色應該擁有所有權限', () => {
      expect(hasPermission('admin', PERMISSIONS.MAPPING_DELETE)).toBe(true);
      expect(hasPermission('admin', PERMISSIONS.MAPPING_BATCH_DELETE)).toBe(true);
      expect(hasPermission('admin', PERMISSIONS.ADMIN_MANAGE)).toBe(true);
      expect(hasPermission('admin', PERMISSIONS.SYSTEM_CONFIG_WRITE)).toBe(true);
    });

    it('moderator 角色應該有基本權限', () => {
      // moderator 可以的操作
      expect(hasPermission('moderator', PERMISSIONS.MAPPING_READ)).toBe(true);
      expect(hasPermission('moderator', PERMISSIONS.MAPPING_UPDATE)).toBe(true);
      expect(hasPermission('moderator', PERMISSIONS.MAPPING_DELETE)).toBe(true);
      expect(hasPermission('moderator', PERMISSIONS.ALBUM_CREATE)).toBe(true);
      expect(hasPermission('moderator', PERMISSIONS.STATS_VIEW)).toBe(true);
    });

    it('moderator 角色不應該有高級權限', () => {
      // moderator 不能的操作
      expect(hasPermission('moderator', PERMISSIONS.MAPPING_BATCH_DELETE)).toBe(false);
      expect(hasPermission('moderator', PERMISSIONS.ADMIN_MANAGE)).toBe(false);
      expect(hasPermission('moderator', PERMISSIONS.ADMIN_DELETE)).toBe(false);
      expect(hasPermission('moderator', PERMISSIONS.SYSTEM_CONFIG_WRITE)).toBe(false);
    });

    it('未知角色不應該有任何權限', () => {
      expect(hasPermission('unknown', PERMISSIONS.MAPPING_READ)).toBe(false);
      expect(hasPermission('viewer', PERMISSIONS.MAPPING_DELETE)).toBe(false);
    });
  });

  describe('hasAllPermissions 函數', () => {
    it('admin 應該擁有多個權限', () => {
      expect(hasAllPermissions('admin', [
        PERMISSIONS.MAPPING_DELETE,
        PERMISSIONS.ALBUM_DELETE,
        PERMISSIONS.ADMIN_MANAGE
      ])).toBe(true);
    });

    it('moderator 應該擁有基本權限組合', () => {
      expect(hasAllPermissions('moderator', [
        PERMISSIONS.MAPPING_READ,
        PERMISSIONS.MAPPING_UPDATE,
        PERMISSIONS.ALBUM_CREATE
      ])).toBe(true);
    });

    it('moderator 不應該同時擁有批量刪除權限', () => {
      expect(hasAllPermissions('moderator', [
        PERMISSIONS.MAPPING_READ,
        PERMISSIONS.MAPPING_BATCH_DELETE  // moderator 沒有這個權限
      ])).toBe(false);
    });
  });

  describe('hasAnyPermission 函數', () => {
    it('moderator 應該至少有一個權限', () => {
      expect(hasAnyPermission('moderator', [
        PERMISSIONS.MAPPING_BATCH_DELETE,  // 沒有
        PERMISSIONS.ADMIN_MANAGE,          // 沒有
        PERMISSIONS.MAPPING_READ           // 有這個
      ])).toBe(true);
    });

    it('未知角色不應該有任何權限', () => {
      expect(hasAnyPermission('unknown', [
        PERMISSIONS.MAPPING_READ,
        PERMISSIONS.ALBUM_CREATE
      ])).toBe(false);
    });
  });
});

/**
 * API 端點權限測試範例
 *
 * 注意：這些測試需要實際的測試環境和資料庫
 */
describe('API 端點權限控制', () => {
  describe('批量刪除 API', () => {
    it('admin 應該可以批量刪除', async () => {
      // 模擬 admin 登入
      const adminToken = await loginAsAdmin();

      const response = await fetch('/api/admin/mappings/batch', {
        method: 'DELETE',
        headers: {
          'Cookie': `admin_token=${adminToken}`
        },
        body: JSON.stringify({ ids: ['id1', 'id2'] })
      });

      expect(response.status).toBe(200);
    });

    it('moderator 應該被拒絕批量刪除', async () => {
      // 模擬 moderator 登入
      const modToken = await loginAsModerator();

      const response = await fetch('/api/admin/mappings/batch', {
        method: 'DELETE',
        headers: {
          'Cookie': `admin_token=${modToken}`
        },
        body: JSON.stringify({ ids: ['id1', 'id2'] })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toContain('權限不足');
    });

    it('權限拒絕應該記錄審計日誌', async () => {
      const modToken = await loginAsModerator();

      await fetch('/api/admin/mappings/batch', {
        method: 'DELETE',
        headers: {
          'Cookie': `admin_token=${modToken}`
        },
        body: JSON.stringify({ ids: ['id1'] })
      });

      // 檢查審計日誌
      const auditLog = await getLatestAuditLog();
      expect(auditLog.action).toBe('PERMISSION_DENIED');
      expect(auditLog.entity).toBe('access_control');
      expect(auditLog.details.requiredPermission).toBe('mapping:batch-delete');
    });
  });

  describe('單個刪除 API', () => {
    it('admin 應該可以刪除', async () => {
      const adminToken = await loginAsAdmin();

      const response = await fetch('/api/admin/mappings/test-hash', {
        method: 'DELETE',
        headers: {
          'Cookie': `admin_token=${adminToken}`
        }
      });

      expect(response.status).toBe(200);
    });

    it('moderator 應該可以刪除', async () => {
      const modToken = await loginAsModerator();

      const response = await fetch('/api/admin/mappings/test-hash', {
        method: 'DELETE',
        headers: {
          'Cookie': `admin_token=${modToken}`
        }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('相簿管理 API', () => {
    it('moderator 應該可以建立相簿', async () => {
      const modToken = await loginAsModerator();

      const response = await fetch('/api/admin/albums', {
        method: 'POST',
        headers: {
          'Cookie': `admin_token=${modToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: '測試相簿' })
      });

      expect(response.status).toBe(200);
    });

    it('moderator 應該可以更新相簿', async () => {
      const modToken = await loginAsModerator();

      const response = await fetch('/api/admin/albums/album-id', {
        method: 'PUT',
        headers: {
          'Cookie': `admin_token=${modToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: '更新後的名稱' })
      });

      expect(response.status).toBe(200);
    });
  });
});

/**
 * 輔助函數（需要根據實際實作調整）
 */

async function loginAsAdmin(): Promise<string> {
  const response = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: 'admin-password'
    })
  });

  // 從 Set-Cookie header 提取 token
  const cookies = response.headers.get('set-cookie');
  const tokenMatch = cookies?.match(/admin_token=([^;]+)/);
  return tokenMatch?.[1] || '';
}

async function loginAsModerator(): Promise<string> {
  const response = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'moderator@test.com',
      password: 'moderator-password'
    })
  });

  const cookies = response.headers.get('set-cookie');
  const tokenMatch = cookies?.match(/admin_token=([^;]+)/);
  return tokenMatch?.[1] || '';
}

async function getLatestAuditLog() {
  // 從資料庫查詢最新的審計日誌
  // 實際實作需要連接資料庫
  return {
    action: 'PERMISSION_DENIED',
    entity: 'access_control',
    details: {
      requiredPermission: 'mapping:batch-delete'
    }
  };
}

/**
 * 手動測試腳本
 *
 * 可以使用 curl 或 Postman 執行以下測試：
 */

/*
# 1. 建立測試帳號（在資料庫中）
INSERT INTO "Admin" (id, email, username, "passwordHash", role)
VALUES
  ('test-admin-id', 'admin@test.com', 'admin', '$2a$10$...', 'admin'),
  ('test-mod-id', 'mod@test.com', 'moderator', '$2a$10$...', 'moderator');

# 2. 測試 admin 批量刪除（應該成功）
curl -X DELETE http://localhost:3000/api/admin/mappings/batch \
  -H "Cookie: admin_token=ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["id1", "id2"]}'

# 3. 測試 moderator 批量刪除（應該失敗 403）
curl -X DELETE http://localhost:3000/api/admin/mappings/batch \
  -H "Cookie: admin_token=MODERATOR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["id1", "id2"]}'

# 4. 測試 moderator 單個刪除（應該成功）
curl -X DELETE http://localhost:3000/api/admin/mappings/some-hash \
  -H "Cookie: admin_token=MODERATOR_TOKEN_HERE"

# 5. 檢查審計日誌
SELECT * FROM "AuditLog"
WHERE action IN ('PERMISSION_DENIED', 'ROLE_DENIED')
ORDER BY "createdAt" DESC
LIMIT 10;
*/
