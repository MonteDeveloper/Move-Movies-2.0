
import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { Movie } from '../types';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';
import { SkeletonPulse } from './Skeleton';
import { useLanguage } from '../contexts/LanguageContext';
import { tmdbService } from '../services/tmdbService';

interface CardProps {
  $fluid?: boolean;
}

const Card = styled.div<CardProps>`
  display: flex;
  flex-direction: column;
  cursor: pointer;
  
  /* Conditional styling based on usage context */
  ${props => props.$fluid ? css`
    width: 100%;
    margin: 0;
  ` : css`
    min-width: 140px;
    max-width: 140px;
    margin-right: ${({ theme }) => theme.spacing(2)};
  `}
`;

const PosterContainer = styled.div`
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.backgroundLight};
  overflow: hidden;
  position: relative;
`;

const Poster = styled.img<{ $loaded: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${props => props.$loaded ? 1 : 0};
  transition: opacity 0.3s ease-in;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  font-size: 12px;
  color: #888;
  background-color: #222;
`;

const Title = styled.h3`
  font-size: 14px;
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.text};
`;

const Rating = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  margin-top: 2px;
`;

interface Props {
  movie: Movie;
  fluid?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

const SelectionOverlay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.primary};
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
`;

const MovieCard: React.FC<Props> = ({ movie, fluid, selected, onSelect }) => {
  const { t } = useTranslation();
  const { openDetail } = useModal();
  const { currentLanguage } = useLanguage();
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Title State for Fallback Logic
  const [displayTitle, setDisplayTitle] = useState(movie.title || movie.name);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    
    // Reset title immediately when movie changes
    setDisplayTitle(movie.title || movie.name);

    if (movie.poster_path) {
      setImgSrc(`https://image.tmdb.org/t/p/w342${movie.poster_path}`);
    } else if (movie.backdrop_path) {
      setImgSrc(`https://image.tmdb.org/t/p/w300${movie.backdrop_path}`);
    } else {
      setImgSrc(null);
      setHasError(true);
      setIsLoaded(true); // Treat "no image" as loaded state so placeholder shows
    }

    // Title Fallback Logic
    const checkTitleFallback = async () => {
        const currentLang = currentLanguage;
        const origLang = movie.original_language;
        const title = movie.title || movie.name;
        const original = movie.original_title || movie.original_name;

        // Strict alignment with DetailPage logic for Title Update
        const isTitleSame = title === original;
        
        // We only care about fetching if we might need to update the title.
        const needsFallback = (
           currentLang !== 'en' &&
           origLang !== 'en' && 
           origLang !== currentLang &&
           isTitleSame
        );

        if (needsFallback) {
            try {
                // Infer media type if missing to ensure we hit the correct endpoint
                let type = movie.media_type;
                if (!type) {
                     if (movie.name) type = 'tv'; // Likely TV if it has 'name' property
                     else type = 'movie'; // Default to movie otherwise
                }
                
                const enData = await tmdbService.getDetails(movie.id, type, 'en-US');
                const enTitle = enData.title || enData.name;
                
                // If English title is different from original (meaning English has a translation)
                // AND the current title is effectively the original (untranslated)
                // Then use English title.
                if (enTitle && enTitle !== original) {
                    setDisplayTitle(enTitle);
                }
            } catch (e) {
                // Log warning but don't break UI
                console.warn("Title fallback fetch failed for movie", movie.id, e);
            }
        }
    };

    checkTitleFallback().catch(e => console.error("MovieCard Async Error", e));

  }, [movie, currentLanguage]);

  const handleError = () => {
    // Fallback chain: Poster -> Backdrop -> Placeholder
    if (imgSrc && imgSrc.includes(movie.poster_path || '')) {
      if (movie.backdrop_path) {
         setImgSrc(`https://image.tmdb.org/t/p/w300${movie.backdrop_path}`);
         setIsLoaded(false); // Reset load state for fallback
      } else {
         setHasError(true);
         setIsLoaded(true);
      }
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      e.stopPropagation();
      onSelect();
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!onSelect) {
      // Use helper to infer type if missing
      let type = movie.media_type;
      if (!type) {
           if (movie.name) type = 'tv';
           else type = 'movie';
      }
      openDetail(movie.id, type);
    } else {
      onSelect();
    }
  };

  return (
    <Card $fluid={fluid} onClick={handleCardClick}>
      <PosterContainer style={{position: 'relative'}}>
        {selected !== undefined && (
          <SelectionOverlay onClick={handleSelect}>
             {selected && <i className="fa-solid fa-check" style={{fontSize: 12, color: 'white'}}></i>}
          </SelectionOverlay>
        )}
        
        {/* Render Image if available */}
        {!hasError && imgSrc && (
          <Poster 
            src={imgSrc} 
            alt={displayTitle} 
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            $loaded={isLoaded}
          />
        )}
        
        {/* Render Skeleton while loading */}
        {!isLoaded && !hasError && (
           <div style={{position: 'absolute', inset: 0, zIndex: 1}}>
              <SkeletonPulse height="100%" radius="0" />
           </div>
        )}

        {/* Render Placeholder strictly on error */}
        {hasError && (
          <Placeholder>{t('imageNotAvailable')}</Placeholder>
        )}
      </PosterContainer>
      <Title>{displayTitle}</Title>
      <Rating>
         <i className="fa-solid fa-star" style={{color: 'gold', fontSize: 10}}></i> 
         {movie.vote_average.toFixed(1)}
      </Rating>
    </Card>
  );
};

export default MovieCard;
