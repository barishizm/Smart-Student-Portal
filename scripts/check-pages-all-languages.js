const bcrypt = require('bcrypt');
const db = require('../models/db');

const BASE_URL = 'http://localhost:3001';
const LANGUAGES = ['en', 'tr', 'lt', 'lv', 'ru'];
const ADMIN_IDENTIFIER = 'admin@vilniustech.lt';
const ADMIN_PASSWORD = 'Pass123!';
const STUDENT_EMAIL = 'langcheck.student@vilniustech.lt';
const STUDENT_USERNAME = 'langcheck.student';
const STUDENT_PASSWORD = 'Pass123!';

const parseToken = (html) => {
  const inputToken = html.match(/name="_csrf" value="([^"]+)"/);
  if (inputToken) return inputToken[1];
  const metaToken = html.match(/meta name="csrf-token" content="([^"]+)"/);
  if (metaToken) return metaToken[1];
  return '';
};

const nowId = () => Date.now().toString();

const toPromise = (method, sql, params = []) =>
  new Promise((resolve, reject) => {
    db[method](sql, params, function callback(err, rowOrRows) {
      if (err) return reject(err);
      if (method === 'run') return resolve(this);
      return resolve(rowOrRows);
    });
  });

const dbGet = (sql, params = []) => toPromise('get', sql, params);
const dbRun = (sql, params = []) => toPromise('run', sql, params);

class SessionClient {
  constructor() {
    this.cookie = '';
  }

  updateCookie(response) {
    const setCookie = response.headers.get('set-cookie') || '';
    const match = setCookie.match(/ssp\.sid=[^;]+/);
    if (match) {
      this.cookie = match[0];
    }
  }

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) headers.Cookie = this.cookie;

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      redirect: 'manual',
    });

    this.updateCookie(response);
    return response;
  }

  async get(path) {
    return this.request(path, { method: 'GET' });
  }

  async postForm(path, payload, csrfToken) {
    const body = new URLSearchParams(payload).toString();
    return this.request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body,
    });
  }

  async postJson(path, payload, csrfToken) {
    return this.request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify(payload),
    });
  }

  async fetchCsrfFrom(path) {
    const response = await this.get(path);
    const html = await response.text();
    return { response, token: parseToken(html), html };
  }
}

const ensureAdminPassword = async () => {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await dbRun(
    `UPDATE users
     SET password_hash = ?, role = 'admin'
     WHERE lower(email) = lower(?) OR lower(username) = lower(?)`,
    [hash, ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]
  );
};

const ensureStudentAccount = async () => {
  const existing = await dbGet(
    'SELECT id FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?) LIMIT 1',
    [STUDENT_EMAIL, STUDENT_USERNAME]
  );

  const hash = await bcrypt.hash(STUDENT_PASSWORD, 10);

  if (existing?.id) {
    await dbRun(
      `UPDATE users
       SET username = ?, email = ?, password_hash = ?, role = 'student', preferred_language = 'en'
       WHERE id = ?`,
      [STUDENT_USERNAME, STUDENT_EMAIL, hash, existing.id]
    );
    return;
  }

  const insertRes = await dbRun(
    `INSERT INTO users (first_name, last_name, username, email, password_hash, role, preferred_language)
     VALUES (?, ?, ?, ?, ?, 'student', 'en')`,
    ['Lang', 'Check', STUDENT_USERNAME, STUDENT_EMAIL, hash]
  );

  const userId = insertRes.lastID;
  await dbRun(
    `INSERT OR IGNORE INTO students (name, surname, student_id, email, user_id, group_name, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Lang', 'Check', `REG-LANG-${userId}`, STUDENT_EMAIL, userId, null, null]
  );
};

const login = async (client, identity, password) => {
  const { token } = await client.fetchCsrfFrom('/');
  const response = await client.postForm('/auth/login', {
    _csrf: token,
    email: identity,
    password,
  });

  if (response.status !== 302) {
    throw new Error(`Login failed for ${identity}, status=${response.status}`);
  }
};

const setLanguage = async (client, language) => {
  const { token } = await client.fetchCsrfFrom('/dashboard');
  const response = await client.postJson('/auth/language', { language }, token);
  if (response.status !== 200) {
    throw new Error(`Language switch failed for ${language}, status=${response.status}`);
  }
};

const assertPage = async (client, path, expectedLanguage) => {
  const response = await client.get(path);
  if (response.status !== 200) {
    throw new Error(`Page ${path} failed with status=${response.status}`);
  }

  const html = await response.text();
  if (!html.includes(`lang="${expectedLanguage}"`)) {
    throw new Error(`Page ${path} did not render expected lang=${expectedLanguage}`);
  }

  if (html.includes('sidebar.contactMessages') || html.includes('contact.searchPlaceholder')) {
    throw new Error(`Page ${path} contains untranslated keys`);
  }
};

const runChecksForRole = async ({ role, identity, password, pages }) => {
  const client = new SessionClient();
  await login(client, identity, password);

  for (const language of LANGUAGES) {
    await setLanguage(client, language);
    for (const page of pages) {
      await assertPage(client, page, language);
    }
  }

  console.log(`OK ${role}`);
};

(async () => {
  await db.ready;
  await ensureAdminPassword();
  await ensureStudentAccount();

  const guest = new SessionClient();
  for (const language of LANGUAGES) {
    const loginPage = await guest.get(`/?lang=${language}`);
    if (loginPage.status !== 200) {
      throw new Error(`Guest page / failed for ${language} with ${loginPage.status}`);
    }
    const html = await loginPage.text();
    if (!html.includes('name="_csrf"')) {
      throw new Error(`Guest page / missing csrf token for ${language}`);
    }
  }
  console.log('OK guest');

  await runChecksForRole({
    role: 'student',
    identity: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
    pages: ['/dashboard', '/profile', '/about', '/contact'],
  });

  await runChecksForRole({
    role: 'admin',
    identity: ADMIN_IDENTIFIER,
    password: ADMIN_PASSWORD,
    pages: ['/dashboard', '/profile', '/about', '/contact', '/contact/messages', '/admin/students', '/schedules/admin'],
  });

  console.log('ALL_LANGUAGE_PAGE_CHECKS_PASSED');
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
