// בדיקת תמונות: node scripts/check-images.mjs
// מוודא שכל תמונה שמצוינת ב-content/recipes.js קיימת, שיש לה גיבוי ב-images/original, ושהמשקל סביר.
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('content/recipes.js', 'utf8'), ctx);
const paths = new Set(['images/keren.webp']);
for (const r of ctx.window.RECIPES) {
  if (r.image) paths.add(r.image);
  (r.gallery || []).forEach(g => paths.add(g));
  (r.blocks || []).forEach(b => b.img && paths.add(b.img));
}
let bad = 0;
for (const f of [...paths].sort()) {
  if (!fs.existsSync(f)) { console.log(`חסר   ${f}`); bad++; continue; }
  const kb = Math.round(fs.statSync(f).size / 1024);
  const noBackup = !fs.existsSync(f.replace('images/', 'images/original/'));
  const heavy = kb > 400;
  if (heavy) bad++;
  if (heavy || noBackup) console.log(`${heavy ? 'כבד  ' : 'אזהרה'} ${f} ${kb}KB${heavy ? ' (יעד עד 400KB)' : ''}${noBackup ? ' (אין גיבוי ב-images/original)' : ''}`);
}
console.log(`${paths.size} תמונות נבדקו, ${bad} בעיות`);
process.exit(bad ? 1 : 0);
