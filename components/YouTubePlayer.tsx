
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Video } from '../types';
import { SkeletonPulse } from './Skeleton';

const PlayerContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  overflow: hidden;
`;

// Opacity transition to prevent black flash/static before API is ready
const VideoWrapper = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.5s ease-in;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  display: flex;
  align-items: center;
  justify-content: center;

  /* Strictly force the iframe to fill the container */
  & iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    border: none;
    margin: 0;
    padding: 0;
    display: block;
  }
`;

const SkeletonOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  background: black;
  pointer-events: none;
`;

interface Props {
  videos: Video[];
  onFallback: (url: string) => void; // Called when all videos fail
  onPlayerReady: () => void; // Called when video is successfully loaded and ready to play
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const YouTubePlayer: React.FC<Props> = ({ videos, onFallback, onPlayerReady }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const playerRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const isUnmountedRef = useRef(false);

  const currentVideo = videos[currentIndex];

  // Fix: Memoize ID to prevent regeneration on every render which causes infinite loop glitches
  const divId = useMemo(() => {
    return `yt-player-${currentVideo?.key || 'placeholder'}`;
  }, [currentVideo?.key]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  const loadNext = useCallback(() => {
    if (isUnmountedRef.current) return;
    
    // Defer state update to next tick to avoid conflicts during error handling
    setTimeout(() => {
        if (isUnmountedRef.current) return;
        
        if (currentIndex < videos.length - 1) {
          console.log(`Video ${currentVideo?.key} failed or timed out. Trying next...`);
          setIsPlayerReady(false); 
          setCurrentIndex((prev) => prev + 1);
        } else {
          console.log('All videos failed. Triggering fallback.');
          if (videos.length > 0) {
            onFallback(`https://www.youtube.com/watch?v=${videos[0].key}`);
          } else {
            onFallback('');
          }
        }
    }, 0);
  }, [currentIndex, videos, currentVideo, onFallback]);

  // 1. Load YouTube API Script (Once)
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // 2. Initialize Player for the current video
  useEffect(() => {
    if (!currentVideo) return;

    // Reset state
    setIsPlayerReady(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const initPlayer = () => {
      if (isUnmountedRef.current) return;

      // Check if target div exists
      const el = document.getElementById(divId);
      if (!el) return; // Wait for React to mount the div

      if (window.YT && window.YT.Player) {
        // Double check cleanup
        if (playerRef.current) {
            try { playerRef.current.destroy(); } catch(e) {}
            playerRef.current = null;
        }

        try {
            playerRef.current = new window.YT.Player(divId, {
                height: '100%',
                width: '100%',
                videoId: currentVideo.key,
                playerVars: {
                  autoplay: 0,
                  modestbranding: 1,
                  rel: 0,
                  origin: window.location.origin, // Important for CORS/Security
                  controls: 1,
                  playsinline: 1,
                  iv_load_policy: 3, 
                  disablekb: 1,
                  fs: 0
                },
                events: {
                  onReady: () => {
                    if (isUnmountedRef.current) return;
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    setIsPlayerReady(true);
                    onPlayerReady(); // Notify parent
                  },
                  onError: (event: any) => {
                    if (isUnmountedRef.current) return;
                    // Wrap in try-catch to avoid crashing if API sends weird error objects
                    try {
                        const code = event.data;
                        console.warn(`YouTube Error ${code} for video ${currentVideo.key}`);
                        loadNext();
                    } catch (e) {
                        loadNext();
                    }
                  },
                },
            });
        } catch (e) {
            console.error("YouTube Player Init Error", e);
            loadNext();
        }

        // Safety timeout
        timeoutRef.current = setTimeout(() => {
           if (!isPlayerReady && !isUnmountedRef.current) {
               console.warn('Player timeout, skipping...');
               loadNext();
           }
        }, 8000); // Increased timeout slightly

      } else {
        // Poll API
        setTimeout(initPlayer, 100);
      }
    };

    // Small delay to ensure DOM is painted
    const initTimer = setTimeout(initPlayer, 50);

    return () => {
      clearTimeout(initTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (playerRef.current) {
        try { 
            const player = playerRef.current;
            playerRef.current = null; 
            player.destroy(); 
        } catch(e) {}
      }
    };
  }, [currentVideo, divId, loadNext, onPlayerReady]); 

  if (!currentVideo) return null;

  return (
    <PlayerContainer>
      {!isPlayerReady && (
        <SkeletonOverlay>
          <SkeletonPulse width="100%" height="100%" radius="0" />
        </SkeletonOverlay>
      )}
      <VideoWrapper $visible={isPlayerReady}>
          <div 
            id={divId} 
            key={currentVideo.key} 
            style={{width: '100%', height: '100%'}} 
          />
      </VideoWrapper>
    </PlayerContainer>
  );
};

export default YouTubePlayer;
