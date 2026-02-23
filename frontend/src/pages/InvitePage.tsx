import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, isApiEnabled } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ tripName: string; destination?: string; startDate: string; endDate: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token || !isApiEnabled()) return;
    api.getInviteInfo(token)
      .then(setInfo)
      .catch(() => setError('קישור ההזמנה לא נמצא או שפג תוקפו'));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await api.acceptInvite(token);
      setAccepted(true);
      setTimeout(() => navigate(`/trip/${result.tripId}`), 1500);
    } catch {
      setError('שגיאה בקבלת ההזמנה');
    } finally {
      setAccepting(false);
    }
  };

  const roleLabel = (r: string) => r === 'participant' ? 'משתתף (עריכה)' : 'צופה (קריאה בלבד)';

  if (error) {
    return (
      <div dir="rtl" className="page-wrap">
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (!info) {
    return <div dir="rtl" className="page-wrap"><p>טוען...</p></div>;
  }

  return (
    <div dir="rtl" className="page-wrap">
      <h1>הזמנה לטיול</h1>
      <div className="card" style={{ padding: 'var(--space-lg)' }}>
        <h2 style={{ marginTop: 0 }}>{info.tripName}</h2>
        {info.destination && <p><strong>יעד:</strong> {info.destination}</p>}
        <p><strong>תאריכים:</strong> {info.startDate} – {info.endDate}</p>
        <p><strong>תפקיד:</strong> {roleLabel(info.role)}</p>

        {accepted ? (
          <p style={{ color: 'var(--color-success, green)' }}>הצטרפת לטיול! מעביר אותך...</p>
        ) : user ? (
          <button type="button" onClick={handleAccept} disabled={accepting} className="btn btn-primary">
            {accepting ? 'מצטרף...' : 'הצטרף לטיול'}
          </button>
        ) : (
          <div>
            <p>כדי להצטרף לטיול, יש להתחבר או להירשם קודם.</p>
            <p className="btn-group">
              <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>התחבר</Link>
              <Link to="/register" className="btn btn-secondary" style={{ textDecoration: 'none' }}>הירשם</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
