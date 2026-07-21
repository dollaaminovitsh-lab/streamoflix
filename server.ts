import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import pg from 'pg';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';

// Load environment variables from .env
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Environment & Keys
// IMPORTANT: Do NOT hard-code secrets in source. Provide them via `.env` or environment variables.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pantyflix_key_123!';
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_gV3rd2nELZsN@ep-dry-salad-za1dlfo7-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres.wipofiounkxmnwgtpmic:6yQA2xJSin4bfbqt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
const APP_URL_RAW = (process.env.APP_URL || '').trim();
const APP_URL = APP_URL_RAW.replace(/\/+$/g, '');

function normalizeUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return '';
  }
}

function getBaseUrl(req: express.Request) {
  const normalizedAppUrl = normalizeUrl(APP_URL);
  if (normalizedAppUrl) {
    return normalizedAppUrl;
  }
  const host = req.get('host') || 'localhost:3000';
  const scheme = req.secure ? 'https' : 'http';
  return `${scheme}://${host}`;
}

// Initialize Stripe Client lazy helper
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    }
    stripe = new Stripe(STRIPE_SECRET_KEY, {} as any);
  }
  return stripe;
}

// Database connections
const neonPool = new pg.Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const supabasePool = new pg.Pool({
  connectionString: SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware to verify User Authentication via JWT cookie
function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign up or sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

// Cookie options helper (secure only in production)
const isProduction = process.env.NODE_ENV === 'production';
function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction, // secure cookies only in production (dev uses http)
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

// ==================== AUTHENTICATION APIS ====================

// Check Me / Session status
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    res.json({ user: null });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const userResult = await neonPool.query('SELECT id, email, is_premium, stripe_customer_id, created_at FROM users WHERE id = $1', [decoded.id]);
    
    if (userResult.rows.length === 0) {
      res.json({ user: null });
      return;
    }

    res.json({ user: userResult.rows[0] });
  } catch (err) {
    res.json({ user: null });
  }
});

// Sign Up API
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    // Check if user exists
    const checkUser = await neonPool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkUser.rows.length > 0) {
      res.status(400).json({ error: 'Email is already registered.' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into Neon users table
    const result = await neonPool.query(
      'INSERT INTO users (email, password, is_premium) VALUES ($1, $2, $3) RETURNING id, email, is_premium, created_at',
      [email.toLowerCase().trim(), hashedPassword, false]
    );

    const user = result.rows[0];

    // Sign JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie('token', token, cookieOptions());

    res.status(201).json({ user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error occurred during registration.' });
  }
});

// Sign In API
app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const userResult = await neonPool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Sign JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie('token', token, cookieOptions());

    res.json({
      user: {
        id: user.id,
        email: user.email,
        is_premium: user.is_premium,
        stripe_customer_id: user.stripe_customer_id,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Internal server error occurred.' });
  }
});

// Sign Out API
app.post('/api/auth/signout', (req, res) => {
  // Clear cookie using same security settings as when set
  const opts: any = { path: '/', sameSite: isProduction ? 'none' : 'lax', secure: isProduction };
  res.clearCookie('token', opts);
  res.json({ success: true });
});


// ==================== STREAMING CONTENT APIS ====================

// Movies API (requires Neon Pool)
app.get('/api/movies', async (req, res) => {
  try {
    const result = await neonPool.query('SELECT * FROM movies ORDER BY release_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch movies error:', err);
    res.status(500).json({ error: 'Could not retrieve movies.' });
  }
});

// Get 6 random items for recommendations
app.get('/api/movies/random', async (req, res) => {
  try {
    const result = await neonPool.query('SELECT * FROM movies ORDER BY random() LIMIT 6');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch random movies error:', err);
    res.status(500).json({ error: 'Could not retrieve featured categories.' });
  }
});

// Single Movie by tmdb_id / database id
app.get('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await neonPool.query('SELECT * FROM movies WHERE id = $1 OR tmdb_id = $2', [
      isNaN(Number(id)) ? -1 : Number(id),
      isNaN(Number(id)) ? -1 : Number(id)
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Movie not found.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch movie by id error:', err);
    res.status(500).json({ error: 'Could not retrieve movie details.' });
  }
});

// Series API (requires Supabase Pool)
app.get('/api/series', async (req, res) => {
  try {
    const result = await supabasePool.query('SELECT * FROM series ORDER BY rating DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch series error:', err);
    res.status(500).json({ error: 'Could not retrieve series.' });
  }
});

// Single Series details
app.get('/api/series/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await supabasePool.query('SELECT * FROM series WHERE id = $1 OR tmdb_id = $2', [
      isNaN(Number(id)) ? -1 : Number(id),
      isNaN(Number(id)) ? -1 : Number(id)
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch series by id error:', err);
    res.status(500).json({ error: 'Could not retrieve series details.' });
  }
});

// Search API (Unified results from both databases)
app.get('/api/search', async (req, res) => {
  const query = req.query.q ? String(req.query.q).toLowerCase().trim() : '';
  if (!query) {
    res.json({ movies: [], series: [] });
    return;
  }

  try {
    // Query Neon movies
    const moviesResult = await neonPool.query(
      'SELECT id, tmdb_id, title, overview, poster_path, backdrop_path, vote_average, genres FROM movies WHERE LOWER(title) LIKE $1 OR LOWER(overview) LIKE $1',
      [`%${query}%`]
    );

    // Query Supabase series
    const seriesResult = await supabasePool.query(
      'SELECT id, tmdb_id, title, description, image, rating, year, genres FROM series WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1',
      [`%${query}%`]
    );

    res.json({
      movies: moviesResult.rows,
      series: seriesResult.rows
    });
  } catch (err) {
    console.error('Search query error:', err);
    res.status(500).json({ error: 'Search operation failed.' });
  }
});


