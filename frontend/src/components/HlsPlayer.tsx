import Hls from 'hls.js';
import { RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type HlsPlayerProps = {
  src: string;
};

export const HlsPlayer = ({ src }: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initPlayer = () => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    setLoading(true);
    setError(null);

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        maxLiveSyncPlaybackRate: 1.5,
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play();
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('Stream offline or unavailable. Retrying...');
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        void video.play();
        setLoading(false);
      });
    } else {
      setError('HLS is not supported in this browser.');
      setLoading(false);
    }
  };

  useEffect(() => {
    initPlayer();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const handleRefresh = () => {
    if (hlsRef.current) {
      // Jump to live edge
      const video = videoRef.current;
      if (video) {
        // If we are significantly behind, reload source to catch up properly
        if (video.duration - video.currentTime > 10) {
          initPlayer();
        } else {
          video.currentTime = video.duration;
        }
      }
    } else {
      initPlayer();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black group">
      {loading && <div className="absolute inset-0 z-10 grid place-items-center text-sm text-zinc-300 bg-black/40">Loading stream...</div>}
      {error && <div className="absolute left-3 top-3 z-20 rounded bg-red-500/80 px-3 py-1 text-xs text-white">{error}</div>}
      
      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/20 backdrop-blur-sm transition-all text-[11px] font-bold tracking-tight uppercase"
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Live</span>
          <RefreshCcw size={12} className="ml-1 opacity-70" />
        </button>
      </div>

      <video ref={videoRef} controls playsInline className="aspect-video w-full" />
    </div>
  );
};
