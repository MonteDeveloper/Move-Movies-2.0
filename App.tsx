
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme, GlobalStyles } from './theme';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import { ApiKeyProvider, useApiKey } from './contexts/ApiKeyContext';
import { FiltersProvider } from './contexts/FiltersContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { DiscoverCacheProvider } from './contexts/DiscoverCacheContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ModalProvider } from './contexts/ModalContext';
import { tmdbService } from './services/tmdbService';

import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage from './pages/ProfilePage';
import FiltersPage from './pages/FiltersPage';
import SettingsPage from './pages/SettingsPage';
import FavoritesPage from './pages/FavoritesPage';
import WatchedPage from './pages/WatchedPage';
import SessionPage from './pages/SessionPage';
import Navbar from './components/Navbar';
import ModalRenderer from './components/ModalRenderer';

// Wrapper to protect routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isValid, apiKey } = useApiKey();
  
  if (!isValid || !apiKey) {
    return <Navigate to="/login" replace />;
  }

  // Ensure service has key
  tmdbService.setApiKey(apiKey);

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  // Hide navbar on login, filters, settings, favorites, session
  // Note: detail pages are now modals so they don't affect route
  const showNav = ['/login', '/filters', '/settings', '/favorites', '/watched', '/session'].every(path => location.pathname !== path);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        
        <Route path="/discover" element={
          <ProtectedRoute>
            <DiscoverPage />
          </ProtectedRoute>
        } />

        <Route path="/filters" element={
          <ProtectedRoute>
            <FiltersPage />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />

        <Route path="/favorites" element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        } />

        <Route path="/watched" element={
          <ProtectedRoute>
            <WatchedPage />
          </ProtectedRoute>
        } />

        <Route path="/session" element={
          <ProtectedRoute>
            <SessionPage />
          </ProtectedRoute>
        } />
        
        {/* Detail route removed as it is now handled by ModalRenderer */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <Navbar />}
      <ModalRenderer />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles theme={theme} />
      <I18nextProvider i18n={i18n}>
        <ApiKeyProvider>
          <LanguageProvider>
            <FavoritesProvider>
              <FiltersProvider>
                <DiscoverCacheProvider>
                  <ModalProvider>
                    <Router>
                      <AppContent />
                    </Router>
                  </ModalProvider>
                </DiscoverCacheProvider>
              </FiltersProvider>
            </FavoritesProvider>
          </LanguageProvider>
        </ApiKeyProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
};

export default App;