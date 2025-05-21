// src/services/scrollUtils.js

// Cubic Bezier Easing (easeInOutCubic)
export function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInOutCubicInverted(t) {
  return 1 - easeInOutCubic(1 - t);
}

/**
 * Animates horizontal scroll of an element.
 * @param {HTMLElement} el - The element to scroll
 * @param {number} from - Start scrollLeft
 * @param {number} to - End scrollLeft
 * @param {number} duration - Duration in ms
 * @param {(t:number)=>number} easingFn - Easing function
 * @param {Function} [callback] - Optional callback after animation
 */
export function animateHorizontalScroll(el, from, to, duration, easingFn, callback) {
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = easingFn(t);
    el.scrollLeft = from + (to - from) * eased;
    if (t < 1) {
      requestAnimationFrame(frame);
    } else if (callback) {
      callback();
    }
  }
  requestAnimationFrame(frame);
}
