// filepath: apps/web/app/blog/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/utils/supabase/admin';

export const metadata: Metadata = {
  title: '物件部落格 | 房東管理系統',
  description: '瀏覽最新的房產銷售與出租資訊',
};

interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string | null;
  tags: string[];
  published_at: string;
  view_count: number;
}

async function getPublishedBlogs(): Promise<BlogListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      'id, title, slug, excerpt, featured_image_url, category, tags, published_at, view_count'
    )
    .eq('status', 'published')
    .not('property_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as BlogListItem[];
}

export default async function BlogListPage() {
  const blogs = await getPublishedBlogs();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">物件部落格</h1>
          <p className="mt-2 text-gray-500">
            瀏覽最新的房產銷售與出租資訊
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {blogs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">目前沒有已發佈的物件部落格</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blog/${blog.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {blog.featured_image_url ? (
                  <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                    <img
                      src={blog.featured_image_url}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <span className="text-4xl opacity-30">🏠</span>
                  </div>
                )}
                <div className="p-5">
                  {blog.category && (
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded mb-2">
                      {blog.category === 'property_sale' ? '出售' : '出租'}
                    </span>
                  )}
                  <h2 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {blog.title}
                  </h2>
                  {blog.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {blog.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {blog.published_at && (
                      <span>
                        {new Date(blog.published_at).toLocaleDateString('zh-TW')}
                      </span>
                    )}
                    {blog.view_count > 0 && (
                      <span>{blog.view_count} 次瀏覽</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
