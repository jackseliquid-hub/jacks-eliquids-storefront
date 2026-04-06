import { Metadata } from 'next';
import { getBlogBySlug, getGlobalSeo } from '@/lib/data';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  const global = await getGlobalSeo();

  const title = blog?.seo?.metaTitle || blog?.title || global?.defaultTitle || "Jack's E-Liquid";
  const desc = blog?.seo?.metaDescription || global?.defaultDescription || "Vaping updates from Jack's";

  return {
    title,
    description: desc,
    keywords: blog?.seo?.keywords || global?.defaultKeywords || undefined,
    alternates: {
       canonical: blog?.seo?.canonicalUrl || undefined
    }
  };
}

export default function BlogSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
