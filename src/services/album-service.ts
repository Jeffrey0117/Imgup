// src/services/album-service.ts
// 相册管理服务 - 自动为用户创建默认相册，管理相册项目

import { prisma } from '@/lib/prisma';
import { Album, AlbumItem, Prisma } from '@prisma/client';

export interface CreateAlbumParams {
  userId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isPublic?: boolean;
}

export interface AddToAlbumParams {
  albumId: string;
  mappingId: string;
  order?: number;
}

export class AlbumService {
  /**
   * 为新用户创建默认相册
   */
  static async createDefaultAlbum(userId: string): Promise<Album> {
    try {
      // 检查是否已存在默认相册
      const existing = await prisma.album.findFirst({
        where: { userId, isDefault: true },
      });

      if (existing) {
        return existing;
      }

      // 创建默认相册
      return await prisma.album.create({
        data: {
          userId,
          name: '我的上传',
          description: '系统自动创建的默认相册，用于存储您的所有上传图片',
          isDefault: true,
          isPublic: false,
        },
      });
    } catch (error) {
      console.error('Failed to create default album:', error);
      throw new Error('Default album creation failed');
    }
  }

  /**
   * 创建自定义相册
   */
  static async createAlbum(params: CreateAlbumParams): Promise<Album> {
    try {
      return await prisma.album.create({
        data: {
          userId: params.userId,
          name: params.name,
          description: params.description,
          isDefault: params.isDefault || false,
          isPublic: params.isPublic || false,
        },
      });
    } catch (error) {
      console.error('Failed to create album:', error);
      throw new Error('Album creation failed');
    }
  }

  /**
   * 添加图片到相册
   */
  static async addToAlbum(params: AddToAlbumParams): Promise<AlbumItem> {
    try {
      // 检查相册是否存在
      const album = await prisma.album.findUnique({
        where: { id: params.albumId },
      });

      if (!album) {
        throw new Error('Album not found');
      }

      // 检查图片是否已在相册中
      const existing = await prisma.albumItem.findFirst({
        where: {
          albumId: params.albumId,
          mappingId: params.mappingId,
        },
      });

      if (existing) {
        return existing;
      }

      // 获取当前相册最大order
      const maxOrder = await prisma.albumItem.aggregate({
        where: { albumId: params.albumId },
        _max: { order: true },
      });

      const order = params.order ?? (maxOrder._max.order ?? 0) + 1;

      // 添加到相册
      const item = await prisma.albumItem.create({
        data: {
          albumId: params.albumId,
          mappingId: params.mappingId,
          order,
        },
      });

      // 更新相册的图片计数和更新时间
      await prisma.album.update({
        where: { id: params.albumId },
        data: {
          imageCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      return item;
    } catch (error) {
      console.error('Failed to add to album:', error);
      throw new Error('Failed to add image to album');
    }
  }

  /**
   * 自动添加上传到默认相册
   */
  static async addToDefaultAlbum(userId: string, mappingId: string): Promise<void> {
    try {
      // 获取或创建默认相册
      let defaultAlbum = await prisma.album.findFirst({
        where: { userId, isDefault: true },
      });

      if (!defaultAlbum) {
        defaultAlbum = await this.createDefaultAlbum(userId);
      }

      // 添加到默认相册
      await this.addToAlbum({
        albumId: defaultAlbum.id,
        mappingId,
      });
    } catch (error) {
      console.error('Failed to add to default album:', error);
      // 不抛出错误，避免影响上传流程
    }
  }

  /**
   * 从相册移除图片
   */
  static async removeFromAlbum(albumId: string, mappingId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // 删除相册项
        await tx.albumItem.deleteMany({
          where: { albumId, mappingId },
        });

        // 更新相册计数
        await tx.album.update({
          where: { id: albumId },
          data: {
            imageCount: { decrement: 1 },
            updatedAt: new Date(),
          },
        });
      });
    } catch (error) {
      console.error('Failed to remove from album:', error);
      throw new Error('Failed to remove image from album');
    }
  }

