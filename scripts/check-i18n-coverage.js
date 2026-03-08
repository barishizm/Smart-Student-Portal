const fs = require('fs');
const path = require('path');

const base = process.cwd();

const walk = (dir) => fs.readdirSync(dir).flatMap((name) => {
  const target = path.join(dir, name);
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    return walk(target);
  }
  return [target];
});

const viewFiles = walk(path.join(base, 'views')).filter((filePath) => filePath.endsWith('.ejs'));
const keyRegex = /\bt\(\s*['"]([^'"]+)['"]/g;

const keys = [...new Set(viewFiles.flatMap((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  let match;
  while ((match = keyRegex.exec(content))) {
    matches.push(match[1]);
  }
  return matches;
}))].sort();

const hasKey = (source, keyPath) => {
  return keyPath.split('.').reduce((acc, segment) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) {
      return acc[segment];
    }
    return undefined;
  }, source) !== undefined;
};

const getValue = (source, keyPath) => keyPath.split('.').reduce((acc, segment) => {
  if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) {
    return acc[segment];
  }
  return undefined;
}, source);

const languages = ['en', 'tr', 'lt', 'lv', 'ru'];
const englishLocale = JSON.parse(fs.readFileSync(path.join(base, 'locales', 'en.json'), 'utf8'));
let ok = true;

for (const language of languages) {
  const localeFile = path.join(base, 'locales', `${language}.json`);
  const locale = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
  const missing = keys.filter((key) => !hasKey(locale, key));
  console.log(`LANG ${language} missing: ${missing.length}`);
  if (missing.length > 0) {
    ok = false;
    console.log(missing.join('\n'));
  }

  if (language === 'en') {
    continue;
  }

  const identicalPages = keys.filter((key) => /Page$/.test(key)).filter((key) => {
    const localized = getValue(locale, key);
    const english = getValue(englishLocale, key);
    return localized !== undefined && JSON.stringify(localized) === JSON.stringify(english);
  });

  console.log(`LANG ${language} identical page blocks: ${identicalPages.length}`);
  if (identicalPages.length > 0) {
    ok = false;
    console.log(identicalPages.join('\n'));
  }
}

process.exit(ok ? 0 : 1);
