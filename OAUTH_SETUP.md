# התחברות עם Google ו-Apple – הגדרה

## Google

1. **Google Cloud Console:** [console.cloud.google.com](https://console.cloud.google.com)
2. צור פרויקט (או בחר קיים) → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
3. סוג: **Web application**. הוסף **Authorized JavaScript origins**:  
   `http://localhost:5173` (פיתוח), וכתובת הפרודקשן (למשל `https://your-app.vercel.app`).
4. העתק את **Client ID**.

**בפרויקט:**
- **backend/.env:** `GOOGLE_CLIENT_ID=המזהה-שהעתקת`
- **frontend/.env:** `VITE_GOOGLE_CLIENT_ID=אותו-מזהה`

הרץ מחדש את Backend ו-Frontend. כפתור "התחבר עם Google" יופיע בדפי ההתחברות וההרשמה.

---

## Apple

1. **Apple Developer:** [developer.apple.com](https://developer.apple.com) (חשבון בתשלום).
2. **Certificates, Identifiers & Profiles** → **Identifiers** → **+** → **Services IDs**. צור Service ID (למשל `com.yourcompany.travelapp`).
3. סמן **Sign In with Apple** והגדר Domain ו-Return URL (הדומיין של האפליקציה).
4. העתק את **Services ID** (זה ה-Client ID).

**בפרויקט:**
- **backend/.env:** `APPLE_CLIENT_ID=ה-Service-ID-שלך`
- **frontend/.env:** `VITE_APPLE_CLIENT_ID=אותו-ערך`

הרץ מחדש. כפתור "התחבר עם Apple" יופיע כש-Apple מוגדר.

---

## בלי OAuth

הרשמה והתחברות עם **אימייל וסיסמה** ממשיכות לעבוד כרגיל – אין חובה להגדיר Google או Apple.
