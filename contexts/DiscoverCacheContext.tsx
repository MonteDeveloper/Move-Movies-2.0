
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Movie, ProviderInfo } from '../types';
import { tmdbService } from '../services/tmdbService';
import { useFilters } from './FiltersContext';
import { useApiKey } from './ApiKeyContext';
import { useLanguage } from './LanguageContext';
import { useFavorites } from './FavoritesContext';

export const SKIPPED_EXPIRATION_DAYS = 30;
const BATCH_SIZE = 20; // Target new items to add per load
const PAGES_PER_BATCH = 30; // Max API pages to fetch before asking user to continue

interface DiscoverCacheContextType {
  queue: Movie[];
  seenHistory: Movie[];
  isLoading: boolean;
  loadMore: () => Promise<void>;
  markAsSeen: (movie: Movie) => void;
  markAsSeenBatch: (movies: Movie[]) => void;
  resetSession: () => void;
  hasOpenedDetail: boolean;
  setHasOpenedDetail: (value: boolean) => void;
  isEndOfList: boolean;
  isLimitReached: boolean;
  continueSearching: () => void;
  providerCache: Record<number, ProviderInfo[]>;
  updateProviderCache: (id: number, providers: ProviderInfo[]) => void;
  sessionId: number; // Expose session ID for UI sync
}

const DiscoverCacheContext = createContext<DiscoverCacheContextType | undefined>(undefined);

