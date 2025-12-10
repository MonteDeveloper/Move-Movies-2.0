
import React, { useEffect, useState, useLayoutEffect, useRef, memo, useCallback } from 'react';
import styled from 'styled-components';
import { tmdbService } from '../services/tmdbService';
import { MediaDetail, CastMember, Review, WatchProviders, CrewMember, Video } from '../types';
import { useFavorites } from '../contexts/FavoritesContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { SkeletonPulse } from '../components/Skeleton';
import { formatDate } from '../utils/formatDate';
import MovieCard from '../components/MovieCard';
import { getLanguageName, getCountryName } from '../utils/formatLocal';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import YouTubePlayer from '@/components/YouTubePlayer';

interface DetailPageProps {
  id: number;
  type: 'movie' | 'tv';
  zIndex: number;
  onClose: () => void;
  onCloseAll: () => void;
  stackIndex: number;
}

// 1) Scroll Locking: Conditional overflow based on props to lock background when sub-modals open
// Changed width to 100% to avoid scrollbar width issues causing layout shifts/overflows
const Container = styled.div<{ $zIndex: number; $isLocked: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%; 
  height: 100vh;
  background-color: ${({ theme }) => theme.background};
  z-index: ${props => props.$zIndex};
  overflow-y: ${props => props.$isLocked ? 'hidden' : 'auto'};
  overscroll-behavior: contain;
`;

const NavButton = styled.button`
  position: fixed;
  top: 20px;
  background: rgba(0,0,0,0.5);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.1);
  z-index: 200;
  transition: transform 0.1s;

  &:active {
    transform: scale(0.95);
  }
`;

const BackButton = styled(NavButton)`
  left: 20px;
`;

const CloseButton = styled(NavButton)`
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
`;

const HeroContainer = styled.div`
  position: relative;
  width: 100%;
  height: 50vh;
  overflow: hidden;
  background: #111;
`;

const BackgroundMedia = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlaceholderHero = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #666;
  font-size: 20px;
`;

const GradientOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(20,20,20,0.4) 50%, ${({ theme }) => theme.background} 100%);
  z-index: 2;
  pointer-events: none;
`;

const HeaderContent = styled.div`
  padding: 20px;
  margin-top: -80px;
  position: relative;
  z-index: 20; 
`;

const StickyVideoContainer = styled.div<{ $isSticky: boolean }>`
  position: ${props => props.$isSticky ? 'sticky' : 'relative'};
  top: 0;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio padding hack */
  z-index: 90;
  background: black;
  box-shadow: ${props => props.$isSticky ? '0 4px 20px rgba(0,0,0,0.5)' : 'none'};
  margin-bottom: 20px;
  overflow: hidden; /* Ensures content doesn't overflow */

  /* Force children to fill the padding-box */
  & > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`;

const BodyContent = styled.div`
  padding: 0 20px 80px 20px;
  position: relative;
  z-index: 10;
  background: ${({ theme }) => theme.background};
`;

const Title = styled.h1`
  font-size: 32px;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 14px;
  margin-bottom: 15px;
`;

const Tag = styled.span`
  background: ${({ theme }) => theme.backgroundLight};
  padding: 4px 8px;
  border-radius: 4px;
  color: ${({ theme }) => theme.text};
  font-size: 12px;
`;

const MediaTag = styled.span`
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.2);
`;

const Overview = styled.p`
  line-height: 1.6;
  color: #ddd;
  margin-bottom: 30px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  color: white;
  border-left: 4px solid ${({ theme }) => theme.primary};
  padding-left: 10px;
  margin: 0;
`;

const SelectLang = styled.select`
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 12px;
  outline: none;
`;

const ScrollContainer = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 15px;
  padding-bottom: 10px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const CastMemberItem = styled.div`
  min-width: 100px;
  max-width: 100px;
  text-align: center;
`;

const CastImg = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 8px;
  background: #333;
`;

const GalleryImg = styled.img`
  height: 120px;
  width: auto;
  border-radius: 8px;
  object-fit: cover;
  cursor: pointer;
  background: #222;
`;

const FallbackAvatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #333;
  margin: 0 auto 8px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-weight: bold;
  font-size: 24px;
  border: 1px solid #444;
`;

const CastName = styled.div`
  font-size: 12px;
  color: #ccc;
  font-weight: bold;
`;

const CastChar = styled.div`
  font-size: 10px;
  color: #888;
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $primary?: boolean; $active?: boolean }>`
  flex: 1;
  min-width: 100px;
  padding: 12px;
  background: ${props => props.$active ? props.theme.primary : (props.$primary ? props.theme.primary : props.theme.backgroundLight)};
  color: white;
  border-radius: 8px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: ${props => props.$active ? 'none' : '1px solid #333'};
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const BackToTopButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  font-size: 18px;
  z-index: 1000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  transition: transform 0.2s;

  &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
  }
`;

const ProviderRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 25px;
`;

const ProviderTextLink = styled.a`
  display: inline-block;
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  text-decoration: none;
  
  &:hover {
    background: #444;
  }
`;

// Season List Style
const SeasonListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 30px;
`;

const SeasonButton = styled.button`
  background: ${({ theme }) => theme.backgroundLight};
  padding: 15px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  color: white;
  border: 1px solid #333;
  transition: background 0.2s;
  
  &:hover {
    background: #2a2a2a;
  }

  & > div {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
`;

const EpisodeItem = styled.div`
  display: flex;
  padding: 15px;
  border-bottom: 1px solid #333;
  gap: 15px;
  cursor: pointer;
  height: 100%;
  box-sizing: border-box;

  &:hover {
    background: #252525;
  }
`;

const EpisodeImg = styled.img`
  width: 100px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  background: #222;
  flex-shrink: 0;
`;

