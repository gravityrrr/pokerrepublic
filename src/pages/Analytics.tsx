import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  Calendar as CalendarIcon,
  Award,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import './Dashboard.css';

const StatCard = ({ title, value, icon, subtitle, delay }: any) => (
  <div className={`stat-card card card-hover animate-slide-up`} style={{ animationDelay: `${delay}s` }}>
    <div className="stat-header">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-icon-wrapper">{icon}</div>
    </div>
    <div className="stat-content">
      <h2 className="stat-value">{value}</h2>
      <div className="stat-trend trend-up" style={{ color: 'var(--text-muted)' }}>
        <span>{subtitle}</span>
      </div>
    </div>
  </div>
);

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Metrics
  const [totalHours, setTotalHours] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  
  // Chart Data
  const [peakHoursData, setPeakHoursData] = useState<any[]>([]);
  const [durationData, setDurationData] = useState<any[]>([]);
  
  // Leaderboard
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  
  // Staff Performance
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    
    // Fetch all sessions with player names and the admin who checked them in
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*, players(first_name, last_name, profile_image_url), admins:checked_in_by(full_name)');

    if (!error && sessions) {
      // 1. Calculate Core Metrics
      let totalMins = 0;
      const completedSessions = sessions.filter(s => s.status === 'Completed');
      completedSessions.forEach(s => totalMins += (s.duration_minutes || 0));
      setTotalHours(Math.round(totalMins / 60));
      setAvgDuration(completedSessions.length > 0 ? Math.round(totalMins / completedSessions.length) : 0);
      setTotalVisits(sessions.length);

      // 2. Calculate Peak Hours (Check-ins by Hour of Day)
      const hourCounts: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourCounts[i] = 0;
      
      sessions.forEach(s => {
        if (s.check_in_time) {
          const hour = new Date(s.check_in_time).getHours();
          hourCounts[hour]++;
        }
      });

      const peakData = [];
      for (let i = 12; i < 36; i++) {
        // Start from 12 PM to 11 AM next day (typical poker hours)
        const hour = i % 24;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const display = hour % 12 === 0 ? 12 : hour % 12;
        peakData.push({
          time: `${display} ${ampm}`,
          visits: hourCounts[hour]
        });
      }
      setPeakHoursData(peakData);

      // 3. Calculate Player Leaderboard (By Total Duration)
      const playerStats: Record<string, any> = {};
      sessions.forEach(s => {
        if (!s.players) return;
        const pId = s.player_id;
        if (!playerStats[pId]) {
          playerStats[pId] = {
            id: pId,
            name: `${s.players.first_name} ${s.players.last_name}`,
            image: s.players.profile_image_url,
            totalMins: 0,
            visits: 0
          };
        }
        playerStats[pId].totalMins += (s.duration_minutes || 0);
        playerStats[pId].visits += 1;
      });

      const leaderboard = Object.values(playerStats)
        .sort((a: any, b: any) => b.totalMins - a.totalMins)
        .slice(0, 5); // Top 5
        
      setTopPlayers(leaderboard);

      // 3.5 Calculate Staff Performance
      const staffCounts: Record<string, any> = {};
      sessions.forEach(s => {
        if (!s.checked_in_by) return;
        const adminId = s.checked_in_by;
        if (!staffCounts[adminId]) {
          staffCounts[adminId] = {
            id: adminId,
            name: s.admins?.full_name || 'Unknown Staff',
            checkIns: 0
          };
        }
        staffCounts[adminId].checkIns += 1;
      });

      const staffLeaderboard = Object.values(staffCounts)
        .sort((a: any, b: any) => b.checkIns - a.checkIns);
      setStaffPerformance(staffLeaderboard);
      
      // 4. Activity Over Time (Last 7 Days)
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
      }
      
      sessions.forEach(s => {
        if (s.check_in_time) {
          const day = new Date(s.check_in_time).toLocaleDateString('en-US', { weekday: 'short' });
          if (days[day] !== undefined) {
            days[day] += (s.duration_minutes || 0) / 60; // Hours
          }
        }
      });
      
      setDurationData(Object.keys(days).map(day => ({
        day,
        hours: Math.round(days[day] * 10) / 10
      })));
    }
    
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Session Analytics</h1>
          <p className="page-subtitle">Deep dive into player visit trends and durations</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading analytics...</div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="stats-grid mb-8">
            <StatCard 
              title="Total Hours Played" 
              value={totalHours.toLocaleString()} 
              icon={<Clock size={24} className="text-accent" />} 
              subtitle="All-time cumulative"
              delay={0.1}
            />
            <StatCard 
              title="Average Duration" 
              value={`${Math.floor(avgDuration / 60)}h ${avgDuration % 60}m`} 
              icon={<TrendingUp size={24} className="text-warning" style={{ color: '#f59e0b' }} />} 
              subtitle="Per player session"
              delay={0.2}
            />
            <StatCard 
              title="Total Player Visits" 
              value={totalVisits.toLocaleString()} 
              icon={<Users size={24} className="text-success" style={{ color: '#10b981' }} />} 
              subtitle="Completed check-ins"
              delay={0.3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* Peak Hours Chart */}
            <div className="card animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="section-header">
                <h3 className="section-title"><BarChart3 size={18} className="mr-2" style={{ display: 'inline' }} /> Peak Hours (Check-ins)</h3>
              </div>
              <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} interval={1} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      cursor={{ fill: 'var(--bg-tertiary)' }}
                    />
                    <Bar dataKey="visits" name="Check-ins" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Total Hours Last 7 Days */}
            <div className="card animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <div className="section-header">
                <h3 className="section-title"><CalendarIcon size={18} className="mr-2" style={{ display: 'inline' }} /> Hours Played (Last 7 Days)</h3>
              </div>
              <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={durationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Area type="monotone" dataKey="hours" name="Total Hours" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="card animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="section-header">
              <h3 className="section-title"><Award size={18} className="mr-2" style={{ display: 'inline' }} /> Most Active Players (All-Time)</h3>
            </div>
            <div style={{ marginTop: '1rem' }}>
              {topPlayers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No player data available yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {topPlayers.map((player, index) => (
                    <div key={player.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '1rem', 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius-md)',
                      border: index === 0 ? '1px solid #ffd700' : '1px solid transparent'
                    }}>
                      <div style={{ 
                        width: '30px', 
                        height: '30px', 
                        borderRadius: '50%', 
                        backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--bg-tertiary)',
                        color: index < 3 ? '#000' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        marginRight: '1rem'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                          {player.image ? (
                            <img src={player.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Users size={20} style={{ margin: '10px', color: 'var(--text-muted)' }} />
                          )}
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{player.name}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{player.visits} Total Visits</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {Math.floor(player.totalMins / 60)}h {player.totalMins % 60}m
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>Total Time</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
