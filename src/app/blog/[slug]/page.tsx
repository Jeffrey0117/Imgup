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
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '2rem 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
        {/* 導航 */}
        <nav style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            ← 回到部落格
          </Link>
        </nav>

        {/* 文章標頭 */}
        <header style={{ background: 'white', borderRadius: '12px', padding: '3rem', marginBottom: '3rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ background: '#e9ecef', color: '#495057', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '500' }}>
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

          <h1 style={{ fontSize: '2.5rem', color: '#2c3e50', marginBottom: '1rem', lineHeight: '1.2' }}>
            {post.title}
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6c757d', lineHeight: '1.6', marginBottom: '2rem' }}>
            {post.description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#495057', fontWeight: '500' }}>作者：{post.author}</span>
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {post.tags.map((tag) => (
                  <span key={tag} style={{ color: '#007bff', fontSize: '0.875rem', background: '#e7f3ff', padding: '0.25rem 0.75rem', borderRadius: '12px' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* 文章內容 */}
        <article style={{ background: 'white', borderRadius: '12px', padding: '3rem', marginBottom: '3rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
          <div
            dangerouslySetInnerHTML={{ __html: post.htmlContent || '' }}
            style={{ lineHeight: '1.8', color: '#2c3e50' }}
          />
        </article>

        {/* 分類連結 */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <Link href={`/blog/category/${post.category}`} style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500', padding: '0.75rem 1.5rem', border: '2px solid #007bff', borderRadius: '25px', transition: 'all 0.3s ease' }}>
            查看更多 {post.category} 相關文章 →
          </Link>
        </div>

        {/* 相關文章 */}
        {relatedPosts.length > 0 && (
          <section style={{ background: 'white', borderRadius: '12px', padding: '3rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '2rem', textAlign: 'center' }}>相關文章</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {relatedPosts.map((relatedPost) => (
                <article key={relatedPost.slug} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '1.5rem', transition: 'box-shadow 0.3s ease' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    <Link href={`/blog/${relatedPost.slug}`} style={{ color: '#2c3e50', textDecoration: 'none' }}>
                      {relatedPost.title}
                    </Link>
                  </h3>
                  <p style={{ color: '#6c757d', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                    {relatedPost.description}
                  </p>
                  <time style={{ color: '#6c757d', fontSize: '0.75rem' }}>
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
    </div>
  );
}