# העלאת הפרויקט ל-GitHub

## שיטה 1: דרך האתר + Git

1. **צור ריפו חדש ב-GitHub**
   - היכנס ל-[github.com](https://github.com) ולחץ על **New repository**.
   - שם הריפו: `travel-app-plan` (או שם אחר).
   - **אל תסמן** "Add a README file" – צור ריפו **ריק**.
   - לחץ **Create repository**.

2. **חבר את הפרויקט לריפו והעלה**
   בהרצה מתוך תיקיית הפרויקט (היכן ש־`.git` נמצא):

   ```bash
   git remote add origin https://github.com/<USERNAME>/travel-app-plan.git
   git branch -M main
   git push -u origin main
   ```

   החלף את `<USERNAME>` בשם המשתמש שלך ב-GitHub. אם השתמשת בשם ריפו אחר, החלף גם את `travel-app-plan` בשם הריפו.

---

## שיטה 2: עם GitHub CLI (`gh`)

אם מותקן אצלך [GitHub CLI](https://cli.github.com/):

```bash
gh repo create travel-app-plan --private --source=. --push
```

זה ייצור ריפו פרטי בשם `travel-app-plan`, יחבר אותו לתיקייה הנוכחית ויעלה את הענף `main`.