const EpisodeFallback = styled.div`
  width: 100px;
  height: 56px;
  border-radius: 4px;
  background: #333;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 9px;
  color: #888;
  padding: 4px;
  flex-shrink: 0;
`;

const ReviewCard = styled.div`
  min-width: 280px;
  max-width: 280px;
  background: ${({ theme }) => theme.backgroundLight};
  padding: 15px;
  border-radius: 8px;
  margin-right: 15px;
  display: flex;
  flex-direction: column;
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
`;

const ReviewMeta = styled.div`
  display: flex;
  flex-direction: column;
`;

const Author = styled.div`
  font-weight: bold;
  font-size: 14px;
`;

const ReviewDate = styled.div`
  font-size: 11px;
  color: #888;
`;

const ReviewRatingBadge = styled.div`
  display: flex;
  align-items: center;
  background: #333;
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  font-size: 12px;
  gap: 4px;
  
  i {
    color: gold;
    font-size: 10px;
  }
`;

const ReviewContent = styled.p`
  font-size: 13px;
  color: #ccc;
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 120px;
  overflow-y: auto;
  flex-grow: 1;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-bottom: 30px;
  background: ${({ theme }) => theme.backgroundLight};
  padding: 15px;
  border-radius: 12px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const InfoLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  margin-bottom: 4px;
`;

const InfoValue = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.text};
`;

// --- MODAL COMPONENTS ---
const FullScreenModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.95);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  padding: 20px;
`;

const SeasonModalContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: ${({ theme }) => theme.background};
  z-index: 2500;
  display: flex;
  flex-direction: column;
`;

const ModalClose = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255,255,255,0.2);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  z-index: 3001;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
      background: rgba(255,255,255,0.3);
  }
`;

const ModalContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
`;

const ModalNavBtn = styled.button<{ $left?: boolean }>`
    background: rgba(255,255,255,0.1);
    color: white;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
    
    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
    
    &:hover:not(:disabled) {
        background: rgba(255,255,255,0.2);
    }
`;

const ModalControls = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 600px;
    margin: 20px auto 0 auto;
    padding: 0 20px;
    flex-shrink: 0;
    position: relative;
    z-index: 3005;
`;

const InfoDisplay = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    color: white;
    text-align: center;
`;

const InfoTop = styled.div`
    font-size: 14px;
    color: #ccc;
    margin-bottom: 2px;
`;

const InfoBottom = styled.div`
    font-size: 16px;
    font-weight: bold;
