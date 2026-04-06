import { NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'nicks-test-product';
  const data = await getProductBySlug(slug);
  return NextResponse.json(data);
}
