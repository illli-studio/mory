import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const sourcePath = join(packageRoot, 'src/client.js');
const assetsRoot = join(packageRoot, 'assets');
const cssPlaceholder = '__MORY_STYLES__';
const logoPlaceholder = '__MORY_LOGO__';
const themesPlaceholder = '__MORY_THEMES__';

async function sourceAsset(original, snapshot) {
  try { return { contents: await readFile(original, 'utf8'), origin: 'website source' }; }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try { return { contents: await readFile(snapshot, 'utf8'), origin: 'packaged source snapshot' }; }
    catch (fallbackError) {
      if (fallbackError.code !== 'ENOENT') throw fallbackError;
      throw new Error(`Missing website asset and packaged snapshot: ${original}`);
    }
  }
}

// Scan CSS boundaries without treating comments, quoted strings or function
// arguments as rule delimiters. No CSS compiler or runtime package is needed.
function boundary(css, start, stopAtClosingBrace = false) {
  let quote = '', comment = false, parentheses = 0, brackets = 0;
  for (let index = start; index < css.length; index++) {
    const character = css[index], next = css[index + 1];
    if (comment) { if (character === '*' && next === '/') { comment = false; index++; } continue; }
    if (quote) { if (character === '\\') index++; else if (character === quote) quote = ''; continue; }
    if (character === '/' && next === '*') { comment = true; index++; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === '(') parentheses++;
    else if (character === ')') parentheses--;
    else if (character === '[') brackets++;
    else if (character === ']') brackets--;
    else if (!parentheses && !brackets && (character === '{' || character === ';' || (stopAtClosingBrace && character === '}'))) return index;
  }
  return -1;
}

function blockEnd(css, opening) {
  let depth = 1, quote = '', comment = false;
  for (let index = opening + 1; index < css.length; index++) {
    const character = css[index], next = css[index + 1];
    if (comment) { if (character === '*' && next === '/') { comment = false; index++; } continue; }
    if (quote) { if (character === '\\') index++; else if (character === quote) quote = ''; continue; }
    if (character === '/' && next === '*') { comment = true; index++; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === '{') depth++;
    else if (character === '}' && --depth === 0) return index;
  }
  throw new Error('Unbalanced website CSS block.');
}

