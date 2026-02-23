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
import SharePage from './pages/SharePage';
import InvitePage from './pages/InvitePage';
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
    <nav className="nav-links">
      {currentUser ? (
        <>
          <Link to="/profile">פרופיל</Link>
          <span className="user-email">{currentUser.email}</span>
          <button type="button" onClick={logout} className="btn btn-ghost">
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
      <header className="app-header">
        <Link to="/">אפליקציית טיולים</Link>
        <HeaderLinks />
      </header>
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
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
