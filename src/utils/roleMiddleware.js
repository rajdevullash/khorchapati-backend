module.exports = function requireRole(allowedRoles) {
  // allowedRoles: array or single string
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const role = user.role || 'user';
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    }

    next();
  };
};
