import pg from 'pg';
import fs from 'fs';

const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres.wipofiounkxmnwgtpmic:6yQA2xJSin4bfbqt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function seed() {
  console.log('Connecting to Supabase Database...');
  const client = new pg.Client({
    connectionString: SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // Create series table
    console.log('Ensuring series table exists in Supabase...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS series (
        id serial PRIMARY KEY,
        tmdb_id integer UNIQUE,
        title text NOT NULL,
        year text,
        description text,
        genres text[] DEFAULT '{}',
        rating numeric DEFAULT 0,
        image text,
        seasons jsonb DEFAULT '{}'::jsonb,
        servers jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Load data from JSON
    console.log('Loading series_seed.json...');
    const data = JSON.parse(fs.readFileSync('./series_seed.json', 'utf8'));

    console.log(`Found ${data.length} series to seed. Starting upsert...`);
    for (const item of data) {
      const genresArray = item.genres || [];

      await client.query({
        text: `
          INSERT INTO series (tmdb_id, title, year, description, genres, rating, image, seasons, servers)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            title = EXCLUDED.title,
            year = EXCLUDED.year,
            description = EXCLUDED.description,
            genres = EXCLUDED.genres,
            rating = EXCLUDED.rating,
            image = EXCLUDED.image,
            seasons = EXCLUDED.seasons,
            servers = EXCLUDED.servers,
            updated_at = now()
        `,
        values: [
          item.id,
          item.title,
          item.year || '',
          item.description || '',
          genresArray,
          parseFloat(item.rating || 0),
          item.image || '',
          JSON.stringify(item.seasons || {}),
          JSON.stringify(item.servers || {})
        ]
      });
    }

    console.log('Supabase database seeded successfully!');
  } catch (err) {
    console.error('Error seeding Supabase database:', err);
  } finally {
    await client.end();
  }
}

seed();
