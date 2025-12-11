
import React, { useEffect, useRef, useState, useMemo } from 'react';
import styled from 'styled-components';
import { SkeletonPulse } from './Skeleton';
import { Video } from '../types';

const PlayerContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  overflow: hidden;
`;

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

  & iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: contain;
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
  videoQueue: Video[];
  onVideoFound: (index: number) => void;
  onAllFailed: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const YouTubePlayer: React.FC<Props> = ({ videoQueue, onVideoFound, onAllFailed }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const playerRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const requestRef = useRef<any>(null);

  // Use refs for callbacks to avoid stale closures in YouTube events
  const onVideoFoundRef = useRef(onVideoFound);
  const onAllFailedRef = useRef(onAllFailed);

  useEffect(() => {
    onVideoFoundRef.current = onVideoFound;
    onAllFailedRef.current = onAllFailed;
  });
  
  // Use current video key or null
  const currentVideo = videoQueue[currentIndex];
  const videoKey = currentVideo?.key;
  const divId = useMemo(() => `yt-player-${videoKey || 'placeholder'}`, [videoKey]);

  // Reset index if the queue changes (e.g. language switch)
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlayerReady(false);
  }, [videoQueue]);

  useEffect(() => {
    // 1. Load API if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        document.body.appendChild(tag);
      }
    }
  }, []);

  useEffect(() => {
    // If no key or queue exhausted, report failure
    if (!videoKey) {
        if (videoQueue.length > 0 && currentIndex >= videoQueue.length) {
            onAllFailedRef.current();
        } else if (videoQueue.length === 0) {
            // Empty queue, do nothing or report fail
            // onAllFailedRef.current(); 
        }
        return;
    }

    setIsPlayerReady(false);

    // Function to try next video safely
    const tryNext = () => {
        // Clear any pending timeouts
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        // Safe destroy
        if (playerRef.current) {
            try { playerRef.current.destroy(); } catch(e) {}
            playerRef.current = null;
        }
        
        const nextIndex = currentIndex + 1;
        if (nextIndex < videoQueue.length) {
            console.log(`Video ${videoKey} failed/timed out. Trying next...`);
            requestRef.current = requestAnimationFrame(() => {
                 setCurrentIndex(nextIndex);
            });
        } else {
            console.log("All videos failed.");
            onAllFailedRef.current();
        }
    };

    const initPlayer = () => {
      const el = document.getElementById(divId);
      if (!el || !window.YT || !window.YT.Player) {
         timeoutRef.current = setTimeout(initPlayer, 100);
         return;
      }

      // 2. Set strict timeout for playback start (2.5 seconds)
      timeoutRef.current = setTimeout(() => {
         tryNext();
      }, 2500); 

      try {
        playerRef.current = new window.YT.Player(divId, {
            height: '100%',
            width: '100%',
            videoId: videoKey,
            playerVars: {
                autoplay: 1,
                mute: 1,
                modestbranding: 1,
                rel: 0,
                origin: window.location.origin,
                controls: 1,
                playsinline: 1,
                iv_load_policy: 3,
                disablekb: 1,
                fs: 0
            },
            events: {
                onReady: (event: any) => {
                    event.target.mute();
                    event.target.playVideo();
                },
                onStateChange: (event: any) => {
                    // State 1 = Playing, 3 = Buffering
                    if (event.data === 1 || event.data === 3) {
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        setIsPlayerReady(true);
                        // Notify parent that we found a working video at this index
                        onVideoFoundRef.current(currentIndex);
                    }
                },
                onError: (e: any) => {
                    console.warn(`YouTube Error ${e.data} for ${videoKey}`);
                    tryNext();
                }
            }
        });
      } catch (e) {
        console.error("Player creation failed", e);
        tryNext();
      }
    };

    const startTimer = setTimeout(initPlayer, 100);

    return () => {
      clearTimeout(startTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null;
      }
    };
  }, [videoKey, divId, currentIndex, videoQueue.length]);

  return (
    <PlayerContainer>
      {!isPlayerReady && (
        <SkeletonOverlay>
          <SkeletonPulse width="100%" height="100%" radius="0" />
        </SkeletonOverlay>
      )}
      <VideoWrapper $visible={isPlayerReady}>
          <div id={divId} style={{width: '100%', height: '100%'}} />
      </VideoWrapper>
    </PlayerContainer>
  );
};

export default YouTubePlayer;
