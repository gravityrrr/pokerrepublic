import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { supabase } from './lib/supabase';
import MainLayout from './components/layout/MainLayout';
import AuthPage from './pages/Auth';
import AuthChoice from './pages/AuthChoice';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Tables from './pages/Tables';
import Analytics from './pages/Analytics';
import StaffManagement from './pages/StaffManagement';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import InstallPrompt from './components/layout/InstallPrompt';

// Role and Session Context
export const AuthContext = React.createContext<{
  session: any | null;
  role: string | null;
  loading: boolean;
}>({ session: null, role: null, loading: true });

function App() {
  const [session, setSession] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchRole(session.user.id);
        
        // Automatic Check-in
        if (_event === 'SIGNED_IN') {
          const { error: attError } = await supabase.from('staff_attendance').insert([{ admin_id: session.user.id }]);
          if (attError) toast.error("Failed to automatically check-in: " + attError.message);
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('admins')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (error) {
      toast.error("Could not fetch user role. You may be unauthorized.");
    }
      
    if (data && !error) {
      setRole(data.role);
    } else {
      setRole('Unauthorized');
    }
    setLoading(false);
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', color: 'white' }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ session, role, loading }}>
      <Toaster position="top-right" theme="system" richColors />
      <InstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/auth/staff" element={!session ? <AuthPage type="staff" /> : <Navigate to="/" />} />
          <Route path="/auth/admin" element={!session ? <AuthPage type="admin" /> : <Navigate to="/" />} />
          <Route path="/auth" element={!session ? <AuthChoice /> : <Navigate to="/" />} />
          
          <Route path="/" element={session ? <MainLayout /> : <Navigate to="/auth" />}>
            <Route index element={<Dashboard />} />
            <Route path="players" element={<Players />} />
            <Route path="tables" element={<Tables />} />
            <Route path="analytics" element={
              role === 'Check-in Staff' ? <Navigate to="/" /> : <Analytics />
            } />
            <Route path="staff" element={
              role === 'Super Admin' || role === 'Manager' ? <StaffManagement /> : <Navigate to="/" />
            } />
            <Route path="alerts" element={<Alerts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
