import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTripData } from '../context/TripContext';
import type { Activity } from '../types';
import { activityFieldsSchema, getFirstZodError } from '../schemas';
import DayMap, { type MapPoint } from '../components/DayMap';

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function DayView() {
  const { id, dayIndex: dayIndexParam } = useParams<{ id: string; dayIndex: string }>();
  const dayIndex = dayIndexParam != null ? parseInt(dayIndexParam, 10) : NaN;
  const {
    getTrip,
    getDays,
    getActivitiesForDay,
    getAccommodationForDay,
    getAttractionsForDay,
    addActivity,
    updateActivity,
    deleteActivity,
  } = useTripData();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ title: '', time: '', description: '', address: '' });
  const [addFormError, setAddFormError] = useState('');

  const trip = id ? getTrip(id) : undefined;
  const days = trip ? getDays(trip) : [];
  const day = useMemo(() => days.find((d) => d.dayIndex === dayIndex), [days, dayIndex]);
  const accommodation = id && !isNaN(dayIndex) ? getAccommodationForDay(id, dayIndex) : undefined;
  const dayAttractions = useMemo(
    () => (id && !isNaN(dayIndex) ? getAttractionsForDay(id, dayIndex) : []),
    [id, dayIndex, getAttractionsForDay]
  );
  const activities = useMemo(
    () => (id && !isNaN(dayIndex) ? getActivitiesForDay(id, dayIndex) : []),
    [id, dayIndex, getActivitiesForDay]
  );

  const mapPoints = useMemo((): MapPoint[] => {
    const pts: MapPoint[] = [];
    if (accommodation?.address) {
      pts.push({ id: accommodation.id, label: accommodation.name, address: accommodation.address, lat: accommodation.lat, lng: accommodation.lng });
    }
    dayAttractions.forEach((a) => {
      if (a.address) pts.push({ id: a.id, label: a.name, address: a.address, lat: a.lat, lng: a.lng });
    });
    activities.forEach((a) => {
      if (a.address) pts.push({ id: a.id, label: a.title, address: a.address, lat: a.lat, lng: a.lng });
    });
    return pts;
  }, [accommodation, dayAttractions, activities]);

  if (!id || isNaN(dayIndex)) {
    return (
      <div dir="rtl">
        <p>נתיב לא תקין</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div dir="rtl">
        <p>הטיול לא נמצא</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  const handleDelete = (activityId: string) => {
    deleteActivity(activityId);
    if (editingId === activityId) setEditingId(null);
  };

  const handleEditSubmit = (activityId: string, partial: Partial<Pick<Activity, 'title' | 'time' | 'description' | 'address'>>) => {
    updateActivity(activityId, partial);
    setEditingId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError('');
    const result = activityFieldsSchema.safeParse({
      title: addForm.title.trim(),
      time: addForm.time.trim() || undefined,
      description: addForm.description.trim() || undefined,
      address: addForm.address.trim() || undefined,
    });
    if (!result.success) {
      setAddFormError(getFirstZodError(result.error));
      return;
    }
    addActivity({
      tripId: id,
      dayIndex,
      title: result.data.title,
      time: result.data.time,
      description: result.data.description,
      address: result.data.address,
      order: activities.length,
    });
    setAddForm({ title: '', time: '', description: '', address: '' });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = activities.map((a) => a.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(activities, oldIndex, newIndex);
      reordered.forEach((act, index) => {
        if (act.order !== index) {
          updateActivity(act.id, { order: index });
        }
      });
    },
    [activities, updateActivity]
  );

  const activityIds = useMemo(() => activities.map((a) => a.id), [activities]);

  return (
    <div dir="rtl" style={{ textAlign: 'right', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <p>
        <Link to="/">דף בית</Link> | <Link to={`/trip/${id}`}>חזרה לטיול</Link>
      </p>

      {day ? (
        <>
          <h1>יום {dayIndex}</h1>
          <p>{day.date}</p>
        </>
      ) : (
        <h1>יום {dayIndex}</h1>
      )}

      {accommodation && (
        <section style={{ marginBlock: 24, padding: 16, border: '1px solid #ccc', borderRadius: 8 }}>
          <h2>לינה</h2>
          <p><strong>{accommodation.name}</strong></p>
          <p>{accommodation.address}</p>
          <a href={mapsUrl(accommodation.address)} target="_blank" rel="noopener noreferrer">נווט</a>
        </section>
      )}

      {dayAttractions.length > 0 && (
        <section style={{ marginBlock: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <h2>אטרקציות היום</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {dayAttractions.map((a) => (
              <li key={a.id} style={{ marginBottom: 8 }}>
                <strong>{a.name}</strong>
                {a.address && (
                  <>
                    <br /><small>{a.address}</small>
                    {' '}
                    <a href={mapsUrl(a.address)} target="_blank" rel="noopener noreferrer">נווט</a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <DayMap points={mapPoints} />

      <section style={{ marginBlock: 24 }}>
        <h2>פעילויות</h2>
        {activities.length === 0 ? (
          <p
            style={{
              padding: 16,
              margin: 0,
              border: '1px dashed rgba(128,128,128,0.35)',
              borderRadius: 8,
              opacity: 0.9,
            }}
          >
            אין עדיין פעילויות ליום זה. הוסף פעילות למעלה.
          </p>
        ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {activities.map((act) => (
                <SortableActivityCard
                  key={act.id}
                  activity={act}
                  isEditing={editingId === act.id}
                  onEditSubmit={(partial) => handleEditSubmit(act.id, partial)}
                  onDelete={() => handleDelete(act.id)}
                  onStartEdit={() => setEditingId(act.id)}
                  onCancelEdit={() => setEditingId(null)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        )}
      </section>

      <section style={{ marginBlock: 24, padding: 16, border: '1px solid #ccc', borderRadius: 8 }}>
        <h2>הוסף פעילות</h2>
        <form onSubmit={handleAddSubmit}>
          {addFormError && <p style={{ color: 'crimson', margin: '0 0 8px 0' }}>{addFormError}</p>}
          <div style={{ marginBottom: 8 }}>
            <label>כותרת *</label>
            <input
              value={addForm.title}
              onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
              required
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>שעה</label>
            <input
              value={addForm.time}
              onChange={(e) => setAddForm((f) => ({ ...f, time: e.target.value }))}
              placeholder="למשל 10:00"
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>תיאור</label>
            <input
              value={addForm.description}
              onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>כתובת</label>
            <input
              value={addForm.address}
              onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            />
          </div>
          <button type="submit">הוסף פעילות</button>
        </form>
      </section>
    </div>
  );
}

function SortableActivityCard({
  activity,
  isEditing,
  onEditSubmit,
  onDelete,
  onStartEdit,
  onCancelEdit,
}: {
  activity: Activity;
  isEditing: boolean;
  onEditSubmit: (partial: Partial<Pick<Activity, 'title' | 'time' | 'description' | 'address'>>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style: React.CSSProperties = {
    marginBottom: 16,
    padding: 12,
    border: '1px solid #eee',
    borderRadius: 8,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {isEditing ? (
        <ActivityEditForm
          activity={activity}
          onSave={onEditSubmit}
          onCancel={onCancelEdit}
        />
      ) : (
        <>
          <p><strong>{activity.title}</strong>{activity.time ? ` – ${activity.time}` : ''}</p>
          {(activity.description || activity.address) && <p>{activity.description || activity.address}</p>}
          {activity.address && (
            <a href={mapsUrl(activity.address)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8 }}>נווט</a>
          )}
          <p style={{ marginTop: 8 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); onStartEdit(); }}>ערוך</button>
            {' '}
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}>מחק</button>
          </p>
        </>
      )}
    </li>
  );
}

function ActivityEditForm({
  activity,
  onSave,
  onCancel,
}: {
  activity: Activity;
  onSave: (partial: Partial<Pick<Activity, 'title' | 'time' | 'description' | 'address'>>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [time, setTime] = useState(activity.time ?? '');
  const [description, setDescription] = useState(activity.description ?? '');
  const [address, setAddress] = useState(activity.address ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title: title.trim(), time: time.trim() || undefined, description: description.trim() || undefined, address: address.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="שעה" style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור" style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="כתובת" style={{ width: '100%' }} />
      </div>
      <button type="submit">שמור</button>
      <button type="button" onClick={onCancel}>ביטול</button>
    </form>
  );
}
