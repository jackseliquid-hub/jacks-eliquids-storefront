import { Metadata, ResolvingMetadata } from 'next';
import { getProductBySlug, getGlobalSeo } from '@/lib/data';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Omit<Props, 'children'>, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const global = await getGlobalSeo();

  const siteNameSuffix = global?.siteName ? ` | ${global.siteName}` : '';
  const title = product?.seo?.metaTitle || (product?.name ? `${product.name}${siteNameSuffix}` : global?.defaultTitle);
  const desc = product?.seo?.metaDescription || (product?.description ? product.description.replace(/<[^>]*>?/gm, '').slice(0, 160) : global?.defaultDescription);

  return {
    title: title || "Jack's E-Liquid",
    description: desc || "Premium Vape Juice options from Jack's.",
    keywords: product?.seo?.keywords || global?.defaultKeywords || undefined,
    alternates: {
       canonical: product?.seo?.canonicalUrl || undefined
    }
  };
}

export default function ProductSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
