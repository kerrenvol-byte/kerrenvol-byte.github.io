"""
בונה קובץ HTML יחיד לתצוגה מקדימה בתוך Claude (dist/keren-wolf.html).
לא חובה לאתר עצמו: האתר האמיתי הוא התיקייה כמו שהיא (index.html + css + js + content).
שימוש: python scripts/build-artifact.py
"""
import re, os
os.makedirs('dist', exist_ok=True)
css = open('css/styles.css', encoding='utf-8').read()
site = open('content/site.js', encoding='utf-8').read()
data = open('content/recipes.js', encoding='utf-8').read()
app = open('js/app.js', encoding='utf-8').read()
idx = open('index.html', encoding='utf-8').read()
body = re.search(r'<body>(.*)</body>', idx, re.S).group(1)
body = re.sub(r'<script src="[^"]+"></script>\s*', '', body)
fonts = re.search(r'<link href="(https://fonts.googleapis.com/css2[^"]+)"', idx).group(1)
out = f'''<title>קרן וולף</title>
<meta name="description" content="מתכונים טבעוניים פשוטים וביתיים ממצרכים שיש בכל מכולת.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{fonts}" rel="stylesheet">
<style>
{css}
:root {{ color-scheme: light; }}
html, body {{ background: #fff; }}
body {{ margin: 0; font-size: 1.0625rem; }}
</style>
<div dir="rtl" lang="he" style="background:#fff">
{body}
</div>
<script>
window.__VIEWER__ = true;
{site}
{data}
{app}
</script>
'''
open('dist/keren-wolf.html', 'w', encoding='utf-8').write(out)
print('dist/keren-wolf.html', len(out), 'bytes')
