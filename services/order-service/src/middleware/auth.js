const jwt = require('jsonwebtoken');

// Écrit chaque refus (401/403) dans les logs : date, utilisateur, action demandée.
function logRefusal(req, status, reason, userId) {
  console.warn(JSON.stringify({
    time: new Date().toISOString(),
    level: 'warn',
    event: 'access_denied',
    status,
    reason,
    user: userId || 'anonyme',
    action: `${req.method} ${req.originalUrl}`,
  }));
}

// 1) AUTHENTIFICATION : qui es-tu ? -> 401 si le jeton est absent, invalide ou expiré.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    logRefusal(req, 401, 'jeton absent');
    return res.status(401).json({ error: 'unauthorized', message: 'Jeton absent.' });
  }
  try {
    // On n'accepte que l'algorithme attendu (HS256), pour éviter les jetons "alg: none".
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, roles: Array.isArray(payload.roles) ? payload.roles : [] };
    return next();
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'jeton expiré' : 'jeton invalide';
    logRefusal(req, 401, reason);
    return res.status(401).json({ error: 'unauthorized', message: `Jeton refusé : ${reason}.` });
  }
}

// 2) AUTORISATION : as-tu le droit ? -> 403 si aucun des rôles du jeton n'est autorisé.
// Utilisation : router.get('/', requireRole('admin', 'analyst'), handler)
function requireRole(...allowed) {
  return (req, res, next) => {
    const ok = req.user.roles.some((role) => allowed.includes(role));
    if (!ok) {
      logRefusal(req, 403, `rôles ${JSON.stringify(req.user.roles)} non autorisés`, req.user.id);
      return res.status(403).json({
        error: 'forbidden',
        message: `Rôle insuffisant. Rôles autorisés : ${allowed.join(', ')}.`,
      });
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };