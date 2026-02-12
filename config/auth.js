const ADMIN_IDENTIFIER = "admin@vilniustech.lt";

const normalizeIdentityValue = (value = "") =>
  String(value).trim().toLowerCase();

const isAdminIdentity = (identity = {}) => {
  const email = normalizeIdentityValue(identity.email);
  const username = normalizeIdentityValue(identity.username);

  return email === ADMIN_IDENTIFIER || username === ADMIN_IDENTIFIER;
};

const getEffectiveRole = (identity = {}) =>
  isAdminIdentity(identity) ? "admin" : "student";

module.exports = {
  ADMIN_IDENTIFIER,
  normalizeIdentityValue,
  isAdminIdentity,
  getEffectiveRole,
};
