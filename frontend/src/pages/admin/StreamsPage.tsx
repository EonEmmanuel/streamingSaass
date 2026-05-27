import { FormEvent, useEffect, useState } from 'react';
import { Copy, Trash2, Check } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Button, Card, PageShell } from '../../components/ui';

type StreamKeyItem = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  rtmpUrl: string;
  srtIngestUrl: string;
  srtPlaybackUrl: string;
};

export const StreamsPage = () => {
  const [items, setItems] = useState<StreamKeyItem[]>([]);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const token = localStorage.getItem('token') ?? '';

  const refresh = async () => {
    const data = await apiFetch<StreamKeyItem[]>('/streams', { headers: { Authorization: `Bearer ${token}` } });
    setItems(data);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch('/streams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, name })
    });
    setName('');
    setKey('');
    await refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stream key?')) return;
    try {
      await apiFetch(`/streams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await refresh();
    } catch (err) {
      console.error('Failed to delete stream key', err);
    }
  };

  const onCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-black">Stream Keys</h1>
        <p className="text-black/60">Manage and create keys for your streaming sessions.</p>
      </div>

      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-black mb-4">Create New Key</h2>
        <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black px-1">Display Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Weekly Webinar" className="w-full rounded-lg border border-vimeo-border bg-vimeo-lightGray p-2 text-black outline-none focus:border-vimeo-blue" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black px-1">Stream Key</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g., webinar-01" className="w-full rounded-lg border border-vimeo-border bg-vimeo-lightGray p-2 text-black outline-none focus:border-vimeo-blue" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full h-[42px]">Create Key</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black px-1">Existing Keys</h2>
        {items.length === 0 ? (
          <Card className="text-center py-10 text-black/60">No stream keys found. Create one above to get started.</Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-black truncate">{item.name}</p>
                  <code className="text-[11px] bg-vimeo-lightGray px-2 py-0.5 rounded text-black/60 font-mono break-all">{item.key}</code>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("h-2 w-2 rounded-full", item.isActive ? "bg-emerald-500" : "bg-black/20")} />
                  <span className={cn("text-xs font-bold", item.isActive ? 'text-emerald-600' : 'text-black/40')}>
                    {item.isActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-black/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                    title="Delete Key"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onCopy(item.id + '-rtmp', item.rtmpUrl)}
                  className={cn(
                    "flex items-center gap-2 bg-vimeo-lightGray text-black hover:bg-vimeo-border border border-vimeo-border shadow-none transition-all duration-200",
                    copiedId === item.id + '-rtmp' && "bg-emerald-50 border-emerald-200 text-emerald-600"
                  )}
                >
                  {copiedId === item.id + '-rtmp' ? <Check size={14} /> : <Copy size={14} />}
                  <span className="text-xs">{copiedId === item.id + '-rtmp' ? 'Copied RTMP!' : 'Copy RTMP'}</span>
                </Button>
                <Button
                  onClick={() => onCopy(item.id + '-srt', item.srtIngestUrl)}
                  className={cn(
                    "flex items-center gap-2 bg-vimeo-lightGray text-black hover:bg-vimeo-border border border-vimeo-border shadow-none transition-all duration-200",
                    copiedId === item.id + '-srt' && "bg-emerald-50 border-emerald-200 text-emerald-600"
                  )}
                >
                  {copiedId === item.id + '-srt' ? <Check size={14} /> : <Copy size={14} />}
                  <span className="text-xs">{copiedId === item.id + '-srt' ? 'Copied SRT Ingest!' : 'Copy SRT Ingest'}</span>
                </Button>
                <Button
                  onClick={() => onCopy(item.id + '-srt-play', item.srtPlaybackUrl)}
                  className={cn(
                    "flex items-center gap-2 bg-vimeo-lightGray text-black hover:bg-vimeo-border border border-vimeo-border shadow-none transition-all duration-200",
                    copiedId === item.id + '-srt-play' && "bg-emerald-50 border-emerald-200 text-emerald-600"
                  )}
                >
                  {copiedId === item.id + '-srt-play' ? <Check size={14} /> : <Copy size={14} />}
                  <span className="text-xs">{copiedId === item.id + '-srt-play' ? 'Copied SRT Playback!' : 'Copy SRT Playback'}</span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
};