`;

// Helper component for Episode Row
const EpisodeRow = memo(({ data, index, style, onClick }: ListChildComponentProps & { onClick: (idx: number) => void }) => {
    const { t } = useTranslation();
    const ep = data[index];
    const [imgError, setImgError] = useState(false);
    
    useEffect(() => {
        setImgError(false);
    }, [ep.id, ep.still_path]);
    
    const getEpisodeRuntime = (ep: any) => {
      if (ep.runtime) return `${ep.runtime} m`;
      return '';
    };

    return (
        <div style={style}>
            <EpisodeItem onClick={() => onClick(index)}>
                {!imgError && ep.still_path ? (
                    <EpisodeImg 
                        src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} 
                        alt={ep.name}
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                ) : (
                    <EpisodeFallback>
                        {t('imageNotAvailable')}
                    </EpisodeFallback>
                )}
                
                <div style={{flex: 1, minWidth: 0}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                         <div style={{fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 10}}>
                            {ep.episode_number}. {ep.name}
                         </div>
                         <div style={{fontSize: 12, color: '#aaa', flexShrink: 0}}>{getEpisodeRuntime(ep)}</div>
                    </div>
                    {ep.overview ? (
                        <div style={{fontSize: 12, color: '#aaa', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                            {ep.overview}
                        </div>
                    ) : null}
                </div>
            </EpisodeItem>
        </div>
    );
});

const DetailPage: React.FC<DetailPageProps> = ({ id, type, zIndex, onClose, onCloseAll, stackIndex }) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { isFavorite, addFavorite, removeFavorite, isWatched, addWatched, removeWatched } = useFavorites();
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollKey = `scroll_detail_${type}_${id}`;

  useLayoutEffect(() => {
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll && containerRef.current) {
        containerRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, [scrollKey]);

  useEffect(() => {
    const container = containerRef.current;
    
    const handleScroll = () => {
        if (!container) return;
        
        sessionStorage.setItem(scrollKey, container.scrollTop.toString());
        
        // Show scroll top button
        if (container.scrollTop > 400) {
            setShowScrollTop(true);
        } else {
            setShowScrollTop(false);
        }
    };

    if (container) {
       container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
         container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollKey]);

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loadingCast, setLoadingCast] = useState(true);
  const [providers, setProviders] = useState<WatchProviders | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);
  
  // Video Queue State
  const [videoQueue, setVideoQueue] = useState<Video[]>([]);
  const [videoFallbackUrl, setVideoFallbackUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewLang, setReviewLang] = useState('app');

  const [gallery, setGallery] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [loadingGalleryImage, setLoadingGalleryImage] = useState(false);
  
  const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, any[]>>({});
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroError, setHeroError] = useState(false);
  
  // Episode Modal State
  const [episodeModal, setEpisodeModal] = useState<{ sIdx: number; eIdx: number } | null>(null);
  const [loadingEpisodeNav, setLoadingEpisodeNav] = useState(false);
  const [loadingEpisodeImage, setLoadingEpisodeImage] = useState(false);
  const [episodeImageError, setEpisodeImageError] = useState(false);

  // New Season Modal State
  const [openSeasonNumber, setOpenSeasonNumber] = useState<number | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  // Back to top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Stable callback for video fallback to prevent re-renders
  const handleVideoFallback = useCallback((url: string) => {
      setVideoFallbackUrl(url);
  }, []);

  const handlePlayerReady = useCallback(() => {
    setIsPlayerReady(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    const mediaType = type;
    const numId = Number(id);

    setDetail(null); setLoadingDetail(true);
    setCast([]); setCrew([]); setLoadingCast(true);
    setProviders(null); setLoadingProviders(true);
    
    // Reset video state
    setVideoQueue([]); setVideoFallbackUrl(null); setLoadingVideo(true); setIsPlayerReady(false);

    setRecommendations([]); setLoadingRecommendations(true);
    setGallery([]); setLoadingGallery(true);
    setSeasonEpisodes({}); setOpenSeasonNumber(null);
    setHeroImage(null); setHeroError(false);
    
    fetchReviews('app');

    const loadData = async () => {
         try {
             let detailsData = await tmdbService.getDetails(numId, mediaType);
             
             if (!detailsData.overview) {
                 try {
                    const enDetails = await tmdbService.getDetails(numId, mediaType, 'en-US');
                    if (enDetails.overview) detailsData.overview = enDetails.overview;
                 } catch {}
             }
             
             if(mounted) {
                 setDetail(detailsData);
                 setLoadingDetail(false);
                 
                 if (detailsData.backdrop_path) {
                    setHeroImage(`https://image.tmdb.org/t/p/original${detailsData.backdrop_path}`);
                 } else if (detailsData.poster_path) {
                    setHeroImage(`https://image.tmdb.org/t/p/original${detailsData.poster_path}`);
                 } else {
                     try {
                        const imgs = await tmdbService.getImages(numId, mediaType);
                        if (imgs.backdrops.length > 0) setHeroImage(`https://image.tmdb.org/t/p/original${imgs.backdrops[0].file_path}`);
                        else if (imgs.posters.length > 0) setHeroImage(`https://image.tmdb.org/t/p/original${imgs.posters[0].file_path}`);
                        else setHeroError(true);
                     } catch { setHeroError(true); }
                 }
             }

             // --- ADVANCED TRAILER SELECTION ---
             // Sort Helper
             const sortVideos = (vids: Video[]) => {
                 return vids
                     .filter(v => v.site === 'YouTube' && v.type === 'Trailer')
                     .sort((a, b) => {
                         // Official first
                         if (a.official !== b.official) return a.official ? -1 : 1;
                         // Recent first
                         const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
                         const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
                         return dateB - dateA;
                     });
             };

             const appLang = currentLanguage === 'it' ? 'it-IT' : 'en-US';
             const fallbackLang = 'en-US';
             const origLang = detailsData.original_language;

             let res1, res2, res3, res4;

             // TV: fetch ONLY season 1 to avoid spoilers.
             // Prioritize: App Lang -> English -> Original Language
             if (mediaType === 'tv') {
                  const p1 = tmdbService.getSeasonVideos(numId, 1, appLang);
                  const p2 = tmdbService.getSeasonVideos(numId, 1, fallbackLang);
                  const p3 = (origLang && origLang !== 'en' && origLang !== 'it') 
                     ? tmdbService.getSeasonVideos(numId, 1, origLang) 
                     : Promise.resolve({ results: [] });
                  
                  [res1, res2, res3] = await Promise.all([p1, p2, p3]);
                  res4 = { results: [] }; 
             } else {
                  // Movies
                  const p1 = tmdbService.getVideos(numId, mediaType, appLang);
                  const p2 = tmdbService.getVideos(numId, mediaType, fallbackLang);
                  const p3 = (origLang && origLang !== 'en' && origLang !== 'it') 
                     ? tmdbService.getVideos(numId, mediaType, origLang) 
                     : Promise.resolve({ results: [] });
                  const p4 = tmdbService.getVideos(numId, mediaType, undefined as any);
                  [res1, res2, res3, res4] = await Promise.all([p1, p2, p3, p4]);
             }

             const list1 = sortVideos((res1.results || []) as Video[]);
             const list2 = sortVideos((res2.results || []) as Video[]);
             const list3 = sortVideos((res3.results || []) as Video[]);
             const list4 = sortVideos((res4.results || []) as Video[]);

             // Priority: AppLang -> English -> Original -> Others
             // Concatenate sorted lists to maintain priority buckets.
             const allCandidates = [...list1, ...list2, ...list3, ...list4];
             
             // Deduplicate
             const uniqueCandidates = Array.from(new Map(allCandidates.map(v => [v.key, v])).values());

             if (mounted) {
                 setVideoQueue(uniqueCandidates);
                 setLoadingVideo(false);
             }

             const [cred, prov, recs, imgs] = await Promise.all([
                 tmdbService.getCredits(numId, mediaType),
                 tmdbService.getWatchProviders(numId, mediaType),
                 tmdbService.getRecommendations(numId, mediaType),
                 tmdbService.getImages(numId, mediaType)
             ]);

             if (mounted) {
                 setCast(cred.cast || []);
                 setCrew(cred.crew || []);
                 setLoadingCast(false);
                 setProviders(prov);
                 setLoadingProviders(false);
                 setRecommendations(recs || []);
                 setLoadingRecommendations(false);
                 setGallery(imgs.backdrops?.slice(0, 15) || []);
                 setLoadingGallery(false);
             }

         } catch (e) {
             console.error(e);
             if(mounted) {
                 setLoadingDetail(false);
                 setLoadingVideo(false);
                 setLoadingCast(false);
                 setLoadingProviders(false);
                 setLoadingRecommendations(false);
                 setLoadingGallery(false);
             }
         }
    };
    
    loadData();

    return () => { mounted = false; };
  }, [id, type, currentLanguage]);

  // Update loading state when modal changes to avoid stale loading skeleton
  useEffect(() => {
    if (episodeModal && detail?.seasons) {
        const { sIdx, eIdx } = episodeModal;
        const season = detail.seasons[sIdx];
        const episodes = seasonEpisodes[season.season_number];
        const ep = episodes?.[eIdx];
        
        // If image exists, set loading true (to show load spinner). If not, set false (to show fallback immediately).
        setLoadingEpisodeImage(!!ep?.still_path);
        setEpisodeImageError(false);
    }
  }, [episodeModal, seasonEpisodes, detail]);

  const scrollToTop = () => {
      if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const fetchReviews = async (langMode: string) => {
      setLoadingReviews(true);
      let langParam: string | null = null;
      if (langMode === 'app') langParam = undefined as any; 
      else if (langMode === 'all') langParam = null;
      else langParam = langMode;

      try {
          const res = await tmdbService.getReviews(Number(id), type, langParam);
          setReviews(res || []);
      } catch (e) {
          setReviews([]);
      } finally {
          setLoadingReviews(false);
      }
  };

  const handleReviewLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setReviewLang(val);
    fetchReviews(val);
  };

  const openSeasonModal = async (seasonNumber: number) => {
      setOpenSeasonNumber(seasonNumber);
      if (!seasonEpisodes[seasonNumber] && id) {
          setLoadingSeason(true);
          try {
              const data = await tmdbService.getSeason(Number(id), seasonNumber);
              if (data.episodes) {
                  setSeasonEpisodes(prev => ({...prev, [seasonNumber]: data.episodes as any[]}));
              }
          } catch (e) {
              console.error("Failed to load season", e);
          } finally {
              setLoadingSeason(false);
          }
      }
  };
  
  const openEpisodeDetail = (sIdx: number, eIdx: number) => {
      setEpisodeModal({ sIdx, eIdx });
  };
  
  const handleEpisodeChange = async (newSIdx: number, newEIdx: number) => {
      setEpisodeModal({ sIdx: newSIdx, eIdx: newEIdx });
      
      // Preload next image logic (optional)
      if (!detail?.seasons) return;
      const season = detail.seasons[newSIdx];
      const episodes = seasonEpisodes[season.season_number];
      if (episodes && episodes[newEIdx + 1]) {
           const nextEp = episodes[newEIdx + 1];
           if (nextEp.still_path) {
               const img = new Image();
               img.src = `https://image.tmdb.org/t/p/original${nextEp.still_path}`;
           }
      }
  };
  
  const handleNextEpisode = async () => {
      if (!episodeModal || !detail?.seasons) return;
      if (loadingEpisodeNav) return;

      const { sIdx, eIdx } = episodeModal;
      const currentSeason = detail.seasons[sIdx];
      const episodes = seasonEpisodes[currentSeason.season_number];

      if (eIdx < episodes.length - 1) {
          handleEpisodeChange(sIdx, eIdx + 1);
      } else if (sIdx < detail.seasons.length - 1) {
          const nextSeason = detail.seasons[sIdx + 1];
          if (!seasonEpisodes[nextSeason.season_number]) {
              setLoadingEpisodeNav(true);
              try {
                  const data = await tmdbService.getSeason(Number(id), nextSeason.season_number);
                  setSeasonEpisodes(prev => ({...prev, [nextSeason.season_number]: data.episodes as any[]}));
                  handleEpisodeChange(sIdx + 1, 0);
              } catch (e) {
                  // error
              } finally {
                  setLoadingEpisodeNav(false);
              }
          } else {
               handleEpisodeChange(sIdx + 1, 0);
          }
      }
  };

  const handlePrevEpisode = async () => {
      if (!episodeModal || !detail?.seasons) return;
      if (loadingEpisodeNav) return;

      const { sIdx, eIdx } = episodeModal;
      
      if (eIdx > 0) {
          handleEpisodeChange(sIdx, eIdx - 1);
      } else if (sIdx > 0) {
          const prevSeason = detail.seasons[sIdx - 1];
           if (!seasonEpisodes[prevSeason.season_number]) {
              setLoadingEpisodeNav(true);
              try {
                  const data = await tmdbService.getSeason(Number(id), prevSeason.season_number);
                  setSeasonEpisodes(prev => ({...prev, [prevSeason.season_number]: data.episodes as any[]}));
                  handleEpisodeChange(sIdx - 1, (data.episodes?.length || 1) - 1);
              } catch (e) {
                  // error
              } finally {
                  setLoadingEpisodeNav(false);
              }
          } else {
               const eps = seasonEpisodes[prevSeason.season_number];
               handleEpisodeChange(sIdx - 1, eps.length - 1);
          }
      }
  };

  const handleGalleryChange = (newIndex: number) => {
      setLoadingGalleryImage(true);
      setGalleryIndex(newIndex);
      if (newIndex < gallery.length - 1) {
          const nextImg = gallery[newIndex + 1];
          const img = new Image();
          img.src = `https://image.tmdb.org/t/p/original${nextImg.file_path}`;
      }
  };

  const isFav = detail ? isFavorite(detail.id) : false;
  const isSeen = detail ? isWatched(detail.id) : false;

  const handleHeroError = async () => {
       if (detail) {
          try {
             const imgs = await tmdbService.getImages(detail.id, detail.media_type || 'movie');
             const bestBackdrop = imgs.backdrops.find(b => !heroImage?.includes(b.file_path));
             if (bestBackdrop) {
                 setHeroImage(`https://image.tmdb.org/t/p/original${bestBackdrop.file_path}`);
             } else {
                 setHeroError(true);
             }
          } catch {
             setHeroError(true);
          }
       } else {
         setHeroError(true);
       }
  };

  const handleShare = async () => {
    if (!detail) return;
    const imdbId = detail.external_ids?.imdb_id || detail.imdb_id;
    const link = imdbId ? `https://www.imdb.com/title/${imdbId}/` : `https://www.themoviedb.org/${type}/${id}`;
    const text = type === 'movie' ? t('shareMovie') : t('shareSeries');
    const shareText = `${text} ${link}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: detail.title || detail.name, text: shareText });
      } catch (e) {
        console.log('Share aborted', e);
      }
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert(t('exportSuccess'));
        }).catch(() => {
            alert(t('exportError'));
        });
    }
  };
  
  const getStatusText = (status: string | undefined) => {
      if (!status) return '';
      const key = `status_${status.replace(/ /g, '_')}`;
      return t(key);
  };

  const renderEpisodesList = (episodes: any[], seasonIndex: number) => (
     <div style={{background: '#1a1a1a', flex: 1, paddingBottom: 20}}>
        <AutoSizer>
            {({ height, width }) => (
                <List
                    height={height}
                    itemCount={episodes.length}
                    itemSize={90} 
                    width={width}
                    itemData={episodes}
                    overscanCount={5}
                >
                   {({ data, index, style }) => (
                       <EpisodeRow 
                          data={data} 
                          index={index} 
                          style={style} 
                          onClick={(idx) => openEpisodeDetail(seasonIndex, idx)} 
                       />
                   )}
                </List>
            )}
        </AutoSizer>
     </div>
  );

  const renderSeasons = () => {
      if (loadingDetail || !detail || detail.media_type !== 'tv' || !detail.seasons || detail.seasons.length === 0) return null;
      const seasons = detail.seasons.filter(s => s.season_number >= 0);

      return (
          <>
            <SectionTitle style={{marginBottom: 15}}>{t('seasonsCount', { count: seasons.length })}</SectionTitle>
            <SeasonListContainer>
              {seasons.map((season) => (
                <SeasonButton key={season.id} onClick={() => openSeasonModal(season.season_number)}>
                    <div>
                        <div style={{fontWeight: 'bold', fontSize: 15}}>{season.name}</div>
                        <div style={{fontSize: 12, color: '#aaa', marginTop: 4}}>
                           {season.episode_count} {t('episodes')}
                           {season.air_date && ` • ${formatDate(season.air_date, currentLanguage).split('/').pop()}`}
                        </div>
                    </div>
                    <i className="fa-solid fa-chevron-right"></i>
                </SeasonButton>
              ))}
            </SeasonListContainer>
          </>
      );
  };

  const directors = crew.filter(m => m.job === 'Director').map(m => m.name).join(', ');
  const writers = crew.filter(m => m.department === 'Writing').map(m => m.name).slice(0, 3).join(', ');
  const music = crew.filter(m => m.job === 'Original Music Composer' || m.job === 'Music').map(m => m.name).join(', ');
  
  const getReleaseDates = () => {
    if (!detail?.release_dates?.results) return null;
    const targetIso = currentLanguage === 'it' ? 'IT' : 'US';
    const local = detail.release_dates.results.find(r => r.iso_3166_1 === targetIso);
    const origDate = detail.release_date || detail.first_air_date;
    return {
        original: origDate,
        local: local?.release_dates?.[0]?.release_date
    };
  };
  const dates = getReleaseDates();
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  // Render Gallery Modal
  const renderGalleryModal = () => {
      if (galleryIndex === null) return null;
      const img = gallery[galleryIndex];
      return (
          <FullScreenModal onClick={() => setGalleryIndex(null)}>
              <ModalClose onClick={() => setGalleryIndex(null)}><i className="fa-solid fa-times"></i></ModalClose>
              
              <ModalContentWrapper onClick={e => e.stopPropagation()}>
                  {loadingGalleryImage && (
                      <div style={{position: 'absolute', zIndex: 10, width: '100%', maxWidth: '800px', aspectRatio: '16/9'}}>
                          <SkeletonPulse width="100%" height="100%" radius="8px" />
                      </div>
                  )}
                  <img 
                      src={`https://image.tmdb.org/t/p/original${img.file_path}`} 
                      alt="Gallery" 
                      style={{maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain'}} 
                      onLoad={() => setLoadingGalleryImage(false)}
                  />
              </ModalContentWrapper>
              
              <ModalControls onClick={e => e.stopPropagation()}>
                 <ModalNavBtn 
                    onClick={(e) => { e.stopPropagation(); handleGalleryChange(Math.max(0, galleryIndex - 1)); }}
                    disabled={galleryIndex === 0}
                 >
                     <i className="fa-solid fa-chevron-left"></i>
                 </ModalNavBtn>
                 
                 <InfoDisplay>
                     <InfoBottom>{galleryIndex + 1} / {gallery.length}</InfoBottom>
                 </InfoDisplay>
                 
                 <ModalNavBtn 
                    onClick={(e) => { e.stopPropagation(); handleGalleryChange(Math.min(gallery.length - 1, galleryIndex + 1)); }}
                    disabled={galleryIndex === gallery.length - 1}
                 >
                     <i className="fa-solid fa-chevron-right"></i>
                 </ModalNavBtn>
              </ModalControls>
          </FullScreenModal>
      );
  };
  
  // Render Season Modal (List of episodes)
  const renderSeasonModal = () => {
      if (openSeasonNumber === null || !detail?.seasons) return null;
      const seasonIndex = detail.seasons.findIndex(s => s.season_number === openSeasonNumber);
      if (seasonIndex === -1) return null;
      const season = detail.seasons[seasonIndex];
      const episodes = seasonEpisodes[openSeasonNumber];

      return (
          <SeasonModalContainer>
             <div style={{display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #333', background: '#111', flexShrink: 0}}>
                 <button onClick={() => setOpenSeasonNumber(null)} style={{background: 'none', color: 'white', fontSize: 24, marginRight: 20}}>
                     <i className="fa-solid fa-arrow-left"></i>
                 </button>
                 <div style={{flex: 1}}>
                     <div style={{fontSize: 18, fontWeight: 'bold'}}>{season.name}</div>
                     {season.air_date && <div style={{fontSize: 12, color: '#aaa'}}>{formatDate(season.air_date, currentLanguage)}</div>}
                 </div>
             </div>
             
             <div style={{flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                 {loadingSeason && !episodes ? (
                     <div style={{padding: 20}}>
                         <SkeletonPulse width="100%" height="90px" style={{marginBottom: 10}}/>
                         <SkeletonPulse width="100%" height="90px" style={{marginBottom: 10}}/>
                         <SkeletonPulse width="100%" height="90px" style={{marginBottom: 10}}/>
                     </div>
                 ) : episodes ? (
                     renderEpisodesList(episodes, seasonIndex)
                 ) : (
                     <div style={{padding: 20, textAlign: 'center', color: '#666'}}>{t('noResults')}</div>
                 )}
             </div>
          </SeasonModalContainer>
      );
  };

  // Render Episode Modal (Detail)
  const renderEpisodeModal = () => {
      if (!episodeModal || !detail?.seasons) return null;
      const { sIdx, eIdx } = episodeModal;
      const season = detail.seasons[sIdx];
      const episodes = seasonEpisodes[season.season_number];
      if (!episodes) return null; 
      const ep = episodes[eIdx];

      return (
          <FullScreenModal onClick={() => setEpisodeModal(null)}>
              <ModalClose onClick={() => setEpisodeModal(null)}><i className="fa-solid fa-times"></i></ModalClose>
              
              <ModalContentWrapper onClick={e => e.stopPropagation()}>
                  <div style={{width: '100%', background: '#111', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh'}}>
                       <div style={{position: 'relative', width: '100%', aspectRatio: '16/9', flexShrink: 0}}>
                           {loadingEpisodeImage && <div style={{position: 'absolute', inset: 0, zIndex: 1}}><SkeletonPulse height="100%" radius="0" /></div>}
                           
                           {(!episodeImageError && ep.still_path) ? (
                               <img 
                                   src={`https://image.tmdb.org/t/p/original${ep.still_path}`} 
                                   alt={ep.name}
                                   style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                   onLoad={() => setLoadingEpisodeImage(false)}
                                   onError={(e) => {
                                       setLoadingEpisodeImage(false);
                                       setEpisodeImageError(true);
                                   }}
                               />
                           ) : (
                               <div style={{width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888'}}>
                                   {t('imageNotAvailable')}
                               </div>
                           )}
                       </div>
                       
                       <div style={{padding: '15px 20px', borderBottom: '1px solid #333', background: '#181818', flexShrink: 0}}>
                           <h2 style={{fontSize: 18, marginBottom: 5, marginTop: 0}}>{ep.name}</h2>
                           <div style={{display: 'flex', gap: 15, fontSize: 13, color: '#aaa'}}>
                               <span>{formatDate(ep.air_date, currentLanguage)}</span>
                               {ep.runtime && <span>{ep.runtime} min</span>}
                               <span style={{color: 'gold'}}><i className="fa-solid fa-star"></i> {ep.vote_average.toFixed(1)}</span>
                           </div>
                       </div>

                       <div style={{padding: 20, overflowY: 'auto', flex: 1}}>
                           {ep.overview ? <p style={{lineHeight: 1.6, color: '#ddd', fontSize: 14, marginTop: 0}}>{ep.overview}</p> : null}
                       </div>
                  </div>
              </ModalContentWrapper>

              <ModalControls onClick={e => e.stopPropagation()}>
                  <ModalNavBtn 
                     onClick={(e) => { e.stopPropagation(); handlePrevEpisode(); }}
                     disabled={sIdx === 0 && eIdx === 0}
                  >
                      <i className="fa-solid fa-chevron-left"></i>
                  </ModalNavBtn>
                  
                  <InfoDisplay>
                     <InfoTop>{season.name}</InfoTop>
                     <InfoBottom>{t('episode')} {ep.episode_number}/{episodes.length}</InfoBottom>
                  </InfoDisplay>
                  
                  <ModalNavBtn 
                     onClick={(e) => { e.stopPropagation(); handleNextEpisode(); }}
                  >
                      <i className="fa-solid fa-chevron-right"></i>
                  </ModalNavBtn>
              </ModalControls>
              
              {loadingEpisodeNav && (
                  <div style={{position: 'absolute', bottom: 80, color: 'white', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: 5}}>
                      {t('loading')}
                  </div>
              )}
          </FullScreenModal>
      );
  };

  const isModalOpen = galleryIndex !== null || episodeModal !== null || openSeasonNumber !== null;

  // Determine if we show player or fallback
  const showPlayer = !loadingVideo && videoQueue.length > 0 && videoFallbackUrl === null;
  const showFallback = !loadingVideo && videoFallbackUrl !== null && videoFallbackUrl !== '';

  return (
    <Container ref={containerRef} $zIndex={zIndex} $isLocked={isModalOpen}>
      {/* Navigation Buttons */}
      {stackIndex > 0 && (
        <BackButton onClick={onClose}>
            <i className="fa-solid fa-arrow-left"></i>
        </BackButton>
      )}
      <CloseButton onClick={stackIndex > 0 ? onCloseAll : onClose}>
         <i className="fa-solid fa-times"></i>
      </CloseButton>
      
      {loadingDetail ? <SkeletonPulse height="50vh" radius="0" /> : (
        <HeroContainer>
          <BackgroundMedia>
             {!heroError && heroImage ? (
                 <StyledImage src={heroImage} alt="Backdrop" onError={handleHeroError} />
             ) : (
                 <PlaceholderHero>{t('imageNotAvailable')}</PlaceholderHero>
             )}
          </BackgroundMedia>
          <GradientOverlay />
        </HeroContainer>
      )}

      {loadingDetail ? (
         <HeaderContent>
            <SkeletonPulse height="40px" width="70%" style={{marginBottom: 20}} />
            <SkeletonPulse height="20px" width="40%" style={{marginBottom: 20}} />
         </HeaderContent>
      ) : detail && (
        <HeaderContent>
          <Title>{detail.title || detail.name}</Title>
          <Meta>
            <MediaTag>{detail.media_type === 'tv' ? t('media_tv') : t('media_movie')}</MediaTag>
            <span><i className="fa-solid fa-star" style={{color: 'gold'}}></i> {detail.vote_average.toFixed(1)} ({detail.vote_count} {t('votes')})</span>
            <span>{formatDate(detail.release_date || detail.first_air_date, currentLanguage)}</span>
            {detail.runtime && <span>{detail.runtime} {t('min')}</span>}
          </Meta>
          <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
            {detail.genres.map(g => (
              <Tag key={g.id}>{t(`genre_${g.id}`, g.name)}</Tag>
            ))}
          </div>
          
          <ButtonsRow>
              <ActionButton $active={isFav} onClick={() => isFav ? removeFavorite(detail.id) : addFavorite(detail)}>
                <i className={isFav ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                {isFav ? t('removeFromFav') : t('addToFav')}
              </ActionButton>
              <ActionButton $active={isSeen} onClick={() => isSeen ? removeWatched(detail.id) : addWatched(detail)}>
                <i className={isSeen ? "fa-solid fa-eye" : "fa-regular fa-eye"}></i>
                {isSeen ? t('removeFromWatched') : t('markAsWatched')}
              </ActionButton>
              {showFallback && videoFallbackUrl && (
                  <ActionButton 
                      $primary 
                      onClick={() => window.open(videoFallbackUrl!, '_blank', 'noopener,noreferrer')}
                  >
                     <i className="fa-brands fa-youtube"></i>
                     {t('goToTrailer')}
                  </ActionButton>
              )}
              <ActionButton onClick={handleShare}>
                 <i className="fa-solid fa-share-nodes"></i>
                 {t('share')}
              </ActionButton>
          </ButtonsRow>
        </HeaderContent>
      )}

      {showPlayer && (
        <StickyVideoContainer $isSticky={isPlayerReady}>
               <YouTubePlayer 
                  videos={videoQueue} 
                  onFallback={handleVideoFallback}
                  onPlayerReady={handlePlayerReady}
               />
        </StickyVideoContainer>
      )}

      <BodyContent>
        <SectionHeader>
           <SectionTitle>{t('availableOn')}</SectionTitle>
        </SectionHeader>
        {loadingProviders ? (
             <SkeletonPulse width="100%" height="60px" style={{marginBottom: 20}} />
        ) : (
             providers?.flatrate && providers.flatrate.length > 0 ? (
                <ProviderRow>
                  {providers.flatrate.map(p => (
                      <ProviderTextLink key={p.provider_id} href={providers.link} target="_blank" rel="noopener noreferrer">
                        {p.provider_name}
                      </ProviderTextLink>
                  ))}
                </ProviderRow>
             ) : <p style={{color: '#888', marginBottom: 20}}>{t('noProviders')}</p>
        )}

        <SectionHeader>
           <SectionTitle>{t('overview')}</SectionTitle>
        </SectionHeader>
        {loadingDetail ? (
           <SkeletonPulse width="100%" height="100px" style={{marginBottom: 30}} />
        ) : (
           <Overview>{detail?.overview || t('noResults')}</Overview>
        )}

        {detail && (
          <>
            <SectionHeader>
               <SectionTitle>{t('details')}</SectionTitle>
            </SectionHeader>
            <InfoGrid>
              {detail.original_title && (
                <InfoItem>
                  <InfoLabel>{t('originalTitle')}</InfoLabel>
                  <InfoValue>{detail.original_title}</InfoValue>
                </InfoItem>
              )}
              {detail.original_language && (
                <InfoItem>
                  <InfoLabel>{t('originalLanguage')}</InfoLabel>
                  <InfoValue>{getLanguageName(detail.original_language, currentLanguage)}</InfoValue>
                </InfoItem>
              )}
              {type === 'tv' && detail.status && (
                <InfoItem>
                   <InfoLabel>{t('status')}</InfoLabel>
                   <InfoValue>{getStatusText(detail.status)}</InfoValue>
                </InfoItem>
              )}
              {detail.origin_country && detail.origin_country.length > 0 && (
                 <InfoItem>
                   <InfoLabel>{t('originCountry')}</InfoLabel>
                   <InfoValue>{detail.origin_country.map(c => getCountryName(c, currentLanguage)).join(', ')}</InfoValue>
                 </InfoItem>
              )}
              {detail.tagline && (
                 <InfoItem>
                   <InfoLabel>{t('tagline')}</InfoLabel>
                   <InfoValue>"{detail.tagline}"</InfoValue>
                </InfoItem>
              )}
              {directors && <InfoItem><InfoLabel>{t('director')}</InfoLabel><InfoValue>{directors}</InfoValue></InfoItem>}
              {writers && <InfoItem><InfoLabel>{t('screenplay')}</InfoLabel><InfoValue>{writers}</InfoValue></InfoItem>}
              {music && <InfoItem><InfoLabel>{t('music')}</InfoLabel><InfoValue>{music}</InfoValue></InfoItem>}
              {dates?.local && dates.local !== dates.original && (
                <InfoItem>
                  <InfoLabel>{t('localRelease', { region: currentLanguage === 'it' ? 'IT' : 'US' })}</InfoLabel>
                  <InfoValue>{formatDate(dates.local, currentLanguage)}</InfoValue>
                </InfoItem>
              )}
              {detail.production_companies && detail.production_companies.length > 0 && (
                <InfoItem>
                   <InfoLabel>{t('productionCompanies')}</InfoLabel>
                   <InfoValue>{detail.production_companies.map(c => c.name).join(', ')}</InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </>
        )}

        {renderSeasons()}

        <SectionHeader>
           <SectionTitle>{t('cast')}</SectionTitle>
        </SectionHeader>
        {loadingCast ? (
           <ScrollContainer>
             {[...Array(5)].map((_, i) => (
                <div key={i} style={{minWidth: 100, textAlign: 'center'}}>
                    <SkeletonPulse width="80px" height="80px" radius="50%" style={{marginBottom: 8}} />
                    <SkeletonPulse width="80px" height="15px" />
                </div>
             ))}
           </ScrollContainer>
        ) : (
           cast.length > 0 ? (
            <ScrollContainer>
              {cast.slice(0, 15).map(actor => (
                <CastMemberItem key={actor.id}>
                  {actor.profile_path ? (
                    <CastImg 
                      src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`} 
                      alt={actor.name}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <FallbackAvatar>{getInitials(actor.name)}</FallbackAvatar>
                  )}
                  <CastName>{actor.name}</CastName>
                  <CastChar>{actor.character}</CastChar>
                </CastMemberItem>
              ))}
            </ScrollContainer>
           ) : <p style={{color: '#888', marginBottom: 20}}>{t('noResults')}</p>
        )}

        <div style={{marginTop: 30}}>
            <SectionHeader>
                <SectionTitle>{t('reviews')}</SectionTitle>
                <SelectLang value={reviewLang} onChange={handleReviewLangChange}>
                    <option value="app">{getLanguageName(currentLanguage === 'it' ? 'it' : 'en', currentLanguage)}</option>
                    <option value={currentLanguage === 'it' ? 'en-US' : 'it-IT'}>{getLanguageName(currentLanguage === 'it' ? 'en' : 'it', currentLanguage)}</option>
                    <option value="all">{t('reviewsLangAll')}</option>
                </SelectLang>
            </SectionHeader>
            {loadingReviews ? (
                <ScrollContainer>
                    <SkeletonPulse width="280px" height="150px" />
                    <SkeletonPulse width="280px" height="150px" />
                </ScrollContainer>
            ) : (
                reviews.length > 0 ? (
                    <ScrollContainer>
                        {reviews.map(review => (
                            <ReviewCard key={review.id}>
                                <ReviewHeader>
                                    <ReviewMeta>
                                        <Author>{review.author}</Author>
                                        <ReviewDate>{formatDate(review.created_at, currentLanguage)}</ReviewDate>
                                    </ReviewMeta>
                                    {review.author_details.rating && (
                                        <ReviewRatingBadge>
                                            {review.author_details.rating}/10 <i className="fa-solid fa-star"></i>
                                        </ReviewRatingBadge>
                                    )}
                                </ReviewHeader>
                                <ReviewContent>{review.content}</ReviewContent>
                            </ReviewCard>
                        ))}
                    </ScrollContainer>
                ) : <p style={{color: '#888', marginBottom: 20}}>{t('noResults')}</p>
            )}
        </div>

        <div style={{marginTop: 30}}>
            <SectionHeader>
                <SectionTitle>{t('gallery')}</SectionTitle>
            </SectionHeader>
            {loadingGallery ? (
                <ScrollContainer>
                     <SkeletonPulse width="200px" height="120px" />
                     <SkeletonPulse width="200px" height="120px" />
                </ScrollContainer>
            ) : (
                gallery.length > 0 ? (
                    <ScrollContainer>
                         {gallery.map((img, idx) => (
                             <GalleryImg 
                                key={idx} 
                                src={`https://image.tmdb.org/t/p/w500${img.file_path}`} 
                                alt="Gallery Item" 
                                loading="lazy"
                                onClick={() => { setGalleryIndex(idx); setLoadingGalleryImage(true); }}
                             />
                         ))}
                    </ScrollContainer>
                ) : <p style={{color: '#888', marginBottom: 20}}>{t('noResults')}</p>
            )}
        </div>

        <div style={{marginTop: 30}}>
            <SectionHeader>
                <SectionTitle>{t('recommendations')}</SectionTitle>
            </SectionHeader>
            {loadingRecommendations ? (
                <ScrollContainer>
                    {[...Array(3)].map((_, i) => (
                    <div key={i} style={{marginRight: 15, minWidth: 140}}>
                        <SkeletonPulse width="140px" height="210px" />
                    </div>
                    ))}
                </ScrollContainer>
            ) : (
                recommendations.length > 0 ? (
                    <ScrollContainer>
                        {recommendations.map(m => (
                            <MovieCard key={m.id} movie={m} />
                        ))}
                    </ScrollContainer>
                ) : <p style={{color: '#888', marginBottom: 20}}>{t('noResults')}</p>
            )}
        </div>

      </BodyContent>

      {/* Moved BackToTopButton to the end of the return to avoid index shifting in DOM causing iframe reload */}
      {showScrollTop && !isModalOpen && (
          <BackToTopButton onClick={scrollToTop}>
              <i className="fa-solid fa-arrow-up"></i>
          </BackToTopButton>
      )}

      {renderGalleryModal()}
      {renderSeasonModal()}
      {renderEpisodeModal()}
      
    </Container>
  );
};

export default DetailPage;
