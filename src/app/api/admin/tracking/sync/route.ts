import { NextRequest, NextResponse } from 'next/server';
import { trackingService } from '@/lib/tracking-service';
import { verifyAdminSession } from '@/utils/admin-auth';

/**
 * 追蹤數據同步 API
 * POST /api/admin/tracking/sync - 手動觸發 Redis 數據同步到資料庫
 * GET /api/admin/tracking/sync - 獲取同步狀態和健康檢查
 */

// 手動觸發同步
export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    const authResult = await verifyAdminSession(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: '未授權存取' },
        { status: 401 }
      );
    }

    console.log(`管理員 ${authResult.admin?.username} 觸發追蹤數據同步`);

    // 執行同步
    const syncedCount = await trackingService.syncToDatabase();

    // 回傳同步結果
    return NextResponse.json({
      success: true,
      data: {
        syncedCount,
        timestamp: new Date().toISOString(),
        triggeredBy: authResult.admin?.username
      }
    });

  } catch (error) {
    console.error('追蹤數據同步失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '同步失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}

// 獲取同步狀態
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const authResult = await verifyAdminSession(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: '未授權存取' },
        { status: 401 }
      );
    }

    // 健康檢查
    const healthCheck = await trackingService.healthCheck();

    return NextResponse.json({
      success: true,
      data: {
        redis: {
          connected: healthCheck.redis,
          pendingSyncCount: healthCheck.pendingSyncCount
        },
        service: {
          isConnected: trackingService.isRedisConnected(),
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('獲取追蹤服務狀態失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '獲取狀態失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}