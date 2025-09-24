import Link from 'next/link';
import { getAllPosts, getAllCategories } from '@/lib/blog';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '部落格 | Duk.tw',
  description: '圖床服務相關文章、教學和最佳實踐指南',
  keywords: '圖床服務, 部落格, 教學, 最佳實踐',
  openGraph: {
    title: '部落格 | Duk.tw',
    description: '圖床服務相關文章、教學和最佳實踐指南',
    type: 'website',
  },
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  const categories = await getAllCategories();

  return (
    <div className="blog-page">
      <div className="container">
        <header className="blog-header">
          <h1>部落格</h1>
          <p>圖床服務相關文章、教學和最佳實踐指南</p>
        </header>

        {/* 分類導航 */}
        <nav className="blog-categories">
          <Link href="/blog" className="category-link active">
            全部文章
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/blog/category/${category}`}
              className="category-link"
            >
              {category}
            </Link>
          ))}
        </nav>

        {/* 文章列表 */}
        <div className="posts-grid">
          {posts.length === 0 ? (
            <div className="no-posts">
              <p>目前沒有文章</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.slug} className="post-card">
                <div className="post-meta">
                  <span className="post-category">{post.category}</span>
                  <time className="post-date">
                    {new Date(post.date).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                <h2 className="post-title">
                  <Link href={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>

                <p className="post-description">{post.description}</p>

                <div className="post-footer">
                  <span className="post-author">作者：{post.author}</span>
                  {post.tags && post.tags.length > 0 && (
                    <div className="post-tags">
                      {post.tags.map((tag) => (
                        <span key={tag} className="post-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Link href={`/blog/${post.slug}`} className="read-more">
                  閱讀更多 →
                </Link>
              </article>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .blog-page {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .blog-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .blog-header h1 {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 1rem;
        }

        .blog-header p {
          font-size: 1.2rem;
          color: #6c757d;
          max-width: 600px;
          margin: 0 auto;
        }

        .blog-categories {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .category-link {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          text-decoration: none;
          color: #495057;
          background: white;
          border: 1px solid #dee2e6;
          transition: all 0.3s ease;
        }

        .category-link:hover,
        .category-link.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .post-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .post-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .post-category {
          background: #e9ecef;
          color: #495057;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .post-date {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .post-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .post-title a {
          color: #2c3e50;
          text-decoration: none;
        }

        .post-title a:hover {
          color: #007bff;
        }

        .post-description {
          color: #6c757d;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .post-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .post-author {
          color: #495057;
          font-size: 0.875rem;
        }

        .post-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .post-tag {
          color: #007bff;
          font-size: 0.75rem;
          background: #e7f3ff;
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
        }

        .read-more {
          color: #007bff;
          text-decoration: none;
          font-weight: 500;
          display: inline-block;
          transition: color 0.3s ease;
        }

        .read-more:hover {
          color: #0056b3;
        }

        .no-posts {
          text-align: center;
          padding: 3rem;
          color: #6c757d;
        }

        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }

          .blog-header h1 {
            font-size: 2rem;
          }

          .posts-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .post-card {
            padding: 1.5rem;
          }

          .blog-categories {
            justify-content: flex-start;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }

          .category-link {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}