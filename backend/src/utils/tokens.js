import jwt from 'jsonwebtoken';

// sessionId is optional only for backward compatibility with any
// already-issued access tokens still in the wild right after a deploy - new
// tokens always carry it so a revoked device can be rejected on its very
// next request instead of waiting for its access token to expire.
export const signAccessToken = (user, sessionId) =>
  jwt.sign(
    {
      sub: user._id,
      orgId: user.orgId,
      role: user.role,
      plan: user.plan || 'standard',
      tv: user.tokenVersion || 0,
      ...(sessionId ? { jti: String(sessionId) } : {}),
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', algorithm: 'HS256' }
  );

// jti ties this refresh token to one row in the Session collection, so a
// single device can be revoked by deleting just that row. tokenVersion is
// kept as a separate, coarser kill switch: bumping it (password change,
// "log out everywhere") invalidates every refresh token at once, even ones
// whose Session row hasn't been individually deleted yet.
export const signRefreshToken = (user, sessionId) =>
  jwt.sign({ sub: user._id, tokenVersion: user.tokenVersion || 0, jti: String(sessionId) }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d',
    algorithm: 'HS256',
  });

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

export const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });

const resetSecret = () => `${process.env.JWT_ACCESS_SECRET}:password-reset`;

export const signResetToken = ({ sub, nonce }) =>
  jwt.sign({ sub, nonce, purpose: 'password-reset' }, resetSecret(), { expiresIn: '10m', algorithm: 'HS256' });

export const verifyResetToken = (token) => {
  const payload = jwt.verify(token, resetSecret(), { algorithms: ['HS256'] });
  if (payload.purpose !== 'password-reset') {
    throw new Error('Wrong token purpose');
  }
  return payload;
};
