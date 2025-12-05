// src/app/api/albums/route.ts
// 相册API - 获取用户相册列表和创建相册

import { NextRequest, NextResponse } from 'next/server';
import { AlbumService } from '@/services/album-service';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const albums = await AlbumService.getUserAlbums(session.user.id);

    return NextResponse.json({
      success: true,
      data: albums,
    });
  } catch (error) {
    console.error('Failed to get albums:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve albums' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, isPublic } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Album name is required' },
        { status: 400 }
      );
    }

    const album = await AlbumService.createAlbum({
      userId: session.user.id,
      name,
      description,
      isPublic: isPublic || false,
    });

    return NextResponse.json({
      success: true,
      data: album,
    });
  } catch (error) {
    console.error('Failed to create album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create album' },
      { status: 500 }
    );
  }
}
