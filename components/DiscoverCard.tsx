import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Movie, WatchProviders, ProviderInfo, getGenreName } from '../types';
import { useFavorites } from '../contexts/FavoritesContext';
import { SkeletonPulse } from './Skeleton';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDate } from '../utils/formatDate';
import { useTranslation } from 'react-i18next';
import { tmdbService } from '../services/tmdbService';
import { useModal } from '../contexts/ModalContext';
import { useDiscoverCache } from '../contexts/DiscoverCacheContext';

const Container = styled.div`
  height: 100vh;
  width: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
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
  opacity: ${props => props.$loaded ? 0.6 : 0};
  transition: opacity 0.5s ease-in;
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
  padding: 80px 20px 100px 20px; /* Increased bottom padding for navbar spacing */
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 2;
  pointer-events: none; /* Let clicks pass through */
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-right: 60px; /* Space for fav button */
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  margin: 0;
  width: 100%;
`;

const ProviderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const ProviderText = styled.span`
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  color: #ddd;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
`;

const Info = styled.div`
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: #ddd;
  flex-wrap: wrap;
  align-items: center;
`;

const Description = styled.p`
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 85%;
  color: #ccc;
  margin-top: 8px; /* Reduced spacing */
`;

const Actions = styled.div`
  position: absolute;
  right: 20px;
  bottom: 120px; /* Adjusted for new Overlay padding */
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
  pointer-events: auto;
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
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const MediaTypeTag = styled.div`
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
}

const DiscoverCard: React.FC<Props> = ({ movie }) => {
  const { t } = useTranslation();
  const { isFavorite, addFavorite, removeFavorite, isWatched, addWatched, removeWatched } = useFavorites();
  const { openDetail } = useModal();
  const { currentLanguage } = useLanguage();
  const { hasOpenedDetail, setHasOpenedDetail } = useDiscoverCache();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const liked = isFavorite(movie.id);
  const watched = isWatched(movie.id);
  
  // Ref for the image to check cached status (Safari fix)
  const imgRef = useRef<HTMLImageElement>(null);

  // Initialize imgSrc directly to avoid initial null render which causes error
  const [imgSrc, setImgSrc] = useState<string | null>(() => {
    if (movie.poster_path) return `https://image.tmdb.org/t/p/original${movie.poster_path}`;
    if (movie.backdrop_path) return `https://image.tmdb.org/t/p/original${movie.backdrop_path}`;
    return null;
  });
  
  // Tooltip Logic
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state on movie change or component remount with different movie
    setImageLoaded(false);
    setHasError(false);
    setShowTooltip(false);
    setProviders([]);

    let url = null;
    if (movie.poster_path) {
        url = `https://image.tmdb.org/t/p/original${movie.poster_path}`;
    } else if (movie.backdrop_path) {
        url = `https://image.tmdb.org/t/p/original${movie.backdrop_path}`;
    } else {
        setHasError(true);
    }
    setImgSrc(url);

    // Fetch providers lightly
    const fetchProviders = async () => {
      try {
        const p = await tmdbService.getWatchProviders(movie.id, movie.media_type || 'movie');
        if (p && p.flatrate) {
            setProviders(p.flatrate);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchProviders();
  }, [movie.id, movie.media_type, movie.poster_path, movie.backdrop_path]);

  // Safari Fix: Check immediately if image is already loaded from cache
  useEffect(() => {
    if (imgRef.current && imgSrc) {
      if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setImageLoaded(true);
      }
    }
  }, [imgSrc]);

  // Interaction / Tooltip Logic
  useEffect(() => {
    // Wait until detail opened OR image is loaded before starting the timer
    if (hasOpenedDetail || !imageLoaded) return; 

    let timer: any;
    let cycleTimer: any;
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting && !hasOpenedDetail && imageLoaded) {
                // User is looking at this card AND image is loaded
                timer = setTimeout(() => {
                    // Double check before showing
                    if (!hasOpenedDetail) {
                        setShowTooltip(true);
                        // Cycle logic
                        cycleTimer = setInterval(() => {
                             if(hasOpenedDetail) {
                                 setShowTooltip(false);
                                 clearInterval(cycleTimer);
                                 return;
                             }
                            setShowTooltip(false);
                            setTimeout(() => {
                                if(!hasOpenedDetail) setShowTooltip(true);
                            }, 10000); 
                        }, 15000); 
                    }
                }, 10000); // 10s inactivity AFTER image load
            } else {
                clearTimeout(timer);
                clearInterval(cycleTimer);
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
        clearTimeout(timer);
        clearInterval(cycleTimer);
    };
  }, [hasOpenedDetail, imageLoaded]); // Added imageLoaded dependency

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (liked) removeFavorite(movie.id);
    else addFavorite(movie);
  };

  const toggleWatched = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (watched) removeWatched(movie.id);
    else addWatched(movie);
  };

  const handleImageError = () => {
     if (!imgSrc) return;

     if (movie.poster_path && imgSrc.includes(movie.poster_path) && movie.backdrop_path) {
         setImgSrc(`https://image.tmdb.org/t/p/original${movie.backdrop_path}`);
     } else {
         setHasError(true);
         setImageLoaded(true); // Stop skeleton if error
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
    <Container ref={containerRef} onClick={handleCardClick}>
      <MediaTypeTag>{mediaType}</MediaTypeTag>
      
      {!imageLoaded && !hasError && (
        <div style={{position: 'absolute', inset: 0, zIndex: 1}}>
           <SkeletonPulse height="100%" radius="0" />
        </div>
      )}
      
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
            <TitleRow>
              <Title>{movie.title || movie.name}</Title>
            </TitleRow>

            {providers.length > 0 && (
                <ProviderRow>
                    {providers.slice(0, 3).map((p, i) => (
                        <ProviderText key={`${p.provider_id}-${i}`} title={p.provider_name}>
                          {p.provider_name}
                        </ProviderText>
                    ))}
                </ProviderRow>
            )}
            
            <Info style={{ marginTop: 10 }}>
              <span style={{display:'flex', alignItems:'center', gap: 4}}>
                  <i className="fa-solid fa-star" style={{color: 'gold', fontSize: 12}}></i> 
                  {movie.vote_average.toFixed(1)}
              </span>
              <span>{formattedDate}</span>
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
    </Container>
  );
};

export default DiscoverCard;