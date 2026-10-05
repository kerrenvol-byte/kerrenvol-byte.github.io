# העלאת האתר לדומיין

האתר הוא תיקייה של קבצים. אין שרת ואין מסד נתונים, ולכן מספיק אחסון סטטי חינמי.

## 1. לבחור ולרכוש דומיין (רק בעלת האתר יכולה)

בדיקה ב-DNS מ-30 בספטמבר 2026 הראתה שהכתובות האלה כנראה פנויות (הוודאות רק ברגע הרכישה):

- `kerenthevegan.com` (תואם לאינסטגרם, מומלץ)
- `kerenthevegan.co.il`
- `keren-wolf.co.il`, `keren-wolf.com`
- `kerenwolfkitchen.co.il`, `wolfkitchen.co.il`

`kerenwolf.co.il` ו-`kerenwolf.com` תפוסים.
דומיין `.com` אפשר לרכוש אצל כל רשם בינלאומי. דומיין `.co.il` אצל רשם ישראלי מורשה מטעם ISOC-IL.

## 2. לבנות גרסת פרסום

אחרי שהדומיין נבחר:

```bash
node scripts/build-static.mjs https://kerenthevegan.com
```

(מחליפים בכתובת האמיתית, בלי סלאש בסוף.) נוצרת התיקייה `deploy/` ובה:

- עמוד אמיתי לכל מתכון (`/recipe/<שם>/`) עם כותרת, תיאור וסכמת Recipe של גוגל.
- `sitemap.xml`, `robots.txt`, `404.html` ו-`_headers` (מטמון לתמונות).

אפשר לבקש מ-Claude להריץ את זה ולוודא שהכול עובד.

## 3. להעלות את `deploy/`

אחת משלוש הדרכים, כולן חינמיות:

- **Netlify Drop:** גוררים את התיקייה `deploy/` ל-https://app.netlify.com/drop.
- **Cloudflare Pages:** Workers & Pages, Create, Pages, Upload assets, ומעלים את `deploy/`.
- **GitHub Pages:** מעלים את תוכן `deploy/` למאגר ומפעילים Pages.

## 4. לחבר את הדומיין

באחסון שנבחר: Custom domain, מזינים את הדומיין, ומעתיקים אצל הרשם את רשומות ה-DNS שהאחסון מציג (בדרך כלל CNAME ל-`www` ורשומת A או ALIAS לשורש). תעודת HTTPS מתקבלת אוטומטית.

## מצב נוכחי (1.10.2026)

- האתר פורסם ב-Netlify (חשבון kerrenvol@gmail.com, אתר `kerrenwolf`): https://kerrenwolf.netlify.app
- הדומיין `kerrenwolf.co.il` חובר לאתר ב-Netlify. כדי שיעבוד צריך אצל הרשם: רשומת A לשורש (`@`) אל `75.2.60.5`, ורשומת CNAME ל-`www` אל `kerrenwolf.netlify.app`.
- Google Search Console: הנכס `https://kerrenwolf.co.il/` אומת ב-1.10.2026 באמצעות קובץ HTML (`verify/google4465869a4914c590.html`, מועתק לשורש בבנייה, אסור למחוק). ה-sitemap נשלח.
- הרשמה לעדכונים: הוסרה מהאתר ב-4.10.2026 לבקשת קרן (הסעיף בדף הפרטיות וגם הטופס ב-Netlify).
- עדכון האתר אחרי שינוי תוכן (דורש Node.js):

```bash
node scripts/build-static.mjs https://kerrenwolf.co.il
npx netlify-cli deploy --dir deploy --prod --no-build
```

- אחרי הבנייה למחוק מ-`deploy/images` את `066*.webp` (תמונות הסיור שהוסר).

## 5. אחרי שהאתר באוויר

- ב-Google Search Console: מוסיפים את הדומיין ושולחים את `https://הדומיין/sitemap.xml`.
- לבדוק מתכון אחד בכלי "Rich Results Test" של גוגל.
- עמוד הפרטיות ב-`content/site.js` עודכן ב-1.10.2026 (בלי ChatGPT Sites, בלי טפסים שנשמרים ובלי אזור ניהול). אחרי שבוחרים אחסון, אפשר להוסיף את שם הספק.
- אם רוצים שהרשמה לעדכונים תישמר בפועל: לחבר שירות (למשל רשימת תפוצה) ולהדביק את הכתובת ב-`newsletter.endpoint`.
- כל שינוי בתוכן: לערוך, להריץ שוב את פקודת הבנייה, ולהעלות מחדש את `deploy/`.
