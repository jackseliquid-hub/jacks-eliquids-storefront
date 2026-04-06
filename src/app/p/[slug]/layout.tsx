import { Metadata, ResolvingMetadata } from 'next';
import { getPageBySlug, getGlobalSeo } from '@/lib/data';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Omit<Props, 'children'>, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  const global = await getGlobalSeo();

  const siteNameSuffix = global?.siteName ? ` | ${global.siteName}` : '';
  const title = page?.seo?.metaTitle || (page?.title ? `${page.title}${siteNameSuffix}` : global?.defaultTitle);
  const desc = page?.seo?.metaDescription || (page?.content ? page.content.replace(/<[^>]*>?/gm, '').slice(0, 160) : global?.defaultDescription);

  return {
    title: title || "Jack's E-Liquid",
    description: desc || "Information from Jack's.",
    keywords: page?.seo?.keywords || global?.defaultKeywords || undefined,
    alternates: {
       canonical: page?.seo?.canonicalUrl || undefined
    }
  };
}

export default function GenericPageSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
