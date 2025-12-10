
import { rateLimiter } from './rateLimiter';
import { FilterState, MediaDetail, Movie, Season, WatchProviders, Review, CrewMember, CastMember, GENRES, COUNTRIES, ProviderInfo } from '../types';

const BASE_URL = 'https://api.themoviedb.org/3';

class TmdbService {
  private apiKey: string = '';
  private language: string = 'it-IT'; // Default Italian
  // Cache to store total provider counts to handle the "All Selected" logic correctly
  private cachedProviderCount: number = 0;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setLanguage(lang: string) {
    this.language = lang;
  }

  setCachedProviderCount(count: number) {
    this.cachedProviderCount = count;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string | number | null> = {}): Promise<T> {
    if (!this.apiKey) throw new Error('API Key missing');

    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', this.apiKey);
    
    // Allow overriding language if it's passed in params
    // If params.language is explicitly null, we DO NOT append a language (for "All languages" fetch)
    if (params.language === undefined) {
      url.searchParams.append('language', this.language);
    } else if (params.language !== null) {
      url.searchParams.append('language', String(params.language));
    }
    
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'language' && value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    return rateLimiter.enqueue(async () => {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`TMDB API Error: ${res.statusText}`);
      }
      return res.json();
    });
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const url = `${BASE_URL}/configuration?api_key=${key}`;
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }

  async search(query: string): Promise<Movie[]> {
    if (!query) return [];
    const data = await this.fetch<{ results: Movie[] }>('/search/multi', {
      query,
      include_adult: 'false',
      page: 1
    });
    // Filter out people, keep movies/tv
    return data.results.filter(m => m.media_type === 'movie' || m.media_type === 'tv');
  }

  async getTrending(type: 'movie' | 'tv'): Promise<Movie[]> {
    const data = await this.fetch<{ results: Movie[] }>(`/trending/${type}/day`);
    return data.results.map(m => ({ ...m, media_type: type }));
  }

  async getTopRated(type: 'movie' | 'tv'): Promise<Movie[]> {
    const data = await this.fetch<{ results: Movie[] }>(`/${type}/top_rated`);
    return data.results.map(m => ({ ...m, media_type: type }));
  }

  async getPopular(type: 'movie' | 'tv'): Promise<Movie[]> {
    const data = await this.fetch<{ results: Movie[] }>(`/${type}/popular`);
    return data.results.map(m => ({ ...m, media_type: type }));
  }

  async getAvailableProviders(): Promise<ProviderInfo[]> {
    const region = this.language.startsWith('it') ? 'IT' : 'US';
    const data = await this.fetch<{ results: ProviderInfo[] }>('/watch/providers/movie', {
        watch_region: region
    });
    // Cache the count for filter logic
    this.cachedProviderCount = data.results.length;
    return data.results;
  }

  async discover(type: 'movie' | 'tv', page: number, filters: FilterState): Promise<Movie[]> {
    const region = this.language.startsWith('it') ? 'IT' : 'US';
    
    const params: Record<string, string | number> = {
      page,
      sort_by: 'popularity.desc',
      'vote_average.gte': filters.voteAverageMin,
      watch_region: region
    };

    // GENRE LOGIC
    if (filters.includeGenres.length > 0) {
      params.with_genres = filters.includeGenres.join('|'); // OR for inclusion
    }
    if (filters.excludeGenres.length > 0) {
      params.without_genres = filters.excludeGenres.join(','); // AND for exclusion
    }

    // PROVIDER LOGIC
    if (filters.includeProviders.length > 0) {
      params.with_watch_providers = filters.includeProviders.join('|');
    }
    if (filters.excludeProviders.length > 0) {
      params.without_watch_providers = filters.excludeProviders.join('|');
    }

    // Runtime logic (Movies only)
    if (type === 'movie') {
        params['with_runtime.gte'] = filters.runtimeRange[0];
        params['with_runtime.lte'] = filters.runtimeRange[1];
    }

    // Country logic
    if (filters.includeCountries.length > 0) {
       params.with_origin_country = filters.includeCountries.join('|');
    }
    if (filters.excludeCountries.length > 0) {
       params.without_origin_country = filters.excludeCountries.join(',');
    }

    if (type === 'movie') {
      if (filters.yearRange) {
        params['primary_release_date.gte'] = `${filters.yearRange[0]}-01-01`;
        params['primary_release_date.lte'] = `${filters.yearRange[1]}-12-31`;
      }
    } else {
       if (filters.yearRange) {
        params['first_air_date.gte'] = `${filters.yearRange[0]}-01-01`;
        params['first_air_date.lte'] = `${filters.yearRange[1]}-12-31`;
      }
    }

    const data = await this.fetch<{ results: Movie[] }>(`/discover/${type}`, params);
    return data.results.map(m => ({ ...m, media_type: type }));
  }

  // CORE Details (lightweight but includes release dates for local info)
  async getDetails(id: number, type: 'movie' | 'tv', language?: string): Promise<MediaDetail> {
    const params: any = {
      append_to_response: 'release_dates,external_ids'
    };
    if (language) params.language = language;
    const data = await this.fetch<MediaDetail>(`/${type}/${id}`, params);
    return { ...data, media_type: type };
  }

  // SEPARATE FETCH METHODS FOR OPTIMIZATION
  
  async getCredits(id: number, type: 'movie' | 'tv') {
    return this.fetch<{ cast: CastMember[]; crew: CrewMember[] }>(`/${type}/${id}/credits`);
  }

  async getVideos(id: number, type: 'movie' | 'tv', language?: string) {
    const params: any = {};
    if (language) params.language = language;
    // If language is explicitly undefined/null passed here, let fetch handle it
    return this.fetch<{ results: any[] }>(`/${type}/${id}/videos`, params);
  }

  async getSeasonVideos(tvId: number, seasonNumber: number, language?: string | null) {
    const params: any = {};
    if (language !== undefined) params.language = language;
    return this.fetch<{ results: any[] }>(`/tv/${tvId}/season/${seasonNumber}/videos`, params);
  }

  async getRecommendations(id: number, type: 'movie' | 'tv') {
    const data = await this.fetch<{ results: Movie[] }>(`/${type}/${id}/recommendations`);
    return data.results.map(m => ({ ...m, media_type: type }));
  }

  async getReviews(id: number, type: 'movie' | 'tv', language?: string | null) {
    const params: any = {};
    if (language !== undefined) params.language = language;
    const data = await this.fetch<{ results: Review[] }>(`/${type}/${id}/reviews`, params);
    return data.results;
  }

  async getSeason(tvId: number, seasonNumber: number): Promise<Season> {
    return this.fetch<Season>(`/tv/${tvId}/season/${seasonNumber}`);
  }

  async getWatchProviders(id: number, type: 'movie' | 'tv'): Promise<WatchProviders | null> {
    try {
      const data = await this.fetch<{ results: { [key: string]: WatchProviders } }>(`/${type}/${id}/watch/providers`);
      const region = this.language.startsWith('it') ? 'IT' : 'US';
      return data.results[region] || null;
    } catch {
      return null;
    }
  }

  async getImages(id: number, type: 'movie' | 'tv') {
    return this.fetch<{ backdrops: any[], posters: any[] }>(`/${type}/${id}/images`, { include_image_language: 'en,null' });
  }
}

export const tmdbService = new TmdbService();
