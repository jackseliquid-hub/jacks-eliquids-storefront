import { NextResponse } from 'next/server';

/**
 * One-time DB migration for homepage redesign.
 * Uses Supabase Management API (via service key) to run SQL.
 * DELETE THIS FILE after migration.
 */
export async function POST() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: 'Missing env' }, { status: 500 });

  // Extract project ref from Supabase URL
  const projectRef = new URL(url).hostname.split('.')[0];

  const sql = `
    -- 1. Create homepage_showcases table
    CREATE TABLE IF NOT EXISTS homepage_showcases (
      id serial PRIMARY KEY,
      title text NOT NULL,
      product_ids jsonb DEFAULT '[]'::jsonb,
      sort_order int DEFAULT 0,
      active boolean DEFAULT true
    );

    -- 2. RLS
    ALTER TABLE homepage_showcases ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homepage_showcases' AND policyname='anon_read') THEN
        CREATE POLICY anon_read ON homepage_showcases FOR SELECT USING (true);
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homepage_showcases' AND policyname='service_all') THEN
        CREATE POLICY service_all ON homepage_showcases FOR ALL USING (true);
      END IF;
    END $$;

    -- 3. Promo tile columns
    ALTER TABLE promo_tiles ADD COLUMN IF NOT EXISTS position text DEFAULT 'top';
    ALTER TABLE promo_tiles ADD COLUMN IF NOT EXISTS shape text DEFAULT 'rectangle';

    -- 4. Pre-seed showcases (skip if already seeded)
    INSERT INTO homepage_showcases (title, product_ids, sort_order, active)
    SELECT * FROM (VALUES
      ('Top Selling E-Liquids', '[]'::jsonb, 1, true),
      ('Popular Pre-filled Kits', '[]'::jsonb, 2, true),
      ('Best Selling Pod Kits', '[]'::jsonb, 3, true),
      ('Best Selling Vape Kits', '[]'::jsonb, 4, true)
    ) AS v(title, product_ids, sort_order, active)
    WHERE NOT EXISTS (SELECT 1 FROM homepage_showcases LIMIT 1);
  `;

  // Use the Supabase pg-meta SQL endpoint 
  // This is available at /pg/query on the Supabase instance
  const pgRes = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (pgRes.ok) {
    const data = await pgRes.json();
    return NextResponse.json({ success: true, data });
  }

  // Fallback: try the /rest/v1/rpc approach with a temporary function
  // First create the function
  const createFnRes = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Supabase-Admin': key,
    },
    body: JSON.stringify({ query: sql }),
  });

  const errorText = await pgRes.text();
  
  // Alternative: try using the database connection pooler
  // Supabase exposes a SQL endpoint at /query
  const altRes = await fetch(`https://${projectRef}.supabase.co/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (altRes.ok) {
    return NextResponse.json({ success: true, via: 'query endpoint' });
  }

  return NextResponse.json({ 
    error: 'Could not run DDL via API',
    pgStatus: pgRes.status,
    pgBody: errorText,
    altStatus: altRes.status,
    sql_to_run_manually: sql,
  }, { status: 500 });
}
