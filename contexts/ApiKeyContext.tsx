import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  isValid: boolean;
  logout: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(localStorage.getItem('tmdb_api_key'));
  const [isValid, setIsValid] = useState<boolean>(!!localStorage.getItem('tmdb_api_key'));

  const setApiKey = (key: string) => {
    localStorage.setItem('tmdb_api_key', key);
    setApiKeyState(key);
    setIsValid(true);
  };

  const logout = () => {
    localStorage.removeItem('tmdb_api_key');
    setApiKeyState(null);
    setIsValid(false);
  };

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, isValid, logout }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (!context) throw new Error('useApiKey must be used within ApiKeyProvider');
  return context;
};
