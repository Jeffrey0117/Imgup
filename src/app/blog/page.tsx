import Link from 'next/link';
import { Metadata } from 'next';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  author: string;
  tags?: string[];
}

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

export default function BlogPage() {
  // 暫時使用靜態資料，之後可以改為從 props 或其他方式獲取
  const posts: BlogPost[] = [];
  const categories: string[] = [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#2c3e50', marginBottom: '1rem' }}>部落格</h1>
          <p style={{ fontSize: '1.2rem', color: '#6c757d', maxWidth: '600px', margin: '0 auto' }}>
            圖床服務相關文章、教學和最佳實踐指南
          </p>
        </header>

        {/* 分類導航 */}
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          <Link href="/blog" style={{ padding: '0.5rem 1rem', borderRadius: '20px', textDecoration: 'none', color: 'white', background: '#007bff', border: '1px solid #007bff', transition: 'all 0.3s ease' }}>
            全部文章
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/blog/category/${category}`}
              style={{ padding: '0.5rem 1rem', borderRadius: '20px', textDecoration: 'none', color: '#495057', background: 'white', border: '1px solid #dee2e6', transition: 'all 0.3s ease' }}
            >
              {category}
            </Link>
          ))}
        </nav>

        {/* 文章列表 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d', gridColumn: '1 / -1' }}>
              <p>目前沒有文章</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.slug} style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ background: '#e9ecef', color: '#495057', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: '500' }}>
                    {post.category}
                  </span>
                  <time style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                    {new Date(post.date).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                  <Link href={`/blog/${post.slug}`} style={{ color: '#2c3e50', textDecoration: 'none' }}>
                    {post.title}
                  </Link>
                </h2>

                <p style={{ color: '#6c757d', lineHeight: '1.6', marginBottom: '1.5rem' }}>{post.description}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ color: '#495057', fontSize: '0.875rem' }}>作者：{post.author}</span>
                  {post.tags && post.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {post.tags.map((tag) => (
                        <span key={tag} style={{ color: '#007bff', fontSize: '0.75rem', background: '#e7f3ff', padding: '0.25rem 0.5rem', borderRadius: '8px' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Link href={`/blog/${post.slug}`} style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500', display: 'inline-block', transition: 'color 0.3s ease' }}>
                  閱讀更多 →
                </Link>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}