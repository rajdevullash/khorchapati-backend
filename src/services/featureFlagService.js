const FeatureFlag = require('../models/FeatureFlag');
const crypto = require('crypto');

/**
 * Determine if a feature flag is enabled for a specific user.
 * - If flag does not exist => false
 * - If flag.enabled === false => false
 * - If rolloutPercentage >= 100 => true
 * - Else: deterministic hash of userId+key -> percentage [0-99] < rolloutPercentage
 */
async function isFeatureEnabledForUser(key, userId) {
  const flag = await FeatureFlag.findOne({ key });
  if (!flag) return false;
  if (!flag.enabled) return false;
  const pct = flag.rolloutPercentage || 0;
  if (pct >= 100) return true;
  if (!userId) return false; // can't evaluate without user

  // deterministic hashing
  const h = crypto.createHash('sha256').update(`${userId}:${key}`).digest('hex');
  // use first 8 hex chars -> integer
  const intVal = parseInt(h.substring(0, 8), 16);
  const mod = intVal % 100;
  return mod < pct;
}

module.exports = {
  isFeatureEnabledForUser
}
