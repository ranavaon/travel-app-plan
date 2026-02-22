import { Routes, Route, Link, Navigate, useLocation, Outlet } from 'react-router-dom';
import { TripProvider } from './context/TripContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isApiEnabled } from './api/client';
import Home from './pages/Home';
import Trip from './pages/Trip';
import DayView from './pages/DayView';
import NewTripPage from './pages/NewTripPage';
import EditTripPage from './pages/EditTripPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

/** When API is enabled, requires login; otherwise renders children. */
function ProtectedRoute() {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (isApiEnabled() && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

function HeaderLinks() {
  const { currentUser, logout } = useAuth();
  if (!isApiEnabled()) return null;
  return (
    <nav style={{ marginRight: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
      {currentUser ? (
        <>
          <Link to="/profile">פרופיל</Link>
          <span style={{ fontSize: '0.9em', opacity: 0.9 }}>{currentUser.email}</span>
          <button type="button" onClick={logout} style={{ padding: '4px 10px', cursor: 'pointer' }}>
            התנתק
          </button>
        </>
      ) : (
        <>
          <Link to="/login">התחבר</Link>
          <Link to="/register">הרשם</Link>
        </>
      )}
    </nav>
  );
}

function AppContent() {
  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/">אפליקציית טיולים</Link>
        <HeaderLinks />
      </header>
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/trip/new" element={<NewTripPage />} />
            <Route path="/trip/:id/edit" element={<EditTripPage />} />
            <Route path="/trip/:id" element={<Trip />} />
            <Route path="/trip/:id/day/:dayIndex" element={<DayView />} />
          </Route>
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <TripProvider>
        <AppContent />
      </TripProvider>
    </AuthProvider>
  );
}

export default App;
