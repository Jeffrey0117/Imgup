import { NextRequest, NextResponse } from "next/server";

// 設定最大檔案大小：4MB (Vercel 免費方案限制)
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes

export async function POST(request: NextRequest) {
  try {
    console.log("API 路由被調用");

    // 檢查請求大小
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { status: 0, message: "檔案大小超過限制（最大 4MB）" },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image") as File;

    console.log("Image:", image?.name, image?.size);

    if (!image) {
      console.log("缺少 image");
      return NextResponse.json(
        { status: 0, message: "Missing image" },
        { status: 400 }
      );
    }

    // 檢查檔案大小
    if (image.size > MAX_FILE_SIZE) {
      console.log("檔案太大:", image.size);
      return NextResponse.json(
        {
          status: 0,
          message: `檔案大小超過限制（最大 ${(
            MAX_FILE_SIZE /
            1024 /
            1024
          ).toFixed(0)}MB）`,
        },
        { status: 413 }
      );
    }

    // 創建 FormData 來轉發到新的 API
    const uploadFormData = new FormData();
    uploadFormData.append("file", image, image.name);

    console.log("開始調用新的 API...");

    // 使用新的上傳 API
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

    console.log("原始 API 響應狀態:", response.status);

    // 檢查 API 是否失效
    if (response.status === 401 || response.status === 403) {
      console.log("API 可能需要重新認證");
      return NextResponse.json(
        {
          status: 0,
          message: "API 認證失效，可能需要重新獲取認證信息",
        },
        { status: 401 }
      );
    }

    if (response.status !== 200) {
      console.log("API 請求失敗，狀態碼:", response.status);
      return NextResponse.json(
        {
          status: 0,
          message: `API 請求失敗，狀態碼: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log("原始 API 響應結果:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);

    // 特別處理 payload 太大的錯誤
    if (
      error instanceof Error &&
      (error.message.includes("payload") || error.message.includes("413"))
    ) {
      return NextResponse.json(
        { status: 0, message: "檔案大小超過 Vercel 限制（最大 4MB）" },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { status: 0, message: "Upload failed" },
      { status: 500 }
    );
  }
}
