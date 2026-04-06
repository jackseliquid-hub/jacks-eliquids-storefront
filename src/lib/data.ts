import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import localProducts from "../data/products.json";
import localCategories from "../data/categories.json";

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface SeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
}

export interface GlobalSeo {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string;
  defaultOgImage?: string;
}

export interface Variation {
  id: string;
  sku: string;
  price: string | null;
  attributes: Record<string, string>;
  inStock: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: string;
  salePrice?: string;
  costPrice?: string;
  weight: number;
  shippingClass?: string;
  trackStock?: boolean;
  image: string;
  gallery?: string[];
  description: string;
  category: string;
  tags?: string[];
  brand?: string;
  supplierId?: string;
  attributes: Record<string, string[]>;
  variations: Variation[];
  status?: 'published' | 'draft';
  seo?: SeoMeta;
}

export interface Blog {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  image?: string;
  status: 'published' | 'draft';
  category?: string;
  tags?: string[];
  publishedAt?: string;
  createdAt?: string;
  seo?: SeoMeta;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: 'published' | 'draft';
  createdAt?: string;
  updatedAt?: string;
  seo?: SeoMeta;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  createdAt?: number;
  seo?: SeoMeta;
}

const USE_FIRESTORE = process.env.NEXT_PUBLIC_USE_FIRESTORE === 'true';

// ─── Products ────────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  if (!USE_FIRESTORE) {
    return localProducts as unknown as Product[];
  }
  try {
    const snapshot = await getDocs(collection(db, "products"));
    return snapshot.docs.map(d => d.data() as Product);
  } catch (err) {
    console.error("Firestore getAllProducts:", err);
    return localProducts as unknown as Product[];
  }
}

export async function getProductById(id: string): Promise<Product | undefined> {
  if (!USE_FIRESTORE) {
    return (localProducts as unknown as Product[]).find(p => p.id === id);
  }
  try {
    const snap = await getDoc(doc(db, "products", id));
    return snap.exists() ? (snap.data() as Product) : undefined;
  } catch (err) {
    console.error("Firestore getProductById:", err);
    return (localProducts as unknown as Product[]).find(p => p.id === id);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  if (!USE_FIRESTORE) {
    return (localProducts as unknown as Product[]).find(p => p.slug === slug);
  }
  try {
    const q = query(collection(db, "products"), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? undefined : (snapshot.docs[0].data() as Product);
  } catch (err) {
    console.error("Firestore getProductBySlug:", err);
    return (localProducts as unknown as Product[]).find(p => p.slug === slug);
  }
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await setDoc(doc(db, "products", id), data, { merge: true });
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<string[]> {
  if (!USE_FIRESTORE) return localCategories;
  try {
    const snap = await getDoc(doc(db, "metadata", "categories"));
    return snap.exists() ? snap.data().categories : localCategories;
  } catch (err) {
    console.error("Firestore getCategories:", err);
    return localCategories;
  }
}

export async function saveCategories(categories: string[]): Promise<void> {
  await setDoc(doc(db, "metadata", "categories"), { categories });
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<TaxonomyItem[]> {
  try {
    const snap = await getDocs(query(collection(db, "tags"), orderBy("name")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaxonomyItem));
  } catch (err) {
    console.error("Firestore getTags:", err);
    return [];
  }
}

export async function addTag(name: string): Promise<void> {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
  await setDoc(doc(db, "tags", id), { name, createdAt: Date.now() });
}

export async function deleteTag(id: string): Promise<void> {
  await deleteDoc(doc(db, "tags", id));
}

// ─── Brands ─────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<TaxonomyItem[]> {
  try {
    const snap = await getDocs(query(collection(db, "brands"), orderBy("name")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaxonomyItem));
  } catch (err) {
    console.error("Firestore getBrands:", err);
    return [];
  }
}

export async function addBrand(name: string): Promise<void> {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
  await setDoc(doc(db, "brands", id), { name, createdAt: Date.now() });
}

export async function deleteBrand(id: string): Promise<void> {
  await deleteDoc(doc(db, "brands", id));
}

// ─── Blogs ──────────────────────────────────────────────────────────────────

export async function getAllBlogs(): Promise<Blog[]> {
  try {
    const snap = await getDocs(query(collection(db, "blogs"), orderBy("createdAt", "desc")));
    return snap.docs.map(d => d.data() as Blog);
  } catch (err) {
    console.error("Firestore getAllBlogs:", err);
    return [];
  }
}

export async function getBlogById(id: string): Promise<Blog | undefined> {
  try {
    const snap = await getDoc(doc(db, "blogs", id));
    return snap.exists() ? (snap.data() as Blog) : undefined;
  } catch (err) {
    console.error("Firestore getBlogById:", err);
    return undefined;
  }
}

export async function getBlogBySlug(slug: string): Promise<Blog | undefined> {
  try {
    const q = query(collection(db, "blogs"), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? undefined : (snapshot.docs[0].data() as Blog);
  } catch (err) {
    console.error("Firestore getBlogBySlug:", err);
    return undefined;
  }
}

export async function updateBlog(id: string, data: Partial<Blog>): Promise<void> {
  await setDoc(doc(db, "blogs", id), data, { merge: true });
}

export async function deleteBlog(id: string): Promise<void> {
  await deleteDoc(doc(db, "blogs", id));
}

// ─── Global SEO ─────────────────────────────────────────────────────────────

export async function getGlobalSeo(): Promise<GlobalSeo | undefined> {
  try {
    const snap = await getDoc(doc(db, "metadata", "seo"));
    return snap.exists() ? (snap.data() as GlobalSeo) : undefined;
  } catch (err) {
    console.error("Firestore getGlobalSeo:", err);
    return undefined;
  }
}

export async function setGlobalSeo(data: GlobalSeo): Promise<void> {
  await setDoc(doc(db, "metadata", "seo"), data, { merge: true });
}

// ─── Pages ──────────────────────────────────────────────────────────────────

export async function getAllPages(): Promise<Page[]> {
  try {
    const snap = await getDocs(query(collection(db, "pages"), orderBy("createdAt", "desc")));
    return snap.docs.map(d => d.data() as Page);
  } catch (err) {
    console.error("Firestore getAllPages:", err);
    return [];
  }
}

export async function getPageById(id: string): Promise<Page | undefined> {
  try {
    const snap = await getDoc(doc(db, "pages", id));
    return snap.exists() ? (snap.data() as Page) : undefined;
  } catch (err) {
    console.error("Firestore getPageById:", err);
    return undefined;
  }
}

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  try {
    const q = query(collection(db, "pages"), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? undefined : (snapshot.docs[0].data() as Page);
  } catch (err) {
    console.error("Firestore getPageBySlug:", err);
    return undefined;
  }
}

export async function updatePage(id: string, data: Partial<Page>): Promise<void> {
  await setDoc(doc(db, "pages", id), data, { merge: true });
}

export async function deletePage(id: string): Promise<void> {
  await deleteDoc(doc(db, "pages", id));
}
