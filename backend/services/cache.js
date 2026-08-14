import NodeCache from "node-cache";

// 5 minutes default TTL, check period 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Keep a bounded stale copy so a provider outage does not turn a previously
// successful request into an empty home page. Fresh values continue to use
// node-cache; stale values are only returned explicitly by route handlers.
const stale = new Map();
const STALE_LIMIT = 200;

export function setCached(key, value, ttl = 300) {
  cache.set(key, value, ttl);
  stale.set(key, { value, expiresAt: Date.now() + Math.max(ttl, 60) * 1000 * 12 });
  while (stale.size > STALE_LIMIT) stale.delete(stale.keys().next().value);
}

export function getCached(key) { return cache.get(key); }

export function getStaleCached(key) {
  const item = stale.get(key);
  return item && item.expiresAt > Date.now() ? item.value : undefined;
}

export default cache;
