# פרסום ועדכון האתר

האתר הוא תיקייה של קבצים סטטיים. אין שרת ואין מסד נתונים. הוא מתארח **בחינם ב-GitHub Pages** ונבנה ומתפרסם אוטומטית בכל שמירה.

## הפרטים
- כתובת האתר: https://www.kerrenwolf.co.il (בתהליך מעבר לכתובת בלי www: https://kerrenwolf.co.il)
- המאגר ב-GitHub: https://github.com/kerrenvol-byte/kerrenvol-byte.github.io
- בנייה ופרסום: `.github/workflows/pages.yml`. כל שמירה ל-`main` מריצה `node scripts/build-static.mjs https://kerrenwolf.co.il` ומפרסמת את התיקייה `deploy/`. זה לוקח כדקה-שתיים, ללא מגבלת קרדיטים.
- הדומיין נרשם ב-InterNIC (תוקף עד 1.10.2027, החידוש בתשלום). רשומות ה-DNS בפורטל InterNIC: `A` של הדומיין ← כתובות GitHub (`185.199.108-111.153`), ו-`www` CNAME ← `kerrenvol-byte.github.io.`
- Google Search Console: הנכס `https://kerrenwolf.co.il/` אומת באמצעות הקובץ `verify/google4465869a4914c590.html` (מועתק לשורש בבנייה, אסור למחוק).

## איך עורכים בעצמך (בלי להתקין כלום)
1. נכנסים ל-GitHub עם החשבון `kerrenvol-byte`, ופותחים את המאגר.
2. פותחים קובץ, למשל `content/recipes.js` (המתכונים) או `content/site.js` (שאר הטקסטים), ולוחצים על העיפרון.
3. מתקנים טקסט ולוחצים **Commit changes**.
4. כעבור דקה-שתיים האתר מתעדכן. אפשר לעקוב בלשונית **Actions**.

## איך עורכים איתי
אני עובד על התיקייה `KERREN\keren-wolf-site` במחשב, בודק מקומית, ושומר ל-GitHub בפקודה אחת (`git push`). הפרסום אוטומטי.

## הרצה מקומית (לבדיקה)
```bash
node scripts/build-static.mjs https://kerrenwolf.co.il
```
ואז לפתוח את `deploy/` עם שרת סטטי (למשל `npx serve deploy`).

## כללים
- אחרי הבנייה לא להעלות ידנית תמונות של סיור אשדוד (`images/066*.webp`): הן ב-`.gitignore` והדף הוסר מהאתר.
- ההרשמה לעדכונים הוסרה מהאתר ב-4.10.2026 לבקשת קרן.
- עמוד הפרטיות, תנאי השימוש והצהרת הנגישות ב-`content/site.js` (טיוטות סבירות, לא ייעוץ משפטי). פרטי רכזת הנגישות מופיעים בהצהרה.
- Netlify שימש לפני כן (אתר `kerrenwolf`). חשבון Free עם 300 קרדיטים בחודש, שנגמרו ב-4.10.2026, ולכן עברנו ל-GitHub Pages.
