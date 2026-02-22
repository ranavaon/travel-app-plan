# זרימת עבודה – ענפים ו-PR

## ענפים

- **main** – קוד יציב שמוכן לפרודקשן. מתעדכן רק דרך PR מ-`development`.
- **development** – ענף פיתוח; כל תיקוני באגים ופיצ'רים נמזגים לכאן קודם.

## תיקון באג

**חובה:** לכל באג – פתיחת Issue ב-GitHub; לכל תיקון – ענף נפרד מ-`development` ו-PR ל-`development`.

1. **Issue:** לכל באג שתדווח עליו (גם כשאתה מדווח כאן בצ'אט) – **פתח קודם [Issue ב-GitHub](https://github.com/ranavon/travel-app-plan/issues/new/choose)**. בחר בתבנית "דיווח באג / Bug report" ומלא תיאור, איך לשחזר, מצופה vs בפועל. בלי Issue – לא ממשיכים לתיקון.
2. **ענף:** צור ענף חדש **מ-`development`** (לא מ-main):
   - `fix/תיאור-קצר` – למשל `fix/expense-api-response`, `fix/share-url-localhost`
   - או `fix/issue-12` אם יש מספר Issue.
3. **פיתוח:** בצע את התיקון **רק בענף הזה**, הוסף/עדכן טסטים רלוונטיים.
4. **PR:** פתח Pull Request **מענף התיקון ל-`development`** (לא ל-main). בתיאור: קישור ל-Issue ותיאור הפתרון.
5. **Merge:** אחרי אימות (טסטים, סקירה אם יש) – מזג את ה-PR ל-`development`.
6. **תיעוד:** עדכן את [docs/BUGS_AND_FIXES.md](BUGS_AND_FIXES.md) עם הרשומה של הבאג והפתרון (כולל קישור ל-Issue ולענף/PR).

**סיכום:** באג → Issue ב-GitHub → ענף `fix/...` מ-development → תיקון → PR ל-development → עדכון BUGS_AND_FIXES.

## הוספת פיצ'ר (Feature)

**חובה:** לכל פיצ'ר – פתיחת Issue ב-GitHub; לכל פיצ'ר – ענף נפרד מ-`development` ו-PR ל-`development`.

1. **Issue:** לפני שמתחילים לפתח – **פתח [Issue ב-GitHub](https://github.com/ranavon/travel-app-plan/issues/new/choose)**. בחר בתבנית "בקשת פיצ'ר / Feature request" ומלא תיאור, מטרה, קבלת משתמש (אם רלוונטי). בלי Issue – לא ממשיכים לפיתוח.
2. **ענף:** צור ענף חדש **מ-`development`**:
   - `feature/תיאור-קצר` – למשל `feature/export-pdf`, `feature/dark-mode`
   - או `feature/issue-15` אם יש מספר Issue.
3. **פיתוח:** ממש את הפיצ'ר **רק בענף הזה**, הוסף/עדכן טסטים רלוונטיים.
4. **PR:** פתח Pull Request **מענף הפיצ'ר ל-`development`** (לא ל-main). בתיאור: קישור ל-Issue ותיאור השינוי.
5. **Merge:** אחרי אימות (טסטים, סקירה אם יש) – מזג את ה-PR ל-`development`.

**סיכום:** פיצ'ר → Issue ב-GitHub → ענף `feature/...` מ-development → פיתוח → PR ל-development.

## PR מחזורי: development → main

- **תדירות:** כל כמה ימים (למשל פעמיים בשבוע) או לפני דיפלוי לפרודקשן.
- **פעולה:** פתח PR שמרכז את כל השינויים ב-`development` ומנסה להיכנס ל-`main`.
- **Checklist ל-PR ל-main:**
  - [ ] כל הטסטים (frontend, backend, E2E) עוברים.
  - [ ] סקירה אם נדרשת.
  - [ ] רשימת תיקונים/שינויים מעודכנת (למשל ב-BUGS_AND_FIXES.md או בתיאור ה-PR).

תבנית PR ל-main נמצאת ב-.github (אם הוגדרה); אפשר גם להשתמש ב-[תבנית release_to_main](.github/PULL_REQUEST_TEMPLATE/release_to_main.md).

## דיאגרמה

```
main ──► development ──► fix/xxx    (תיקון באג)
                    └──► feature/yyy (פיצ'ר חדש)
                            │
                            ▼
                    PR (fix או feature) → development
                            │
                            ▼
                    PR development → main
```
