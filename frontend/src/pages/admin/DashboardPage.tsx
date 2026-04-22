import { useEffect, useState } from 'react';
import { Radio, Library, Activity, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card } from '../../components/ui';

type Stats = {
  liveCount: number;
  totalKeys: number;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({ liveCount: 0, totalKeys: 0 });
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [live, keys] = await Promise.all([
          apiFetch<any[]>('/live'),
          apiFetch<any[]>('/streams', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setStats({
          liveCount: live.length,
          totalKeys: keys.length
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    void fetchStats();
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-black">Dashboard Overview</h1>
        <p className="text-black/60">Real-time status of your streaming server.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <Radio size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-black/60">Live Streams</p>
            <p className="text-2xl font-bold text-black">{stats.liveCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
            <Library size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-black/60">Total Keys</p>
            <p className="text-2xl font-bold text-black">{stats.totalKeys}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 opacity-50">
          <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-black/60">Server Load</p>
            <p className="text-2xl font-bold text-black">Normal</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 opacity-50">
          <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-black/60">Total Viewers</p>
            <p className="text-2xl font-bold text-black">0</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-black">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <a href="/admin/streams" className="p-4 rounded-xl bg-vimeo-lightGray hover:bg-vimeo-border transition-colors text-center">
              <p className="font-bold text-black text-sm">Manage Keys</p>
            </a>
            <a href="/admin/live-monitor" className="p-4 rounded-xl bg-vimeo-lightGray hover:bg-vimeo-border transition-colors text-center">
              <p className="font-bold text-black text-sm">Monitor Live</p>
            </a>
          </div>
        </Card>

        <Card className="flex flex-col justify-center items-center text-center space-y-2 p-12 bg-vimeo-lightGray/30 border-dashed border-2">
          <div className="bg-white p-4 rounded-full shadow-sm">
             <Activity className="text-vimeo-blue" size={32} />
          </div>
          <h3 className="font-bold text-black">System Logs</h3>
          <p className="text-sm text-black/60 max-w-xs">Logging and advanced analytics will appear here in future updates.</p>
        </Card>
      </div>
    </div>
  );
}
