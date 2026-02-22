# PR: פיצ'ר שיתוף טיול עם תפקידים (Issue #2) → development

## מה נכלל בענף `feature/issue-2-shared-trip-roles`

- **פיצ'ר:** שיתוף טיול עם תפקידים (owner, participant, viewer) — Issue #2
- **תיעוד וזרימה:** GITHUB.md, docs/WORKFLOW.md, docs/BUGS_AND_FIXES.md, docs/issue-share-email-whatsapp-sms.md
- **תבניות:** .github/ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE, workflows/test.yml
- **כללי Cursor:** .cursor/rules (bug-fix, feature, design-agent)
- **טסטים:** backend (vitest: auth, expenses), frontend (playwright e2e, Trip/tripUtils)
- **קוד:** LocationPickerMap, maps, tripUtils, עדכוני דפים ו-TripContext

## צעדים לפתיחת ה-PR (לפי הזרימה ב-[WORKFLOW.md](WORKFLOW.md))

1. **דחיפת הענף:**
   ```bash
   git push -u origin feature/issue-2-shared-trip-roles
   ```

2. **פתיחת Pull Request ב-GitHub:**
   - base: **development**
   - compare: **feature/issue-2-shared-trip-roles**
   - קישור ישיר:  
     https://github.com/ranavon/travel-app-plan/compare/development...feature/issue-2-shared-trip-roles

3. **בתיאור ה-PR לכלול:**
   - קישור ל-Issue: `Closes #2` או `Related to #2`
   - סיכום קצר: שיתוף טיול עם תפקידים (owner, participant, viewer), תיעוד זרימה, טסטים.

4. **אחרי המיזוג ל-`development`:**  
   (אין צורך לעדכן BUGS_AND_FIXES — זה פיצ'ר, לא תיקון באג.)

---

**זכור:** PR מחזורי מ-`development` ל-`main` נעשה בנפרד (תבנית: release_to_main).
