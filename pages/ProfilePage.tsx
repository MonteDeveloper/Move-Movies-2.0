
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../contexts/FavoritesContext';
import { useDiscoverCache } from '../contexts/DiscoverCacheContext';

const Container = styled.div`
  padding: 40px 20px 80px 20px;
`;

const Title = styled.h1`
  font-size: 32px;
  margin-bottom: 40px;
`;

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const MenuItem = styled(Link)`
  background: ${({ theme }) => theme.backgroundLight};
  padding: 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  transition: background 0.2s;

  &:hover {
    background: #333;
  }

  i {
    color: ${({ theme }) => theme.textSecondary};
  }
`;

const Badge = styled.span`
  background: ${({ theme }) => theme.primary};
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 14px;
  margin-left: 10px;
`;

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { favorites, watched } = useFavorites();
  const { seenHistory } = useDiscoverCache();

  return (
    <Container>
      <Title>{t('profile')}</Title>

      <MenuContainer>
        <MenuItem to="/favorites">
          <div>
            <i className="fa-solid fa-heart" style={{marginRight: 15, width: 20}}></i>
            {t('favorites')}
            {favorites.length > 0 && <Badge>{favorites.length}</Badge>}
          </div>
          <i className="fa-solid fa-chevron-right"></i>
        </MenuItem>

        <MenuItem to="/watched">
          <div>
            <i className="fa-solid fa-eye" style={{marginRight: 15, width: 20}}></i>
            {t('watched')}
            {watched.length > 0 && <Badge>{watched.length}</Badge>}
          </div>
          <i className="fa-solid fa-chevron-right"></i>
        </MenuItem>

        <MenuItem to="/session">
          <div>
            <i className="fa-solid fa-forward" style={{marginRight: 15, width: 20}}></i>
            {t('seenSession')}
            {seenHistory.length > 0 && <Badge>{seenHistory.length}</Badge>}
          </div>
          <i className="fa-solid fa-chevron-right"></i>
        </MenuItem>

        <MenuItem to="/settings">
          <div>
            <i className="fa-solid fa-gear" style={{marginRight: 15, width: 20}}></i>
            {t('settings')}
          </div>
          <i className="fa-solid fa-chevron-right"></i>
        </MenuItem>
      </MenuContainer>
    </Container>
  );
};

export default ProfilePage;
