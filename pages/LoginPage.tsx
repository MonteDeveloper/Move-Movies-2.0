import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { tmdbService } from '../services/tmdbService';
import { useApiKey } from '../contexts/ApiKeyContext';
import { useTranslation } from 'react-i18next';

const Container = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  text-align: center;
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.primary};
  margin-bottom: 20px;
  font-size: 2.5rem;
`;

const Input = styled.input`
  padding: 12px;
  border-radius: ${({ theme }) => theme.borderRadius};
  border: 1px solid ${({ theme }) => theme.border};
  background-color: ${({ theme }) => theme.backgroundLight};
  color: ${({ theme }) => theme.text};
  width: 100%;
  max-width: 400px;
  margin-bottom: 20px;
  font-size: 16px;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
    outline: none;
  }
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.primary};
  color: white;
  padding: 12px 30px;
  border-radius: ${({ theme }) => theme.borderRadius};
  font-weight: bold;
  font-size: 16px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMsg = styled.p`
  color: #ff4444;
  margin-top: 15px;
  background: rgba(255, 0, 0, 0.1);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ff4444;
`;

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setApiKey } = useApiKey();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!inputKey) return;
    setLoading(true);
    setError('');

    try {
      const isValid = await tmdbService.validateKey(inputKey);

      if (isValid) {
        setApiKey(inputKey);
        tmdbService.setApiKey(inputKey);
        navigate('/discover');
      } else {
        setError(t('invalidKey'));
      }
    } catch (e) {
      setError(t('invalidKey'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Title>Move Movies</Title>
      <p style={{ marginBottom: '30px', color: '#888' }}>
        {t('enterKey')}
      </p>
      <Input 
        type="text" 
        placeholder="TMDB API Key" 
        value={inputKey} 
        onChange={(e) => setInputKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      />
      <Button onClick={handleLogin} disabled={loading}>
        {loading ? t('verifying') : t('startWatching')}
      </Button>
      {error && <ErrorMsg>{error}</ErrorMsg>}
    </Container>
  );
};

export default LoginPage;