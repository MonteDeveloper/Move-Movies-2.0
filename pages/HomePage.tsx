
import React, { useEffect, useState, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { tmdbService } from '../services/tmdbService';
import MovieCard from '../components/MovieCard';
import { Movie } from '../types';
import { useTranslation } from 'react-i18next';
import { SkeletonPulse } from '../components/Skeleton';
import { useLanguage } from '../contexts/LanguageContext';
import SearchBar from '../components/SearchBar';

const PageContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: 65px; /* Mobile Navbar */
  
  @media (min-width: 768px) {
    padding-bottom: 0;
    padding-top: 65px; /* Desktop Navbar */
  }
`;

const FixedHeader = styled.div`
  flex: 0 0 auto;
  padding: 20px;
  background-color: ${({ theme }) => theme.background};
  z-index: 10;
  border-bottom: 1px solid #222;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ScrollableContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
  }
`;

const Section = styled.div`
  margin-bottom: 30px;
  padding-left: 20px;
`;

const SectionTitle = styled.h2`
  margin-bottom: 15px;
  font-size: 18px;
  border-left: 4px solid ${({ theme }) => theme.primary};
  padding-left: 10px;
  margin-top: 20px;
`;

const Slider = styled.div`
  display: flex;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 15px;
  padding: 20px;
  width: 100%;
`;

const NoData = styled.div`
  color: #666;
  font-style: italic;
  padding: 20px;
  text-align: center;
`;

// Separate component for independent loading
// Memoized to prevent re-renders unless fetchFn actually changes
const MovieSection = React.memo<{ 
  title: string; 
  fetchFn: () => Promise<Movie[]>; 
  storageKey: string; 
  setSliderRef: (key: string, el: HTMLDivElement | null) => void 
}>(({ title, fetchFn, storageKey, setSliderRef }) => {
  const [data, setData] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchFn().then(res => {
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [fetchFn]);

  if (loading) {
    return (
      <Section>
        <SectionTitle>{title}</SectionTitle>
        <Slider>
          {[...Array(5)].map((_, i) => (
             <div key={i} style={{ marginRight: 16, minWidth: 140 }}>
                <SkeletonPulse width="140px" height="210px" />
                <SkeletonPulse width="100px" height="15px" style={{marginTop: 8}} />
             </div>
          ))}
        </Slider>
      </Section>
    );
  }

  if (data.length === 0) return (
     <Section>
       <SectionTitle>{title}</SectionTitle>
       <NoData>No results</NoData>
     </Section>
  );

  return (
    <Section>
      <SectionTitle>{title}</SectionTitle>
      <Slider ref={(el) => setSliderRef(storageKey, el)}>
        {data.map(m => <MovieCard key={m.id} movie={m} />)}
      </Slider>
    </Section>
  );
});

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('home_search_query') || '');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sliderRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Save state on unmount
  useEffect(() => {
    return () => {
      sessionStorage.setItem('home_search_query', searchQuery);
      if (scrollContainerRef.current) {
         sessionStorage.setItem('home_scroll_y', scrollContainerRef.current.scrollTop.toString());
      }
      const sliderScrolls: Record<string, number> = {};
      sliderRefs.current.forEach((el, key) => {
        if (el) sliderScrolls[key] = el.scrollLeft;
      });
      sessionStorage.setItem('home_slider_scrolls', JSON.stringify(sliderScrolls));
    };
  }, [searchQuery]);

  // Restore Scroll Position
  useLayoutEffect(() => {
    const savedScrollY = sessionStorage.getItem('home_scroll_y');
    if (savedScrollY && scrollContainerRef.current) {
      setTimeout(() => {
         if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = parseInt(savedScrollY, 10);
      }, 100);
    }
    
    const restoreSliders = () => {
        const savedSliderScrolls = sessionStorage.getItem('home_slider_scrolls');
        if (savedSliderScrolls) {
          const scrolls = JSON.parse(savedSliderScrolls);
          Object.keys(scrolls).forEach(key => {
            const el = sliderRefs.current.get(key);
            if (el) el.scrollLeft = scrolls[key];
          });
        }
    };
    setTimeout(restoreSliders, 500);
    setTimeout(restoreSliders, 1500);

  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const results = await tmdbService.search(searchQuery);
          setSearchResults(results);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentLanguage]);

  const setSliderRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) sliderRefs.current.set(key, el);
    else sliderRefs.current.delete(key);
  }, []);

  // Memoize fetch functions to prevent MovieSection re-renders/flicker
  const fetchTrendingMovies = useCallback(() => tmdbService.getTrending('movie'), []);
  const fetchTrendingTv = useCallback(() => tmdbService.getTrending('tv'), []);
  const fetchTopRated = useCallback(() => tmdbService.getTopRated('movie'), []);
  const fetchPopularTv = useCallback(() => tmdbService.getPopular('tv'), []);

  return (
    <PageContainer>
      <FixedHeader>
        <SearchBar 
            placeholder={t('searchPlaceholder')} 
            value={searchQuery}
            onChange={setSearchQuery}
        />
      </FixedHeader>

      <ScrollableContent ref={scrollContainerRef}>
        {searchQuery.length > 2 ? (
          <div>
            <SectionTitle style={{ marginLeft: 20 }}>{t('resultsFor', { query: searchQuery })}</SectionTitle>
            {isSearching ? (
               <Grid>
                 {[...Array(6)].map((_, i) => (
                    <div key={i} style={{width: '100%', aspectRatio: '2/3'}}>
                       <SkeletonPulse width="100%" height="100%" radius="8px" />
                       <SkeletonPulse width="80%" height="14px" style={{marginTop: 8}} />
                    </div>
                 ))}
               </Grid>
            ) : searchResults.length > 0 ? (
               <Grid>
                 {searchResults.map(m => (
                   <MovieCard key={m.id} movie={m} fluid />
                 ))}
               </Grid>
            ) : (
              <NoData>{t('noResults')}</NoData>
            )}
          </div>
        ) : (
          <>
            <MovieSection 
                key={`trend_mov_${currentLanguage}`} 
                title={t('trendingMovies')} 
                fetchFn={fetchTrendingMovies} 
                storageKey="trending_movies"
                setSliderRef={setSliderRef}
            />
            <MovieSection 
                key={`trend_tv_${currentLanguage}`} 
                title={t('trendingSeries')} 
                fetchFn={fetchTrendingTv} 
                storageKey="trending_series"
                setSliderRef={setSliderRef}
            />
            <MovieSection 
                key={`top_mov_${currentLanguage}`} 
                title={t('topRated')} 
                fetchFn={fetchTopRated} 
                storageKey="top_rated"
                setSliderRef={setSliderRef}
            />
            <MovieSection 
                key={`pop_tv_${currentLanguage}`} 
                title={t('popularSeries')} 
                fetchFn={fetchPopularTv} 
                storageKey="popular_series"
                setSliderRef={setSliderRef}
            />
          </>
        )}
      </ScrollableContent>
    </PageContainer>
  );
};

export default HomePage;
