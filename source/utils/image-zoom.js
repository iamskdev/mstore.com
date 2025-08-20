/**
 * @file Initializes pinch-to-zoom and double-tap zoom on an image.
 * Works on mobile devices with smooth gestures and center-focused zoom.
 */

/**
 * Initializes the image zoom functionality.
 * @param {object} elements - An object containing the necessary DOM elements.
 * @param {HTMLElement} elements.container - The wrapper around the image.
 * @param {HTMLImageElement} elements.image - The main image to be zoomed.
 * @param {function(number): void} [elements.onZoomChange] - Optional callback when zoom scale changes.
 * @returns {Function} A cleanup function to remove all listeners.
 */
export function initializeImageZoom({ container, image, onZoomChange }) {
  if (!container || !image) {
    console.warn("Image zoom initialization failed: missing elements.");
    return;
  }

  let scale = 1;
  let translateX = 0, translateY = 0;
  let startX = 0, startY = 0;
  let initialTranslateX = 0, initialTranslateY = 0;
  let initialScale = 1;
  let initialDistance = 0;
  const originalTouchAction = container.style.touchAction || '';

  const applyTransform = () => {
    image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    container.style.touchAction = scale > 1 ? 'none' : originalTouchAction;
    onZoomChange?.(scale);
  };

  const resetZoom = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
  };

  const onDoubleClick = (e) => {
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (scale > 1) {
      resetZoom();
    } else {
      scale = 2;
      translateX = (container.offsetWidth / 2 - clickX) * (scale - 1);
      translateY = (container.offsetHeight / 2 - clickY) * (scale - 1);
      applyTransform();
    }
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialScale = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      startX = e.touches[0].clientX - translateX;
      startY = e.touches[0].clientY - translateY;
      initialTranslateX = translateX;
      initialTranslateY = translateY;
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length > 1 || scale > 1) e.preventDefault(); // Prevent page scroll on multi-touch

    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      scale = Math.min(3, Math.max(1, initialScale * distance / initialDistance));
      applyTransform();
    } else if (e.touches.length === 1 && scale > 1) {
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;

      const maxX = (scale - 1) * container.offsetWidth / 2;
      const maxY = (scale - 1) * container.offsetHeight / 2;
      translateX = Math.min(maxX, Math.max(-maxX, translateX));
      translateY = Math.min(maxY, Math.max(-maxY, translateY));
      applyTransform();
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length === 0 && e.changedTouches.length > 0) {
      startX = e.changedTouches[0].clientX - translateX;
      startY = e.changedTouches[0].clientY - translateY;
      initialTranslateX = translateX;
      initialTranslateY = translateY;
    }
  };

  container.addEventListener('dblclick', onDoubleClick);
  container.addEventListener('touchstart', onTouchStart);
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd);
  window.addEventListener('beforeunload', resetZoom);

  applyTransform();

  return () => {
    container.removeEventListener('dblclick', onDoubleClick);
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchmove', onTouchMove);
    container.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('beforeunload', resetZoom);
  };
}