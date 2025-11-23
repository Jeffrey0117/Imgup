import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import {
  uploadRateLimiter,
  getClientIP,
  isIPBlacklisted
} from '@/utils/rate-limit';
import {
  validateImageUrl,
  extractFilenameFromUrl,
  normalizeImageUrl
} from '@/utils/url-validation';
import { sanitizeFileName } from '@/utils/file-validation';
import { detectFileExtensionComprehensive } from '@/utils/file-extension';
import { prisma } from '@/lib/prisma';
import { generateUniqueHash } from '@/utils/hash';
import { UploadManager } from '@/utils/upload-providers';

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

  if (process.env.NODE_ENV === 'production') {
    console.log('[Upload From URL]', JSON.stringify(logEntry));
  } else {
    console.log('[Upload From URL]', logEntry);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent');

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

    // 步驟 3: 解析請求 body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      await logUploadAttempt(clientIP, false, 'Invalid JSON', userAgent);
      return NextResponse.json(
        { status: 0, message: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { url, password, expiresAt } = body;

    if (!url || typeof url !== 'string') {
      await logUploadAttempt(clientIP, false, 'No URL provided', userAgent);
      return NextResponse.json(
        { status: 0, message: 'Missing or invalid URL' },
        { status: 400 }
      );
    }

    // 步驟 4: 標準化並驗證 URL
    const normalizedUrl = normalizeImageUrl(url);
    console.log(`[Upload From URL] Validating URL: ${normalizedUrl}`);

    const urlValidation = await validateImageUrl(normalizedUrl, true);
    if (!urlValidation.valid) {
      await logUploadAttempt(clientIP, false, urlValidation.error, userAgent);
      return NextResponse.json(
        { status: 0, message: urlValidation.error || 'Invalid URL' },
        { status: 400 }
      );
    }

    // 步驟 5: 在伺服器端下載圖片
    console.log(`[Upload From URL] Downloading image from: ${normalizedUrl}`);

    let imageResponse: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 秒超時

      imageResponse = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UpImg/1.0)',
          'Accept': 'image/*',
        },
      });

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`);
      }
    } catch (error: any) {
      const errorMsg = error.name === 'AbortError'
        ? 'Download timeout (30s exceeded)'
        : `Failed to download: ${error.message}`;

      await logUploadAttempt(clientIP, false, errorMsg, userAgent);
      return NextResponse.json(
        { status: 0, message: errorMsg },
        { status: 400 }
      );
    }

    // 步驟 6: 轉換為 Blob 和 File
    const imageBlob = await imageResponse.blob();
    const originalFilename = extractFilenameFromUrl(normalizedUrl);
    const safeFileName = sanitizeFileName(originalFilename);

    // 檢查檔案大小 (最大 20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (imageBlob.size > MAX_SIZE) {
      await logUploadAttempt(clientIP, false, 'File too large', userAgent);
      return NextResponse.json(
        { status: 0, message: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    const imageFile = new File(
      [imageBlob],
      safeFileName,
      { type: imageBlob.type || 'image/jpeg' }
    );

    console.log(`[Upload From URL] Downloaded file: ${safeFileName} (${imageBlob.size} bytes, ${imageFile.type})`);

    // 步驟 7: 使用 UploadManager 上傳
    const uploadManager = new UploadManager();
    console.log(`[Upload From URL] Available providers: ${uploadManager.getAvailableProviders().join(', ')}`);

    let uploadResult;
    try {
      uploadResult = await uploadManager.upload(imageFile, safeFileName);
      console.log(`[Upload From URL] Upload result:`, {
        provider: uploadResult.provider,
        url: uploadResult.url,
        filename: uploadResult.filename,
      });
    } catch (uploadError) {
      console.error('[Upload From URL] UploadManager failed:', uploadError);
      await logUploadAttempt(clientIP, false, 'Upload failed', userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: 'Upload failed. Please try again later.',
          detail: String(uploadError),
        },
        { status: 500 }
      );
    }

    // 記錄成功的上傳
    await logUploadAttempt(clientIP, true, `Success via ${uploadResult.provider}`, userAgent);

    // 步驟 8: 提取圖片 URL
    const imageUrl = uploadResult.url;
    if (!imageUrl) {
      await logUploadAttempt(clientIP, false, 'No image URL in response', userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: "Upload service returned no image URL",
          detail: { provider: uploadResult?.provider || null, uploadResult },
        },
        { status: 500 }
      );
    }

    // 步驟 9: 檢測檔案副檔名
    const fileExtension = detectFileExtensionComprehensive(
      uploadResult.mime || imageFile.type,
      imageUrl
    );
    console.log(`[Upload From URL] Detected file extension: ${fileExtension}`);

    // 步驟 10: 生成短 hash
    const hash = await generateUniqueHash(
      `${imageUrl}_${Date.now()}`,
      async (hashToCheck: string) => {
        const existing = await prisma.mapping.findUnique({
          where: { hash: hashToCheck }
        });
        return existing !== null;
      }
    );
    console.log(`[Upload From URL] Generated hash: ${hash}`);

    // 步驟 11: 儲存到資料庫
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
          console.log('[Upload From URL] User session check failed:', err);
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
          sourceType: 'url_upload', // 標記為 URL 上傳
          originalUrl: normalizedUrl, // 記錄原始 URL
        }
      };

      console.log('[Upload From URL] Saving to database with data:', {
        hash,
        hasPassword: !!password,
        expiresAt: mappingData.expiresAt,
        userId: userId || 'guest',
        sourceType: 'url_upload',
      });

      await prisma.mapping.create({
        data: mappingData,
      });

      console.log(`[Upload From URL] Saved mapping to database: ${hash} -> ${imageUrl} (short: ${shortUrl})`);
    } catch (dbError) {
      console.error('[Upload From URL] Database save error:', dbError);
      await logUploadAttempt(clientIP, false, 'Database save failed', userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: "Failed to save upload record",
          detail: String(dbError),
        },
        { status: 500 }
      );
    }

    // 記錄效能指標
    const processingTime = Date.now() - startTime;
    if (processingTime > 10000) {
      console.warn(`[Upload From URL] Slow request detected: ${processingTime}ms from ${clientIP}`);
    }

    // 建立短網址
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://duk.tw'
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    const finalShortUrl = `${baseUrl}/${hash}${fileExtension || ""}`;

    return NextResponse.json(
      {
        result: hash,
        extension: fileExtension,
        shortUrl: finalShortUrl,
        originalUrl: normalizedUrl,
      },
      {
        status: 200,
        headers: {
          'X-Processing-Time': String(processingTime),
        }
      }
    );

  } catch (error) {
    console.error('[Upload From URL] Unexpected error:', error);
    await logUploadAttempt(clientIP, false, 'Internal error', userAgent);

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
