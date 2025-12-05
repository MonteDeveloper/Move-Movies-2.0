import 'styled-components';

export interface Movie {
  id: number;
  title?: string;
  name?: string; // For TV shows
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  original_language?: string;
  original_title?: string;
  origin_country?: string[];
}

export interface Video {
  id: string;
  key: string;
  site: string;
  type: string;
  official: boolean;
}

export interface ProviderInfo {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  link?: string;
  flatrate?: ProviderInfo[];
  rent?: ProviderInfo[];
  buy?: ProviderInfo[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  episode_number: number;
  season_number: number;
  vote_average: number;
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string;
  episodes?: Episode[]; // Fetched separately
}

export interface Review {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  url: string;
  iso_639_1?: string;
}

export interface ProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface ReleaseDate {
  certification: string;
  descriptors: string[];
  iso_639_1: string;
  note: string;
  release_date: string;
  type: number;
}

export interface ReleaseDatesResult {
  iso_3166_1: string;
  release_dates: ReleaseDate[];
}

export interface MediaDetail extends Movie {
  genres: { id: number; name: string }[];
  runtime?: number; // Minutes
  credits?: {
    cast: CastMember[];
    crew: CrewMember[];
  };
  videos?: {
    results: Video[];
  };
  'watch/providers'?: {
    results: {
      [key: string]: WatchProviders;
    };
  };
  seasons?: Season[];
  reviews?: {
    results: Review[];
  };
  recommendations?: {
    results: Movie[];
  };
  tagline?: string;
  production_companies?: ProductionCompany[];
  release_dates?: {
    results: ReleaseDatesResult[];
  };
  external_ids?: {
    imdb_id?: string;
    facebook_id?: string;
    instagram_id?: string;
    twitter_id?: string;
  };
  imdb_id?: string;
  status?: string; // "Returning Series", "Ended", "Released", etc.
}

export interface FilterState {
  type: 'movie' | 'tv' | 'both';
  yearRange: [number, number];
  voteAverageMin: number;
  withGenres: number[]; // Array of IDs
  genreMode: 'include' | 'exclude';
  withProviders: number[]; // Array of Provider IDs
  providerMode: 'include' | 'exclude';
  runtimeRange: [number, number]; // New: Minutes
  withCountries: string[]; // New: ISO codes
  countryMode: 'include' | 'exclude'; // New
}

export interface ThemeType {
  primary: string;
  accent: string;
  background: string;
  backgroundLight: string;
  text: string;
  textSecondary: string;
  border: string;
  borderRadius: string;
  spacing: (factor: number) => string;
}

// Augment styled-components DefaultTheme
declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}

export const GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" }
];

// Helper to look up genre names
export const getGenreName = (id: number): string => {
  return GENRES.find(g => g.id === id)?.name || "Unknown";
};

// Static providers replaced by dynamic fetch, keeping structure for compatibility if needed
export const PROVIDERS = []; 

export const SPECIAL_PROVIDER_IMAGES = []; 

export const COUNTRIES = [
  { iso: 'US', name: 'USA' },
  { iso: 'IT', name: 'Italia' },
  { iso: 'GB', name: 'United Kingdom' },
  { iso: 'FR', name: 'France' },
  { iso: 'JP', name: 'Japan' },
  { iso: 'KR', name: 'South Korea' },
  { iso: 'DE', name: 'Germany' },
  { iso: 'ES', name: 'Spain' },
  { iso: 'CN', name: 'China' },
  { iso: 'IN', name: 'India' },
];