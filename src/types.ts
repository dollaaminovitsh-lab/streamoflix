export interface User {
  id: number;
  email: string;
  is_premium: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
}

export interface Movie {
  id: number;
  tmdb_id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genres: string[];
  servers: Record<string, string>;
}

export interface Episode {
  title: string;
  servers: Record<string, string>;
}

export interface Season {
  episodes: Record<string, Episode>;
}

export interface Series {
  id: number;
  tmdb_id: number;
  title: string;
  year: string;
  description: string;
  genres: string[];
  rating: number;
  image: string;
  seasons: Record<string, Season>;
  servers?: Record<string, string>;
}
