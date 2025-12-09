import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { Movie } from '../types';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';

interface CardProps {
  $fluid?: boolean;
}

const Card = styled.div<CardProps>`
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
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

  &:hover {
    transform: scale(1.05);
  }
`;

const PosterContainer = styled.div`
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.backgroundLight};
  overflow: hidden;
  position: relative;
`;

const Poster = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (movie.poster_path) {
      setImgSrc(`https://image.tmdb.org/t/p/w342${movie.poster_path}`);
      setHasError(false);
    } else if (movie.backdrop_path) {
      setImgSrc(`https://image.tmdb.org/t/p/w300${movie.backdrop_path}`);
      setHasError(false);
    } else {
      setImgSrc(null);
      setHasError(true);
    }
  }, [movie]);

  const handleError = () => {
    // Fallback chain: Poster -> Backdrop -> Placeholder
    if (imgSrc && imgSrc.includes(movie.poster_path || '')) {
      if (movie.backdrop_path) {
         setImgSrc(`https://image.tmdb.org/t/p/w300${movie.backdrop_path}`);
      } else {
         setHasError(true);
      }
    } else {
      setHasError(true);
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
      openDetail(movie.id, movie.media_type || 'movie');
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
        {!hasError && imgSrc ? (
          <Poster 
            src={imgSrc} 
            alt={movie.title || movie.name} 
            loading="lazy"
            onError={handleError}
          />
        ) : (
          <Placeholder>{t('imageNotAvailable')}</Placeholder>
        )}
      </PosterContainer>
      <Title>{movie.title || movie.name}</Title>
      <Rating>
         <i className="fa-solid fa-star" style={{color: 'gold', fontSize: 10}}></i> 
         {movie.vote_average.toFixed(1)}
      </Rating>
    </Card>
  );
};

export default MovieCard;