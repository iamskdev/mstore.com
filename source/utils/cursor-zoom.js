/**
 * @file Initializes a responsive, lens-style hover-to-zoom feature for desktop users.
 */

/**
 * Initializes the desktop hover-to-zoom functionality.
 * @param {object} options - The configuration object.
 * @param {HTMLElement} options.container - The wrapper around the image that listens for mouse events.
 * @param {HTMLImageElement} options.image - The main image element to be zoomed.
 * @param {HTMLElement} options.lens - The lens element that follows the cursor.
 * @param {HTMLElement} options.resultBox - The box where the zoomed image is displayed.
 * @param {HTMLElement} options.infoBox - The element to match the size of the result box against.
 * @param {number} [options.zoomFactor=2.0] - The magnification level. A higher number means a smaller lens and more zoom.
 * @returns {Function} A cleanup function to remove all attached event listeners.
 */
export function initializeDesktopHoverZoom({ container, image, lens, resultBox, infoBox, zoomFactor = 5.0 }) {
  if (!container || !image || !lens || !resultBox || !infoBox) {
    console.warn("Desktop zoom initialization failed: one or more required elements are missing.");
    return () => {};
  }

  const moveLens = (e) => {
    e.preventDefault();

    // --- Robust Size & Position Calculation ---
    const resultWidth = infoBox.offsetWidth;
    const resultHeight = infoBox.offsetHeight;
    const lensWidth = resultWidth / zoomFactor;
    const lensHeight = resultHeight / zoomFactor;

    resultBox.style.width = `${resultWidth}px`;
    resultBox.style.height = `${resultHeight}px`;
    lens.style.width = `${lensWidth}px`;
    lens.style.height = `${lensHeight}px`;

    const cx = resultWidth / lensWidth;
    const cy = resultHeight / lensHeight;

    if (!isFinite(cx) || !isFinite(cy)) return;

    const xRatio = image.naturalWidth / image.offsetWidth;
    const yRatio = image.naturalHeight / image.offsetHeight;

    resultBox.style.backgroundSize = `${image.naturalWidth * cx}px ${image.naturalHeight * cy}px`;

    const pos = getCursorPos(e);
    let x = pos.x - (lensWidth / 2);
    let y = pos.y - (lensHeight / 2);

    if (x > image.offsetWidth - lensWidth) x = image.offsetWidth - lensWidth;
    if (x < 0) x = 0;
    if (y > image.offsetHeight - lensHeight) y = image.offsetHeight - lensHeight;
    if (y < 0) y = 0;

    lens.style.left = x + 'px';
    lens.style.top = y + 'px';

    // --- Correct Centering Logic ---
    // To center the zoom, we calculate the background position based on the
    // cursor's position, not the lens's top-left corner.
    const bgPosX = (resultWidth / 2) - (pos.x * xRatio * cx);
    const bgPosY = (resultHeight / 2) - (pos.y * yRatio * cy);

    resultBox.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
  };

  const getCursorPos = (e) => {
    const a = image.getBoundingClientRect();
    const x = e.clientX - a.left;
    const y = e.clientY - a.top;
    return { x, y };
  };

  const onMouseEnter = () => {
    if (!image.complete || image.naturalHeight === 0) return;

    // Just set the background image and display properties.
    // Sizes will be calculated dynamically in moveLens.
    resultBox.style.backgroundImage = `url('${image.src}')`;

    lens.style.display = 'block';
    resultBox.style.display = 'block';
  };

  const onMouseLeave = () => {
    lens.style.display = 'none';
    resultBox.style.display = 'none';
  };

  container.addEventListener('mousemove', moveLens);
  container.addEventListener('mouseenter', onMouseEnter);
  container.addEventListener('mouseleave', onMouseLeave);

  return () => {
    container.removeEventListener('mousemove', moveLens);
    container.removeEventListener('mouseenter', onMouseEnter);
    container.removeEventListener('mouseleave', onMouseLeave);
    if (lens) lens.style.display = 'none';
    if (resultBox) resultBox.style.display = 'none';
  };
}