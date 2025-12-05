

import React from 'react';
import styled from 'styled-components';
import { useApiKey } from '../contexts/ApiKeyContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  padding: 20px;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
`;

const BackBtn = styled.button`
  background: none;
  color: white;
  font-size: 20px;
  margin-right: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
`;

const Section = styled.div`
  margin-bottom: 30px;
  background: ${({ theme }) => theme.backgroundLight};
  padding: 20px;
  border-radius: 12px;
`;

const Label = styled.h3`
  margin-bottom: 15px;
  font-size: 16px;
  color: ${({ theme }) => theme.textSecondary};
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 15px;
  background: #333;
  color: #ff4444;
  border-radius: 8px;
  font-weight: bold;
  margin-top: 20px;
  cursor: pointer;

  &:hover {
    background: #444;
  }
`;

const ChipContainer = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Chip = styled.div<{ $active: boolean }>`
  padding: 12px 20px;
  background: ${props => props.$active ? props.theme.primary : '#333'};
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props => props.$active ? '' : '#444'};
  }
`;

const SettingsPage: React.FC = () => {
  const { logout } = useApiKey();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  return (
    <Container>
      <Header>
        <BackBtn onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i>
        </BackBtn>
        <Title>{t('settings')}</Title>
      </Header>

      <Section>
        <Label>{t('selectLanguage')}</Label>
        <ChipContainer>
          <Chip 
            $active={currentLanguage === 'en'} 
            onClick={() => changeLanguage('en')}
          >
             <span>English (US)</span>
             {currentLanguage === 'en' && <i className="fa-solid fa-check"></i>}
          </Chip>
          <Chip 
            $active={currentLanguage === 'it'} 
            onClick={() => changeLanguage('it')}
          >
             <span>Italiano</span>
             {currentLanguage === 'it' && <i className="fa-solid fa-check"></i>}
          </Chip>
        </ChipContainer>
      </Section>

      <LogoutButton onClick={logout}>{t('logout')}</LogoutButton>
    </Container>
  );
};

export default SettingsPage;