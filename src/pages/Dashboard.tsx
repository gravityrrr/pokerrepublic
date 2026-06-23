import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  MonitorPlay,
  TrendingUp,
  Activity,
  Bell
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { exportToCsv } from '../utils/exportCsv';
import './Dashboard.css';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import CheckInModal from '../components/players/CheckInModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';


const StatCard = ({ title, value, icon, trend, trendUp, delay }: any) => (
  <div className={`stat-card card card-hover`} style={{ animationDelay: `${delay}s` }}>
    <div className="stat-header">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-icon-wrapper">{icon}</div>
    </div>
    <div className="stat-content">
      <h2 className="stat-value">{value}</h2>
      <div className={`stat-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
        {trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        <span>{trend}</span>
        <span className="trend-text">vs last week</span>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { role } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [stats, setStats] = useState({
    total_registered_players: 0,
    players_currently_playing: 0,
    sessions_today: 0,
    avg_session_duration_today_mins: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [feed, setFeed] = useState<any[]>([]);

  const fetchStats = async () => {
    const { data, error } = await supabase.from('vw_dashboard_summary').select('*').single();
    if (error) {
      toast.error("Failed to load dashboard stats: " + error.message);
    }
    if (data) {
      setStats(data);
    }

    // Fetch real chart data (Check-ins per hour for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('check_in_time')
      .gte('check_in_time', today.toISOString());
      
    if (sessionData) {
      const hourCounts: Record<number, number> = {};
      sessionData.forEach((s: any) => {
        const hour = new Date(s.check_in_time).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const newChartData = [];
      const currentHour = new Date().getHours();
      for (let i = Math.max(0, currentHour - 11); i <= currentHour; i++) {
        const ampm = i >= 12 ? 'PM' : 'AM';
        const displayHour = i % 12 === 0 ? 12 : i % 12;
        newChartData.push({
          time: `${displayHour} ${ampm}`,
          checkins: hourCounts[i] || 0
        });
      }
      setChartData(newChartData);
    }

    // Fetch initial feed history
    const { data: recentAlerts } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentAlerts) {
      setFeed(recentAlerts.map(a => ({
        type: a.severity?.toLowerCase() === 'critical' ? 'alert' : 'checkin',
        text: a.title,
        time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVIP: a.severity?.toLowerCase() === 'critical'
      })));
    }
  };

  useEffect(() => {
    fetchStats();

    const channel = supabase.channel('dashboard-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, _payload => {
        setFeed(prev => [{ type: 'checkin', text: `Player checked in at a table.`, time: 'Just now', isVIP: false }, ...prev].slice(0, 10));
        toast.success("Player checked in.");
        fetchStats();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, payload => {
        if (payload.new.status === 'Completed' && payload.old.status === 'Active') {
          setFeed(prev => [{ type: 'checkout', text: `Player checked out. Duration: ${payload.new.duration_minutes || 0}m`, time: 'Just now', isVIP: false }, ...prev].slice(0, 10));
          toast.info(`Player checked out. Duration: ${payload.new.duration_minutes || 0}m`);
          fetchStats();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, payload => {
        setFeed(prev => [{ type: 'checkin', text: `New player registered: ${payload.new.first_name}`, time: 'Just now', isVIP: false }, ...prev].slice(0, 10));
        toast.success(`New Player Registered: ${payload.new.first_name}`);
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="dashboard-container">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Real-time floor operations and analytics</p>
        </div>
        <div className="header-actions">
          {role === 'Super Admin' && (
            <button 
              className="btn-secondary"
              onClick={() => exportToCsv('dashboard_summary_report', [stats])}
            >
              Export Report
            </button>
          )}
          <button className="btn-primary" onClick={() => setIsCheckInOpen(true)}>
            New Check-in
          </button>
        </div>
      </div>

      <div className="stats-grid animate-slide-up">
        <StatCard 
          title="Total Players" 
          value={stats.total_registered_players} 
          icon={<Users size={24} className="text-accent" />} 
          trend="Live" 
          trendUp={true}
          delay={0.1}
        />
        <StatCard 
          title="Active Players" 
          value={stats.players_currently_playing} 
          icon={<MonitorPlay size={24} className="text-accent" />} 
          trend="Live" 
          trendUp={true}
          delay={0.2}
        />
        <StatCard 
          title="Avg Session (Today)" 
          value={`${Math.round(stats.avg_session_duration_today_mins)}m`} 
          icon={<Clock size={24} className="text-accent" />} 
          trend="Live" 
          trendUp={false}
          delay={0.3}
        />
        <StatCard 
          title="Sessions Today" 
          value={stats.sessions_today} 
          icon={<TrendingUp size={24} className="text-accent" />} 
          trend="Live" 
          trendUp={true}
          delay={0.4}
        />
      </div>

      <div className="dashboard-main-grid">
        <div className="chart-section card animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="section-header">
            <h3 className="section-title">Floor Activity (Last 24h)</h3>
            <div className="chart-actions">
              <span className="badge badge-success"><Activity size={14} className="mr-1"/> Live</span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  cursor={{ fill: 'var(--bg-tertiary)' }}
                />
                <Bar dataKey="checkins" name="Check-ins" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="activity-feed card animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="section-header">
            <h3 className="section-title">Live Activity Feed</h3>
            <button className="btn-secondary" onClick={() => navigate('/alerts')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>View All</button>
          </div>
          <div className="feed-list">
            {feed.map((item, idx) => (
              <div key={idx} className="feed-item">
                <div className={`feed-icon ${item.type}`}>
                  {item.type === 'checkin' && <ArrowUpRight size={16} />}
                  {item.type === 'checkout' && <ArrowDownRight size={16} />}
                  {item.type === 'alert' && <Bell size={16} />}
                </div>
                <div className="feed-content">
                  <p className="feed-text">
                    {item.text}
                    {item.isVIP && <span className="badge badge-vip ml-2">VIP</span>}
                  </p>
                  <span className="feed-time">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <CheckInModal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} />
    </div>
  );
};

export default Dashboard;
