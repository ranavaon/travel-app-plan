import { useState } from 'react';
import { useTripData } from '../context/TripContext';
import type { Document as Doc, DocumentType } from '../types';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'דרכון',
  visa: 'ויזה',
  insurance: 'ביטוח',
  booking: 'הזמנה',
  other: 'אחר',
};

type Props = { tripId: string };

export default function TripDocuments({ tripId }: Props) {
  const {
    getDocumentsForTrip,
    addDocument,
    updateDocument,
    deleteDocument,
  } = useTripData();
  const documents = getDocumentsForTrip(tripId);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('other');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<Doc | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<DocumentType>('other');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      await addDocument({ tripId, title: title.trim(), type, file });
      setTitle('');
      setType('other');
      setFile(null);
      setShowForm(false);
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (doc: Doc) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditType(doc.type ?? 'other');
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateDocument(editingId, { title: editTitle.trim(), type: editType });
    setEditingId(null);
  };

  const handleDelete = (doc: Doc) => {
    if (window.confirm(`למחוק את המסמך "${doc.title}"?`)) {
      deleteDocument(doc.id);
      if (viewing?.id === doc.id) setViewing(null);
      if (editingId === doc.id) setEditingId(null);
    }
  };

  return (
    <div dir="rtl" style={{ textAlign: 'right' }}>
      <h2>מסמכים</h2>
      <p style={{ marginTop: 0, color: '#666' }}>
        דרכון, ויזה, ביטוח, הזמנות – שמור עותקים לטיול.
      </p>

      {documents.length === 0 ? (
        <p
          style={{
            padding: 16,
            margin: '8px 0 0',
            border: '1px dashed rgba(128,128,128,0.35)',
            borderRadius: 8,
            opacity: 0.9,
          }}
        >
          אין מסמכים עדיין. הוסף מסמך (דרכון, ויזה, ביטוח) למטה.
        </p>
      ) : (
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {documents.map((doc) => (
          <li
            key={doc.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              overflow: 'hidden',
              padding: 8,
            }}
          >
            {editingId === doc.id ? (
              <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="כותרת"
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as DocumentType)}
                  style={{ width: '100%' }}
                >
                  {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((t) => (
                    <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit">שמור</button>
                  <button type="button" onClick={() => setEditingId(null)}>ביטול</button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setViewing(doc)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'right',
                  }}
                >
                  {doc.fileUrl && (
                    <img
                      src={doc.fileUrl}
                      alt={doc.title}
                      style={{
                        width: '100%',
                        maxHeight: 120,
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                  )}
                  <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>{doc.title}</p>
                  {doc.type && <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>{DOC_TYPE_LABELS[doc.type]}</p>}
                </button>
                <p style={{ margin: '8px 0 0' }}>
                  <button type="button" onClick={() => startEdit(doc)}>ערוך</button>
                  {' '}
                  <button type="button" onClick={() => handleDelete(doc)} style={{ color: 'crimson' }}>מחק</button>
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
      )}

      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
          הוסף מסמך
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 12, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <label>כותרת *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="למשל: דרכון, ויזה, ביטוח"
              style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>סוג מסמך</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            >
              {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((t) => (
                <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>תמונה *</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required={!file}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            />
            <small>במובייל: צילום או בחירת קובץ מהגלריה</small>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={uploading}>
              {uploading ? 'שומר...' : 'הוסף מסמך'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFile(null); setTitle(''); }}>ביטול</button>
          </div>
        </form>
      )}

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="צפייה במסמך"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            onClick={() => setViewing(null)}
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            סגור
          </button>
          <p style={{ color: '#fff', margin: '0 0 8px' }}>{viewing.title}</p>
          <img
            src={viewing.fileUrl}
            alt={viewing.title}
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
