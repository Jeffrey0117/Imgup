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

    // 步驟 3: 驗證 Origin/Referer
    if (process.env.ENABLE_ORIGIN_CHECK !== 'false' && !validateOrigin(request)) {
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
      checkSignature: process.env.ENABLE_FILE_SIGNATURE_CHECK !== 'false',
      checkMalicious: process.env.ENABLE_MALICIOUS_CHECK !== 'false',
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

    // 步驟 8: 準備轉發到外部 API
    console.log(`[Upload] Processing file: ${safeFileName} (${image.size} bytes) from ${clientIP}`);

    // 創建 FormData 來轉發到新的 API
    const uploadFormData = new FormData();
    uploadFormData.append("file", image, safeFileName);

    // 步驟 9: 調用外部上傳 API（meteor.today）
    const response = await fetch(
      "https://meteor.today/upload/upload_general_image",
      {
        method: "POST",
        body: uploadFormData,
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://meteor.today/p/times",
          Origin: "https://meteor.today",
        },
        mode: "cors",
        credentials: "include",
      }
    );

    // 步驟 10: 處理 API 回應
    console.log(`[Upload] External API response status: ${response.status}`);

    // 檢查 API 是否失效
    if (response.status === 401 || response.status === 403) {
      await logUploadAttempt(clientIP, false, 'External API auth failed', userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: "API authentication failed",
        },
        { status: 401 }
      );
    }

    if (response.status !== 200) {
      await logUploadAttempt(clientIP, false, `External API error: ${response.status}`, userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: `Upload service error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`[Upload] External API result:`, JSON.stringify(result, null, 2));

    // 記錄成功的上傳
    await logUploadAttempt(clientIP, true, 'Success', userAgent);
    // 步驟 11: 從結果中提取圖片 URL
    const imageUrl = result.result;
    if (!imageUrl) {
      await logUploadAttempt(clientIP, false, 'No image URL in response', userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: "Upload service returned no image URL",
        },
        { status: 500 }
      );
    }

    // 步驟 12: 檢測檔案副檔名
    const fileExtension = detectFileExtensionComprehensive(image.type, imageUrl);
    console.log(`[Upload] Detected file extension: ${fileExtension}`);

    // 步驟 13: 生成短 hash
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

    // 步驟 14: 儲存到資料庫
    try {
      await prisma.mapping.create({
        data: {
          hash,
          url: imageUrl,
          fileExtension: fileExtension || null,
          filename: safeFileName,
          createdAt: new Date(),
        },
      });
      console.log(`[Upload] Saved mapping to database: ${hash} -> ${imageUrl}`);
    } catch (dbError) {
      console.error('[Upload] Database save error:', dbError);
      await logUploadAttempt(clientIP, false, 'Database save failed', userAgent);
      return NextResponse.json(
        {
          status: 0,
          message: "Failed to save upload record",
        },
        { status: 500 }
      );
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
    return NextResponse.json(
      { status: 0, message: "Upload failed" },
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