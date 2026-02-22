# Backend – אפליקציית טיולים

שרת API ב־Node.js + Express + TypeScript עם SQLite.

## הרצה

```bash
npm install
npm run build
npm start
```

השרת יעלה על פורט 3001 (או המשתנה `PORT`).

## פיתוח

```bash
npm run dev
```

(מקמפל ומריץ עם watch.)

## משתני סביבה

- `PORT` – פורט (ברירת מחדל 3001)
- `SQLITE_PATH` – נתיב לקובץ SQLite (ברירת מחדל: `./data.sqlite`)

## חיבור הפרונט

בפרונט, הגדר את כתובת ה-API:

```bash
# ב־frontend/.env או בהרצה
VITE_API_URL=http://localhost:3001
```

אז הפרונט ישתמש ב-API במקום ב-localStorage.

## API (תמצית)

- `GET /api/health` – בדיקת תקינות
- `GET /api/state` – כל ה-state של המשתמש (טיולים + פעילויות + לינה + אטרקציות + קניות + מסמכים)
- `GET/POST /api/trips`, `GET/PUT/DELETE /api/trips/:id`
- `GET/POST /api/trips/:tripId/activities`, `PUT/DELETE /api/activities/:id`
- `GET/POST /api/trips/:tripId/accommodations`, `PUT/DELETE /api/accommodations/:id`
- `GET/POST /api/trips/:tripId/attractions`, `PUT/DELETE /api/attractions/:id`
- `GET/POST /api/trips/:tripId/shopping`, `PATCH/DELETE /api/shopping/:id`
- `GET/POST /api/trips/:tripId/documents`, `PUT/DELETE /api/documents/:id`

MVP כרגע עם משתמש יחיד (`userId = 'u1'`).

## אירוח Backend (Railway / Render)

כדי להעלות את ה־Backend ל־Railway או Render (חינם):

1. **חבר את הריפו** לשירות (GitHub → New Project).
2. **Root Directory:** הגדר `backend` (או Root = `backend/`).
3. **Build:** `npm run build`
4. **Start:** `npm start`
5. **משתני סביבה:** הוסף `SQLITE_PATH=./data.sqlite` (ו־`JWT_SECRET` אם יתווסף אימות). `PORT` לרוב מוגדר אוטומטית על ידי הפלטפורמה.

**הערה:** SQLite הוא קובץ על הדיסק. בסביבות עם filesystem חולף (למשל Railway) הנתונים עלולים לא להישמר בין הפעלות — אלא אם משתמשים ב־volume או עוברים ל־PostgreSQL בהמשך.

## הרצה עם Docker

```bash
docker build -t travel-backend .
docker run -p 3001:3001 -e JWT_SECRET=xxx travel-backend
```

לשמירת נתוני SQLite בין הפעלות, הוסף volume:

```bash
docker run -p 3001:3001 -e JWT_SECRET=xxx -v $(pwd)/data.sqlite:/app/data.sqlite travel-backend
```
