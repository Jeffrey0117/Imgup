import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  UnifiedImageAccess,
  MemoryCacheProvider,
  ImageAccessRequest,
  ImageMapping
} from "@/lib/unified-access";

const prisma = new PrismaClient();

// 資料來源提供者 - 橋接 Prisma
const prismaDataProvider = async (hash: string): Promise<ImageMapping | null> => {
  try {
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
    });

    if (!mapping) return null;

    return {
      id: mapping.hash,
      url: mapping.url,
      filename: mapping.filename || '',
      fileExtension: (mapping as any).fileExtension,
      createdAt: mapping.createdAt,
      expiresAt: mapping.expiresAt ?? undefined,
      password: mapping.password ?? undefined,
      shortUrl: mapping.shortUrl,
    };
  } catch (error) {
    console.error('Prisma data provider error:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
};

// 初始化統一存取服務
const unifiedAccess = new UnifiedImageAccess(
  new MemoryCacheProvider(),
  prismaDataProvider
);

export async function GET(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash: rawHash } = params;

    // 建構統一請求物件
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const accessRequest: ImageAccessRequest = {
      hash: rawHash,
      headers,
      userAgent: headers['user-agent'] || headers['User-Agent'],
      referer: headers.referer || headers.Referer,
      ip: req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown'
    };

    console.log("Smart Route 統一介面請求:", {
      rawHash,
      userAgent: accessRequest.userAgent?.substring(0, 50),
      referer: accessRequest.referer?.substring(0, 50)
    });

    // 使用統一介面處理請求
    const response = await unifiedAccess.accessImage(accessRequest);

    // 根據回應類型處理結果
    switch (response.type) {
      case 'redirect':
        if (response.url) {
          console.log(`Smart Route 重定向: ${response.url}`);
          return NextResponse.redirect(new URL(response.url, req.url), {
            status: response.statusCode || 302,
          });
        }
        break;

      case 'json':
        if (response.data) {
          console.log(`Smart Route 返回 JSON:`, response.data);
          return NextResponse.json(response.data, {
            status: response.statusCode || 200,
          });
        }
        break;

      case 'error':
        console.error('Smart Route 錯誤:', response);
        return NextResponse.redirect(new URL(`/${rawHash}`, req.url), {
          status: response.statusCode || 302,
        });
    }

    // 預設重定向到原路徑
    return NextResponse.redirect(new URL(`/${rawHash}`, req.url), {
      status: 302,
    });

  } catch (error) {
    console.error("Smart Route 統一介面錯誤:", error);
    // 發生錯誤時，重定向到原路由讓 Next.js 處理
    return NextResponse.redirect(new URL(`/${params.hash}`, req.url), {
      status: 302,
    });
  }
}