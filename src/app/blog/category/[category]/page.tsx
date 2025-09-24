import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostsByCategory, getAllCategories } from '@/lib/blog';
import { Metadata } from 'next';

interface PageProps {
  params: {
    category: string;
  };
}

export async function generateStaticParams() {
  const categories = await getAllCategories();

  return categories.map((category) => ({
    category,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const posts = await getPostsByCategory(params.category);

  if (posts.length === 0) {
    return {
      title: '分類未找到 | Duk.tw',
    };
  }

  return {
    title: `${params.category} | Duk.tw 部落格`,
    description: `瀏覽 ${params.category} 分類下的所有文章`,
    keywords: `${params.category}, 部落格, 文章`,
    openGraph: {
      title: `${params.category} | Duk.tw 部落格`,
      description: `瀏覽 ${params.category} 分類下的所有文章`,
      type: 'website',
    },
  };
}

export default async function BlogCategoryPage({ params }: PageProps) {
  const posts = await getPostsByCategory(params.category);
  const allCategories = await getAllCategories();

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="blog-category-page">
      <div className="container">
        <header className="category-header">
          <nav className="category-navigation">
            <Link href="/blog" className="back-link">
              ← 回到部落格
            </Link>
          </nav>

          <h1>{params.category} 分類</h1>
          <p>共 {posts.length} 篇文章</p>
        </header>

        {/* 分類導航 */}
        <nav className="blog-categories">
          <Link href="/blog" className="category-link">
            全部文章
          </Link>
          {allCategories.map((category) => (
            <Link
              key={category}
              href={`/blog/category/${category}`}
              className={`category-link ${category === params.category ? 'active' : ''}`}
            >
              {category}
            </Link>
          ))}
        </nav>

        {/* 文章列表 */}
        <div className="posts-grid">
          {posts.map((post) => (
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
          ))}
        </div>
      </div>

      <style jsx>{`
        .blog-category-page {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .category-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .category-navigation {
          margin-bottom: 2rem;
        }

        .back-link {
          color: #007bff;
          text-decoration: none;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .back-link:hover {
          color: #0056b3;
        }

        .category-header h1 {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 1rem;
        }

        .category-header p {
          font-size: 1.1rem;
          color: #6c757d;
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

        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }

          .category-header h1 {
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

          .post-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}