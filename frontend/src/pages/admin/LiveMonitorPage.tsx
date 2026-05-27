import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Card, PageShell } from '../../components/ui';

type LiveItem = { id: string; key: string; name: string; startedAt: string; viewerCount: number };
type StreamStats = { bitrate: number; fps: number; viewers: number; uptime: number };
type LiveItemWithStats = LiveItem & Partial<StreamStats>;

const formatUptime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m}m`
    : m > 0
    ? `${m}m ${s}s`
    : `${s}s`;
};

export const LiveMonitorPage = () => {
  const [streams, setStreams] = useState<LiveItemWithStats[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const live = await apiFetch<LiveItem[]>('/live');

      const withStats = await Promise.all(
        live.map(async (s) => {
          try {
            const stats = await apiFetch<StreamStats>(`/streams/${s.key}/stats`);
            return { ...s, ...stats };
          } catch {
            return s;
          }
        })
      );

      setStreams(withStats);
    };

    void fetchAll();
    const id = setInterval(() => { void fetchAll(); }, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <PageShell>
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-black">Live Monitor</h1>
        <p className="text-black/60">View all currently active streams and their statistics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {streams.length === 0 ? (
          <Card className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-2 bg-vimeo-lightGray/30 border-dashed border-2">
            <p className="text-black/60 font-medium text-lg">No active streams right now.</p>
            <p className="text-sm text-black/40">Start broadcasting to see your streams here.</p>
          </Card>
        ) : (
          streams.map((stream) => (
            <Card key={stream.id} className="relative overflow-hidden group hover:border-vimeo-blue transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">LIVE NOW</span>
              </div>
              <h2 className="text-xl font-bold text-black mb-1 truncate">{stream.name}</h2>

              {/* SRS stats row */}
              <div className="grid grid-cols-3 gap-2 mt-3 mb-1">
                <div className="flex flex-col items-center bg-vimeo-lightGray rounded-lg py-2">
                  <span className="text-[10px] font-semibold text-black/50 uppercase">Bitrate</span>
                  <span className="text-sm font-bold text-black">
                    {stream.bitrate != null ? `${stream.bitrate} kbps` : '—'}
                  </span>
                </div>
                <div className="flex flex-col items-center bg-vimeo-lightGray rounded-lg py-2">
                  <span className="text-[10px] font-semibold text-black/50 uppercase">FPS</span>
                  <span className="text-sm font-bold text-black">
                    {stream.fps != null ? stream.fps.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="flex flex-col items-center bg-vimeo-lightGray rounded-lg py-2">
                  <span className="text-[10px] font-semibold text-black/50 uppercase">Uptime</span>
                  <span className="text-sm font-bold text-black">
                    {stream.uptime != null ? formatUptime(stream.uptime) : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-vimeo-border">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-black/50 uppercase">Stream Path</span>
                  <span className="text-sm font-medium text-black">/{stream.key}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-black/50 uppercase">Viewers</span>
                  <span className="text-sm font-bold text-black">{stream.viewers ?? stream.viewerCount}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
};