export const DiscoverCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { filters } = useFilters();
  const { apiKey } = useApiKey();
  const { currentLanguage } = useLanguage();
  const { favorites, watched } = useFavorites();
  const [queue, setQueue] = useState<Movie[]>([]);
  
  // Unique ID for the current "stream" of movies. 
  // Used to sync scroll position in UI (reset scroll if sessionId changes).
  const [sessionId, setSessionId] = useState(Date.now());
  
  // Cache for streaming providers to avoid refetching on scroll back
  const [providerCache, setProviderCache] = useState<Record<number, ProviderInfo[]>>({});

  // Initialize and clean up history based on timestamp
  const initializeHistory = (): { ids: Set<number>, history: Movie[] } => {
    const storedHistory = localStorage.getItem('move_movies_seen_history');
    if (!storedHistory) return { ids: new Set(), history: [] };

    let parsedHistory: Movie[] = [];
    try {
        parsedHistory = JSON.parse(storedHistory);
    } catch(e) { return { ids: new Set(), history: [] }; }

    const now = Date.now();
    const expirationMs = SKIPPED_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    // Filter out expired items
    parsedHistory = parsedHistory.map(m => ({
      ...m,
      skippedAt: m.skippedAt || now 
    })).filter(m => {
       const age = now - (m.skippedAt || 0);
       return age < expirationMs;
    });

    const validIds = new Set(parsedHistory.map(m => m.id));
    return { ids: validIds, history: parsedHistory };
  };

  const [initialData] = useState(() => initializeHistory());

  // "seenIds" tracks items shown in the discover feed (Skipped + implicitly seen)
  const [seenIds, setSeenIds] = useState<Set<number>>(initialData.ids);
  const [seenHistory, setSeenHistory] = useState<Movie[]>(initialData.history);

  // Refs to track state synchronously for fast scroll handlers & immediate persistence
  const seenIdsRef = useRef(initialData.ids);
  const seenHistoryRef = useRef(initialData.history);

  // Sync refs with state when state updates (fallback for external updates)
  useEffect(() => {
    seenIdsRef.current = seenIds;
  }, [seenIds]);

  useEffect(() => {
    seenHistoryRef.current = seenHistory;
  }, [seenHistory]);

  const [hasOpenedDetail, setHasOpenedDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEndOfList, setIsEndOfList] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);

  // --- RANDOMIZATION LOGIC REFS ---
  const availablePagesMovieRef = useRef<number[]>([]);
  const availablePagesTvRef = useRef<number[]>([]);
  const totalPagesMovieRef = useRef(0);
  const totalPagesTvRef = useRef(0);
  const probeDoneRef = useRef(false);
  const pagesFetchedSessionRef = useRef(0); 
  const pageLimitRef = useRef(PAGES_PER_BATCH); 

  const resetState = () => {
    setQueue([]);
    setIsEndOfList(false);
    setIsLimitReached(false);
    setSessionId(Date.now()); // Update session ID implies a new stream
    
    pagesFetchedSessionRef.current = 0;
    pageLimitRef.current = PAGES_PER_BATCH;
    
    availablePagesMovieRef.current = [];
    availablePagesTvRef.current = [];
    totalPagesMovieRef.current = 0;
    totalPagesTvRef.current = 0;
    probeDoneRef.current = false;
  };

  useEffect(() => {
    resetState();
  }, [filters]);

  useEffect(() => {
    resetState();
    setProviderCache({});
  }, [currentLanguage]);

  const updateProviderCache = useCallback((id: number, providers: ProviderInfo[]) => {
      setProviderCache(prev => ({ ...prev, [id]: providers }));
  }, []);

  const getNextRandomPage = (availablePages: number[]): number | null => {
      if (availablePages.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * availablePages.length);
      const page = availablePages[randomIndex];
      availablePages[randomIndex] = availablePages[availablePages.length - 1];
      availablePages.pop();
      return page;
  };

  const loadMore = useCallback(async () => {
    // Basic guards
    if (isLoading || !apiKey) return;
    // CRITICAL: Strict guard. If we are already at a terminal state, DO NOT load.
    if (isEndOfList || isLimitReached) return;

    setIsLoading(true);

    // Local trackers to handle state updates within the async function execution
    let localEndOfList = false;
    let localLimitReached = false;

    try {
      const fetchMovies = filters.type === 'movie' || filters.type === 'both';
      const fetchTv = filters.type === 'tv' || filters.type === 'both';
      
      if (!probeDoneRef.current) {
         const probePromises = [];
         
         if (fetchMovies) {
             probePromises.push(tmdbService.discover('movie', 1, filters).then(res => {
                 const total = Math.min(res.total_pages, 500);
                 totalPagesMovieRef.current = total;
                 availablePagesMovieRef.current = Array.from({length: total}, (_, i) => i + 1);
                 return res.total_results;
             }));
         }
         
         if (fetchTv) {
             probePromises.push(tmdbService.discover('tv', 1, filters).then(res => {
                 const total = Math.min(res.total_pages, 500);
                 totalPagesTvRef.current = total;
                 availablePagesTvRef.current = Array.from({length: total}, (_, i) => i + 1);
                 return res.total_results;
             }));
         }
         
         const results = await Promise.all(probePromises);
         const totalAvailable = results.reduce((a, b) => a + b, 0);
         
         probeDoneRef.current = true;

         if (totalAvailable === 0) {
             setIsEndOfList(true);
             setIsLoading(false);
             return; 
         }
      }

      const favIds = new Set(favorites.map(m => m.id));
      const watchedIds = new Set(watched.map(m => m.id));

      let itemsAdded = 0;
      let newBatch: Movie[] = [];
      let consecutiveEmptyFetches = 0;

      // Safety limit: Don't let the loop run forever even if BATCH_SIZE isn't met
      const MAX_LOOPS = 12; 
      let loopCount = 0;

      while (itemsAdded < BATCH_SIZE && loopCount < MAX_LOOPS) {
          loopCount++;

          // Check session limits first
          if (pagesFetchedSessionRef.current >= pageLimitRef.current) {
             setIsLimitReached(true);
             localLimitReached = true;
             break;
          }

          const moviePagesLeft = fetchMovies && (availablePagesMovieRef.current.length > 0);
          const tvPagesLeft = fetchTv && (availablePagesTvRef.current.length > 0);

          if (!moviePagesLeft && !tvPagesLeft) {
              setIsEndOfList(true);
              localEndOfList = true;
              break;
          }
          
          if (consecutiveEmptyFetches > 5) {
              // Forced break to allow user interaction via "Continue" button
              setIsLimitReached(true);
              localLimitReached = true;
              break; 
          }

          const promises = [];
          
          if (moviePagesLeft) {
             const p = getNextRandomPage(availablePagesMovieRef.current);
             if (p) {
                 promises.push(tmdbService.discover('movie', p, filters).then(r => ({type: 'movie', data: r})));
                 pagesFetchedSessionRef.current++;
             }
          }

          if (tvPagesLeft) {
             const p = getNextRandomPage(availablePagesTvRef.current);
             if (p) {
                 promises.push(tmdbService.discover('tv', p, filters).then(r => ({type: 'tv', data: r})));
                 pagesFetchedSessionRef.current++;
             }
          }

          if (promises.length === 0) break;

          let results = [];
          try {
             results = await Promise.all(promises);
          } catch (e) {
             console.error("Batch fetch error", e);
             consecutiveEmptyFetches++;
             continue;
          }

          let rawItems: Movie[] = [];
          results.forEach(r => {
              if (r && r.data && r.data.results) {
                  rawItems.push(...r.data.results);
              }
          });
          
          if (rawItems.length === 0) {
              consecutiveEmptyFetches++;
              continue;
          }
          
          const validItems = rawItems.filter(item => 
            !seenIdsRef.current.has(item.id) && 
            !favIds.has(item.id) && 
            !watchedIds.has(item.id)
          );

          if (validItems.length > 0) {
              consecutiveEmptyFetches = 0; 
              // Shuffle batch
              for (let i = validItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [validItems[i], validItems[j]] = [validItems[j], validItems[i]];
              }
              newBatch.push(...validItems);
              itemsAdded += validItems.length;
          } else {
              consecutiveEmptyFetches++;
          }
      }

      if (newBatch.length > 0) {
          setQueue(prev => [...prev, ...newBatch]);
      } else {
          // CRITICAL: If we added NO items in this run, we must set a terminal state.
          // We use local vars because React state (isEndOfList) won't update until next render.
          if (!localEndOfList && !localLimitReached && !isEndOfList && !isLimitReached) {
             setIsLimitReached(true);
          }
      }

    } catch (error) {
      console.error("Discover fetch error", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, apiKey, isLoading, favorites, watched, isEndOfList, isLimitReached]);

  const continueSearching = useCallback(() => {
     pageLimitRef.current += PAGES_PER_BATCH;
     setIsLimitReached(false);
  }, []);

  const markAsSeenBatch = useCallback((movies: Movie[]) => {
      const now = Date.now();
      const currentIds = seenIdsRef.current;
      const currentHistory = seenHistoryRef.current;
      
      const itemsToAdd: Movie[] = [];
      const nextIds = new Set(currentIds);
      let changed = false;

      movies.forEach(m => {
          if (!nextIds.has(m.id)) {
              nextIds.add(m.id);
              itemsToAdd.push({ ...m, skippedAt: now });
              changed = true;
          }
      });

      if (changed) {
          const nextHistory = [...currentHistory, ...itemsToAdd];
          seenIdsRef.current = nextIds;
          seenHistoryRef.current = nextHistory;
          try {
              localStorage.setItem('move_movies_seen_ids', JSON.stringify(Array.from(nextIds)));
              localStorage.setItem('move_movies_seen_history', JSON.stringify(nextHistory));
          } catch (e) { console.error("Save error", e); }
          setSeenIds(nextIds);
          setSeenHistory(nextHistory);
      }
  }, []);

  const markAsSeen = useCallback((movie: Movie) => {
    markAsSeenBatch([movie]);
  }, [markAsSeenBatch]);

  const resetSession = () => {
    const emptyIds = new Set<number>();
    const emptyHistory: Movie[] = [];
    seenIdsRef.current = emptyIds;
    seenHistoryRef.current = emptyHistory;
    localStorage.removeItem('move_movies_seen_ids');
    localStorage.removeItem('move_movies_seen_history');
    setSeenIds(emptyIds);
    setSeenHistory(emptyHistory);
    setQueue([]);
    setProviderCache({});
    resetState();
    
    // Force reset on next tick
    setTimeout(() => {
        setIsLimitReached(false);
        setIsEndOfList(false);
    }, 0);
  };

  return (
    <DiscoverCacheContext.Provider value={{ 
        queue, 
        seenHistory, 
        isLoading, 
        loadMore, 
        markAsSeen, 
        markAsSeenBatch,
        resetSession, 
        hasOpenedDetail, 
        setHasOpenedDetail, 
        isEndOfList, 
        isLimitReached, 
        continueSearching, 
        providerCache, 
        updateProviderCache,
        sessionId
    }}>
      {children}
    </DiscoverCacheContext.Provider>
  );
};

export const useDiscoverCache = () => {
  const context = useContext(DiscoverCacheContext);
  if (!context) throw new Error('useDiscoverCache must be used within DiscoverCacheProvider');
  return context;
};