// ==================== STRIPE SUBSCRIPTION INTEGRATION APIS ====================

// Create checkout session for monthly subscribe
app.post('/api/checkout/create-session', authenticateUser, async (req, res) => {
  const user = (req as any).user;
  const baseUrl = process.env.APP_URL || `${req.secure ? 'https' : 'http'}://${req.get('host')}`;

  try {
    // Get full user row
    const userResult = await neonPool.query('SELECT email, stripe_customer_id FROM users WHERE id = $1', [user.id]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User session not found.' });
      return;
    }
    const dbUser = userResult.rows[0];

    const stripeClient = getStripe();
    
    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: dbUser.stripe_customer_id ? undefined : dbUser.email,
      customer: dbUser.stripe_customer_id || undefined,
      client_reference_id: String(user.id),
      metadata: {
        userId: String(user.id)
      },
      success_url: `${getBaseUrl(req)}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl(req)}/subscription-cancelled`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Create stripe checkout session error:', err);
    res.status(500).json({ error: err.message || 'Stripe initialization failed.' });
  }
});

// Verify Checkout Session and grant access
app.post('/api/checkout/verify', authenticateUser, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    res.status(400).json({ error: 'Session ID is required.' });
    return;
  }

  try {
    const stripeClient = getStripe();
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const userId = session.client_reference_id || session.metadata?.userId;
      
      if (!userId) {
        res.status(400).json({ error: 'Could not associate checkout session with a user.' });
        return;
      }

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      // Update user premium flag in Neon
      await neonPool.query(
        'UPDATE users SET is_premium = true, stripe_customer_id = $1, stripe_subscription_id = $2 WHERE id = $3',
        [customerId, subscriptionId, Number(userId)]
      );

      res.json({ success: true, message: 'Subscription completed and verified successfully!' });
    } else {
      res.status(400).json({ error: 'Stripe checkout session has not been fully paid.' });
    }
  } catch (err: any) {
    console.error('Verify checkout session error:', err);
    res.status(500).json({ error: err.message || 'Verification failed.' });
  }
});


// ==================== ADMIN SYSTEM CONTROL APIS ====================

// Helper middleware for admin checks
function checkAdminAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminPassword = req.headers['x-admin-password'];
  const expectedPassword = process.env.VITE_ADMIN_PASSWORD || 'admin';
  
  if (adminPassword === expectedPassword) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Incorrect admin password.' });
  }
}

// Add Movie to Neon
app.post('/api/admin/movies', checkAdminAccess, async (req, res) => {
  const { tmdb_id, title, overview, poster_path, backdrop_path, release_date, vote_average, genres, servers } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Movie title is required.' });
    return;
  }

  try {
    const newTmdbId = tmdb_id || Math.floor(Math.random() * 900000) + 100000;
    const releaseDateVal = release_date ? new Date(release_date) : new Date();
    
    const result = await neonPool.query({
      text: `
        INSERT INTO movies (tmdb_id, title, overview, poster_path, backdrop_path, release_date, vote_average, genres, servers)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      values: [
        newTmdbId,
        title,
        overview || '',
        poster_path || '',
        backdrop_path || '',
        releaseDateVal,
        vote_average || 0,
        genres || [],
        JSON.stringify(servers || {})
      ]
    });

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Admin add movie error:', err);
    res.status(500).json({ error: err.message || 'Failed to add movie.' });
  }
});

// Delete Movie from Neon
app.delete('/api/admin/movies/:id', checkAdminAccess, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await neonPool.query('DELETE FROM movies WHERE id = $1 RETURNING title', [Number(id)]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Movie not found in database.' });
      return;
    }
    res.json({ success: true, message: `Successfully deleted "${result.rows[0].title}".` });
  } catch (err: any) {
    console.error('Admin delete movie error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete movie.' });
  }
});

// Add Series to Supabase
app.post('/api/admin/series', checkAdminAccess, async (req, res) => {
  const { tmdb_id, title, year, description, genres, rating, image, seasons } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Series title is required.' });
    return;
  }

  try {
    const newTmdbId = tmdb_id || Math.floor(Math.random() * 900000) + 100000;

    const result = await supabasePool.query({
      text: `
        INSERT INTO series (tmdb_id, title, year, description, genres, rating, image, seasons)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      values: [
        newTmdbId,
        title,
        year || String(new Date().getFullYear()),
        description || '',
        genres || [],
        rating || 0,
        image || '',
        JSON.stringify(seasons || {})
      ]
    });

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Admin add series error:', err);
    res.status(500).json({ error: err.message || 'Failed to add series.' });
  }
});

// Delete Series from Supabase
app.delete('/api/admin/series/:id', checkAdminAccess, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await supabasePool.query('DELETE FROM series WHERE id = $1 RETURNING title', [Number(id)]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Series not found in database.' });
      return;
    }
    res.json({ success: true, message: `Successfully deleted "${result.rows[0].title}".` });
  } catch (err: any) {
    console.error('Admin delete series error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete series.' });
  }
});


// ==================== DEVELOPMENT DEV SERVER & STATIC MIDDLEWARE ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from compiled dist directory in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('server.ts');

if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Failed to boot Express fullstack server:', err);
  });
}

export default app;
