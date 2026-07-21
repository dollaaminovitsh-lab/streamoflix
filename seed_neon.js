import pg from 'pg';
import fs from 'fs';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_gV3rd2nELZsN@ep-dry-salad-za1dlfo7-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function seed() {
  console.log('Connecting to Neon Database...');
  const client = new pg.Client({
    connectionString: NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // Create movies table
    console.log('Ensuring movies table exists in Neon...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id serial PRIMARY KEY,
        tmdb_id integer UNIQUE,
        title text NOT NULL,
        overview text,
        poster_path text,
        backdrop_path text,
        release_date timestamptz,
        vote_average numeric DEFAULT 0,
        genre_ids integer[] DEFAULT '{}',
        genres text[] DEFAULT '{}',
        video_url text,
        servers jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Create users table
    console.log('Ensuring users table exists in Neon...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_premium BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255)
      );
    `);

    // Load data from JSON
    console.log('Loading movies.json...');
    const data = JSON.parse(fs.readFileSync('./movies.json', 'utf8'));

    console.log(`Found ${data.length} movies to seed. Starting upsert...`);
    for (const movie of data) {
      // release_date should be a valid Date or null
      const releaseDate = movie.release_date ? new Date(movie.release_date) : null;
      // Convert genres list into PG array format e.g. {"Action","Adventure"}
      const genresArray = movie.genres || [];

      await client.query({
        text: `
          INSERT INTO movies (tmdb_id, title, overview, poster_path, backdrop_path, release_date, vote_average, genres, servers)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            title = EXCLUDED.title,
            overview = EXCLUDED.overview,
            poster_path = EXCLUDED.poster_path,
            backdrop_path = EXCLUDED.backdrop_path,
            release_date = EXCLUDED.release_date,
            vote_average = EXCLUDED.vote_average,
            genres = EXCLUDED.genres,
            servers = EXCLUDED.servers,
            updated_at = now()
        `,
        values: [
          movie.id,
          movie.title,
          movie.overview || movie.description || '',
          movie.poster_path || '',
          movie.backdrop_path || '',
          releaseDate,
          movie.vote_average || 0,
          genresArray,
          JSON.stringify(movie.servers || {})
        ]
      });
    }

    console.log('Neon database seeded successfully!');
  } catch (err) {
    console.error('Error seeding Neon database:', err);
  } finally {
    await client.end();
  }
}

seed();
