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

    // 步驟 11: 處理副檔名並儲存到資料庫
    try {
      // 從外部 API 回應中提取 hash 和 url
      const externalHash = result.hash || result.id;
      const externalUrl = result.url || result.image_url;

      if (externalHash && externalUrl) {
        // 檢測檔案副檔名
        const fileExtension = detectFileExtensionComprehensive(image.type, image.name);
        console.log(`[Upload] Detected file extension: ${fileExtension} for MIME type: ${image.type}`);

        // 產生新的 hash（如果需要加上副檔名）
        const finalHash = generateHashedFilename(externalHash, fileExtension);
        const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://duk.tw'}/${finalHash}`;

        // 儲存到資料庫
        await prisma.mapping.create({
          data: {
            hash: externalHash, // 儲存原始 hash，不包含副檔名
            filename: safeFileName,
            url: externalUrl,
            shortUrl,
            fileExtension, // 儲存副檔名
          },
        });

        console.log(`[Upload] Saved mapping: ${externalHash} -> ${finalHash}`);

        // 修改回傳結果，包含副檔名的 hash
        const modifiedResult = {
          ...result,
          hash: finalHash, // 返回包含副檔名的 hash
          original_hash: externalHash, // 保留原始 hash 以供參考
          extension: fileExtension,
        };

        await logUploadAttempt(clientIP, true, 'Success', userAgent);

        // 記錄效能指標
        const processingTime = Date.now() - startTime;

        return NextResponse.json(
          modifiedResult,
          {
            status: 200,
            headers: {
              'X-Processing-Time': String(processingTime),
            }
          }
        );
      } else {
        // 如果外部 API 回應格式不符合預期，降級處理
        console.warn('[Upload] External API response missing expected fields, falling back');
        await logUploadAttempt(clientIP, true, 'Success (fallback)', userAgent);

        const processingTime = Date.now() - startTime;

        return NextResponse.json(
          result,
          {
            status: 200,
            headers: {
              'X-Processing-Time': String(processingTime),
              'X-Fallback-Mode': 'true',
            }
          }
        );
      }

    } catch (dbError) {
      console.error('[Upload] Database error:', dbError);
      // 如果資料庫儲存失敗，仍返回外部 API 的原始結果
      await logUploadAttempt(clientIP, true, 'Success (no db)', userAgent);

      const processingTime = Date.now() - startTime;

      return NextResponse.json(
        result, // 返回原始結果
        {
          status: 200,
          headers: {
            'X-Processing-Time': String(processingTime),
            'X-Database-Error': 'true',
          }
        }
      );
    }

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