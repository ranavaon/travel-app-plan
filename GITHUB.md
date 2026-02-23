# העלאת הפרויקט ל-GitHub

הריפו המקומי כבר מחובר ל־**origin**:  
`https://github.com/ranavon/travel-app-plan.git`

נשאר רק **להעלות** (push). פתח טרמינל **במחשב שלך** בתיקיית הפרויקט והרץ:

```bash
cd /Users/rann/travel-app-plan
git push -u origin main
```

---

## ענפים וזרימת עבודה

- **main** – קוד יציב; מתעדכן רק דרך PR מ-`development`.
- **development** – ענף פיתוח; כל תיקון באג וכל פיצ'ר נמזגים לכאן **רק** מענף נפרד ו-PR ל-`development`.
- **חובה:** לכל באג – [Issue](https://github.com/ranavon/travel-app-plan/issues) + ענף `fix/...`; לכל פיצ'ר – Issue + ענף `feature/...`.
- **תיעוד באגים ופתרונות:** [docs/BUGS_AND_FIXES.md](docs/BUGS_AND_FIXES.md)
- **זרימת עבודה מפורטת:** [docs/WORKFLOW.md](docs/WORKFLOW.md)

יצירת ענף `development` (פעם אחת):

```bash
git checkout main
git checkout -b development
git push -u origin development
```

---

## אם מתבקשים פרטי התחברות

### אופציה א': HTTPS עם Personal Access Token (מומלץ)

1. ב־GitHub: **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token** – סמן scope `repo`.
3. העתק את ה־token.
4. בהרצת `git push`:
   - **Username:** השם המשתמש ב-GitHub שלך (למשל `ranavon`).
   - **Password:** הדבק את ה־**token** (לא את סיסמת החשבון).

### אופציה ב': SSH (אם הגדרת מפתחות SSH ב-GitHub)

החלף את ה־remote ל־SSH והעלה:

```bash
git remote set-url origin git@github.com:ranavon/travel-app-plan.git
git push -u origin main
```

---

## בדיקה

אחרי push מוצלח, נכנס ל־  
https://github.com/ranavon/travel-app-plan  
ואמור להופיע שם כל הקוד.
