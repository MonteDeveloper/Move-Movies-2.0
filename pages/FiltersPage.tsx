import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useFilters } from '../contexts/FiltersContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GENRES, COUNTRIES, ProviderInfo, FilterState, getGenreName } from '../types';
import { getCountryName } from '../utils/formatLocal';
import { useLanguage } from '../contexts/LanguageContext';
import { tmdbService } from '../services/tmdbService';

const Container = styled.div`
  padding: 20px;
  min-height: 100vh;
  padding-bottom: 40px;
  background: ${({ theme }) => theme.background};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
`;

const Section = styled.div`
  margin-bottom: 30px;
  background: ${({ theme }) => theme.backgroundLight};
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const Label = styled.label`
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme }) => theme.text};
`;

const SubLabel = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.textSecondary};
`;

const Select = styled.select`
  width: 100%;
  padding: 14px;
  background: #333;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  
  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.primary};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 16px;
  background: ${props => props.$variant === 'secondary' ? '#333' : props.theme.primary};
  color: white;
  border-radius: 12px;
  font-weight: 700;
  font-size: 16px;
  transition: transform 0.1s;
  
  &:active {
    transform: scale(0.98);
  }
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
`;

const Chip = styled.div<{ $isActive: boolean }>`
  padding: 10px 16px;
  background: ${props => props.$isActive ? props.theme.primary : '#333'};
  color: white;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  border: 1px solid transparent;

  &:hover {
    background: ${props => props.$isActive ? props.theme.accent : '#444'};
  }
`;

const SummaryText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  margin-bottom: 12px;
  line-height: 1.4;
  padding: 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
`;

const Highlight = styled.span<{ $type: 'inc' | 'exc' }>`
  color: ${props => props.$type === 'inc' ? '#4cd137' : '#e84118'};
  font-weight: bold;
`;

// --- SWITCH COMPONENT ---
const SwitchContainer = styled.div`
  display: flex;
  background: #222;
  border-radius: 20px;
  padding: 3px;
  border: 1px solid #444;
`;

const SwitchOption = styled.div<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  background: ${props => props.$active ? (props.children === 'Exclude' || props.children === 'Escludi' ? '#d63031' : '#E50914') : 'transparent'};
  color: ${props => props.$active ? 'white' : '#888'};
  font-weight: ${props => props.$active ? 'bold' : 'normal'};
  transition: all 0.2s;
`;

// --- STAR RATING SLIDER COMPONENT ---
const StarsSliderContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  cursor: pointer;
  touch-action: none;
`;

const StarDisplay = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  pointer-events: none;
`;

const StarIcon = styled.i<{ $fill: number }>`
  font-size: 32px;
  background: linear-gradient(90deg, #FFD700 ${props => props.$fill}%, #444 ${props => props.$fill}%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: background 0.1s;
`;

const OverlayInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
  margin: 0;
  touch-action: manipulation;
`;

// --- DUAL SLIDER COMPONENT ---
const SliderContainer = styled.div`
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
`;

const Track = styled.div`
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 6px;
  background: #333;
  border-radius: 3px;
  transform: translateY(-50%);
`;

const TrackFill = styled.div<{ $left: number; $width: number }>`
  position: absolute;
  top: 50%;
  left: ${props => props.$left}%;
  width: ${props => props.$width}%;
  height: 6px;
  background: ${({ theme }) => theme.primary};
  border-radius: 3px;
  transform: translateY(-50%);
  z-index: 1;
