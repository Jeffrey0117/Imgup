import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

export interface Post {
  slug: string;
  title: string;
  date: string;
  author: string;
  category: string;
  description: string;
  tags: string[];
  content?: string;
  htmlContent?: string;
}

const postsDirectory = path.join(process.cwd(), 'content/blog');

export async function getAllPosts(): Promise<Post[]> {
  // 確保目錄存在
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || '',
        date: data.date || '',
        author: data.author || '',
        category: data.category || '',
        description: data.description || '',
        tags: data.tags || [],
      } as Post;
    });

  // 按日期排序，最新的在前面
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // 處理 Markdown 內容
    const processedContent = await remark()
      .use(html)
      .process(content);
    const htmlContent = processedContent.toString();

    return {
      slug,
      title: data.title || '',
      date: data.date || '',
      author: data.author || '',
      category: data.category || '',
      description: data.description || '',
      tags: data.tags || [],
      content,
      htmlContent,
    } as Post;
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => post.category === category);
}

export async function getAllCategories(): Promise<string[]> {
  const allPosts = await getAllPosts();
  const categories = allPosts.map(post => post.category);
  return [...new Set(categories)].filter(Boolean);
}

export async function getAllTags(): Promise<string[]> {
  const allPosts = await getAllPosts();
  const allTags = allPosts.flatMap(post => post.tags || []);
  return [...new Set(allTags)].filter(Boolean);
}