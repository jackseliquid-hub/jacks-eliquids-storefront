import { Metadata, ResolvingMetadata } from 'next';
import { getProductBySlug, getGlobalSeo } from '@/lib/data';
import ProductJsonLd from '@/components/ProductJsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquid.co.uk';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Omit<Props, 'children'>, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const global = await getGlobalSeo();

  const siteNameSuffix = global?.siteName ? ` | ${global.siteName}` : '';
  const seo = product?.seo || {};
  const title = seo.metaTitle || (product?.name ? `${product.name}${siteNameSuffix}` : global?.defaultTitle);
  const description = seo.metaDescription || (product?.description ? product.description.replace(/<[^>]*>?/gm, '').slice(0, 160) : global?.defaultDescription);
  const canonical = seo.canonicalUrl || (product ? `${SITE_URL}/product/${product.slug}` : undefined);
  const ogTitle = seo.ogTitle || title;
  const ogDescription = seo.ogDescription || description;

  return {
    title: title || "Jack's E-Liquid",
    description: description || "Premium Vape Juice options from Jack's.",
    keywords: seo.keywords || global?.defaultKeywords || undefined,
    alternates: {
      canonical: canonical || undefined,
    },
    openGraph: {
      title: ogTitle || undefined,
      description: ogDescription || undefined,
      url: canonical || undefined,
      siteName: global?.siteName || 'Jacks E-Liquid',
      type: 'website',
      images: product?.image ? [{ url: product.image, alt: product.name }] : 
              global?.defaultOgImage ? [{ url: global.defaultOgImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle || undefined,
      description: ogDescription || undefined,
      images: product?.image ? [product.image] : undefined,
    },
    ...(seo.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ProductSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return (
    <>
      {product && <ProductJsonLd product={product} siteUrl={SITE_URL} />}
      {children}
    </>
  );
}
