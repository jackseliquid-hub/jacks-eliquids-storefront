import { NextResponse } from 'next/server';

/**
 * Server-side endpoint to fetch Google Reviews via Places API.
 * - Caches results for 24 hours (via Next.js revalidation)
 * - Never exposes the API key to the browser
 */

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  profile_photo_url?: string;
}

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return NextResponse.json({ reviews: [], error: 'API key or Place ID not configured' });
  }

  try {
    // Use Google Places API (legacy) — fields: reviews, rating, user_ratings_total
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total,name&key=${apiKey}`;

    const res = await fetch(url, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      console.error('Google Places API error:', res.status, await res.text());
      return NextResponse.json({ reviews: [], error: 'API request failed' });
    }

    const data = await res.json();

    if (data.status !== 'OK') {
      console.error('Google Places API status:', data.status, data.error_message);
      return NextResponse.json({ reviews: [], error: data.error_message || data.status });
    }

    const result = data.result;
    const reviews: GoogleReview[] = (result.reviews || []).map((r: any) => ({
      author_name: r.author_name,
      rating: r.rating,
      text: r.text,
      relative_time_description: r.relative_time_description,
      profile_photo_url: r.profile_photo_url || null,
    }));

    return NextResponse.json({
      reviews,
      rating: result.rating || null,
      total_ratings: result.user_ratings_total || null,
      business_name: result.name || null,
    });
  } catch (err) {
    console.error('Google Reviews fetch error:', err);
    return NextResponse.json({ reviews: [], error: 'Failed to fetch reviews' });
  }
}
