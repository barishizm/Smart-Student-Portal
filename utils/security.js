const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getSessionSecret = (req) => {
  if (!req.session) {
    return null;
  }

  if (!req.session.csrf_secret) {
    req.session.csrf_secret = crypto.randomBytes(32).toString('hex');
  }

  return req.session.csrf_secret;
};

const issueCsrfToken = (req) => {
  const secret = getSessionSecret(req);
  if (!secret || !req.sessionID) {
    return '';
  }

  return crypto
    .createHmac('sha256', secret)
    .update(String(req.sessionID))
    .digest('hex');
};

const isSameToken = (left, right) => {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');

  if (a.length !== b.length || a.length === 0) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

const csrfProtection = (req, res, next) => {
  res.locals.csrfToken = issueCsrfToken(req);

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const submittedToken =
    req.get('x-csrf-token') ||
    req.get('x-xsrf-token') ||
    req.body?._csrf ||
    '';

  const expectedToken = issueCsrfToken(req);
  if (isSameToken(submittedToken, expectedToken)) {
    return next();
  }

  if ((req.headers.accept || '').includes('application/json')) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  req.flash('error_msg', 'Invalid request token. Please refresh and try again.');
  return res.status(403).redirect('/');
};

module.exports = {
  csrfProtection,
  issueCsrfToken,
};