  /**
   * 获取用户所有相册
   */
  static async getUserAlbums(userId: string) {
    try {
      return await prisma.album.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        include: {
          items: {
            take: 4, // 相册封面显示前4张
            orderBy: { order: 'asc' },
            include: {
              mapping: {
                select: {
                  id: true,
                  shortCode: true,
                  imageUrl: true,
                  filename: true,
                },
              },
            },
          },
          _count: {
            select: { items: true },
          },
        },
      });
    } catch (error) {
      console.error('Failed to get user albums:', error);
      throw new Error('Failed to retrieve user albums');
    }
  }

  /**
   * 获取相册详情
   */
  static async getAlbumDetail(albumId: string, page: number = 1, pageSize: number = 50) {
    try {
      const [album, items, total] = await Promise.all([
        prisma.album.findUnique({
          where: { id: albumId },
        }),
        prisma.albumItem.findMany({
          where: { albumId },
          orderBy: { order: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            mapping: {
              select: {
                id: true,
                shortCode: true,
                imageUrl: true,
                filename: true,
                fileSize: true,
                mimeType: true,
                width: true,
                height: true,
                uploadedAt: true,
              },
            },
          },
        }),
        prisma.albumItem.count({
          where: { albumId },
        }),
      ]);

      if (!album) {
        throw new Error('Album not found');
      }

      return {
        album,
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      console.error('Failed to get album detail:', error);
      throw new Error('Failed to retrieve album detail');
    }
  }

  /**
   * 更新相册信息
   */
  static async updateAlbum(
    albumId: string,
    data: { name?: string; description?: string; isPublic?: boolean }
  ): Promise<Album> {
    try {
      return await prisma.album.update({
        where: { id: albumId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to update album:', error);
      throw new Error('Album update failed');
    }
  }

  /**
   * 删除相册（不删除图片本身）
   */
  static async deleteAlbum(albumId: string): Promise<void> {
    try {
      // 检查是否为默认相册
      const album = await prisma.album.findUnique({
        where: { id: albumId },
      });

      if (!album) {
        throw new Error('Album not found');
      }

      if (album.isDefault) {
        throw new Error('Cannot delete default album');
      }

      await prisma.$transaction(async (tx) => {
        // 删除相册项
        await tx.albumItem.deleteMany({
          where: { albumId },
        });

        // 删除相册
        await tx.album.delete({
          where: { id: albumId },
        });
      });
    } catch (error) {
      console.error('Failed to delete album:', error);
      throw new Error('Album deletion failed');
    }
  }

  /**
   * 批量添加到相册
   */
  static async addBatchToAlbum(albumId: string, mappingIds: string[]): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // 获取当前最大order
        const maxOrder = await tx.albumItem.aggregate({
          where: { albumId },
          _max: { order: true },
        });

        let order = (maxOrder._max.order ?? 0) + 1;

        // 批量创建
        for (const mappingId of mappingIds) {
          // 检查是否已存在
          const existing = await tx.albumItem.findFirst({
            where: { albumId, mappingId },
          });

          if (!existing) {
            await tx.albumItem.create({
              data: { albumId, mappingId, order: order++ },
            });
          }
        }

        // 更新相册
        await tx.album.update({
          where: { id: albumId },
          data: {
            imageCount: { increment: mappingIds.length },
            updatedAt: new Date(),
          },
        });
      });
    } catch (error) {
      console.error('Failed to batch add to album:', error);
      throw new Error('Batch add to album failed');
    }
  }

  /**
   * 重新排序相册项
   */
  static async reorderAlbumItems(
    albumId: string,
    items: { mappingId: string; order: number }[]
  ): Promise<void> {
    try {
      await prisma.$transaction(
        items.map(({ mappingId, order }) =>
          prisma.albumItem.updateMany({
            where: { albumId, mappingId },
            data: { order },
          })
        )
      );
    } catch (error) {
      console.error('Failed to reorder album items:', error);
      throw new Error('Album reorder failed');
    }
  }
}
