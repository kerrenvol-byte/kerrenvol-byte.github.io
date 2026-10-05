# קרן וולף | אתר מתכונים

אתר סטטי בעברית. אין התקנה ואין build.

```bash
python -m http.server 8791
```

ואז לפתוח http://localhost:8791.

## איפה עורכים

- מתכונים: `content/recipes.js`
- שאר הטקסטים: `content/site.js`
- תמונות: `images/` (הגיבוי המקורי ב-`images/original/`)
- לוגו: `assets/logo/`

עבודה עם קודקס: ראו [AGENTS.md](AGENTS.md), [docs/TEXTS.md](docs/TEXTS.md) ו-[docs/IMAGES.md](docs/IMAGES.md).

## פרסום

שלבים מלאים ב-[docs/DEPLOY.md](docs/DEPLOY.md). בקצרה: בוחרים דומיין, מריצים `node scripts/build-static.mjs https://הדומיין` ומעלים את התיקייה `deploy/` לאחסון סטטי חינמי.

## מה עדיין חסר

- **הרשמה לעדכונים:** בלי כתובת שרת, ההרשמה פותחת מייל מוכן. כתובת מדביקים ב-`newsletter.endpoint` בתוך `content/site.js`.
- **מאסטר שף:** הסקשן מציג רק מה שהופיע באתר הישן (שני מתכונים מהאודישנים). עונה, שנה ושלב מתווספים ב-`content/site.js` כשיהיו פרטים מאושרים.
- **אזור ניהול:** האתר הישן הכיל `/admin` ושמירת הודעות בשרת. האתר החדש לא כולל אותם.
