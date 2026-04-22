import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Card, PageShell } from '../../components/ui';

type LiveItem = { id: string; key: string; name: string; startedAt: string; viewerCount: number };

export const LiveMonitorPage = () => {
  const [streams, setStreams] = useState<LiveItem[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      void apiFetch<LiveItem[]>('/live').then(setStreams);
    }, 4000);

    return () => clearInterval(id);
  }, []);

  return (
    <PageShell>
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold text-black">Live Monitor</h1>
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
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-vimeo-border">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-black/50 uppercase">Stream Path</span>
                  <span className="text-sm font-medium text-black">/{stream.key}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-semibold text-black/50 uppercase">Viewers</span>
                   <span className="text-sm font-bold text-black">{stream.viewerCount}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
};
