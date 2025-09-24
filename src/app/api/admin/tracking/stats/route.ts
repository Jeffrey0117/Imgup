import { NextRequest, NextResponse } from 'next/server';
import { trackingService } from '@/lib/tracking-service';
import { verifyAdminSession } from '@/utils/admin-auth';
import prisma from '@/lib/prisma';

/**
 * 追蹤統計 API
 * GET /api/admin/tracking/stats - 獲取追蹤統計資訊
 * GET /api/admin/tracking/stats?hash=xxx - 獲取特定圖片的統計
 * GET /api/admin/tracking/stats?overview=true - 獲取統計概覽
 */

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限 - 從請求中提取 token
    let token: string | null = null;

    // 嘗試從 Authorization header 獲取
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // 如果沒有，嘗試從 cookie 獲取
    if (!token) {
      token = request.cookies.get("admin_token")?.value || null;
      if (!token) {
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const cookies = cookieHeader.split(";").map((c) => c.trim());
          for (const cookie of cookies) {
            if (cookie.startsWith("admin_token=")) {
              token = cookie.split("=")[1];
              break;
            }
          }
        }
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未授權存取' },
        { status: 401 }
      );
    }

    const authResult = await verifyAdminSession(token);
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: '未授權存取' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    const overview = searchParams.get('overview') === 'true';

    if (hash) {
      // 獲取特定圖片的統計
      const stats = await getImageStats(hash);
      return NextResponse.json({
        success: true,
        data: {
          hash,
          ...stats,
          timestamp: new Date().toISOString()
        }
      });
    } else if (overview) {
      // 獲取統計概覽
      const overviewStats = await getOverviewStats();
      return NextResponse.json({
        success: true,
        data: {
          ...overviewStats,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // 獲取整體統計
      const overallStats = await getOverallStats();
      return NextResponse.json({
        success: true,
        data: {
          ...overallStats,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('獲取追蹤統計失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '獲取統計失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}

// 獲取特定圖片的統計資訊
async function getImageStats(hash: string) {
  try {
    // 從 Redis 獲取即時數據
    const redisViewCount = await trackingService.getViewCount(hash);
    const redisReferrerStats = await trackingService.getReferrerStats(hash);

    // 從資料庫獲取持久化數據
    const mapping = await prisma.mapping.findUnique({
      where: { hash },
      include: {
        referrerStats: {
          orderBy: { accessCount: 'desc' },
          take: 10 // 取前 10 個來源
        }
      }
    });

    const dbViewCount = mapping?.viewCount || 0;
    const dbReferrerStats = mapping?.referrerStats || [];

    return {
      viewCount: {
        redis: redisViewCount,
        database: dbViewCount,
        pending: Math.max(0, redisViewCount - dbViewCount)
      },
      referrerStats: {
        redis: redisReferrerStats,
        database: dbReferrerStats.reduce((acc, stat) => {
          acc[stat.refererDomain] = stat.accessCount;
          return acc;
        }, {} as Record<string, number>),
        topReferrers: dbReferrerStats.map(stat => ({
          domain: stat.refererDomain,
          count: stat.accessCount,
          lastAccess: stat.lastAccessAt
        }))
      },
      mapping: mapping ? {
        filename: mapping.filename,
        createdAt: mapping.createdAt,
        url: mapping.url
      } : null
    };

  } catch (error) {
    console.error(`獲取圖片 ${hash} 統計失敗:`, error);
    throw error;
  }
}

// 獲取整體統計資訊
async function getOverallStats() {
  try {
    // 健康檢查
    const healthCheck = await trackingService.healthCheck();

    // 資料庫統計
    const totalMappings = await prisma.mapping.count();
    const totalViews = await prisma.mapping.aggregate({
      _sum: { viewCount: true }
    });
    const totalReferrerStats = await prisma.referrerStats.count();

    // 熱門來源統計
    const topReferrers = await prisma.referrerStats.groupBy({
      by: ['refererDomain'],
      _sum: { accessCount: true },
      orderBy: { _sum: { accessCount: 'desc' } },
      take: 10
    });

    // 熱門圖片統計
    const topImages = await prisma.mapping.findMany({
      where: { viewCount: { gt: 0 } },
      orderBy: { viewCount: 'desc' },
      take: 10,
      select: {
        hash: true,
        filename: true,
        viewCount: true,
        createdAt: true
      }
    });

    // 今日新增統計
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMappings = await prisma.mapping.count({
      where: { createdAt: { gte: today } }
    });

    return {
      redis: {
        connected: healthCheck.redis,
        pendingSyncCount: healthCheck.pendingSyncCount
      },
      database: {
        totalMappings,
        totalViews: totalViews._sum.viewCount || 0,
        totalReferrerDomains: totalReferrerStats,
        todayNewMappings: todayMappings
      },
      topReferrers: topReferrers.map(stat => ({
        domain: stat.refererDomain,
        totalCount: stat._sum.accessCount || 0
      })),
      topImages: topImages.map(img => ({
        hash: img.hash,
        filename: img.filename,
        viewCount: img.viewCount,
        createdAt: img.createdAt
      }))
    };

  } catch (error) {
    console.error('獲取整體統計失敗:', error);
    throw error;
  }
}

// 獲取統計概覽資訊（用於管理員介面摘要卡片）
async function getOverviewStats() {
  try {
    // 健康檢查
    const healthCheck = await trackingService.healthCheck();

    // 總瀏覽次數
    const totalViews = await prisma.mapping.aggregate({
      _sum: { viewCount: true }
    });

    // 今日瀏覽次數
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 從 AccessLog 計算今日瀏覽次數（因為 Redis 可能沒有歷史數據）
    const todayViewsResult = await prisma.accessLog.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // 熱門圖片 Top 5
    const topImages = await prisma.mapping.findMany({
      where: { viewCount: { gt: 0 } },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        hash: true,
        filename: true,
        viewCount: true,
        createdAt: true
      }
    });

    // 熱門外連來源 Top 5
    const topReferrers = await prisma.referrerStats.groupBy({
      by: ['refererDomain'],
      _sum: { accessCount: true },
      orderBy: { _sum: { accessCount: 'desc' } },
      take: 5
    });

    return {
      summary: {
        totalViews: totalViews._sum.viewCount || 0,
        todayViews: todayViewsResult,
        redisConnected: healthCheck.redis,
        pendingSyncCount: healthCheck.pendingSyncCount
      },
      topImages: topImages.map(img => ({
        hash: img.hash,
        filename: img.filename,
        viewCount: img.viewCount,
        createdAt: img.createdAt
      })),
      topReferrers: topReferrers.map(stat => ({
        domain: stat.refererDomain,
        count: stat._sum.accessCount || 0
      }))
    };

  } catch (error) {
    console.error('獲取統計概覽失敗:', error);
    throw error;
  }
}