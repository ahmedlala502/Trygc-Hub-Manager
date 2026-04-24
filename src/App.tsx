import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Toaster } from './components/ui/sonner';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Pages (to be created)
import Dashboard from './pages/Dashboard';
import CampaignList from './pages/CampaignList';
import CampaignDetail from './pages/CampaignDetail';
import IntakeForm from './pages/IntakeForm';
import Community from './pages/Community';
import QACenter from './pages/QACenter';
import Blockers from './pages/Blockers';
import AuditLogs from './pages/AuditLogs';
import Admin from './pages/Admin';
import Reporting from './pages/Reporting';
import Tasks from './pages/Tasks';
import Templates from './pages/Templates';
import Analytics from './pages/Analytics';
import AssetRegistry from './pages/AssetRegistry';
import CampaignClosure from './pages/CampaignClosure';
import CampaignIntake from './pages/CampaignIntake';
import CampaignSetup from './pages/CampaignSetup';
import InfluencerDiscovery from './pages/InfluencerDiscovery';
import InfluencerList from './pages/InfluencerList';
import InfluencerProfile from './pages/InfluencerProfile';
import Invitations from './pages/Invitations';
import PostingCoverage from './pages/PostingCoverage';
import QAReview from './pages/QAReview';
import Scheduling from './pages/Scheduling';
import Settings from './pages/Settings';
import Validation from './pages/Validation';
import Login from './pages/Login';
import Layout from './components/Layout';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default function App() {
  const [user, setUser] = useState<User | null>({ 
    uid: 'mock-admin-id', 
    email: 'admin@example.com', 
    displayName: 'Admin User',
    photoURL: ''
  } as unknown as User);
  const [role, setRole] = useState<string | null>('admin');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // const unsubscribe = onAuthStateChanged(auth, async (user) => {
    //   if (user) {
    //     setUser(user);
    //     // Fetch or create user profile
    //     const userDoc = await getDoc(doc(db, 'users', user.uid));
    //     if (userDoc.exists()) {
    //       setRole(userDoc.data().role);
    //     } else {
    //       const defaultRole = user.email === 'ahmedlalatoo2013@gmail.com' ? 'admin' : 'Viewer';
    //       await setDoc(doc(db, 'users', user.uid), {
    //         name: user.displayName,
    //         email: user.email,
    //         role: defaultRole,
    //         photoURL: user.photoURL,
    //       });
    //       setRole(defaultRole);
    //     }
    //   } else {
    //     setUser(null);
    //     setRole(null);
    //   }
    //   setLoading(false);
    // });
    // return unsubscribe;
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no action needed or show a subtle message
        console.log('Authentication popup closed by user');
      } else {
        console.error('Authentication error:', error);
        throw error;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="animate-pulse font-mono text-sm tracking-widest uppercase">Initializing Command Center...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard />} />
            <Route path="campaigns" element={<CampaignList />} />
            <Route path="campaigns/new" element={<CampaignIntake />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="campaigns/:id/setup" element={<CampaignSetup />} />
            <Route path="campaigns/:id/closure" element={<CampaignClosure />} />
            <Route path="community" element={<Community />} />
            <Route path="qa" element={<QAReview />} />
            <Route path="blockers" element={<Blockers />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="reporting" element={<Reporting />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="templates" element={<Templates />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="assets" element={<AssetRegistry />} />
            <Route path="influencers/discovery" element={<InfluencerDiscovery />} />
            <Route path="influencers" element={<InfluencerList />} />
            <Route path="influencers/:id" element={<InfluencerProfile />} />
            <Route path="invitations" element={<Invitations />} />
            <Route path="coverage" element={<PostingCoverage />} />
            <Route path="scheduling" element={<Scheduling />} />
            <Route path="validation" element={<Validation />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={role === 'admin' ? <Admin /> : <Navigate to="/" />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
      <SpeedInsights />
    </AuthContext.Provider>
  );
}
