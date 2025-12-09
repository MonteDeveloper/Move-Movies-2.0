import React, { createContext, useContext, useState } from 'react';
import { FilterState } from '../types';

interface FiltersContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

// Default State: Include Mode + Empty Selection (Implies All)
const defaultFilters: FilterState = {
  type: 'both',
  yearRange: [1980, new Date().getFullYear()],
  voteAverageMin: 0,
  includeGenres: [],
  excludeGenres: [],
  includeProviders: [],
  excludeProviders: [],
  runtimeRange: [0, 240],
  includeCountries: [],
  excludeCountries: []
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  return (
    <FiltersContext.Provider value={{ filters, setFilters }}>
      {children}
    </FiltersContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFilters must be used within FiltersProvider');
  return context;
};