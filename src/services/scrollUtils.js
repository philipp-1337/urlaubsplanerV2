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

/**
 * Triggers a horizontal scroll hint animation on a container if below a certain breakpoint.
 * @param {Object} opts
 * @param {string} opts.selector - CSS selector for the scroll container
 * @param {number} [opts.breakpoint=1024] - Max width for effect
 * @param {number} [opts.scrollDistance=90] - How far to scroll (px)
 * @param {number} [opts.duration=500] - Duration for scroll right (ms)
 * @param {number} [opts.returnDuration=400] - Duration for scroll back (ms)
 */
export function triggerHorizontalScrollHint({
  selector,
  breakpoint = 1024,
  scrollDistance = 90,
  duration = 500,
  returnDuration = 400
}) {
  if (typeof window === 'undefined') return;
  if (window.innerWidth >= breakpoint) return;
  const scrollContainer = document.querySelector(selector);
  if (!scrollContainer) return;
  if (scrollContainer.scrollWidth <= scrollContainer.clientWidth) return;
  const originalScroll = scrollContainer.scrollLeft;
  const maxScroll = Math.min(scrollDistance, scrollContainer.scrollWidth - scrollContainer.clientWidth);
  animateHorizontalScroll(scrollContainer, originalScroll, maxScroll, duration, easeInOutCubic, () => {
    animateHorizontalScroll(scrollContainer, maxScroll, originalScroll, returnDuration, easeInOutCubicInverted);
  });
}
