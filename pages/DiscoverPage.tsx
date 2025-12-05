

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useDiscoverCache } from '../contexts/DiscoverCacheContext';
import DiscoverCard from '../components/DiscoverCard';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  position: relative;
  background-color: black;
`;

const FilterButton = styled(Link)`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 50;
  background: rgba(0,0,0,0.5);
  color: white;
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 14px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.2);
`;

const Loading = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.textSecondary};
  scroll-snap-align: start;
`;

const DiscoverPage: React.FC = () => {
  const { t } = useTranslation();
  const { queue, loadMore, markAsSeen, isLoading } = useDiscoverCache();
  const containerRef = useRef<HTMLDivElement>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (queue.length < 5) {
      loadMore();
    }
  }, [queue.length, loadMore]);

  // Restore scroll position
  useEffect(() => {
    if (!restored && queue.length > 0 && containerRef.current) {
      const savedIndex = sessionStorage.getItem('discoverIndex');
      if (savedIndex) {
        const index = parseInt(savedIndex, 10);
        // Small timeout to ensure DOM is ready
        setTimeout(() => {
          const element = containerRef.current?.children[index] as HTMLElement;
          if (element) {
             element.scrollIntoView({ behavior: 'instant' });
          }
        }, 0);
      }
      setRestored(true);
    }
  }, [queue, restored]);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && queue[index]) {
              // Save scroll position
              sessionStorage.setItem('discoverIndex', index.toString());

              markAsSeen(queue[index]);
              
              if (index >= queue.length - 3) {
                loadMore();
              }
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    const children = containerRef.current?.children;
    if (children) {
      Array.from(children).forEach((child) => observer.observe(child as Element));
    }

    return () => observer.disconnect();
  }, [queue, markAsSeen, loadMore]);

  return (
    <>
      <FilterButton to="/filters">{t('filters')}</FilterButton>
      <Container ref={containerRef}>
        {queue.map((movie, index) => (
          <div 
            key={`${movie.id}-${index}`} 
            data-index={index} 
            style={{ 
              height: '100vh', 
              scrollSnapAlign: 'start', 
              scrollSnapStop: 'always' 
            }}
          >
            <DiscoverCard movie={movie} />
          </div>
        ))}
        {isLoading && <Loading>{t('loadingContent')}</Loading>}
      </Container>
    </>
  );
};

export default DiscoverPage;