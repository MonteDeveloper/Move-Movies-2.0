
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDiscoverCache, SKIPPED_EXPIRATION_DAYS } from '../contexts/DiscoverCacheContext';
import MovieCard from '../components/MovieCard';
import { GENRES } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchBar from '../components/SearchBar';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

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
  justify-content: space-between;
`;

const TitleGroup = styled.div`
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

const ActionButton = styled.button<{ $danger?: boolean }>`
  flex: 1;
  background: ${props => props.$danger ? '#d63031' : '#333'};
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;

  &:hover {
    opacity: 0.9;
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
  const { items, columnCount } = data;
  const index = rowIndex * columnCount + columnIndex;
  
  if (index >= items.length) {
    return null;
  }

  const m = items[index];

  return (
    <div style={{ ...style, padding: '0 7.5px 15px 7.5px' }}>
      <MovieCard movie={m} fluid />
    </div>
  );
};

const SessionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { seenHistory, resetSession } = useDiscoverCache();
  
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('sess_search') || '');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(() => {
      const saved = sessionStorage.getItem('sess_genre');
      return saved ? parseInt(saved, 10) : null;
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    return () => {
      sessionStorage.setItem('sess_search', searchTerm);
      sessionStorage.setItem('sess_genre', selectedGenre ? selectedGenre.toString() : '');
    };
  }, [searchTerm, selectedGenre]);

  const filtered = seenHistory.slice().reverse().filter(m => {
    const matchesSearch = (m.title || m.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre ? m.genre_ids?.includes(selectedGenre) : true;
    return matchesSearch && matchesGenre;
  });

  const handleReset = () => {
    resetSession();
    navigate(-1);
    setIsConfirmOpen(false);
  };

  return (
    <PageContainer>
      <FixedHeader>
        <TopRow>
          <TitleGroup>
            <BackBtn onClick={() => navigate(-1)}>
              <i className="fa-solid fa-arrow-left"></i>
            </BackBtn>
            <Title>{t('seenSession')}</Title>
          </TitleGroup>
        </TopRow>

        <ActionRow>
            <ActionButton onClick={() => setIsInfoOpen(true)}>
                <i className="fa-solid fa-circle-info"></i>
                Info
            </ActionButton>
            <ActionButton onClick={() => setIsConfirmOpen(true)} $danger>
                <i className="fa-solid fa-trash-can"></i>
                {t('resetSession')}
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
          <p style={{textAlign: 'center', color: '#666', marginTop: 40}}>{t('noResults')}</p>
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
                  itemData={{ items: filtered, columnCount }}
                  style={{overflowX: 'hidden'}}
                >
                  {Cell}
                </Grid>
              );
            }}
          </AutoSizer>
        )}
      </ScrollableContent>

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        title={t('resetSession')}
        message={t('resetConfirm')}
        onConfirm={handleReset}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('confirm')}
        isDanger
      />

      <ConfirmationModal 
        isOpen={isInfoOpen}
        title={t('skippedInfoTitle')}
        message={t('skippedInfoMessage', { days: SKIPPED_EXPIRATION_DAYS })}
        onConfirm={() => setIsInfoOpen(false)}
        onCancel={() => setIsInfoOpen(false)}
        confirmText="OK"
        hideCancel
      />
    </PageContainer>
  );
};

export default SessionPage;