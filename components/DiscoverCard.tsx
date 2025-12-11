
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Movie, getGenreName, ProviderInfo } from '../types';
import { useFavorites } from '../contexts/FavoritesContext';
import { SkeletonPulse } from './Skeleton';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDate } from '../utils/formatDate';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';
import { useDiscoverCache } from '../contexts/DiscoverCacheContext';
import { tmdbService } from '../services/tmdbService';
import Snackbar from './Snackbar';

const Container = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
  overflow: hidden;
  cursor: pointer;
`;

const BackgroundImage = styled.img<{ $loaded: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.6; 
`;

const SkeletonOverlay = styled.div<{ $visible: boolean }>`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    opacity: ${props => props.$visible ? 1 : 0};
    pointer-events: none;
    transition: opacity 0.3s ease-out;
    background: black;
`;

const Placeholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #222;
  color: #666;
  font-size: 20px;
`;

const Overlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to top, rgba(0,0,0,0.95), transparent);
  padding: 60px 20px 90px 20px; 
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2;
  pointer-events: none; 
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-right: 60px; 
`;

const Title = styled.h2`
  font-size: 20px;
  line-height: 1.2;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  margin: 0;
  width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Info = styled.div`
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #ddd;
  flex-wrap: wrap;
  align-items: center;
`;

const Description = styled.p`
  font-size: 13px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 85%;
  color: #ccc;
  margin-top: 4px; 
  margin-bottom: 20px;
`;

const Actions = styled.div`
  position: absolute;
  right: 20px;
  bottom: 110px; 
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
  pointer-events: auto;
`;

const popAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: ${props => props.$active ? '#E50914' : 'white'};
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255,255,255,0.1);
  transition: color 0.3s ease, transform 0.2s ease, background 0.3s;
  animation: ${props => props.$active ? css`${popAnimation} 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)` : 'none'};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: scale(0.9);
  }
`;

const TopTag = styled.div`
  position: absolute;
  top: 20px;
  left: 20px; 
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  z-index: 10;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.2);
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Updated Providers Styling (Text-based, dedicated row above title)
const ProviderRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
  animation: ${slideUp} 0.5s ease-out forwards;
`;

const ProviderTextTag = styled.div`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const fadeKeyframes = keyframes`
  0% { opacity: 0; transform: translate(-50%, 10px); }
  10% { opacity: 1; transform: translate(-50%, 0); }
  90% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, 10px); }
`;

const Tooltip = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 0);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  animation: ${fadeKeyframes} 5s forwards;
  z-index: 100;
  white-space: nowrap;
`;

interface Props {
  movie: Movie;
  style?: React.CSSProperties; 
}

