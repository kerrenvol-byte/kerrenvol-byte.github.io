// בניית גרסת פרסום: node scripts/build-static.mjs https://הדומיין-שלך.com
// יוצר את התיקייה deploy/ שמעלים לאחסון. לכל מתכון נוצר עמוד אמיתי (/recipe/<שם>/) עם כותרת, תיאור,
// תוכן וסכמת Recipe של גוגל, כדי שמנועי חיפוש ימצאו אותו.
// בלי כתובת הדומיין הכול עדיין עובד, אבל בלי sitemap ובלי קישורי שיתוף מלאים.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';

const SITE_URL = (process.argv[2] || '').replace(/\/+$/, '');
const OUT = 'deploy';
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['content/site.js', 'content/recipes.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const SITE = ctx.window.SITE, RECIPES = ctx.window.RECIPES;
const catName = Object.fromEntries(SITE.categories.map(c => [c.key, c.name]));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const abs = p => (SITE_URL ? SITE_URL + '/' : '/') + p.replace(/^\//, '');
const enc = s => encodeURIComponent(s);
const template = fs.readFileSync('index.html', 'utf8');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const copy = (src, dst) => fs.cpSync(src, dst, { recursive: true, filter: s => !/images[\\/]original/.test(s) });
for (const d of ['css', 'js', 'content', 'assets', 'images']) copy(d, path.join(OUT, d));
// קבצי אימות בעלות (למשל של Google Search Console) מהתיקייה verify/ מועתקים לשורש האתר
if (fs.existsSync('verify')) for (const f of fs.readdirSync('verify')) copy(path.join('verify', f), path.join(OUT, f));
if (SITE_URL) fs.writeFileSync(path.join(OUT, 'content/site-url.js'), `window.SITE_URL = ${JSON.stringify(SITE_URL)};\n`);

function page({ route, title, desc, urlPath, image, jsonld, body, type }) {
  let h = template;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  h = h.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  h = h.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  let head = '<base href="/">\n<meta name="kw-route" content="' + esc(route) + '">\n';
  if (SITE_URL) {
    head += `<link rel="canonical" href="${esc(SITE_URL + urlPath)}">\n<meta property="og:url" content="${esc(SITE_URL + urlPath)}">\n<meta property="og:type" content="${type || 'website'}">\n`;
    if (image) head += `<meta property="og:image" content="${esc(abs(image))}">\n<meta name="twitter:card" content="summary_large_image">\n`;
  }
  if (jsonld) head += `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>\n`;
  h = h.replace('<head>', '<head>\n' + head);
  if (SITE_URL) h = h.replace('<script src="content/site.js">', '<script src="content/site-url.js"></script>\n<script src="content/site.js">');
  if (body) h = h.replace('<main id="main" tabindex="-1"></main>', `<main id="main" tabindex="-1">${body}</main>`);
  return h;
}
const write = (rel, html) => { const f = path.join(OUT, rel, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

const urls = [{ loc: '/', pri: '1.0' }];
const plain = RECIPES.filter(r => !r.type);
fs.writeFileSync(path.join(OUT, 'index.html'), page({
  route: '', title: 'קרן וולף | מתכונים טבעוניים פשוטים', desc: SITE.hero.lead, urlPath: '/', image: plain[0] && plain[0].image,
  body: `<h1>${esc(SITE.hero.title)}</h1><p>${esc(SITE.hero.lead)}</p><ul>${plain.map(r => `<li><a href="recipe/${enc(r.slug)}/">${esc(r.title)}</a></li>`).join('')}</ul>`,
}));

for (const [key, route, title, desc] of [
  ['recipes', '#/recipes', 'כל המתכונים | קרן וולף', 'כל המתכונים הטבעוניים של קרן וולף: חיפוש לפי שם, מרכיב או מה שיש במקרר.'],
  ['about', '#/about', 'קצת עליי | קרן וולף', SITE.about.lead],
  ['contact', '#/contact', 'יצירת קשר | קרן וולף', SITE.contact.lead],
  ['privacy', '#/privacy', 'מדיניות הפרטיות | קרן וולף', 'מדיניות הפרטיות של האתר.'],
  ['accessibility', '#/accessibility', 'הצהרת נגישות | קרן וולף', 'הצהרת הנגישות של האתר.'],
  ['terms', '#/terms', 'תנאי שימוש | קרן וולף', 'תנאי השימוש באתר.'],
]) { write(key, page({ route, title, desc, urlPath: `/${key}/` })); urls.push({ loc: `/${key}/`, pri: '0.6' }); }

let n = 0;
for (const r of RECIPES) {
  if (r.type === 'external') continue;
  const cat = catName[r.category] || '';
  const desc = r.tagline || `${r.title}. מתכון טבעוני פשוט מהמטבח של קרן וולף.`;
  const urlPath = `/recipe/${enc(r.slug)}/`;
  let body, jsonld;
  if (r.type === 'article') {
    body = `<h1>${esc(r.title)}</h1>${(r.blocks || []).map(b => b.p ? `<p>${esc(b.p)}</p>` : '').join('')}`;
    jsonld = { '@context': 'https://schema.org', '@type': 'Article', headline: r.title, image: [abs(r.image)], author: { '@type': 'Person', name: 'קרן וולף' }, inLanguage: 'he' };
  } else {
    const ing = (r.ingredients || []).map(x => typeof x === 'string' ? `<li>${esc(x)}</li>` : `<li><b>${esc(x.heading)}</b></li>`).join('');
    body = `<h1>${esc(r.title)}</h1>${r.tagline ? `<p>${esc(r.tagline)}</p>` : ''}<img src="${esc(r.image)}" alt="${esc(r.imageAlt || r.title)}" width="600" height="600"><h2>מה צריך?</h2><ul>${ing}</ul><h2>יאללה, לעבודה</h2><ol>${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
    jsonld = {
      '@context': 'https://schema.org', '@type': 'Recipe', name: r.title, description: desc, image: [r.image, ...(r.gallery || [])].map(abs),
      author: { '@type': 'Person', name: 'קרן וולף' }, recipeCategory: cat, inLanguage: 'he', suitableForDiet: 'https://schema.org/VeganDiet',
      ...(r.time ? { totalTime: `PT${Math.floor(r.time / 60) ? Math.floor(r.time / 60) + 'H' : ''}${r.time % 60 ? (r.time % 60) + 'M' : ''}` } : {}),
      ...(r.yield ? { recipeYield: r.yield } : {}),
      recipeIngredient: (r.ingredients || []).filter(x => typeof x === 'string'),
      recipeInstructions: (r.steps || []).map(t => ({ '@type': 'HowToStep', text: t })),
    };
  }
  write(`recipe/${r.slug}`, page({ route: `#/recipe/${enc(r.slug)}`, title: `${r.title} | קרן וולף`, desc, urlPath, image: r.image, jsonld, body, type: 'article' }));
  urls.push({ loc: urlPath, pri: '0.8' }); n++;
}
fs.writeFileSync(path.join(OUT, '404.html'), page({ route: '#/404', title: 'לא מצאנו | קרן וולף', desc: 'הדף לא נמצא.', urlPath: '/404.html' }));
fs.writeFileSync(path.join(OUT, '_headers'), '/images/*\n  Cache-Control: public, max-age=86400\n/css/*\n  Cache-Control: public, max-age=3600\n/js/*\n  Cache-Control: public, max-age=3600\n/content/*\n  Cache-Control: public, max-age=3600\n');
if (SITE_URL) {
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE_URL}${u.loc}</loc><priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
} else {
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  console.log('שימו לב: לא הוזנה כתובת דומיין, ולכן לא נוצר sitemap.xml ושיתוף הקישורים יהיה יחסי.');
}
const sum = d => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? sum(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`נבנו ${n} עמודי תוכן ו-${urls.length - n - 1} עמודים כלליים, ${Math.round(sum(OUT) / 1024 / 1024)}MB בתיקייה ${OUT}/`);
