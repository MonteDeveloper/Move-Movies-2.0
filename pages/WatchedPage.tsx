
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../contexts/FavoritesContext';
import MovieCard from '../components/MovieCard';
import { GENRES } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchBar from '../components/SearchBar';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Snackbar from '../components/Snackbar';

const PageContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.background};
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
  overflow: hidden;
  padding: 10px 20px 0 20px;
  position: relative;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const BackBtn = styled.button`
  background: none;
  color: white;
  font-size: 20px;
  margin-right: 15px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`;

const ActionButton = styled.button<{ $active?: boolean; $danger?: boolean }>`
  flex: 1;
  background: ${props => props.$danger ? '#d63031' : (props.$active ? props.theme.primary : '#333')};
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const FloatingDeleteButton = styled.button`
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #d63031;
  color: white;
  padding: 12px 24px;
  border-radius: 30px;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 100;
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  @keyframes popIn {
    from { transform: translateX(-50%) scale(0.8); opacity: 0; }
    to { transform: translateX(-50%) scale(1); opacity: 1; }
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 5px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const FilterChip = styled.div<{ $active: boolean }>`
  padding: 6px 12px;
  background: ${props => props.$active ? props.theme.primary : '#333'};
  color: white;
  border-radius: 16px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
`;

const Cell = ({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
  const { items, columnCount, isSelectionMode, selectedIds, toggleSelection } = data;
  const index = rowIndex * columnCount + columnIndex;
  
  if (index >= items.length) {
    return null;
  }

  const m = items[index];
  const isSelected = selectedIds.has(m.id);

  return (
    <div style={{ ...style, padding: '0 7.5px 15px 7.5px' }}>
      <MovieCard 
        movie={m} 
        fluid 
        selected={isSelectionMode ? isSelected : undefined}
        onSelect={isSelectionMode ? () => toggleSelection(m.id) : undefined}
      />
    </div>
  );
};

const WatchedPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { watched, removeWatched } = useFavorites();
  
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('watched_search') || '');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('watched_genre');
    return saved ? parseInt(saved, 10) : null;
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  useEffect(() => {
    return () => {
      sessionStorage.setItem('watched_search', searchTerm);
      sessionStorage.setItem('watched_genre', selectedGenre ? selectedGenre.toString() : '');
    };
  }, [searchTerm, selectedGenre]);

  const filtered = watched.filter(m => {
    const matchesSearch = (m.title || m.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre ? m.genre_ids?.includes(selectedGenre) : true;
    return matchesSearch && matchesGenre;
  });

  const toggleSelection = (id: number) => {
    if (isSelectionMode) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
      });
    }
  };

  const handleConfirmDelete = () => {
    selectedIds.forEach(id => removeWatched(id));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setIsConfirmOpen(false);
  };
  
  const toggleMode = () => {
      if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
      } else {
          setIsSelectionMode(true);
      }
  };

  const handleExport = () => {
    if (filtered.length === 0) return;

    let text = "";
    filtered.forEach(m => {
      const title = m.title || m.name;
      const date = m.release_date || m.first_air_date;
      const year = date ? date.split('-')[0] : '';
      const type = m.media_type === 'tv' ? 'tv' : 'movie';
      
      text += `${title} (${year})\n`;
      text += `TMDB: https://www.themoviedb.org/${type}/${m.id}\n`;
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setShowSnackbar(true);
      setTimeout(() => setShowSnackbar(false), 2500);
    }).catch(() => {
      alert(t('exportError'));
    });
  };

  return (
    <PageContainer>
      <FixedHeader>
        <TopRow>
          <BackBtn onClick={() => navigate(-1)}>
            <i className="fa-solid fa-arrow-left"></i>
          </BackBtn>
          <Title>{t('watched')}</Title>
        </TopRow>
        
        <ActionRow>
            <ActionButton onClick={handleExport}>
                <i className="fa-regular fa-copy"></i>
                {t('copyList')}
            </ActionButton>
            <ActionButton 
                onClick={toggleMode} 
                $active={isSelectionMode}
            >
                {isSelectionMode ? <i className="fa-solid fa-times"></i> : <i className="fa-solid fa-check-circle"></i>}
                {isSelectionMode ? t('cancel') : t('selectItems')}
            </ActionButton>
        </ActionRow>

        <SearchBar 
            placeholder={t('filterPlaceholder')} 
            value={searchTerm}
            onChange={setSearchTerm}
        />

        <FiltersContainer>
          <FilterChip $active={selectedGenre === null} onClick={() => setSelectedGenre(null)}>All</FilterChip>
          {GENRES.map(g => (
            <FilterChip 
              key={g.id} 
              $active={selectedGenre === g.id}
              onClick={() => setSelectedGenre(g.id === selectedGenre ? null : g.id)}
            >
              {t(`genre_${g.id}`, g.name)}
            </FilterChip>
          ))}
        </FiltersContainer>
      </FixedHeader>

      <ScrollableContent>
        {filtered.length === 0 ? (
          <p style={{textAlign: 'center', color: '#666', marginTop: 40}}>{t('noWatched')}</p>
        ) : (
          <AutoSizer>
            {({ height, width }) => {
              const itemWidth = 140; 
              const availableWidth = width;
              const columnCount = Math.floor(availableWidth / itemWidth);
              const computedColumnWidth = availableWidth / columnCount;
              const rowCount = Math.ceil(filtered.length / columnCount);
              const rowHeight = computedColumnWidth * 1.5 + 40 + 15;

              return (
                <Grid
                  columnCount={columnCount}
                  columnWidth={computedColumnWidth}
                  height={height}
                  rowCount={rowCount}
                  rowHeight={rowHeight}
                  width={width}
                  itemData={{ 
                    items: filtered, 
                    columnCount, 
                    isSelectionMode, 
                    selectedIds, 
                    toggleSelection 
                  }}
                  style={{overflowX: 'hidden'}}
                >
                  {Cell}
                </Grid>
              );
            }}
          </AutoSizer>
        )}
      </ScrollableContent>

      {isSelectionMode && selectedIds.size > 0 && (
        <FloatingDeleteButton onClick={() => setIsConfirmOpen(true)}>
           <i className="fa-solid fa-trash"></i>
           {t('delete')} ({selectedIds.size})
        </FloatingDeleteButton>
      )}

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        title={t('deleteSelected')}
        message={t('deleteSelectedConfirm')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('delete')}
        isDanger
      />

      <Snackbar 
        message={t('listCopied')} 
        isVisible={showSnackbar} 
      />
    </PageContainer>
  );
};

export default WatchedPage;
