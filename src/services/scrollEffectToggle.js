// src/services/scrollEffectToggle.js

const SCROLL_HINT_KEY = 'scrollHintEnabled';

export function isScrollHintEnabled() {
  const value = localStorage.getItem(SCROLL_HINT_KEY);
  // Default: enabled
  return value === null ? true : value === 'true';
}

export function setScrollHintEnabled(enabled) {
  localStorage.setItem(SCROLL_HINT_KEY, enabled ? 'true' : 'false');
}
