import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  RotateCcw,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getVideoBlobUrlFromIndexedDB } from '../../services/indexedDBService';

interface ShowcaseVideoPlayerProps {
  showcaseId?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  posterImage?: string;
  title: string;
  autoPlay?: boolean;
  onViewTracked?: () => void;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
}

export const ShowcaseVideoPlayer: React.FC<ShowcaseVideoPlayerProps> = ({
  showcaseId,
  videoUrl,
  thumbnailUrl,
  posterImage,
  title,
  autoPlay = false,
  onViewTracked,
  className = '',
  aspectRatio = 'video'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fallbackAttemptedRef = useRef(false);

  const [activeUrl, setActiveUrl] = useState(videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('The video demo is currently unavailable.');

  const poster = thumbnailUrl || posterImage;

  // Sync activeUrl when videoUrl prop changes
  useEffect(() => {
    setActiveUrl(videoUrl);
    fallbackAttemptedRef.current = false;
    setHasError(false);
    setIsLoading(false);

    let videoPath = videoUrl || '';
    try {
      if (videoUrl && !videoUrl.startsWith('blob:')) {
        videoPath = new URL(videoUrl, window.location.origin).pathname;
      }
    } catch (e) {}

    console.log('[VIDEO LOAD]', {
      'showcase ID': showcaseId || 'unknown',
      'video URL': videoUrl,
      'video path': videoPath
    });
  }, [showcaseId, videoUrl]);

  // Format seconds to mm:ss
  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec) || timeInSec < 0) return '0:00';
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handlePlayPause = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!videoRef.current) return;

    if (videoRef.current.paused || videoRef.current.ended) {
      setHasStarted(true);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Video playback warning:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch((err) => console.warn(err));
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch((err) => console.warn(err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Track view after 4 seconds of playback
    if (cur >= 4 && !hasTrackedView) {
      setHasTrackedView(true);
      if (onViewTracked) {
        onViewTracked();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 0;
    setDuration(dur);
    setHasError(false);
    console.log('[VIDEO SUCCESS] loadedmetadata', {
      duration: dur,
      videoWidth: videoRef.current.videoWidth,
      videoHeight: videoRef.current.videoHeight
    });
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setHasError(false);
    console.log('[VIDEO SUCCESS] canplay', {
      readyState: videoRef.current?.readyState,
      currentSrc: videoRef.current?.currentSrc
    });
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleVideoError = async () => {
    setIsLoading(false);
    const err = videoRef.current?.error;
    const currentSrc = videoRef.current?.currentSrc || activeUrl || videoUrl;

    // Try IndexedDB cached video fallback if available and not yet tried
    if (showcaseId && !fallbackAttemptedRef.current) {
      fallbackAttemptedRef.current = true;
      try {
        const cachedBlobUrl = await getVideoBlobUrlFromIndexedDB(showcaseId);
        if (cachedBlobUrl && cachedBlobUrl !== activeUrl) {
          console.log('[VIDEO FALLBACK] Switching to IndexedDB cache for showcase:', showcaseId);
          setActiveUrl(cachedBlobUrl);
          setHasError(false);
          return;
        }
      } catch (fallbackErr) {
        console.warn('[VIDEO FALLBACK] IndexedDB fallback check failed:', fallbackErr);
      }
    }

    setHasError(true);
    if (err?.code === 4) {
      setErrorMessage('Video format not supported or media source unavailable.');
    } else {
      setErrorMessage('The video demo could not be played.');
    }

    console.warn('[VIDEO NOTE]', {
      currentSrc,
      networkState: videoRef.current?.networkState,
      readyState: videoRef.current?.readyState,
      'error.code': err?.code,
      'error.message': err?.message || 'Media playback warning'
    });
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Sync fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative group/player bg-black rounded-2xl overflow-hidden select-none ${
        aspectRatio === 'video' ? 'aspect-video' : aspectRatio === 'square' ? 'aspect-square' : ''
      } ${className}`}
    >
      <video
        ref={videoRef}
        src={activeUrl}
        poster={poster}
        playsInline
        muted={isMuted}
        autoPlay={autoPlay}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={handleVideoError}
        onClick={handlePlayPause}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Poster Overlay with Play Button if not yet playing and no error */}
      {!hasStarted && !isPlaying && !hasError && (
        <div 
          onClick={handlePlayPause}
          className="absolute inset-0 bg-black/30 hover:bg-black/40 transition-colors flex items-center justify-center cursor-pointer z-10"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-900/90 text-white flex items-center justify-center shadow-xl backdrop-blur-xs group-hover/player:scale-110 transition-transform">
            <Play className="w-6 h-6 sm:w-7 sm:h-7 translate-x-0.5 fill-current" />
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-white text-[11px] font-bold">
            <span className="px-2.5 py-1 bg-black/70 rounded-lg backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-400" />
              <span>Project Demo</span>
            </span>
            {duration > 0 && (
              <span className="px-2 py-1 bg-black/70 rounded-lg backdrop-blur-xs">
                {formatTime(duration)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Video Control Bar */}
      {hasStarted && !hasError && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex flex-col gap-1.5 z-20 opacity-0 group-hover/player:opacity-100 transition-opacity duration-200"
        >
          {/* Progress Slider */}
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
          />

          <div className="flex items-center justify-between text-white text-xs font-semibold">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayPause}
                className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="text-[11px] font-mono opacity-90">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1 hover:text-red-400 transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error State with fallback and retry */}
      {hasError && (
        <div className="absolute inset-0 bg-neutral-900/95 text-white flex flex-col items-center justify-center p-4 text-center z-30">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2 opacity-90" />
          <p className="text-xs font-bold text-neutral-200 mb-1">{title || 'Video Demo'}</p>
          <p className="text-[11px] text-neutral-400 max-w-xs mb-3">{errorMessage}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Playback</span>
          </button>
        </div>
      )}
    </div>
  );
};
