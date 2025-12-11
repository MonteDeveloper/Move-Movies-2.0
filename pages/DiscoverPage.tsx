
import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useDiscoverCache } from '../contexts/DiscoverCacheContext';
import DiscoverCard from '../components/DiscoverCard';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SkeletonPulse } from '../components/Skeleton';
import ConfirmationModal from '../components/ConfirmationModal';

const Container = styled.div`
  height: 100vh; /* Fallback */
  width: 100vw;
  background-color: black;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  position: relative;
  overscroll-behavior-y: none;
  
  /* Hide scrollbar for cleaner look, but keep functionality */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const ScrollContent = styled.div<{ $height: number }>`
  height: ${props => props.$height}px;
  width: 100%;
  position: relative;
`;

const ItemWrapper = styled.div<{ $top: number; $height: number }>`
  position: absolute;
  top: ${props => props.$top}px;
  left: 0;
  width: 100%;
  height: ${props => props.$height}px;
  scroll-snap-align: start;
  scroll-snap-stop: always;
`;

const FilterButton = styled(Link)`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 50;
  background: rgba(255, 255, 255, 0.2);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: white;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255,255,255,0.1);
  text-decoration: none;
  transition: transform 0.2s, background 0.3s;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: scale(0.9);
  }
`;

// -- End Card Components --
const EndCardContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: black;
  color: white;
  text-align: center;
  padding: 40px;
  position: relative;
`;

const EndIcon = styled.div`
  font-size: 60px;
  color: #333;
  margin-bottom: 20px;
`;

const EndTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 10px;
  color: ${({ theme }) => theme.text};
`;

const EndText = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.textSecondary};
  max-width: 300px;
  margin-bottom: 30px;
  line-height: 1.5;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 30px;
  background: ${props => props.$variant === 'secondary' ? '#333' : props.theme.primary};
  color: white;
  font-weight: bold;
  font-size: 14px;
  border: none;
  cursor: pointer;
  margin-bottom: 10px;
  width: 200px;
  
  &:hover {
    opacity: 0.9;
  }
`;

// -- Dynamic Loader Component (Initial Only) --
const LoaderContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background: black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #666;
`;

const LoaderText = styled.div`
  margin-top: 20px;
  font-size: 16px;
  text-align: center;
  max-width: 80%;
  animation: fadeIn 0.5s ease-in-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// -- Skeleton Card Component (For Bottom Loading) --
const SkeletonCardContainer = styled.div`
  width: 100%;
  height: 100%;
  background: black;
  position: relative;
  overflow: hidden;
`;

const SkeletonOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 60px 20px 90px 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.95), transparent);
`;

const SkeletonCard: React.FC = () => (
    <SkeletonCardContainer>
        <div style={{position: 'absolute', inset: 0, opacity: 0.3}}>
             <SkeletonPulse height="100%" radius="0" />
        </div>
        <SkeletonOverlay>
            <SkeletonPulse width="70%" height="30px" style={{marginBottom: 10}} />
            <SkeletonPulse width="40%" height="20px" style={{marginBottom: 10}} />
            <SkeletonPulse width="90%" height="60px" style={{marginTop: 20}} />
        </SkeletonOverlay>
    </SkeletonCardContainer>
);

const LoadingMessage: React.FC = () => {
    const { t } = useTranslation();
    const [msgIndex, setMsgIndex] = useState(1);

    useEffect(() => {
        setMsgIndex(Math.floor(Math.random() * 20) + 1);
        const interval = setInterval(() => {
            setMsgIndex(prev => {
                const next = Math.floor(Math.random() * 20) + 1;
                return next === prev ? (next % 20) + 1 : next;
            });
        }, 2000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <LoaderContainer>
            <div style={{width: 50, height: 50, borderRadius: '50%', border: '3px solid #333', borderTopColor: '#E50914', animation: 'spin 1s linear infinite'}}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <LoaderText>{t(`loading_msg_${msgIndex}`)}</LoaderText>
        </LoaderContainer>
    );
};


const BUFFER = 8; // Aggressive buffer

const DiscoverPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { queue, loadMore, markAsSeenBatch, isLoading, isEndOfList, isLimitReached, continueSearching, resetSession, sessionId } = useDiscoverCache();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Use explicit pixel height to avoid black gaps caused by vh rounding errors
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight || 800);

  // Initialize activeIndex state
  const [activeIndex, setActiveIndex] = useState(() => {
    const savedIndex = sessionStorage.getItem('discoverIndex');
    const savedSession = sessionStorage.getItem('discoverSessionId');
    // Only restore if session matches exactly
    if (savedIndex && savedSession && parseInt(savedSession, 10) === sessionId) {
        return parseInt(savedIndex, 10);
    }
    return 0;
  });

  const queueRef = useRef(queue);
  const markAsSeenBatchRef = useRef(markAsSeenBatch);
  const activeIndexRef = useRef(activeIndex);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { markAsSeenBatchRef.current = markAsSeenBatch; }, [markAsSeenBatch]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const totalItems = queue.length + 1;
  const hasNextPage = !isEndOfList && !isLimitReached;

  // Track session changes. If sessionId changes (filters changed), force reset to 0.
  // This effect ensures we snap to top when context changes underneath us.
  useEffect(() => {
      const savedSession = sessionStorage.getItem('discoverSessionId');
      if (!savedSession || parseInt(savedSession, 10) !== sessionId) {
          setActiveIndex(0);
          activeIndexRef.current = 0;
          if (containerRef.current) containerRef.current.scrollTop = 0;
          sessionStorage.setItem('discoverIndex', '0');
          sessionStorage.setItem('discoverSessionId', sessionId.toString());
      }
  }, [sessionId]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight > 0) {
        setViewportHeight(window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Preload images
  const preloadImages = (startIndex: number, count: number) => {
      const q = queueRef.current;
      const end = Math.min(startIndex + count, q.length);
      for (let i = startIndex; i < end; i++) {
          const movie = q[i];
          if (!movie) continue;
          let src = null;
          if (movie.poster_path) src = `https://image.tmdb.org/t/p/w780${movie.poster_path}`;
          else if (movie.backdrop_path) src = `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`;
          if (src) { const img = new Image(); img.src = src; }
      }
  };

  // Initial load request
  useEffect(() => {
    if (queue.length === 0 && !isLoading && !isEndOfList && !isLimitReached) {
      loadMore();
    }
  }, [queue.length, isLoading, isEndOfList, isLimitReached, loadMore]);

  // Restore scroll on layout effect (only if session matches)
  useLayoutEffect(() => {
    const savedIndex = sessionStorage.getItem('discoverIndex');
    const savedSession = sessionStorage.getItem('discoverSessionId');
    if (savedIndex && savedSession && parseInt(savedSession, 10) === sessionId) {
        if (containerRef.current && queue.length > 0) {
            const idx = parseInt(savedIndex, 10);
            if (idx < totalItems) {
                containerRef.current.scrollTop = idx * viewportHeight;
            }
        }
    }
  }, [queue.length, viewportHeight, totalItems, sessionId]);

  // SCROLL HANDLER
  // Added `isLoading` dependency to ensure listener binds when loader disappears and container mounts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: any;

    const handleScroll = () => {
        const scrollTop = container.scrollTop;
        const height = viewportHeight; 
        if (height === 0) return;

        const newIndex = Math.round(scrollTop / height);
        const lastIndex = activeIndexRef.current;
        
        if (newIndex !== lastIndex) {
            const start = Math.min(lastIndex, newIndex);
            const end = Math.max(lastIndex, newIndex);
            const batch = [];
            for (let i = start; i <= end; i++) {
                const item = queueRef.current[i];
                if (item) batch.push(item);
            }
            if (batch.length > 0) markAsSeenBatchRef.current(batch);

            activeIndexRef.current = newIndex;
            setActiveIndex(newIndex);
            sessionStorage.setItem('discoverIndex', newIndex.toString());
            preloadImages(newIndex + 1, 3);
        }
    };

    const throttledScroll = () => {
        if (timeoutId) return;
        timeoutId = requestAnimationFrame(() => {
            handleScroll();
            timeoutId = null;
        });
    };

    container.addEventListener('scroll', throttledScroll, { passive: true });
    return () => {
        container.removeEventListener('scroll', throttledScroll);
        if (timeoutId) cancelAnimationFrame(timeoutId);
    };
  }, [viewportHeight, isLoading]); 

  // Load More Trigger
  useEffect(() => {
    if (hasNextPage && !isLoading && (activeIndex >= queue.length - 8 || queue.length === 0)) {
        const t = setTimeout(() => {
            loadMore();
        }, 50); 
        return () => clearTimeout(t);
    }
  }, [activeIndex, queue.length, hasNextPage, isLoading, loadMore]);
  
  // FAILSAFE: If we are stuck at the bottom (activeIndex == queue.length), 
  // not loading, and not at end state, force a load.
  useEffect(() => {
     if (queue.length > 0 && activeIndex >= queue.length - 1 && !isLoading && !isEndOfList && !isLimitReached) {
         const t = setTimeout(() => {
            loadMore();
         }, 500);
         return () => clearTimeout(t);
     }
  }, [activeIndex, queue.length, isLoading, isEndOfList, isLimitReached, loadMore]);

  const handleReset = () => {
      resetSession();
      setShowResetConfirm(false);
      setActiveIndex(0);
      activeIndexRef.current = 0;
      if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  const handleContinue = () => {
      continueSearching();
  };

  if (queue.length === 0 && isLoading) {
      return (
         <div style={{width: '100vw', height: '100vh', background: 'black'}}>
             <LoadingMessage />
         </div>
      );
  }

  // Calculate rendering window
  const renderStart = Math.max(0, activeIndex - BUFFER);
  const renderEnd = Math.min(queue.length - 1, activeIndex + BUFFER);

  const items = [];
  
  // 1. Render Visible Movies
  for (let i = renderStart; i <= renderEnd; i++) {
      const topPos = i * viewportHeight;
      items.push(
        <ItemWrapper key={queue[i].id} $top={topPos} $height={viewportHeight}>
            <DiscoverCard movie={queue[i]} />
        </ItemWrapper>
      );
  }

  // 2. Explicitly Render End Card / Loader
  // Always attempt to render this if it falls in buffer range.
  const terminalIndex = queue.length;
  if (terminalIndex >= activeIndex - BUFFER && terminalIndex <= activeIndex + BUFFER) {
      let content;
      // PRIORITIZE End Of List (Flag) over Limit Reached (Hourglass)
      if (isEndOfList) {
          content = (
            <EndCardContainer>
                <EndIcon><i className="fa-solid fa-flag-checkered"></i></EndIcon>
                <EndTitle>{t('endCardTitle')}</EndTitle>
                <EndText>{t('endCardDesc')}</EndText>
                <Button onClick={() => navigate('/filters')}>{t('filters')}</Button>
                <Button $variant="secondary" onClick={() => setShowResetConfirm(true)}>{t('clearSkippedOnly')}</Button>
            </EndCardContainer>
          );
      } else if (isLimitReached) {
          content = (
            <EndCardContainer>
                <EndIcon><i className="fa-solid fa-hourglass-half"></i></EndIcon>
                <EndTitle>{t('continueSearching')}</EndTitle>
                <EndText>{t('continueSearchingDesc')}</EndText>
                <Button onClick={handleContinue}>{t('continue')}</Button>
                <Button $variant="secondary" onClick={() => navigate('/filters')}>{t('filters')}</Button>
            </EndCardContainer>
          );
      } else {
          // Default: Loading Skeleton
          content = <SkeletonCard />;
      }
      
      const topPos = terminalIndex * viewportHeight;
      items.push(
        <ItemWrapper key="end-loader" $top={topPos} $height={viewportHeight}>
            {content}
        </ItemWrapper>
      );
  }
  
  return (
    <>
      <FilterButton to="/filters">
          <i className="fa-solid fa-sliders"></i>
      </FilterButton>

      <Container ref={containerRef} style={{ height: viewportHeight }}>
         <ScrollContent $height={totalItems * viewportHeight}>
            {items}
         </ScrollContent>
      </Container>
      
      <ConfirmationModal
        isOpen={showResetConfirm}
        title={t('resetSession')}
        message={t('resetConfirm')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
        isDanger
      />
    </>
  );
};

export default DiscoverPage;
