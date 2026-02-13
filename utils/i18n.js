const en = require('../locales/en.json');
const lt = require('../locales/lt.json');
const tr = require('../locales/tr.json');
const lv = require('../locales/lv.json');
const ru = require('../locales/ru.json');

const SUPPORTED_LANGUAGES = ['en', 'lt', 'tr', 'lv', 'ru'];

const dictionaries = {
  en,
  lt,
  tr,
  lv,
  ru,
};

const normalizeLanguage = (value) => {
  const language = String(value || '').trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
};

const getValueByPath = (source, path) => {
  if (!source || !path) return undefined;
  return path.split('.').reduce((current, segment) => {
    if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
      return current[segment];
    }
    return undefined;
  }, source);
};

const formatMessage = (template, params = {}) => {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const value = getValueByPath(params, key);
    return value === undefined || value === null ? '' : String(value);
  });
};

const translate = (lang, key, params = {}) => {
  const selectedLanguage = normalizeLanguage(lang);
  const primary = getValueByPath(dictionaries[selectedLanguage], key);
  const fallback = getValueByPath(dictionaries.en, key);
  const value = primary !== undefined ? primary : fallback;

  if (value === undefined) {
    return key;
  }

  return formatMessage(value, params);
};

module.exports = {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  translate,
};