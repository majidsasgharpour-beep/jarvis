# ساخت دوباره‌ی apex-world.js / apex-world.css

سورس از [APEX-UI](https://github.com/RubenM1990/APEX-UI) (MIT) است. هسته‌ی ذرات سه‌بعدی (three / react-three-fiber) در این بیلد نیست.
نیازمندی: `esbuild` و `react` / `react-dom` نسخه‌ی ۱۹ (در دسترس از node_modules).

```bash
cd apex-src
esbuild entry.jsx --bundle --minify --format=iife --target=safari15,chrome100 \
  --jsx=automatic --define:process.env.NODE_ENV='"production"' --loader:.js=jsx \
  --outfile=../apex-world.js
```
خروجی `apex-world.js` و `apex-world.css` را کنار `index.html` بگذار و نسخه‌ی `V` در `sw.js` را بالا ببر.