const DiscoverCard: React.FC<Props> = ({ movie, style }) => {
  const { t } = useTranslation();
  const { isFavorite, addFavorite, removeFavorite, isWatched, addWatched, removeWatched } = useFavorites();
  const { openDetail } = useModal();
  const { currentLanguage } = useLanguage();
  const { hasOpenedDetail, setHasOpenedDetail, providerCache, updateProviderCache } = useDiscoverCache();

  // Basic Image State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Title Fallback State
  const [displayTitle, setDisplayTitle] = useState(movie.title || movie.name);
  const [loadingTitle, setLoadingTitle] = useState(false);
  
  // Providers State
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [showProviders, setShowProviders] = useState(false);
  const [isCardVisible, setIsCardVisible] = useState(false);

  const liked = isFavorite(movie.id);
  const watched = isWatched(movie.id);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Tooltip
  const [showTooltip, setShowTooltip] = useState(false);

  // 1. Initial Data Setup & Title Logic
  useEffect(() => {
    // Reset states when movie prop changes
    setImageLoaded(false);
    setHasError(false);
    setShowTooltip(false);
    setShowSnackbar(false);
    
    // Check if we have cached providers for this movie
    const cachedProviders = providerCache[movie.id];
    if (cachedProviders) {
        setProviders(cachedProviders);
        setShowProviders(true);
    } else {
        setProviders([]);
        setShowProviders(false);
    }
    
    // -- Image Logic --
    // OPTIMIZATION: Use w780 for posters and w1280 for backdrops instead of original
    let url = null;
    if (movie.poster_path) {
        url = `https://image.tmdb.org/t/p/w780${movie.poster_path}`;
    } else if (movie.backdrop_path) {
        url = `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`;
    } else {
        setHasError(true);
    }
    setImgSrc(url);

    // -- Title Fallback Logic --
    // Reset title initially
    setDisplayTitle(movie.title || movie.name);
    setLoadingTitle(false);

    const checkTitle = async () => {
        const title = movie.title || movie.name;
        const original = movie.original_title || movie.original_name;
        const isTitleSame = title === original;
        
        // If app is NOT English, but content is same as original (likely untranslated),
        // and original is NOT English (e.g. Japanese anime with Japanese title in Italian app),
        // try to fetch English title.
        const needsFallback = (
            currentLanguage !== 'en' &&
            movie.original_language !== 'en' &&
            movie.original_language !== currentLanguage &&
            isTitleSame
        );

        if (needsFallback) {
            setLoadingTitle(true);
            try {
                // Infer type
                let type = movie.media_type;
                if (!type) type = movie.name ? 'tv' : 'movie';
                
                const enData = await tmdbService.getDetails(movie.id, type, 'en-US');
                const enTitle = enData.title || enData.name;
                
                if (enTitle && enTitle !== original) {
                    setDisplayTitle(enTitle);
                }
            } catch (e) {
                // Keep original if fail
            } finally {
                setLoadingTitle(false);
            }
        }
    };
    checkTitle();

  }, [movie, currentLanguage]); // Intentionally omitting providerCache from dependency to avoid loop, it's checked on mount

  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // Safari/Cache Fix
  useLayoutEffect(() => {
    if (imgRef.current && imgSrc && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, [imgSrc]);

  // 2. Intersection Observer for Visibility Tracking & Tooltip
  useEffect(() => {
    if (hasOpenedDetail) return; 

    let tooltipTimer: any;
    let tooltipCycle: any;

    const observer = new IntersectionObserver(
        ([entry]) => {
            setIsCardVisible(entry.isIntersecting);

            if (entry.isIntersecting && !hasOpenedDetail && imageLoaded) {
                // Tooltip Logic
                tooltipTimer = setTimeout(() => {
                    if (!hasOpenedDetail) {
                        setShowTooltip(true);
                        tooltipCycle = setInterval(() => {
                             if(hasOpenedDetail) {
                                 setShowTooltip(false);
                                 clearInterval(tooltipCycle);
                                 return;
                             }
                            setShowTooltip(false);
                            setTimeout(() => {
                                if(!hasOpenedDetail) setShowTooltip(true);
                            }, 10000); 
                        }, 15000); 
                    }
                }, 10000); 
            } else {
                clearTimeout(tooltipTimer);
                clearInterval(tooltipCycle);
                setShowTooltip(false);
            }
        },
        { threshold: 0.8 }
    );

    if (containerRef.current) {
        observer.observe(containerRef.current);
    }

    return () => {
        observer.disconnect();
        clearTimeout(tooltipTimer);
        clearInterval(tooltipCycle);
    };
  }, [hasOpenedDetail, imageLoaded]); 

  // 3. Provider Fetch Logic (5s Delay on Visible, Cached)
  useEffect(() => {
      let providerTimer: any;

      // Check cache inside effect to ensure freshness
      const cached = providerCache[movie.id];
      const hasData = cached || providers.length > 0;

      if (isCardVisible) {
          if (hasData) {
             // Already have data, ensure it's shown
             if(!showProviders) setShowProviders(true);
             if(!providers.length && cached) setProviders(cached);
          } else {
             // Start timer to fetch
             providerTimer = setTimeout(async () => {
                 try {
                     // Infer type
                     let type = movie.media_type;
                     if (!type) type = movie.name ? 'tv' : 'movie';

                     const watchData = await tmdbService.getWatchProviders(movie.id, type);
                     if (watchData) {
                         const flatrate = watchData.flatrate || [];
                         const rent = watchData.rent || [];
                         const buy = watchData.buy || [];
                         
                         // Prioritize Flatrate -> Rent -> Buy. Take top 3 unique.
                         const combined = [...flatrate, ...rent, ...buy];
                         const uniqueMap = new Map();
                         combined.forEach(p => {
                             if(!uniqueMap.has(p.provider_id)) uniqueMap.set(p.provider_id, p);
                         });
                         
                         const topProviders = Array.from(uniqueMap.values()).slice(0, 3);
                         
                         // Update Local and Cache
                         setProviders(topProviders);
                         updateProviderCache(movie.id, topProviders);
                         
                         if (topProviders.length > 0) {
                             setShowProviders(true);
                         }
                     }
                 } catch (e) {
                     console.error("Provider fetch error", e);
                 }
            }, 5000);
          }
      } else {
          // If user scrolls away before 5s or card invisible, cancel request
          clearTimeout(providerTimer);
      }

      return () => clearTimeout(providerTimer);
  }, [isCardVisible, movie.id, movie.media_type, movie.name, providerCache, updateProviderCache]);


  const showFeedback = (msg: string) => {
    setSnackbarMsg(msg);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 2000);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (liked) {
        removeFavorite(movie.id);
        showFeedback(t('removedFromFav'));
    } else {
        addFavorite(movie);
        showFeedback(t('addedToFav'));
    }
  };

  const toggleWatched = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (watched) {
        removeWatched(movie.id);
        showFeedback(t('removedFromWatched'));
    } else {
        addWatched(movie);
        showFeedback(t('addedToWatched'));
    }
  };

  const handleImageError = () => {
     if (!imgSrc) return;
     // Fallback if optimized image fails (unlikely, but safe)
     if (movie.poster_path && imgSrc.includes(movie.poster_path) && movie.backdrop_path) {
         setImgSrc(`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`);
     } else {
         setHasError(true);
         setImageLoaded(true); 
     }
  };

  const handleCardClick = () => {
     setHasOpenedDetail(true);
     setShowTooltip(false);
     openDetail(movie.id, movie.media_type || 'movie');
  };

  const dateStr = movie.release_date || movie.first_air_date;
  const formattedDate = formatDate(dateStr, currentLanguage);
  const mediaType = movie.media_type === 'tv' ? t('media_tv') : t('media_movie');
  const firstGenreId = movie.genre_ids?.[0];
  const firstGenreName = firstGenreId ? getGenreName(firstGenreId) : null;
  const firstGenre = (firstGenreName && firstGenreName !== 'Unknown') 
    ? t(`genre_${firstGenreId}`, firstGenreName) 
    : null;
    
  return (
    <Container ref={containerRef} onClick={handleCardClick} style={style}>
      <TopTag>{mediaType}</TopTag>
      
      <SkeletonOverlay $visible={!imageLoaded && !hasError}>
         <SkeletonPulse height="100%" radius="0" />
      </SkeletonOverlay>
      
      {hasError ? (
          <Placeholder>{t('imageNotAvailable')}</Placeholder>
      ) : (
          imgSrc ? (
            <BackgroundImage 
              ref={imgRef}
              src={imgSrc} 
              alt={movie.title} 
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              $loaded={imageLoaded}
              decoding="sync"
            />
          ) : null
      )}

      {showTooltip && (
          <Tooltip>
             <i className="fa-solid fa-hand-pointer"></i>
             {t('tapToView')}
          </Tooltip>
      )}

      <Overlay>
        {!imageLoaded && !hasError ? (
          <>
             <SkeletonPulse width="70%" height="30px" style={{marginBottom: 10}} />
             <SkeletonPulse width="40%" height="20px" style={{marginBottom: 10}} />
             <SkeletonPulse width="90%" height="60px" style={{marginTop: 20}} />
          </>
        ) : (
          <>
            {/* Provider Tags - Placed above title in flux to avoid overlap */}
            {providers.length > 0 && showProviders && (
                <ProviderRow>
                    {providers.map(prov => (
                        <ProviderTextTag key={prov.provider_id}>
                            {prov.provider_name}
                        </ProviderTextTag>
                    ))}
                </ProviderRow>
            )}

            <TitleRow>
              {loadingTitle ? (
                  <SkeletonPulse width="80%" height="24px" style={{marginBottom: 5}} />
              ) : (
                  <Title>{displayTitle}</Title>
              )}
            </TitleRow>
            
            <Info>
              <span style={{display:'flex', alignItems:'center', gap: 4}}>
                  <i className="fa-solid fa-star" style={{color: 'gold', fontSize: 12}}></i> 
                  {movie.vote_average.toFixed(1)}
              </span>
              <span>{formattedDate.split('/').pop()}</span>
              {firstGenre && <span>• {firstGenre}</span>}
            </Info>
            <Description>{movie.overview}</Description>
          </>
        )}
      </Overlay>
      
      <Actions>
        <ActionButton $active={liked} onClick={toggleLike}>
          <i className={liked ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
        </ActionButton>
        <ActionButton $active={watched} onClick={toggleWatched}>
          <i className={watched ? "fa-solid fa-eye" : "fa-regular fa-eye"}></i>
        </ActionButton>
      </Actions>

      <Snackbar message={snackbarMsg} isVisible={showSnackbar} />
    </Container>
  );
};

export default DiscoverCard;
