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
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <nav style={{ marginBottom: '2rem' }}>
            <Link href="/blog" style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              ← 回到部落格
            </Link>
          </nav>

          <h1 style={{ fontSize: '2.5rem', color: '#2c3e50', marginBottom: '1rem' }}>
            {params.category} 分類
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6c757d' }}>
            共 {posts.length} 篇文章
          </p>
        </header>

        {/* 分類導航 */}
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          <Link href="/blog" style={{ padding: '0.5rem 1rem', borderRadius: '20px', textDecoration: 'none', color: '#495057', background: 'white', border: '1px solid #dee2e6', transition: 'all 0.3s ease' }}>
            全部文章
          </Link>
          {allCategories.map((category) => (
            <Link
              key={category}
              href={`/blog/category/${category}`}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                textDecoration: 'none',
                color: category === params.category ? 'white' : '#495057',
                background: category === params.category ? '#007bff' : 'white',
                border: `1px solid ${category === params.category ? '#007bff' : '#dee2e6'}`,
                transition: 'all 0.3s ease'
              }}
            >
              {category}
            </Link>
          ))}
        </nav>

        {/* 文章列表 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
          {posts.map((post) => (
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

              <p style={{ color: '#6c757d', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                {post.description}
              </p>

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
          ))}
        </div>
      </div>
    </div>
  );
}