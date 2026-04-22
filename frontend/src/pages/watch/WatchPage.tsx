import { useParams } from 'react-router-dom';
import { HlsPlayer } from '../../components/HlsPlayer';
import { Card, PageShell } from '../../components/ui';
import { getHlsUrl } from '../../lib/api';

export const WatchPage = () => {
  const { streamKey } = useParams<{ streamKey: string }>();

  if (!streamKey) {
    return (
      <PageShell>
        <Card>Missing stream key.</Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold text-black">Watching /{streamKey}</h1>
        <p className="text-black/60">You are currently watching a live broadcast.</p>
      </div>
      
      <Card className="p-0 overflow-hidden bg-black border-none shadow-2xl aspect-video flex items-center justify-center">
        <HlsPlayer src={getHlsUrl(streamKey)} />
      </Card>
      
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vimeo-lightGray flex items-center justify-center text-vimeo-blue font-bold">
            {streamKey.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-black">{streamKey}</p>
            <p className="text-xs text-black/60">Live Stream</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
};
