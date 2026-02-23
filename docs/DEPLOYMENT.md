# פריסה ל-Production (Render)

המדריך מתאר פריסה ל-[Render.com](https://render.com) – **חינם** במסגרת Free Tier, מתאים לבדיקות ולשימוש אישי.

---

## עלות

| פריט | Free Tier |
|------|-----------|
| **מחיר** | **0$** – לא נדרש כרטיס אשראי |
| שעות ריצה | 750 שעות/חודש (מספיק לשירות אחד 24/7 כ־31 ימים) |
| שינה | אחרי ~15 דקות ללא גישה – השרת "נרדם". כניסה ראשונה אחרי שינה יכולה לקחת עד דקה |
| דיסק | **ארעי** – כל מה ששמור על הדיסק (כולל SQLite) **נמחק** בעת redeploy או הפעלה מחדש. לנתונים קבועים צריך Disk בתשלום (~7$/חודש) או מסד נתונים חיצוני |
| רוחב פס | 100 GB/חודש |

**סיכום:** מתאים מאוד לבדיקה ולשימוש קל. אם צריך שנתוני הטיולים יישמרו לאורך זמן – מומלץ להוסיף Persistent Disk ב-Render או לעבור למסד נתונים מנוהל.

---

## צעדים לפריסה

### 1. הכנה ב-GitHub

- דחוף את הפרויקט ל-GitHub (כולל `render.yaml` והשינויים ב-backend).
- אם אתה משתמש ב-**Sign in with Google**, ב-[Google Cloud Console](https://console.cloud.google.com/) הוסף ל-OAuth Client את ה-URL של האפליקציה ב-Render (למשל `https://travel-app-plan.onrender.com` כ-**Authorized JavaScript origins** ו-**Authorized redirect URIs**).

### 2. חיבור Render ל-GitHub

1. היכנס ל-[render.com](https://render.com) (הרשמה חינם).
2. **Dashboard** → **New** → **Blueprint**.
3. חבר את ה-repository של הפרויקט.
4. Render יזהה את `render.yaml`. אשר יצירת ה-**Web Service** (שירות אחד שמריץ גם API וגם את ה-Frontend).

### 3. הגדרת משתני סביבה (חובה)

**מומלץ להגדיר את המשתנים לפני ה-deploy הראשון.** ב-**Dashboard** → השירות → **Environment**:

| משתנה | ערך | הערה |
|--------|-----|------|
| `VITE_API_URL` | `https://<שם-השירות>.onrender.com` | **חובה.** להחליף בשם השירות האמיתי (למשל `https://travel-app-plan.onrender.com`). ללא זה ה-Frontend לא ידע לשלוח ל-API. |
| `JWT_SECRET` | מחרוזת אקראית ארוכה | נוצר אוטומטית ב-Render אם הוגדר ב-blueprint; אחרת ליצור ידנית. |
| `GOOGLE_CLIENT_ID` | ה-Client ID מ-Google | אם משתמש ב-Sign in with Google. |

אם **לא** הגדרת `VITE_API_URL` לפני ה-build הראשון – אחרי ה-deploy הראשון העתק את ה-URL של השירות, הוסף `VITE_API_URL` עם הכתובת הזו, ושמור. אחר כך **Redeploy** (עם "Clear build cache & deploy") כדי שה-Frontend ייבנה מחדש עם כתובת ה-API הנכונה.

### 4. Deploy

- אחרי שמירת ה-Environment, Render יריץ **Build** ואז **Start**.
- בסיום יופיע קישור לאפליקציה, למשל: `https://travel-app-plan.onrender.com`.

### 5. שימוש

- נכנסים לקישור מהדפדפן (או מהטלפון) – אותה כתובת מגישה גם ל-Frontend וגם ל-API.
- בכניסה ראשונה אחרי "שינה" ייתכן עיכוב של עד דקה עד שהשרת מתעורר.

---

## איך זה עובד בפרויקט

- **Build:**  
  - בונים את ה-Frontend (`frontend/`) עם `VITE_API_URL` שמוגדר ב-Render.  
  - מעתיקים את תוכן `frontend/dist` ל-`backend/public`.  
  - בונים את ה-Backend (TypeScript → `backend/dist`).

- **Runtime:**  
  - הפעלה: `cd backend && node dist/index.js`.  
  - ה-Backend מגיש את כל ה-`/api/*` ומגיש קבצים סטטיים מתוך `backend/public` (כולל SPA – כל path שלא קובץ מחזיר `index.html`).

כך נדרש **שירות אחד** ב-Render, עם כתובת אחת לאפליקציה.

---

## שמירת נתונים (SQLite) ב-Free Tier

ב-Free Tier הדיסק ארעי: בעת redeploy או restart הנתונים ב-SQLite נמחקים.

אם חשוב לך שטיולים ומשתמשים יישמרו:

- **Render:** להוסיף **Persistent Disk** לשירות (בתשלום, כ־7$/חודש) ולכוון את `SQLITE_PATH` לתיקייה על הדיסק, או  
- לעבור ל-**PostgreSQL** (ב-Render יש מסד חינמי ל־90 יום, או בתשלום) – ידרוש שינוי קוד ב-backend.

---

## קישורים שימושיים

- [Render – Free Tier](https://render.com/docs/free)
- [Render – Web Services](https://render.com/docs/web-services)
- [גישה מרשת ואינטרנט (כולל LAN)](./NETWORK_ACCESS.md)
