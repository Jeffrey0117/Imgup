// 資料儲存工具
export interface UploadedImage {
  id: string; // HASH 值
  filename: string; // 原始檔名
  url: string; // 圖片 URL
  shortUrl: string; // 短網址
  createdAt: Date; // 上傳時間
  expiresAt?: Date; // 過期時間
  password?: string; // 密碼（雜湊後）
}

// 使用 localStorage 作為簡單的儲存方案
const STORAGE_KEY = "upimg_mappings";

export function saveImageMapping(mapping: UploadedImage): void {
  try {
    const mappings = getImageMappings();
    mappings[mapping.id] = mapping;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch (error) {
    console.error("Failed to save image mapping:", error);
  }
}

export function getImageMappings(): Record<string, UploadedImage> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to get image mappings:", error);
    return {};
  }
}

export function getImageMapping(id: string): UploadedImage | null {
  try {
    const mappings = getImageMappings();
    const mapping = mappings[id];

    if (!mapping) return null;

    // 檢查是否過期
    if (mapping.expiresAt && new Date() > new Date(mapping.expiresAt)) {
      deleteImageMapping(id);
      return null;
    }

    return mapping;
  } catch (error) {
    console.error("Failed to get image mapping:", error);
    return null;
  }
}

export function deleteImageMapping(id: string): void {
  try {
    const mappings = getImageMappings();
    delete mappings[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch (error) {
    console.error("Failed to delete image mapping:", error);
  }
}

export function cleanExpiredMappings(): void {
  try {
    const mappings = getImageMappings();
    const now = new Date();
    let hasChanges = false;

    for (const [id, mapping] of Object.entries(mappings)) {
      if (mapping.expiresAt && now > new Date(mapping.expiresAt)) {
        delete mappings[id];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    }
  } catch (error) {
    console.error("Failed to clean expired mappings:", error);
  }
}