function selectorForPanel(selector) {
  return selector
    .replace(/:root\b/g, ':scope')
    .replace(/#root\b/g, ':scope')
    .replace(/(^|[,\s>+~(])(?:html|body)(?=$|[,\s>+~.#:[\])])/g, '$1:scope')
    // The website sets data-theme on html; the native panel sets it on itself.
    .replace(/(\[data-theme\s*=\s*(?:"[^"]*"|'[^']*'|[^\]]+)\])\s+:scope\b/g, '$1')
    .replace(/\[data-theme\s*=\s*(?:"[^"]*"|'[^']*'|[^\]]+)\]/g, (attribute, offset, original) => original.slice(Math.max(0, offset - 6), offset) === ':scope' ? attribute : `:scope${attribute}`)
    .replace(/:scope(?:\s+:scope)+/g, ':scope');
}

function widthOnly(condition) {
  return condition.trim().split(/\s+and\s+/i).every(part => /^\(\s*(?:min-|max-)?width\s*:\s*(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem)\s*\)$/i.test(part));
}

export function scopeWebsiteCss(originalCss) {
  const keyframes = new Set([...originalCss.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].map(match => match[1]));
  const renameAnimations = block => {
    for (const name of keyframes) block = block.replace(new RegExp(`(?<![\\w-])${name}(?![\\w-])`, 'g'), `mory-site-${name}`);
    return block;
  };
  let containerQueries = 0;
  function rules(css) {
    let output = '', cursor = 0;
    while (cursor < css.length) {
      const next = boundary(css, cursor);
      if (next === -1) { output += css.slice(cursor); break; }
      const prelude = css.slice(cursor, next);
      // Keep every historical rule and its source order; trim only for matching.
      const meaningful = prelude.replace(/^(?:\s|\/\*[\s\S]*?\*\/)+/, '').trim();
      if (css[next] === ';') {
        if (/^@import\s+["']tailwindcss["']\s*$/i.test(meaningful)) {
          output += prelude.slice(0, prelude.indexOf('@import'));
        } else {
          if (/^@import\b/i.test(meaningful)) throw new Error('Unexpected CSS import: package the stylesheet asset explicitly.');
          output += prelude + ';';
        }
        cursor = next + 1;
        continue;
      }
      const end = blockEnd(css, next);
      const content = css.slice(next + 1, end);
      let header = prelude, body = content;
      if (/^@media\b/i.test(meaningful)) {
        const condition = meaningful.replace(/^@media\s*/i, '');
        if (widthOnly(condition)) { header = prelude.replace(/@media\b/i, '@container mory'); containerQueries++; }
        body = rules(content);
      } else if (/^@(?:supports|layer|container|scope)\b/i.test(meaningful)) {
        body = rules(content);
      } else if (/^@theme\s+inline$/i.test(meaningful)) {
        header = prelude.replace(/@theme\s+inline/i, ':scope');
      } else if (/^@(?:-webkit-)?keyframes\b/i.test(meaningful)) {
        header = renameAnimations(prelude);
      } else if (!meaningful.startsWith('@')) {
        header = selectorForPanel(prelude);
        body = renameAnimations(content);
      }
      output += `${header}{${body}}`;
      cursor = end + 1;
    }
    return output;
  }
  const scoped = rules(originalCss);
  const root = '.mory-app{container-type:inline-size;container-name:mory;position:relative;isolation:isolate;height:100%;overflow:auto;min-width:0;}';
  return { css: `${root}\n@scope (.mory-app) {\n${scoped}\n}\n`, containerQueries };
}

export async function buildClient() {
  const source = await readFile(sourcePath, 'utf8');
  for (const placeholder of [cssPlaceholder, logoPlaceholder, themesPlaceholder]) {
    if (source.split(placeholder).length !== 2) throw new Error(`Client source must contain exactly one ${placeholder} placeholder.`);
  }
  if (!source.includes("id: '@illli-studio/dsh-mory'") && !source.includes('id: "@illli-studio/dsh-mory"')) throw new Error('Client source must register @illli-studio/dsh-mory.');
  const [styleAsset, logoAsset, themeAsset, localeAsset, protocolAsset] = await Promise.all([
    sourceAsset(join(repoRoot, 'apps/web/src/styles.css'), join(assetsRoot, 'website-styles.css')),
    sourceAsset(join(repoRoot, 'apps/web/public/mory-logo-premium.svg'), join(assetsRoot, 'mory-logo-premium.svg')),
    sourceAsset(join(repoRoot, 'apps/web/src/theme.tsx'), join(assetsRoot, 'website-theme.tsx')),
    sourceAsset(join(repoRoot, 'apps/web/src/i18n.tsx'), join(assetsRoot, 'website-i18n.tsx')),
    sourceAsset(join(repoRoot, 'packages/memory-core/protocol.mjs'), join(assetsRoot, 'memory-protocol.mjs')),
  ]);
  const dictionaries = localeAsset.contents.replace(/\r\n/g, '\n').match(/\ben:\s*\{([\s\S]*?)\n\s*\},\n\s*zh:\s*\{([\s\S]*?)\n\s*\},/);
  if (!dictionaries) throw new Error('Cannot read original website theme translations.');
  const labels = dictionaries.slice(1).map(section => Object.fromEntries([...section.matchAll(/\b(theme[A-Z]\w*):\s*("(?:[^"\\]|\\.)*")/g)].map(match => [match[1], JSON.parse(match[2])])));
  const themes = [...themeAsset.contents.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*description:\s*"([^"]+)",\s*swatches:\s*(\[[^\]]+\])\s*\}/g)].map(match => {
    const key = `theme${match[1][0].toUpperCase()}${match[1].slice(1)}`;
    return { id: match[1], swatches: JSON.parse(match[4]), en: { name: labels[0][key] || match[2], hint: labels[0][`${key}Hint`] || match[3] }, zh: { name: labels[1][key] || match[2], hint: labels[1][`${key}Hint`] || match[3] } };
  });
  if (themes.length < 2) throw new Error('Cannot read the original website theme catalog.');
  if (!/<svg\b[^>]*\bxmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/s.test(logoAsset.contents)) throw new Error('The original Mory logo must be an SVG.');
  const { css, containerQueries } = scopeWebsiteCss(styleAsset.contents);
  const logo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoAsset.contents)}`;
  const generated = '// Generated by scripts/build-client.mjs; edit src/client.js and website source assets.\n'
    + source.replace(cssPlaceholder, () => JSON.stringify(css)).replace(logoPlaceholder, () => JSON.stringify(logo)).replace(themesPlaceholder, () => JSON.stringify(themes));
  if (generated.includes(cssPlaceholder) || generated.includes(logoPlaceholder) || generated.includes(themesPlaceholder)) throw new Error('Unresolved client build placeholder.');
  await mkdir(assetsRoot, { recursive: true });
  await Promise.all([
    writeFile(join(assetsRoot, 'website-styles.css'), styleAsset.contents),
    writeFile(join(assetsRoot, 'mory-logo-premium.svg'), logoAsset.contents),
    writeFile(join(assetsRoot, 'website-theme.tsx'), themeAsset.contents),
    writeFile(join(assetsRoot, 'website-i18n.tsx'), localeAsset.contents),
    writeFile(join(assetsRoot, 'memory-protocol.mjs'), protocolAsset.contents),
    writeFile(join(packageRoot, 'protocol.mjs'), protocolAsset.contents),
    writeFile(join(assetsRoot, 'source.json'), JSON.stringify({
      stylesheet: 'apps/web/src/styles.css', logo: 'apps/web/public/mory-logo-premium.svg',
      stylesheetSha256: createHash('sha256').update(styleAsset.contents).digest('hex'),
      logoSha256: createHash('sha256').update(logoAsset.contents).digest('hex'),
    }, null, 2) + '\n'),
    writeFile(join(packageRoot, 'icon.svg'), logoAsset.contents),
    writeFile(join(packageRoot, 'client.js'), generated),
  ]);
  console.log(`Built Mory client: full website CSS (${styleAsset.origin}), ${containerQueries} width container queries, original logo (${logoAsset.origin}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildClient();
