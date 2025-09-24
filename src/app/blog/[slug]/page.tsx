import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const posts = await getAllPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return (
    <>
      {/* JSON-LD 結構化資料 - Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.title,
            "description": post.description,
            "image": [], // 可以根據需要添加圖片
            "datePublished": post.date,
            "dateModified": post.date,
            "author": {
              "@type": "Person",
              "name": post.author
            },
            "publisher": {
              "@type": "Organization",
              "name": "Duk.tw Team",
              "logo": {
                "@type": "ImageObject",
                "url": "https://duk.tw/logo-imgup.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://duk.tw/blog/${post.slug}`
            },
            "articleSection": post.category,
            "keywords": post.tags?.join(", ")
          })
        }}
      />
      <div className="blog-post-page">
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: '文章未找到 | Duk.tw',
    };
  }

  return {
    title: `${post.title} | Duk.tw 部落格`,
    description: post.description,
    keywords: post.tags?.join(', '),
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // 獲取相關文章（同分類的其他文章）
  const allPosts = await getAllPosts();
  const relatedPosts = allPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3);

  return (
    <div className="blog-post-page">
      <div className="container">
        {/* 導航 */}
        <nav className="post-navigation">
          <Link href="/blog" className="back-link">
            ← 回到部落格
          </Link>
        </nav>

        {/* 文章標頭 */}
        <header className="post-header">
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

          <h1 className="post-title">{post.title}</h1>

          <p className="post-description">{post.description}</p>

          <div className="post-info">
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
        </header>

        {/* 文章內容 */}
        <article className="post-content">
          <div
            dangerouslySetInnerHTML={{ __html: post.htmlContent || '' }}
            className="markdown-content"
          />
        </article>

        {/* 分類連結 */}
        <div className="post-category-link">
          <Link href={`/blog/category/${post.category}`}>
            查看更多 {post.category} 相關文章 →
          </Link>
        </div>

        {/* 相關文章 */}
        {relatedPosts.length > 0 && (
          <section className="related-posts">
            <h2>相關文章</h2>
            <div className="related-posts-grid">
              {relatedPosts.map((relatedPost) => (
                <article key={relatedPost.slug} className="related-post-card">
                  <h3>
                    <Link href={`/blog/${relatedPost.slug}`}>
                      {relatedPost.title}
                    </Link>
                  </h3>
                  <p>{relatedPost.description}</p>
                  <time>
                    {new Date(relatedPost.date).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .blog-post-page {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .post-navigation {
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

        .post-header {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          margin-bottom: 3rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .post-category {
          background: #e9ecef;
          color: #495057;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .post-date {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .post-title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .post-description {
          font-size: 1.2rem;
          color: #6c757d;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .post-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .post-author {
          color: #495057;
          font-weight: 500;
        }

        .post-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .post-tag {
          color: #007bff;
          font-size: 0.875rem;
          background: #e7f3ff;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
        }

        .post-content {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          margin-bottom: 3rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .markdown-content {
          line-height: 1.8;
          color: #2c3e50;
        }

        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          color: #2c3e50;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .markdown-content h1 { font-size: 2rem; border-bottom: 2px solid #e9ecef; padding-bottom: 0.5rem; }
        .markdown-content h2 { font-size: 1.75rem; border-bottom: 1px solid #e9ecef; padding-bottom: 0.5rem; }
        .markdown-content h3 { font-size: 1.5rem; }
        .markdown-content h4 { font-size: 1.25rem; }

        .markdown-content p {
          margin-bottom: 1.5rem;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 1.5rem;
          padding-left: 2rem;
        }

        .markdown-content li {
          margin-bottom: 0.5rem;
        }

        .markdown-content blockquote {
          border-left: 4px solid #007bff;
          padding-left: 1rem;
          margin: 2rem 0;
          color: #6c757d;
          font-style: italic;
        }

        .markdown-content code {
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.875em;
          font-family: 'Monaco', 'Consolas', monospace;
        }

        .markdown-content pre {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5rem 0;
        }

        .markdown-content pre code {
          background: none;
          padding: 0;
        }

        .post-category-link {
          text-align: center;
          margin-bottom: 3rem;
        }

        .post-category-link a {
          color: #007bff;
          text-decoration: none;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          border: 2px solid #007bff;
          border-radius: 25px;
          transition: all 0.3s ease;
        }

        .post-category-link a:hover {
          background: #007bff;
          color: white;
        }

        .related-posts {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .related-posts h2 {
          color: #2c3e50;
          margin-bottom: 2rem;
          text-align: center;
        }

        .related-posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .related-post-card {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1.5rem;
          transition: box-shadow 0.3s ease;
        }

        .related-post-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .related-post-card h3 {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .related-post-card h3 a {
          color: #2c3e50;
          text-decoration: none;
        }

        .related-post-card h3 a:hover {
          color: #007bff;
        }

        .related-post-card p {
          color: #6c757d;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .related-post-card time {
          color: #6c757d;
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }

          .post-header,
          .post-content,
          .related-posts {
            padding: 2rem;
          }

          .post-title {
            font-size: 2rem;
          }

          .related-posts-grid {
            grid-template-columns: 1fr;
          }

          .post-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}