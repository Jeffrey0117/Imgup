/**
 * Role-Based Access Control (RBAC) 權限控制系統
 *
 * 定義系統中所有角色的權限映射，並提供權限檢查功能
 */

// 定義所有可能的權限操作
export const PERMISSIONS = {
  // 圖片對應管理權限
  MAPPING_READ: 'mapping:read',
  MAPPING_CREATE: 'mapping:create',
  MAPPING_UPDATE: 'mapping:update',
  MAPPING_DELETE: 'mapping:delete',
  MAPPING_BATCH_UPDATE: 'mapping:batch-update',
  MAPPING_BATCH_DELETE: 'mapping:batch-delete',
  MAPPING_EXPORT: 'mapping:export',

  // 相簿管理權限
  ALBUM_READ: 'album:read',
  ALBUM_CREATE: 'album:create',
  ALBUM_UPDATE: 'album:update',
  ALBUM_DELETE: 'album:delete',
  ALBUM_MANAGE_ITEMS: 'album:manage-items',

  // 統計與審計權限
  STATS_VIEW: 'stats:view',
  AUDIT_LOG_VIEW: 'audit:view',

  // 管理員管理權限（最高權限）
  ADMIN_MANAGE: 'admin:manage',
  ADMIN_DELETE: 'admin:delete',

  // 系統設定權限（最高權限）
  SYSTEM_CONFIG_READ: 'system:config:read',
  SYSTEM_CONFIG_WRITE: 'system:config:write',

  // 收藏功能
  FAVORITE_MANAGE: 'favorite:manage',

  // 短網址功能
  SHORTEN_URL: 'shorten:create',
} as const;

// 定義角色類型
export type Role = 'admin' | 'moderator';

// 定義每個角色可以執行的操作
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  // admin 角色擁有所有權限
  admin: ['*'],

  // moderator 角色擁有中等權限
  moderator: [
    // 圖片管理 - 完整權限
    PERMISSIONS.MAPPING_READ,
    PERMISSIONS.MAPPING_CREATE,
    PERMISSIONS.MAPPING_UPDATE,
    PERMISSIONS.MAPPING_DELETE,
    PERMISSIONS.MAPPING_BATCH_UPDATE,
    // 注意：moderator 不能批量刪除
    PERMISSIONS.MAPPING_EXPORT,

    // 相簿管理 - 完整權限
    PERMISSIONS.ALBUM_READ,
    PERMISSIONS.ALBUM_CREATE,
    PERMISSIONS.ALBUM_UPDATE,
    PERMISSIONS.ALBUM_DELETE,
    PERMISSIONS.ALBUM_MANAGE_ITEMS,

    // 統計查看
    PERMISSIONS.STATS_VIEW,
    PERMISSIONS.AUDIT_LOG_VIEW,

    // 收藏功能
    PERMISSIONS.FAVORITE_MANAGE,

    // 短網址功能
    PERMISSIONS.SHORTEN_URL,

    // 注意：moderator 不能管理其他管理員
    // 注意：moderator 不能修改系統設定
  ],
};

/**
 * 檢查指定角色是否擁有某個權限
 * @param role 角色名稱
 * @param permission 要檢查的權限
 * @returns 是否擁有該權限
 */
export function hasPermission(role: string, permission: string): boolean {
  // 如果角色不存在於定義中，返回 false
  if (!(role in ROLE_PERMISSIONS)) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[role as Role];

  // 如果角色擁有萬用權限（*），則擁有所有權限
  if (rolePermissions.includes('*')) {
    return true;
  }

  // 檢查角色的權限列表中是否包含指定權限
  return rolePermissions.includes(permission);
}

/**
 * 檢查指定角色是否擁有多個權限（需全部滿足）
 * @param role 角色名稱
 * @param permissions 要檢查的權限列表
 * @returns 是否擁有所有權限
 */
export function hasAllPermissions(role: string, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * 檢查指定角色是否擁有多個權限（滿足任一即可）
 * @param role 角色名稱
 * @param permissions 要檢查的權限列表
 * @returns 是否擁有任一權限
 */
export function hasAnyPermission(role: string, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * 獲取角色的所有權限列表
 * @param role 角色名稱
 * @returns 權限列表
 */
export function getRolePermissions(role: string): string[] {
  if (!(role in ROLE_PERMISSIONS)) {
    return [];
  }
  return [...ROLE_PERMISSIONS[role as Role]];
}

/**
 * 權限描述映射（用於顯示和審計日誌）
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.MAPPING_READ]: '查看圖片列表',
  [PERMISSIONS.MAPPING_CREATE]: '上傳新圖片',
  [PERMISSIONS.MAPPING_UPDATE]: '更新圖片資訊',
  [PERMISSIONS.MAPPING_DELETE]: '刪除圖片',
  [PERMISSIONS.MAPPING_BATCH_UPDATE]: '批量更新圖片',
  [PERMISSIONS.MAPPING_BATCH_DELETE]: '批量刪除圖片',
  [PERMISSIONS.MAPPING_EXPORT]: '匯出圖片資料',

  [PERMISSIONS.ALBUM_READ]: '查看相簿',
  [PERMISSIONS.ALBUM_CREATE]: '建立相簿',
  [PERMISSIONS.ALBUM_UPDATE]: '更新相簿資訊',
  [PERMISSIONS.ALBUM_DELETE]: '刪除相簿',
  [PERMISSIONS.ALBUM_MANAGE_ITEMS]: '管理相簿項目',

  [PERMISSIONS.STATS_VIEW]: '查看統計資料',
  [PERMISSIONS.AUDIT_LOG_VIEW]: '查看審計日誌',

  [PERMISSIONS.ADMIN_MANAGE]: '管理管理員',
  [PERMISSIONS.ADMIN_DELETE]: '刪除管理員',

  [PERMISSIONS.SYSTEM_CONFIG_READ]: '查看系統設定',
  [PERMISSIONS.SYSTEM_CONFIG_WRITE]: '修改系統設定',

  [PERMISSIONS.FAVORITE_MANAGE]: '管理收藏',
  [PERMISSIONS.SHORTEN_URL]: '建立短網址',
};

/**
 * 獲取權限的描述
 * @param permission 權限名稱
 * @returns 權限描述
 */
export function getPermissionDescription(permission: string): string {
  return PERMISSION_DESCRIPTIONS[permission] || permission;
}
