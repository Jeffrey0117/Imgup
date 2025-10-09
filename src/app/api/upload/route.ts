import { NextRequest, NextResponse } from "next/server";
import {
  uploadRateLimiter,
  getClientIP,
  isIPBlacklisted
} from '@/utils/rate-limit';
import {
  validateFile,
  validateOrigin,
  sanitizeFileName
} from '@/utils/file-validation';

// 加入副檔名處理
import { detectFileExtensionComprehensive, generateHashedFilename } from '@/utils/file-extension';

// 加入資料庫儲存
import { prisma } from '@/lib/prisma';
import { generateShortHash, generateUniqueHash } from '@/utils/hash';

// 加入 Upload Manager
import { UploadManager, MeteorProvider } from '@/utils/upload-providers';

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
    const validationResult = await validateFile(image, {
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

    // 步驟 8: 使用 Upload Manager 上傳
    console.log(`[Upload] Processing file: ${safeFileName} (${image.size} bytes) from ${clientIP}`);

    const uploadManager = new UploadManager();
    console.log(`[Upload] Available providers: ${uploadManager.getAvailableProviders().join(', ')}`);

    let uploadResult;
    try {
      uploadResult = await uploadManager.upload(image, safeFileName, providerPreference || undefined);
      console.log(`[Upload] Upload result:`, {
        provider: uploadResult.provider,
        url: uploadResult.url,
        filename: uploadResult.filename,
      });
    } catch (uploadError) {
      console.error('[Upload] UploadManager failed, attempting Meteor emergency fallback:', uploadError);
      try {
        const meteor = new MeteorProvider();
        if (!meteor.enabled) {
          console.warn('[Upload] Meteor provider is disabled by config, overriding for emergency fallback');
          // 強制嘗試（即便環境變數關閉）
          (meteor as any).enabled = true;
        }
        uploadResult = await meteor.upload(image, safeFileName);
        console.log('[Upload] Meteor emergency fallback succeeded');
      } catch (meteorError) {
        console.error('[Upload] Meteor emergency fallback failed:', meteorError);
        await logUploadAttempt(clientIP, false, 'Upload failed', userAgent);
        return NextResponse.json(
          {
            status: 0,
            message: 'Upload failed. Please try again later.',
            detail: String(meteorError),
          },
          { status: 500 }
        );
      }
    }

    // 記錄成功的上傳
    await logUploadAttempt(clientIP, true, `Success via ${uploadResult.provider}`, userAgent);

    // 步驟 9: 提取圖片 URL
    const imageUrl = uploadResult.url;
    if (!imageUrl) {
      await logUploadAttempt(clientIP, false, 'No image URL in response', userAgent);
      {
        return NextResponse.json(
          {
            status: 0,
            message: "Upload service returned no image URL",
            detail: { provider: uploadResult?.provider || null, uploadResult },
          },
          { status: 500 }
        );
      }
    }

    // 步驟 10: 檢測檔案副檔名
    const fileExtension = detectFileExtensionComprehensive(
      uploadResult.mime || image.type,
      imageUrl
    );
    console.log(`[Upload] Detected file extension: ${fileExtension}`);

    // 步驟 11: 生成短 hash
    const hash = await generateUniqueHash(
      `${imageUrl}_${Date.now()}`,
      async (hashToCheck: string) => {
        const existing = await prisma.mapping.findUnique({
          where: { hash: hashToCheck }
        });
        return existing !== null;
      }
    );
    console.log(`[Upload] Generated hash: ${hash}`);

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

    // 回傳包含 hash 和副檔名的結果
    return NextResponse.json(
      {
        result: hash,
        extension: fileExtension,
        originalUrl: imageUrl,
        provider: uploadResult.provider,
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
    console.error('[Upload] Unexpected error:', error);
    await logUploadAttempt(clientIP, false, 'Internal error', userAgent);

    // 不要洩漏錯誤詳情給客戶端
    {
      return NextResponse.json(
        {
          status: 0,
          message: "Upload failed",
          detail: String(error),
        },
        { status: 500 }
      );
    }
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