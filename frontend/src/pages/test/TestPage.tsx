import { useMemo, useState } from 'react';
import { HlsPlayer } from '../../components/HlsPlayer';
import { Card, PageShell } from '../../components/ui';
import { getHlsUrl } from '../../lib/api';

export const TestPage = () => {
  const [streamKey, setStreamKey] = useState('');
  const streamUrl = useMemo(() => (streamKey ? getHlsUrl(streamKey) : ''), [streamKey]);

  return (
    <PageShell>
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold text-black">Test Streaming</h1>
        <p className="text-black/60">Preview your stream by entering your stream key below.</p>
      </div>
      
      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-black">Stream Key</label>
          <input
            value={streamKey}
            onChange={(e) => setStreamKey(e.target.value)}
            placeholder="Enter stream key (e.g., my-awesome-stream)"
            className="w-full rounded-lg border border-vimeo-border bg-vimeo-lightGray p-2 text-black outline-none focus:border-vimeo-blue"
          />
          <p className="text-xs text-black/60">Debug URL: <code className="bg-vimeo-lightGray px-1 rounded text-black">{streamUrl || 'N/A'}</code></p>
        </div>
        
        <div className="pt-4 border-t border-vimeo-border">
          {streamKey ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-black">Player Preview</p>
              <HlsPlayer src={streamUrl} />
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 bg-vimeo-lightGray/30 rounded-xl border-dashed border-2 border-vimeo-border">
              <p className="text-black/60 font-medium">Enter a key to start preview.</p>
            </div>
          )}
        </div>
      </Card>
    </PageShell>
  );
};
