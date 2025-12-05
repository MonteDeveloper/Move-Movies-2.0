
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie } from '../types';
import { useLanguage } from './LanguageContext';
import { tmdbService } from '../services/tmdbService';

interface FavoritesContextType {
  favorites: Movie[];
  addFavorite: (movie: Movie) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  
  watched: Movie[];
  addWatched: (movie: Movie) => void;
  removeWatched: (id: number) => void;
  isWatched: (id: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLanguage } = useLanguage();
  
  // --- FAVORITES ---
  const [favorites, setFavorites] = useState<Movie[]>(() => {
    const stored = localStorage.getItem('move_movies_favorites');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('move_movies_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // --- WATCHED ---
  const [watched, setWatched] = useState<Movie[]>(() => {
    const stored = localStorage.getItem('move_movies_watched');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('move_movies_watched', JSON.stringify(watched));
  }, [watched]);


  // Refresh metadata when language changes
  useEffect(() => {
    const refreshList = async (list: Movie[], setList: React.Dispatch<React.SetStateAction<Movie[]>>) => {
      if (list.length === 0) return;
      try {
        const updated = await Promise.all(
          list.map(async (movie) => {
            try {
              const type = movie.media_type || 'movie';
              const details = await tmdbService.getDetails(movie.id, type);
              return { ...details, media_type: type };
            } catch (e) {
              return movie;
            }
          })
        );
        if (updated.length > 0) {
          setList(updated);
        }
      } catch (e) {
        console.error("Failed to refresh list language", e);
      }
    };
    
    refreshList(favorites, setFavorites);
    refreshList(watched, setWatched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  // Favorites Actions
  const addFavorite = (movie: Movie) => {
    setFavorites(prev => {
        if (prev.some(f => f.id === movie.id)) return prev;
        return [...prev, movie];
    });
  };

  const removeFavorite = (id: number) => {
    setFavorites(prev => prev.filter(m => m.id !== id));
  };

  const isFavorite = (id: number) => favorites.some(m => m.id === id);

  // Watched Actions
  const addWatched = (movie: Movie) => {
    setWatched(prev => {
        if (prev.some(w => w.id === movie.id)) return prev;
        return [...prev, movie];
    });
  };

  const removeWatched = (id: number) => {
    setWatched(prev => prev.filter(m => m.id !== id));
  };

  const isWatched = (id: number) => watched.some(m => m.id === id);

  return (
    <FavoritesContext.Provider value={{ 
      favorites, addFavorite, removeFavorite, isFavorite,
      watched, addWatched, removeWatched, isWatched
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider');
  return context;
};
