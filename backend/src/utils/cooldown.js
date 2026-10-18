// Shared 7-day cooldown helper for username/email changes. Both authController
// and userController expose the same locked-until info on publicUser(), so it
// lives in one place to avoid drift between the two.

export const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// Returns the Date the field unlocks at, or null if it's not currently locked
// (either never changed, or the cooldown window has already passed).
export const cooldownLockedUntil = (changedAt) => {
  if (!changedAt) return null;
  const unlocksAt = new Date(new Date(changedAt).getTime() + COOLDOWN_MS);
  return unlocksAt > new Date() ? unlocksAt : null;
};

export const cooldownLockedUntilIso = (changedAt) => {
  const unlocksAt = cooldownLockedUntil(changedAt);
  return unlocksAt ? unlocksAt.toISOString() : null;
};
