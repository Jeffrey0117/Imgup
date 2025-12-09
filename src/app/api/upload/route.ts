import { NextRequest, NextResponse } from "next/server";

// 確保在 Vercel/Serverless 環境不因預設超時而中斷上傳流程
export const runtime = 'nodejs';         // 使用 Node.js 環境（非 edge），避免過短超時
export const dynamic = 'force-dynamic';  // 強制動態，避免快取干擾
export const maxDuration = 60;           // 放寬執行時間限制（秒），依部署平台支援度生效
import {
  uploadRateLimiter,
  getClientIP,
  isIPBlacklisted
} from '@/utils/rate-limit';
import {
  validateFile,
  validateOrigin,
  sanitizeFileName,
  FILE_SIZE_LIMITS
} from '@/utils/file-validation';

// 加入副檔名處理
import { detectFileExtensionComprehensive, generateHashedFilename } from '@/utils/file-extension';

// 加入資料庫儲存
import { prisma } from '@/lib/prisma';
import { generateShortHash, generateUniqueHash } from '@/utils/hash';

// 加入 Upload Manager（舊的外部服務）
import { UploadManager, MeteorProvider } from '@/utils/upload-providers';

// 加入新的統一儲存服務（支援 R2）
import { uploadFile, isProviderAvailable, StorageProvider } from '@/lib/storage';

// 加入安全錯誤處理和日誌
import { formatApiError, logError } from '@/utils/api-errors';
import { logFileOperation, logErrorWithContext } from '@/utils/secure-logger';

// Fallback 到舊的外部上傳服務
async function fallbackToExternalUpload(
  image: File,
  safeFileName: string,
  providerPreference: string,
  clientIP: string,
  userAgent: string | null
): Promise<{ provider: string; url: string; filename?: string; mime?: string } | null> {
  const uploadManager = new UploadManager();
  console.log(`[Upload] External providers: ${uploadManager.getAvailableProviders().join(', ')}`);

  try {
    const result = await uploadManager.upload(image, safeFileName, providerPreference || undefined);
    console.log(`[Upload] External upload result:`, {
      provider: result.provider,
      url: result.url,
    });
    return result;
  } catch (uploadError) {
    console.error('[Upload] UploadManager failed, attempting Meteor emergency fallback:', uploadError);
    try {
      const meteor = new MeteorProvider();
      if (!meteor.enabled) {
        (meteor as any).enabled = true;
      }
      const result = await meteor.upload(image, safeFileName);
      console.log('[Upload] Meteor emergency fallback succeeded');
      return result;
    } catch (meteorError) {
      console.error('[Upload] Meteor emergency fallback failed:', meteorError);
      return null;
    }
  }
}

// 記錄上傳嘗試（用於監控和分析）
async function logUploadAttempt(
  ip: string,
  success: boolean,
  reason?: string,
  userAgent?: string | null
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ip,
    success,
    reason,
    userAgent: userAgent || 'unknown',
  };

  // 在生產環境，可以將此日誌發送到監控服務
  if (process.env.NODE_ENV === 'production') {
    console.log('[Upload Attempt]', JSON.stringify(logEntry));
  } else {
    console.log('[Upload Attempt]', logEntry);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent');
  const debug = process.env.DEBUG_UPLOAD_ERRORS === 'true' || process.env.NODE_ENV !== 'production';

  // 簡單 API Key 驗證（對本站來源豁免）
  // 規則：
  //  1) 若未設定 UPLOAD_API_KEY => 不驗證
  //  2) 若已設定：
  //     - 來自本站網頁（duk.tw 或 NEXT_PUBLIC_BASE_URL 同源）=> 豁免，不需帶 key
  //     - 其他來源（外部工具/腳本）=> 需要帶正確 key
  const requiredKey = (process.env.UPLOAD_API_KEY || '').trim();

  // 判斷是否為本站來源
  const host = request.headers.get('host') || '';
  const originHeader = request.headers.get('origin') || '';
  const refererHeader = request.headers.get('referer') || '';
  const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || '';

  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  };

  const hostHostname = getHostname(`http://${host}`);
  const originHostname = originHeader ? getHostname(originHeader) : '';
  const refererHostname = refererHeader ? getHostname(refererHeader) : '';
  const baseEnvHostname = baseUrlEnv ? getHostname(baseUrlEnv) : '';

  const isFirstParty =
    // 同 host
    (!!hostHostname && (originHostname === hostHostname || refererHostname === hostHostname)) ||
    // 與 NEXT_PUBLIC_BASE_URL 同網域
    (!!baseEnvHostname && (originHostname === baseEnvHostname || refererHostname === baseEnvHostname));

  // 支援的 key 來源
  const providedKey =
    request.headers.get('x-api-key') ||
    request.nextUrl.searchParams.get('key') ||
    request.nextUrl.searchParams.get('apiKey');

  // 僅對「非本站來源」要求 key
  if (requiredKey && !isFirstParty) {
    if (!providedKey || providedKey !== requiredKey) {
      await logUploadAttempt(clientIP, false, 'Invalid API key', userAgent);
      return NextResponse.json(
        { status: 0, message: 'Invalid API key' },
        { status: 401 }
      );
    }
  }

  try {
    // 步驟 1: 檢查 IP 黑名單
    if (isIPBlacklisted(clientIP)) {
      await logUploadAttempt(clientIP, false, 'IP blacklisted', userAgent);
      return NextResponse.json(
        { status: 0, message: 'Access denied' },
        { status: 403 }
      );
    }

    // 步驟 2: Rate Limiting
    const rateLimitResult = await uploadRateLimiter(request);
    if (!rateLimitResult.allowed) {
      await logUploadAttempt(clientIP, false, rateLimitResult.reason, userAgent);

      const headers: HeadersInit = {};
      if (rateLimitResult.retryAfter) {
        headers['Retry-After'] = String(rateLimitResult.retryAfter);
        headers['X-RateLimit-Limit'] = process.env.UPLOAD_RATE_LIMIT_PER_MINUTE || '3';
        headers['X-RateLimit-Remaining'] = '0';
        headers['X-RateLimit-Reset'] = new Date(Date.now() + rateLimitResult.retryAfter * 1000).toISOString();
      }

      return NextResponse.json(
        { status: 0, message: rateLimitResult.reason || 'Too many requests' },
        { status: 429, headers }
      );
    }

    // 步驟 3: 驗證 Origin/Referer（改為僅當明確開啟時才檢查）
    if (process.env.ENABLE_ORIGIN_CHECK === 'true' && !validateOrigin(request)) {
      await logUploadAttempt(clientIP, false, 'Invalid origin', userAgent);
      return NextResponse.json(
        { status: 0, message: 'Invalid request origin' },
        { status: 403 }
      );
    }

    // 步驟 4: 解析表單資料
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      await logUploadAttempt(clientIP, false, 'Invalid form data', userAgent);
      return NextResponse.json(
        { status: 0, message: 'Invalid request format' },
        { status: 400 }
      );
    }

    const image = formData.get("image") as File;
    const password = formData.get("password") as string | null;
    const expiresAt = formData.get("expiresAt") as string | null;

    // 可選：指定上傳 Provider（例如 ?provider=meteor 或 formData provider=meteor）
    // 預設先用 Urusai（可用 form/query 或環境變數覆寫）
    const providerPreference =
      (formData.get("provider") as string | null) ||
      request.nextUrl.searchParams.get("provider") ||
      process.env.DEFAULT_UPLOAD_PROVIDER ||
      'urusai';

    console.log('[Upload] FormData received:', {
      hasImage: !!image,
      password: password ? `[SET: ${password.length} chars]` : '[NOT SET]',
      expiresAt: expiresAt || '[NOT SET]',
    });

    // 步驟 5: 檢查檔案是否存在
    if (!image) {
      await logUploadAttempt(clientIP, false, 'No file provided', userAgent);
      return NextResponse.json(
        { status: 0, message: "Missing image" },
        { status: 400 }
      );
    }

    // 步驟 6: 驗證檔案（包含大小、類型、簽名、惡意內容檢查）
    // 根據用戶身份取得對應的檔案大小限制
    const userTier = rateLimitResult.userContext?.tier || 'guest';
    const maxFileSize = FILE_SIZE_LIMITS[userTier as keyof typeof FILE_SIZE_LIMITS] || FILE_SIZE_LIMITS.guest;

    const validationResult = await validateFile(image, {
      maxSize: maxFileSize,
      // 僅當明確設定為 'true' 才啟用嚴格檢查，避免誤殺導致 400/500
      checkSignature: process.env.ENABLE_FILE_SIGNATURE_CHECK === 'true',
      checkMalicious: process.env.ENABLE_MALICIOUS_CHECK === 'true',
    });

    if (!validationResult.valid) {
      await logUploadAttempt(clientIP, false, validationResult.error, userAgent);
      return NextResponse.json(
        { status: 0, message: validationResult.error || 'Invalid file' },
        { status: 400 }
      );
    }

    // 步驟 7: 清理檔案名稱
    const safeFileName = sanitizeFileName(image.name);

    // 7.1: 阻擋可疑 Logo 重複上傳（可由環境變數 BLOCK_KNOWN_LOGO_UPLOADS 控制，預設啟用）
    try {
      const blockLogo = process.env.BLOCK_KNOWN_LOGO_UPLOADS !== 'false';
      if (blockLogo) {
        const lower = (safeFileName || '').toLowerCase().trim();
        // 常見站內 Logo 檔名模式
        const logoPattern = /^(logo[-_]?imgup|new_logo_with_text3(?:_resize)?)\.(png|webp|jpe?g|gif|svg|bmp|ico)$/i;
        if (logoPattern.test(lower)) {
          console.warn('[Upload] Blocked suspicious logo upload attempt:', {
            file: lower,
            ip: clientIP,
            origin: request.headers.get('origin') || null,
            referer: request.headers.get('referer') || null,
            ua: userAgent || null,
          });
          await logUploadAttempt(clientIP, false, `Blocked suspicious logo upload: ${lower}`, userAgent);
          return NextResponse.json(
            { status: 0, message: 'Blocked suspicious upload' },
            { status: 400 }
          );
        }
      }
    } catch (e) {
      console.warn('[Upload] Logo-block check error:', e);
    }

    // 7.2: 重複檔名防刷（同檔名在時間窗內多次上傳時擋下）
    try {
      const guardEnabled = process.env.ENABLE_DUPLICATE_FILENAME_GUARD !== 'false';
      if (guardEnabled && safeFileName) {
        const threshold = parseInt(process.env.DUP_GUARD_THRESHOLD || '3', 10); // 次數
        const windowMinutes = parseInt(process.env.DUP_GUARD_WINDOW_MINUTES || '60', 10); // 分鐘
        const since = new Date(Date.now() - windowMinutes * 60 * 1000);

        const recent = await prisma.mapping.findMany({
          where: {
            filename: safeFileName,
            createdAt: { gte: since },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.max(threshold, 10),
        });

        // 同 IP 判斷（uploadStats 內含 ipAddress）
        const recentSameIp = recent.filter(r => {
          try {
            const stats = (r as any).uploadStats || {};
            return stats && stats.ipAddress === clientIP;
          } catch {
            return false;
          }
        });

        if (recent.length >= threshold || recentSameIp.length >= Math.max(2, Math.floor(threshold / 2))) {
          await logUploadAttempt(clientIP, false, `Duplicate filename guard hit: ${safeFileName}`, userAgent);
          return NextResponse.json(
            { status: 0, message: 'Too many uploads with the same filename recently' },
            { status: 429 }
          );
        }
      }
    } catch (e) {
      console.warn('[Upload] Duplicate filename guard error:', e);
    }

    // 步驟 8: 使用統一儲存服務上傳（優先 R2，支援 fallback）
    console.log(`[Upload] Processing file: ${safeFileName} (${image.size} bytes) from ${clientIP}`);

    // 先生成 hash（用於 R2 檔名）
    const preHash = await generateUniqueHash(
      `${safeFileName}_${Date.now()}_${Math.random()}`,
      async (hashToCheck: string) => {
        const existing = await prisma.mapping.findUnique({
          where: { hash: hashToCheck }
        });
        return existing !== null;
      }
    );

    // 讀取檔案內容
    const fileBuffer = Buffer.from(await image.arrayBuffer());

    // 決定使用哪個 provider
    const preferredProvider = (providerPreference as StorageProvider) || 'r2';
    console.log(`[Upload] Preferred provider: ${preferredProvider}, R2 available: ${isProviderAvailable('r2')}`);

    let uploadResult: {
      provider: string;
      url: string;
      filename?: string;
      mime?: string;
      key?: string;
      tier?: string;
    } | null = null;
    let storageProvider: StorageProvider = 'urusai';
    let storageTier = 'external';
    let storageKey: string | undefined;

    // 嘗試使用新的統一儲存服務（R2 優先）
    if (isProviderAvailable('r2') && (preferredProvider === 'r2' || !isProviderAvailable(preferredProvider))) {
      console.log('[Upload] Using R2 storage...');
      const r2Result = await uploadFile(fileBuffer, safeFileName, preHash, 'r2');

      if (r2Result.success) {
        console.log(`[Upload] R2 upload success: ${r2Result.key}`);
        storageProvider = 'r2';
        storageTier = 'hot';
        storageKey = r2Result.key;
        uploadResult = {
          provider: 'r2',
          url: `r2://${r2Result.key}`, // 內部標記，實際讀取走 Worker
          filename: safeFileName,
          key: r2Result.key,
          tier: 'hot',
        };
      } else {
        console.warn(`[Upload] R2 failed: ${r2Result.error}, falling back to external services...`);
        // R2 失敗，降級到舊的上傳服務
        const fallbackResult = await fallbackToExternalUpload(image, safeFileName, providerPreference, clientIP, userAgent);
        if (!fallbackResult) {
          await logUploadAttempt(clientIP, false, 'All upload providers failed', userAgent);
          return NextResponse.json(
            { status: 0, message: 'Upload failed. Please try again later.' },
            { status: 500 }
          );
        }
        uploadResult = fallbackResult;
        storageProvider = fallbackResult.provider as StorageProvider;
        storageTier = 'external';
      }
    } else {
      // 使用舊的外部服務
      console.log('[Upload] Using external upload services...');
      const fallbackResult = await fallbackToExternalUpload(image, safeFileName, providerPreference, clientIP, userAgent);
      if (!fallbackResult) {
        await logUploadAttempt(clientIP, false, 'All upload providers failed', userAgent);
        return NextResponse.json(
          { status: 0, message: 'Upload failed. Please try again later.' },
          { status: 500 }
        );
      }
      uploadResult = fallbackResult;
      storageProvider = fallbackResult.provider as StorageProvider;
      storageTier = 'external';
    }

    console.log(`[Upload] Final result:`, {
      provider: storageProvider,
      tier: storageTier,
      key: storageKey,
    });

    // 確保 uploadResult 不為 null
    if (!uploadResult) {
      await logUploadAttempt(clientIP, false, 'Upload result is null', userAgent);
      return NextResponse.json(
        { status: 0, message: 'Upload failed. Please try again later.' },
        { status: 500 }
      );
    }

    // 記錄成功的上傳
    await logUploadAttempt(clientIP, true, `Success via ${uploadResult.provider}`, userAgent);

    // 步驟 9: 提取圖片 URL（R2 用內部標記，外部用真實 URL）
    const imageUrl = uploadResult.url;
    if (!imageUrl) {
      await logUploadAttempt(clientIP, false, 'No image URL in response', userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: "Upload service returned no image URL",
          detail: { provider: uploadResult.provider || null, uploadResult },
        },
        { status: 500 }
      );
    }

    // 步驟 10: 檢測檔案副檔名
    const fileExtension = detectFileExtensionComprehensive(
      uploadResult.mime || image.type,
      storageProvider === 'r2' ? safeFileName : imageUrl
    );
    console.log(`[Upload] Detected file extension: ${fileExtension}`);

    // 步驟 11: 使用預先生成的 hash（R2 已經用這個 hash 存檔了）
    const hash = preHash;
    console.log(`[Upload] Using hash: ${hash}`);

    // 步驟 12: 儲存到資料庫
    try {
      const base =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (typeof process !== "undefined" && process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://duk.tw");
      const shortUrl = `${base}/${hash}${fileExtension || ""}`;

      const userToken = request.cookies.get('user_token')?.value;
      let userId: string | undefined;

      if (userToken) {
        try {
          const session = await prisma.userSession.findUnique({
            where: { token: userToken },
            include: { user: true }
          });

          if (session && session.expiresAt > new Date() && session.user.isActive) {
            userId = session.userId;
            
            await prisma.user.update({
              where: { id: userId },
              data: {
                totalUploads: { increment: 1 }
              }
            });
          }
        } catch (err) {
          console.log('[Upload] User session check failed:', err);
        }
      }

      const mappingData = {
        hash,
        url: imageUrl,
        filename: safeFileName,
        shortUrl,
        createdAt: new Date(),
        password: password || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        fileExtension: fileExtension || null,
        // 新增：儲存相關資訊
        storageProvider: storageProvider,
        storageTier: storageTier,
        storageKey: storageKey || null,
        fileSize: image.size || null,
        contentType: image.type || null,
        uploadStats: {
          userId: userId || null,
          ipAddress: clientIP,
          provider: uploadResult.provider,
          userAgent: userAgent || null,
        }
      };

      console.log('[Upload] Saving to database with data:', {
        hash,
        hasPassword: !!password,
        password: password || null,
        expiresAt: mappingData.expiresAt,
        userId: userId || 'guest',
      });

      await prisma.mapping.create({
        data: mappingData,
      });
      
      console.log(`[Upload] Saved mapping to database: ${hash} -> ${imageUrl} (short: ${shortUrl})`);
    } catch (dbError) {
      console.error('[Upload] Database save error:', dbError);
      await logUploadAttempt(clientIP, false, 'Database save failed', userAgent);
      {
        return NextResponse.json(
          {
            status: 0,
            message: "Failed to save upload record",
            detail: String(dbError),
          },
          { status: 500 }
        );
      }
    }

    // 記錄效能指標
    const processingTime = Date.now() - startTime;
    if (processingTime > 5000) { // 超過 5 秒視為慢速請求
      console.warn(`[Upload] Slow request detected: ${processingTime}ms from ${clientIP}`);
    }

    // 建立短網址（隱藏原始 provider 資訊）
    // 優先使用 duk.tw，只在本地開發時才使用其他網址
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://duk.tw'
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    const shortUrl = `${baseUrl}/${hash}${fileExtension || ""}`;

    // 回傳包含 hash、副檔名和短網址的結果（不回傳原始網址和 provider）
    return NextResponse.json(
      {
        result: hash,
        extension: fileExtension,
        shortUrl: shortUrl,
      },
      {
        status: 200,
        headers: {
          'X-Processing-Time': String(processingTime),
        }
      }
    );

  } catch (error) {
    // 捕獲所有未預期的錯誤
    logErrorWithContext('[Upload] Unexpected error', error, {
      clientIP,
      userAgent
    });
    await logUploadAttempt(clientIP, false, 'Internal error', userAgent);

    // 安全地返回錯誤，開發環境包含詳情，生產環境只返回通用訊息
    const errorResponse = formatApiError(error);
    return NextResponse.json(
      {
        status: 0,
        ...errorResponse,
      },
      { status: 500 }
    );
  }
}

// OPTIONS 請求處理（CORS）
export async function OPTIONS(req: NextRequest) {
  // 只在允許的來源才回應 CORS
  if (!validateOrigin(req)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}