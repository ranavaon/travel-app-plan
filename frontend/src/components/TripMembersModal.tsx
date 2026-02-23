import { useState, useEffect } from 'react';
import { api, type TripMember } from '../api/client';
import { getShareBaseOrigin } from '../pages/tripUtils';

type Props = {
  tripId: string;
  onClose: () => void;
};

export default function TripMembersModal({ tripId, onClose }: Props) {
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'participant' | 'viewer'>('participant');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLinkRole, setInviteLinkRole] = useState<'participant' | 'viewer'>('participant');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  useEffect(() => {
    api.getTripMembers(tripId)
      .then((r) => { setMembers(r.members); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tripId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteStatus('loading');
    setInviteError(null);
    try {
      const { member } = await api.inviteTripMember(tripId, { email, role: inviteRole });
      setMembers((prev) => [...prev, member]);
      setInviteEmail('');
      setInviteStatus('ok');
      setTimeout(() => setInviteStatus('idle'), 2000);
    } catch (err) {
      setInviteStatus('error');
      setInviteError(err instanceof Error ? err.message : 'שגיאה');
    }
  };

  const handleCreateInviteLink = async () => {
    try {
      const { token } = await api.createInviteToken(tripId, inviteLinkRole);
      const baseOrigin = getShareBaseOrigin(window.location.hostname, window.location.host, window.location.origin);
      const url = `${baseOrigin}/invite/${token}`;
      setInviteLink(url);
      await navigator.clipboard.writeText(url);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 3000);
    } catch {
      setInviteError('שגיאה ביצירת קישור הזמנה');
    }
  };

  const handleRoleChange = async (userId: string, role: 'participant' | 'viewer') => {
    try {
      const { member } = await api.updateTripMemberRole(tripId, userId, role);
      setMembers((prev) => prev.map((m) => m.userId === userId ? member : m));
    } catch {
      // keep previous state
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm('להסיר משתתף זה מהטיול?')) return;
    try {
      await api.removeTripMember(tripId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      // keep previous state
    }
  };

  const roleLabel = (r: string) => r === 'owner' ? 'בעלים' : r === 'participant' ? 'משתתף' : 'צופה';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="משתתפים בטיול" onClick={onClose}>
      <div dir="rtl" className="card modal-content" style={{ maxWidth: '420px', margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>משתתפים בטיול</h2>
        {loading ? (
          <p>טוען...</p>
        ) : (
          <>
            <ul className="list-bare" style={{ marginBottom: 'var(--space-md)' }}>
              {members.map((m) => (
                <li key={m.userId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{m.email}</strong>
                    {m.name && <><br /><small>{m.name}</small></>}
                    <br /><small style={{ opacity: 0.8 }}>{roleLabel(m.role)}</small>
                  </span>
                  {m.role !== 'owner' && (
                    <span style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value as 'participant' | 'viewer')}
                        style={{ fontSize: '0.9rem' }}
                      >
                        <option value="participant">משתתף</option>
                        <option value="viewer">צופה</option>
                      </select>
                      <button type="button" onClick={() => handleRemove(m.userId)} className="btn btn-ghost">הסר</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>הזמן משתמש (לפי אימייל)</h3>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ flex: 1, minWidth: '140px' }}>
                  <span style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>אימייל</span>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" required style={{ width: '100%' }} />
                </label>
                <label>
                  <span style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>תפקיד</span>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'participant' | 'viewer')}>
                    <option value="participant">משתתף</option>
                    <option value="viewer">צופה</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-primary" disabled={inviteStatus === 'loading'}>
                  {inviteStatus === 'loading' ? '...' : inviteStatus === 'ok' ? 'נוסף!' : 'הזמן'}
                </button>
              </div>
              {inviteError && <p style={{ color: 'var(--color-danger)', fontSize: '0.9em', margin: 0 }}>{inviteError}</p>}
            </form>
            <hr style={{ margin: 'var(--space-md) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-sm) 0' }}>או: צור קישור הזמנה</h3>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label>
                <span style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>תפקיד</span>
                <select value={inviteLinkRole} onChange={(e) => setInviteLinkRole(e.target.value as 'participant' | 'viewer')}>
                  <option value="participant">משתתף</option>
                  <option value="viewer">צופה</option>
                </select>
              </label>
              <button type="button" onClick={handleCreateInviteLink} className="btn btn-primary">צור קישור</button>
            </div>
            {inviteLink && (
              <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" readOnly value={inviteLink} style={{ flex: 1, minWidth: 0, fontSize: '0.85em' }} onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button type="button" onClick={() => { navigator.clipboard.writeText(inviteLink); setInviteLinkCopied(true); setTimeout(() => setInviteLinkCopied(false), 3000); }} className="btn btn-secondary">
                  {inviteLinkCopied ? 'הועתק!' : 'העתק'}
                </button>
                <a href={`mailto:?subject=${encodeURIComponent('הזמנה לטיול')}&body=${encodeURIComponent(inviteLink)}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>מייל</a>
                <a href={`https://wa.me/?text=${encodeURIComponent(inviteLink)}`} className="btn btn-secondary" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">וואטסאפ</a>
              </div>
            )}
          </>
        )}
        <p style={{ marginTop: 'var(--space-md)', marginBottom: 0 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">סגור</button>
        </p>
      </div>
    </div>
  );
}
