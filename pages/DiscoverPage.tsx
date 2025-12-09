import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
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

const LoadingContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.textSecondary};
  scroll-snap-align: start;
  background: black;
`;

const rotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoaderIcon = styled.div`
  font-size: 48px;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 24px;
  animation: ${rotate} 2s linear infinite;
`;

const LoaderText = styled.div`
  font-size: 16px;
  color: #ccc;
  text-align: center;
  max-width: 80%;
  min-height: 24px;
  animation: fadeIn 0.5s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const DynamicLoader: React.FC = () => {
  const { t } = useTranslation();
  const [msgKey, setMsgKey] = useState<string>('loading_msg_1');
  const availableIndices = useRef<number[]>([]);

  useEffect(() => {
    // Fill indices 0-19
    if (availableIndices.current.length === 0) {
      availableIndices.current = Array.from({ length: 20 }, (_, i) => i);
    }

    const pickNextMessage = () => {
      if (availableIndices.current.length === 0) {
        availableIndices.current = Array.from({ length: 20 }, (_, i) => i);
      }
      
      const randomIndex = Math.floor(Math.random() * availableIndices.current.length);
      const val = availableIndices.current[randomIndex];
      
      // Remove used index
      availableIndices.current.splice(randomIndex, 1);
      
      setMsgKey(`loading_msg_${val + 1}`);
    };

    // Pick first message immediately
    pickNextMessage();

    let timeoutId: any;
    
    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000; // 3s to 8s
      timeoutId = setTimeout(() => {
        pickNextMessage();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <LoadingContainer>
      <LoaderIcon>
        <i className="fa-solid fa-circle-notch"></i>
      </LoaderIcon>
      <LoaderText key={msgKey}>
        {t(msgKey)}
      </LoaderText>
    </LoadingContainer>
  );
};

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
        {isLoading && <DynamicLoader />}
      </Container>
    </>
  );
};

export default DiscoverPage;