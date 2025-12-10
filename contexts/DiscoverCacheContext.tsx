
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Movie } from '../types';
import { tmdbService } from '../services/tmdbService';
import { useFilters } from './FiltersContext';
import { useApiKey } from './ApiKeyContext';
import { useLanguage } from './LanguageContext';
import { useFavorites } from './FavoritesContext';

export const SKIPPED_EXPIRATION_DAYS = 30;

interface DiscoverCacheContextType {
  queue: Movie[];
  seenHistory: Movie[];
  isLoading: boolean;
  loadMore: () => Promise<void>;
  markAsSeen: (movie: Movie) => void;
  resetSession: () => void;
  hasOpenedDetail: boolean;
  setHasOpenedDetail: (value: boolean) => void;
}

const DiscoverCacheContext = createContext<DiscoverCacheContextType | undefined>(undefined);

export const DiscoverCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { filters } = useFilters();
  const { apiKey } = useApiKey();
  const { currentLanguage } = useLanguage();
  const { favorites, watched } = useFavorites();
  const [queue, setQueue] = useState<Movie[]>([]);
  
  // Initialize and clean up history based on timestamp
  const initializeHistory = (): { ids: Set<number>, history: Movie[] } => {
    const storedHistory = localStorage.getItem('move_movies_seen_history');
    if (!storedHistory) return { ids: new Set(), history: [] };

    let parsedHistory: Movie[] = JSON.parse(storedHistory);
    const now = Date.now();
    const expirationMs = SKIPPED_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    // Retroactive fix: Assign timestamp to existing items if missing
    // Filter out expired items
    parsedHistory = parsedHistory.map(m => ({
      ...m,
      skippedAt: m.skippedAt || now // Retroactive timestamp assignment
    })).filter(m => {
       const age = now - (m.skippedAt || 0);
       return age < expirationMs;
    });

    // Rebuild the ID set from the cleaned history
    const validIds = new Set(parsedHistory.map(m => m.id));
    
    // Also check stored IDs just in case, but sync with history is safer
    // We prioritize the history list as the source of truth for "Skipped"
    return { ids: validIds, history: parsedHistory };
  };

  const [initialData] = useState(() => initializeHistory());

  // "seenIds" tracks items shown in the discover feed (Skipped + implicitly seen)
  const [seenIds, setSeenIds] = useState<Set<number>>(initialData.ids);

  // "seenHistory" is effectively the "Skipped" list now
  const [seenHistory, setSeenHistory] = useState<Movie[]>(initialData.history);

  // Track if user has opened details at least once in this session (in-memory only)
  const [hasOpenedDetail, setHasOpenedDetail] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const pageRef = useRef(1);
  const totalPagesRef = useRef(500);

  useEffect(() => {
    localStorage.setItem('move_movies_seen_ids', JSON.stringify(Array.from(seenIds)));
  }, [seenIds]);

  useEffect(() => {
    localStorage.setItem('move_movies_seen_history', JSON.stringify(seenHistory));
  }, [seenHistory]);

  // Reset queue when filters change
  useEffect(() => {
    setQueue([]);
    pageRef.current = Math.floor(Math.random() * 50) + 1;
  }, [filters]);

  // When language changes: Clear queue to fetch new movies in correct language
  useEffect(() => {
    setQueue([]); // Force re-fetch
    
    const refreshHistory = async () => {
        if (seenHistory.length === 0) return;
        try {
            const updatedHistory = await Promise.all(
                seenHistory.map(async (movie) => {
                    try {
                         const details = await tmdbService.getDetails(movie.id, movie.media_type || 'movie');
                         return { ...details, media_type: movie.media_type, skippedAt: movie.skippedAt };
                    } catch {
                        return movie;
                    }
                })
            );
            setSeenHistory(updatedHistory);
        } catch (e) {
            console.error(e);
        }
    };
    refreshHistory();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  const loadMore = useCallback(async () => {
    if (isLoading || !apiKey) return;
    setIsLoading(true);

    try {
      const fetchMovies = filters.type === 'movie' || filters.type === 'both';
      const fetchTv = filters.type === 'tv' || filters.type === 'both';

      let newItems: Movie[] = [];

      const randomPageOffset = Math.floor(Math.random() * 5); 
      let currentPage = pageRef.current + randomPageOffset;
      if (currentPage > totalPagesRef.current) currentPage = 1;

      if (fetchMovies) {
        const res = await tmdbService.discover('movie', currentPage, filters);
        newItems = [...newItems, ...res];
      }
      if (fetchTv) {
        const res = await tmdbService.discover('tv', currentPage, filters);
        newItems = [...newItems, ...res];
      }

      for (let i = newItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
      }

      // Filter out:
      // 1. Items already seen in this session/skipped (seenIds)
      // 2. Items in Favorites
      // 3. Items in Watched
      const favIds = new Set(favorites.map(m => m.id));
      const watchedIds = new Set(watched.map(m => m.id));

      const uniqueItems = newItems.filter(item => 
        !seenIds.has(item.id) && 
        !favIds.has(item.id) && 
        !watchedIds.has(item.id)
      );

      setQueue(prev => [...prev, ...uniqueItems]);
      pageRef.current = currentPage + 1;

    } catch (error) {
      console.error("Discover fetch error", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, apiKey, seenIds, isLoading, favorites, watched]);

  const markAsSeen = (movie: Movie) => {
    if (!seenIds.has(movie.id)) {
      setSeenIds(prev => new Set(prev).add(movie.id));
      // Add skippedAt timestamp
      setSeenHistory(prev => [...prev, { ...movie, skippedAt: Date.now() }]);
    }
  };

  const resetSession = () => {
    setSeenIds(new Set());
    setSeenHistory([]);
    setQueue([]);
    pageRef.current = 1;
    localStorage.removeItem('move_movies_seen_ids');
    localStorage.removeItem('move_movies_seen_history');
    loadMore();
  };

  return (
    <DiscoverCacheContext.Provider value={{ queue, seenHistory, isLoading, loadMore, markAsSeen, resetSession, hasOpenedDetail, setHasOpenedDetail }}>
      {children}
    </DiscoverCacheContext.Provider>
  );
};

export const useDiscoverCache = () => {
  const context = useContext(DiscoverCacheContext);
  if (!context) throw new Error('useDiscoverCache must be used within DiscoverCacheProvider');
  return context;
};