`;

const RangeInput = styled.input`
  position: absolute;
  width: 100%;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  margin: 0;
  pointer-events: none;
  appearance: none;
  background: transparent;
  z-index: 2;

  &::-webkit-slider-thumb {
    pointer-events: auto;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: white;
    border: 2px solid #E50914;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }
  
  &::-moz-range-thumb {
    pointer-events: auto;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: white;
    border: 2px solid #E50914;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    border: none;
  }
`;

const RangeValue = styled.div`
  text-align: right;
  color: ${({ theme }) => theme.primary};
  font-weight: bold;
  font-size: 14px;
`;

// STRICT PROVIDER GROUPS (Explicit TMDB IDs)
const PROVIDER_GROUPS = [
  { name: "Netflix", ids: [8] },
  { name: "Disney+", ids: [337] },
  { name: "Prime Video", ids: [119, 9] }, // 119 = Flatrate, 9 = Rent/Buy Video
  { name: "Apple TV+", ids: [350] },
  { name: "Max", ids: [384, 1899] }, // 384 = Max, 1899 = Max Amazon Channel
  { name: "Paramount+", ids: [531] },
  { name: "Peacock", ids: [386] },
  { name: "Crunchyroll", ids: [283] },
  { name: "Hulu", ids: [15] },
  { name: "Discovery+", ids: [520] },
  { name: "YouTube Premium", ids: [188] },
  { name: "Rakuten Viki", ids: [344] }
];

const FiltersPage: React.FC = () => {
  const { filters, setFilters } = useFilters();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [genreUiMode, setGenreUiMode] = useState<'include' | 'exclude'>('include');
  const [providerUiMode, setProviderUiMode] = useState<'include' | 'exclude'>('include');
  const [countryUiMode, setCountryUiMode] = useState<'include' | 'exclude'>('include');

  const minYear = 1960;
  const maxYear = new Date().getFullYear();
  const minRuntime = 0;
  const maxRuntime = 240;
  
  const starContainerRef = useRef<HTMLDivElement>(null);

  const handleChange = (key: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  // GENRE LOGIC
  const toggleGenre = (id: number) => {
    if (genreUiMode === 'include') {
        const current = localFilters.includeGenres;
        const other = localFilters.excludeGenres;
        
        if (current.includes(id)) {
            handleChange('includeGenres', current.filter(g => g !== id));
        } else {
            handleChange('includeGenres', [...current, id]);
            // Enforce mutual exclusivity
            if (other.includes(id)) {
                handleChange('excludeGenres', other.filter(g => g !== id));
            }
        }
    } else {
        const current = localFilters.excludeGenres;
        const other = localFilters.includeGenres;

        if (current.includes(id)) {
            handleChange('excludeGenres', current.filter(g => g !== id));
        } else {
            handleChange('excludeGenres', [...current, id]);
            // Enforce mutual exclusivity
            if (other.includes(id)) {
                handleChange('includeGenres', other.filter(g => g !== id));
            }
        }
    }
  };

  const isGenreSelected = (id: number) => {
      if (genreUiMode === 'include') {
          return localFilters.includeGenres.includes(id);
      } else {
          return localFilters.excludeGenres.includes(id);
      }
  };

  // PROVIDER LOGIC
  const toggleProviderGroup = (ids: number[]) => {
      if (providerUiMode === 'include') {
          const current = localFilters.includeProviders;
          const other = localFilters.excludeProviders;
          
          // Logic: if any of the group IDs are selected, deselect them all.
          // Otherwise, select them all.
          const isSelected = ids.some(id => current.includes(id));

          if (isSelected) {
              handleChange('includeProviders', current.filter(id => !ids.includes(id)));
          } else {
              const newIds = Array.from(new Set([...current, ...ids]));
              handleChange('includeProviders', newIds);
              // Mutual exclusivity
              const toRemove = ids.filter(id => other.includes(id));
              if (toRemove.length > 0) {
                  handleChange('excludeProviders', other.filter(id => !ids.includes(id)));
              }
          }
      } else {
          const current = localFilters.excludeProviders;
          const other = localFilters.includeProviders;

          const isSelected = ids.some(id => current.includes(id));

          if (isSelected) {
              handleChange('excludeProviders', current.filter(id => !ids.includes(id)));
          } else {
              const newIds = Array.from(new Set([...current, ...ids]));
              handleChange('excludeProviders', newIds);
              // Mutual exclusivity
              const toRemove = ids.filter(id => other.includes(id));
              if (toRemove.length > 0) {
                  handleChange('includeProviders', other.filter(id => !ids.includes(id)));
              }
          }
      }
  };

  const isProviderGroupSelected = (ids: number[]) => {
      if (providerUiMode === 'include') {
          return ids.some(id => localFilters.includeProviders.includes(id));
      } else {
          return ids.some(id => localFilters.excludeProviders.includes(id));
      }
  };

  const getProviderGroupSummary = (list: number[]) => {
      const names: string[] = [];
      PROVIDER_GROUPS.forEach(group => {
          if (group.ids.some(id => list.includes(id))) {
              if (!names.includes(group.name)) names.push(group.name);
          }
      });
      return names;
  };

  // COUNTRY LOGIC
  const toggleCountry = (iso: string) => {
    if (countryUiMode === 'include') {
        const current = localFilters.includeCountries;
        const other = localFilters.excludeCountries;
        
        if (current.includes(iso)) {
            handleChange('includeCountries', current.filter(c => c !== iso));
        } else {
            handleChange('includeCountries', [...current, iso]);
            // Enforce mutual exclusivity
            if (other.includes(iso)) {
                handleChange('excludeCountries', other.filter(c => c !== iso));
            }
        }
    } else {
        const current = localFilters.excludeCountries;
        const other = localFilters.includeCountries;

        if (current.includes(iso)) {
            handleChange('excludeCountries', current.filter(c => c !== iso));
        } else {
            handleChange('excludeCountries', [...current, iso]);
            // Enforce mutual exclusivity
            if (other.includes(iso)) {
                handleChange('includeCountries', other.filter(c => c !== iso));
            }
        }
    }
  };

  const isCountrySelected = (iso: string) => {
      if (countryUiMode === 'include') {
          return localFilters.includeCountries.includes(iso);
      } else {
          return localFilters.excludeCountries.includes(iso);
      }
  };

  // RANGE LOGIC
  const handleYearChange = (index: 0 | 1, value: number) => {
    const newRange = [...localFilters.yearRange] as [number, number];
    if (index === 0) {
        if (value > newRange[1]) value = newRange[1];
        newRange[0] = value;
    } else {
        if (value < newRange[0]) value = newRange[0];
        newRange[1] = value;
    }
    handleChange('yearRange', newRange);
  };

  const handleRuntimeChange = (index: 0 | 1, value: number) => {
    const newRange = [...localFilters.runtimeRange] as [number, number];
    if (index === 0) {
        if (value > newRange[1]) value = newRange[1];
        newRange[0] = value;
    } else {
        if (value < newRange[0]) value = newRange[0];
        newRange[1] = value;
    }
    handleChange('runtimeRange', newRange);
  };

  const handleApply = () => {
    setFilters(localFilters);
    navigate('/discover');
  };

  const getPercent = (value: number, min: number, max: number) => Math.round(((value - min) / (max - min)) * 100);
  
  const safeYearMin = Math.max(minYear, localFilters.yearRange[0]);
  const safeYearMax = Math.min(maxYear, localFilters.yearRange[1]);
  
  const minYearPercent = getPercent(safeYearMin, minYear, maxYear);
  const maxYearPercent = getPercent(safeYearMax, minYear, maxYear);
  
  const minRuntimePercent = getPercent(localFilters.runtimeRange[0], minRuntime, maxRuntime);
  const maxRuntimePercent = getPercent(localFilters.runtimeRange[1], minRuntime, maxRuntime);

  const renderStars = (value: number) => {
     const stars = [];
     const visualValue = value / 2;
     for (let i = 1; i <= 5; i++) {
        let fill = 0;
        if (visualValue >= i) fill = 100;
        else if (visualValue > i - 1) fill = (visualValue - (i - 1)) * 100;
        stars.push(<StarIcon key={i} className="fa-solid fa-star" $fill={fill} />);
     }
     return stars;
  };
  
  const handleRatingInteract = (e: React.TouchEvent | React.MouseEvent) => {
      if (!starContainerRef.current) return;
      const rect = starContainerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      
      let percent = (clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      
      let val = percent * 10;
      val = Math.round(val * 2) / 2;
      
      handleChange('voteAverageMin', val);
  };

  const renderSummary = (includedNames: string[], excludedNames: string[]) => {
      if (includedNames.length === 0 && excludedNames.length === 0) return null;
      return (
          <SummaryText>
              {includedNames.length > 0 && (
                  <div>
                      <Highlight $type="inc">{t('includedAbbr')}: </Highlight> 
                      {includedNames.join(', ')}
                  </div>
              )}
              {excludedNames.length > 0 && (
                  <div>
                      <Highlight $type="exc">{t('excludedAbbr')}: </Highlight> 
                      {excludedNames.join(', ')}
                  </div>
              )}
          </SummaryText>
      );
  };

  return (
    <Container>
      <Header>
        <Title>{t('filters')}</Title>
        <button onClick={() => navigate('/discover')} style={{background: 'none', color: '#888', fontSize: 24}}>
            <i className="fa-solid fa-times"></i>
        </button>
      </Header>
      
      <Section>
        <SectionHeader>
            <Label>{t('type')}</Label>
        </SectionHeader>
        <Select 
          value={localFilters.type} 
          onChange={(e) => handleChange('type', e.target.value)}
        >
          <option value="both">{t('moviesTV')}</option>
          <option value="movie">{t('moviesOnly')}</option>
          <option value="tv">{t('tvOnly')}</option>
        </Select>
      </Section>

      <Section>
        <SectionHeader>
            <Label>{t('minRating')}</Label>
            <RangeValue>{localFilters.voteAverageMin.toFixed(1)} / 10</RangeValue>
        </SectionHeader>
        <StarsSliderContainer 
           ref={starContainerRef}
           onTouchStart={handleRatingInteract}
           onTouchMove={handleRatingInteract}
           onClick={handleRatingInteract}
           onMouseMove={(e) => {
               if (e.buttons === 1) handleRatingInteract(e);
           }}
        >
          <StarDisplay>
             {renderStars(localFilters.voteAverageMin)}
          </StarDisplay>
          <OverlayInput 
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={localFilters.voteAverageMin}
              onChange={() => {}} 
              style={{pointerEvents: 'none'}} 
          />
        </StarsSliderContainer>
      </Section>

      <Section>
        <SectionHeader>
            <Label>{t('yearRange')}</Label>
            <RangeValue>{localFilters.yearRange[0]} - {localFilters.yearRange[1]}</RangeValue>
        </SectionHeader>
        <SliderContainer>
          <Track />
          <TrackFill $left={minYearPercent} $width={maxYearPercent - minYearPercent} />
          <RangeInput 
            type="range"
            min={minYear}
            max={maxYear}
            value={localFilters.yearRange[0]}
            onChange={(e) => handleYearChange(0, Number(e.target.value))}
            style={{zIndex: localFilters.yearRange[0] > maxYear - 5 ? 3 : 2}}
          />
          <RangeInput 
            type="range"
            min={minYear}
            max={maxYear}
            value={localFilters.yearRange[1]}
            onChange={(e) => handleYearChange(1, Number(e.target.value))}
          />
        </SliderContainer>
      </Section>

      {localFilters.type !== 'tv' && (
        <Section>
          <SectionHeader>
             <Label>{t('runtime')}</Label>
             <RangeValue>{localFilters.runtimeRange[0]} - {localFilters.runtimeRange[1]} m</RangeValue>
          </SectionHeader>
          <SliderContainer>
            <Track />
            <TrackFill $left={minRuntimePercent} $width={maxRuntimePercent - minRuntimePercent} />
            <RangeInput 
              type="range"
              min={minRuntime}
              max={maxRuntime}
              value={localFilters.runtimeRange[0]}
              onChange={(e) => handleRuntimeChange(0, Number(e.target.value))}
              style={{zIndex: localFilters.runtimeRange[0] > maxRuntime - 5 ? 3 : 2}}
            />
            <RangeInput 
              type="range"
              min={minRuntime}
              max={maxRuntime}
              value={localFilters.runtimeRange[1]}
              onChange={(e) => handleRuntimeChange(1, Number(e.target.value))}
            />
          </SliderContainer>
        </Section>
      )}

      <Section>
        <SectionHeader>
          <div>
              <Label style={{display: 'block'}}>{t('genres')}</Label>
              <SubLabel>{t('selectItems')}</SubLabel>
          </div>
           <SwitchContainer>
            <SwitchOption 
               $active={genreUiMode === 'include'} 
               onClick={() => setGenreUiMode('include')}
            >
              {t('include')}
            </SwitchOption>
            <SwitchOption 
               $active={genreUiMode === 'exclude'} 
               onClick={() => setGenreUiMode('exclude')}
            >
              {t('exclude')}
            </SwitchOption>
          </SwitchContainer>
        </SectionHeader>
        
        {renderSummary(
            localFilters.includeGenres.map(id => t(`genre_${id}`, getGenreName(id))),
            localFilters.excludeGenres.map(id => t(`genre_${id}`, getGenreName(id)))
        )}

        <ChipContainer>
          {GENRES.map(g => (
            <Chip 
              key={g.id} 
              $isActive={isGenreSelected(g.id)}
              onClick={() => toggleGenre(g.id)}
            >
              {t(`genre_${g.id}`, g.name)}
            </Chip>
          ))}
        </ChipContainer>
      </Section>

      <Section>
        <SectionHeader>
          <div>
              <Label style={{display: 'block'}}>{t('providers')}</Label>
              <SubLabel>{t('selectItems')}</SubLabel>
          </div>
          <SwitchContainer>
            <SwitchOption 
               $active={providerUiMode === 'include'} 
               onClick={() => setProviderUiMode('include')}
            >
              {t('include')}
            </SwitchOption>
            <SwitchOption 
               $active={providerUiMode === 'exclude'} 
               onClick={() => setProviderUiMode('exclude')}
            >
              {t('exclude')}
            </SwitchOption>
          </SwitchContainer>
        </SectionHeader>
        
        {renderSummary(
            getProviderGroupSummary(localFilters.includeProviders),
            getProviderGroupSummary(localFilters.excludeProviders)
        )}

        <ChipContainer>
          {PROVIDER_GROUPS.map(group => {
            const isActive = isProviderGroupSelected(group.ids);
            
            return (
                <Chip 
                  key={group.name} 
                  $isActive={isActive}
                  onClick={() => toggleProviderGroup(group.ids)}
                >
                  {group.name}
                </Chip>
            );
          })}
        </ChipContainer>
      </Section>

      <Section>
        <SectionHeader>
          <div>
              <Label style={{display: 'block'}}>{t('countries')}</Label>
              <SubLabel>Origin countries</SubLabel>
          </div>
          <SwitchContainer>
            <SwitchOption 
               $active={countryUiMode === 'include'} 
               onClick={() => setCountryUiMode('include')}
            >
              {t('include')}
            </SwitchOption>
            <SwitchOption 
               $active={countryUiMode === 'exclude'} 
               onClick={() => setCountryUiMode('exclude')}
            >
              {t('exclude')}
            </SwitchOption>
          </SwitchContainer>
        </SectionHeader>
        
        {renderSummary(
            localFilters.includeCountries.map(iso => getCountryName(iso, currentLanguage)),
            localFilters.excludeCountries.map(iso => getCountryName(iso, currentLanguage))
        )}

        <ChipContainer>
           {COUNTRIES.map(c => (
             <Chip 
               key={c.iso}
               $isActive={isCountrySelected(c.iso)}
               onClick={() => toggleCountry(c.iso)}
             >
               {getCountryName(c.iso, currentLanguage)}
             </Chip>
           ))}
        </ChipContainer>
      </Section>

      <ButtonRow>
        <Button $variant="secondary" onClick={() => navigate('/discover')}>{t('cancel')}</Button>
        <Button onClick={handleApply}>{t('apply')}</Button>
      </ButtonRow>
    </Container>
  );
};

export default FiltersPage;