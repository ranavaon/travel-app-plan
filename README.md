# אפליקציית טיולים – Travel App

תכנון ופיתוח לפי [PLANNING.md](./PLANNING.md).

## שלב 1 – פרונט אנד (React + TypeScript)

זהו **שלב 1** של האפליקציה: שלד הפרונט עם Vite, React, TypeScript ו־React Router.

### הרצת הפרויקט

```bash
cd frontend
npm install
npm run dev
```

אחרי ההרצה, פתח בדפדפן את הכתובת שמופיעה (בדרך כלל `http://localhost:5173`).

### מבנה הפרויקט

- **frontend/** – אפליקציית React (Vite)
  - `src/types/` – טיפוסי TypeScript (Trip, Day, Activity, Accommodation, Attraction, ShoppingItem)
  - `src/pages/` – דפים: Home (רשימת טיולים), Trip (טיול בודד), DayView (מבט יום)
  - `src/components/` – קומפוננטות לשימוש חוזר
  - `src/api/` – קריאות API (להמשך)

### נתיבים (Routes)

- `/` – דף בית (הטיולים שלי)
- `/trip/:id` – תצוגת טיול בודד
- `/trip/:id/day/:dayIndex` – מבט יום בטיול
- `/register` – הרשמה
- `/login` – התחברות

### העלאה (Deployment)

הפרונט בנוי כ־SPA עם ניתוב בצד הלקוח; יש להגדיר fallback ל־`index.html` לכל הנתיבים.

**Vercel**

1. חבר את הריפו ל־[Vercel](https://vercel.com).
2. בהגדרות הפרויקט: **Root Directory** = `frontend`.
3. Build Command: `npm run build`, Output Directory: `dist` (ברירת מחדל ל־Vite).
4. קובץ `frontend/vercel.json` מגדיר כבר rewrites כך שכל הנתיבים מפנים ל־`index.html`.

**Netlify**

- צור `netlify.toml` בשורש הפרויקט עם:
  - `build.command` = `cd frontend && npm run build`
  - `publish` = `frontend/dist`
  - הוסף redirect לכל הנתיבים ל־`/index.html` (למשל `/* /index.html 200`).
- חבר את הריפו ל־Netlify והעלה.

**העלאה ידנית:** הרץ `npm run build` מתוך `frontend/`, העלה את תוכן התיקייה `frontend/dist` לשרת סטטי והגדר fallback ל־`index.html` לכל נתיב.

---

## שלב 2 – Backend ו־API

נוסף שרת API ב־**backend/** (Node.js + Express + TypeScript + SQLite).

### הרצת Backend

```bash
cd backend
npm install
npm run build
npm start
```

(השרת על פורט 3001.)

### חיבור הפרונט ל־Backend

צור קובץ `frontend/.env` עם:

```
VITE_API_URL=http://localhost:3001
```

הרץ את הפרונט (`npm run dev` מתוך `frontend/`). כאשר המשתנה מוגדר, האפליקציה תשתמש ב-API במקום ב-localStorage.

פרטים נוספים: [backend/README.md](./backend/README.md).

### הרצת המערכת המלאה

כדי להריץ את המערכת עם Backend ו־Frontend יחד:

1. **Backend** – הרץ את השרת:
   ```bash
   cd backend && npm run build && npm start
   ```
2. **Frontend** – צור קובץ `frontend/.env` עם:
   ```
   VITE_API_URL=http://localhost:3001
   ```
   ואז הרץ את הפרונט:
   ```bash
   cd frontend && npm run dev
   ```

כאשר ה־API פעיל, נדרשת **התחברות**: יש להירשם קודם בנתיב `/register`, ואז להתחבר ב־`/login`.  
אפשר גם **התחברות עם Google או Apple** – להגדרה ראו [OAUTH_SETUP.md](./OAUTH_SETUP.md).

### משתני סביבה

- **פרונט:** `VITE_API_URL` – כתובת ה־API (למשל `http://localhost:3001` בפיתוח).
- **Backend:** רשימה מלאה והסבר ב־[backend/README.md](./backend/README.md) ובקובץ [backend/.env.example](./backend/.env.example). בין היתר:
  - `JWT_SECRET` – סוד לחתימת JWT (חובה בפרודקשן)
  - `GOOGLE_CLIENT_ID` – (אופציונלי) להתחברות עם Google
  - `APPLE_CLIENT_ID` – (אופציונלי) ל־Sign in with Apple  
  להגדרת OAuth (Google/Apple) ראו [OAUTH_SETUP.md](./OAUTH_SETUP.md).

---

## פריסה (Production)

- **Frontend** – בהעלאה לפרודקשן יש להגדיר **`VITE_API_URL`** לכתובת ה־API הפרודה (למשל `https://your-backend-url.com`). בנה עם המשתנה הזה — לדוגמה:
  ```
  VITE_API_URL=https://your-backend-url.com
  ```
  הרץ `npm run build` מתוך `frontend/` (או השתמש ב־build של Netlify/Vercel עם המשתנה בהגדרות הפרויקט). האפליקציה הבנויה תפנה ל־Backend הפרוס.
- **Backend** – ניתן להריץ עם Docker (קיים `Dockerfile` בתיקיית `backend/`). הוראות פריסה מפורטות (Railway, Render, Docker ועוד) ב־[backend/README.md](./backend/README.md).
- **CORS** – יש להגדיר ב־Backend שה־origin של הפרונט הפרוס מורשה (CORS מאפשר את כתובת הפרונט).

---

בשלבים הבאים: אימות משתמשים (הרשמה/התחברות), אירוח Backend.
