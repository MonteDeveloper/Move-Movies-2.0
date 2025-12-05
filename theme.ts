import { createGlobalStyle } from 'styled-components';
import { ThemeType } from './types';

export const theme: ThemeType = {
  primary: '#E50914', // Cinema Red
  accent: '#B81D24', // Darker Red
  background: '#141414', // Almost Black
  backgroundLight: '#1F1F1F', // Dark Grey
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  border: '#333333',
  borderRadius: '8px',
  spacing: (factor: number) => `${factor * 8}px`,
};

export const GlobalStyles = createGlobalStyle<{ theme: ThemeType }>`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: ${({ theme }) => theme.background};
    color: ${({ theme }) => theme.text};
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
  }

  a {
    text-decoration: none;
    color: inherit;
  }
`;