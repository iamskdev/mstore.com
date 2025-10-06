/**
 * @file Media Editor Component
 * This module encapsulates all the logic for the photo editor modal.
 * It is designed to be self-contained and reusable throughout the application.
 * To use, import and call `initMediaEditor()` once, then use the global `openPhotoEditor()` function.
 */

let onSaveCallback = null;
let currentImage = null;
let currentAspectRatio = 1;
let isDragging = false;
let isResizing = false;
let resizeHandle = '';
let startX, startY, startWidth, startHeight, startLeft, startTop;
let imageScale = 1;
let imagePosX = 0;
let imagePosY = 0;
let isPanning = false;
let panStartX, panStartY;
let initialPinchDistance = 0;
let lastScale = 1;

// DOM Elements (will be populated by initMediaEditor)
let modal, previewContainer, previewImage, cropFrame;
let controls = {};

/**
 * Opens the photo editor with a specified image and configuration.
 * This function is attached to the window object to be globally accessible.
 * @param {string} imageSrc - The Data URL or object URL of the image to edit.
 * @param {object} options - Configuration for the editor.
 * @param {Array} [options.aspectRatios] - e.g., [{label: '1:1', value: 1}]
 * @param {number} [options.initialAspectRatio=1] - The starting aspect ratio.
 * @param {boolean} [options.isCircle=false] - If true, starts in circle crop mode.
 * @param {Array<object>} [options.controls] - Array of row objects, e.g., [{ zoom: true }, { rotate: true }]
 * @param {string} [options.compression.type] - 'target' (default) or 'general' to select compressor.
 * @param {object} options.compression - e.g., { targetSizeKB: 150, minQuality: 0.7, format: 'image/jpeg' }
 * @param {string} [options.title] - The main title of the editor modal.
 * @param {string} [options.subtitle] - The subtitle text below the main title.
 * @param {function} options.onSave - Callback function that receives the final blob.
 */
function openPhotoEditor(imageSrc, options) {
    if (!modal) {
        console.error("Media Editor has not been initialized. Call initMediaEditor() first.");
        return;
    }
    applyEditorConfiguration(options);
    document.documentElement.style.overflow = 'hidden'; // Prevent body scroll
    modal.style.display = 'flex';
    loadImage(imageSrc);
}

function closeModal() {
    if (modal) {
        document.documentElement.style.overflow = ''; // Restore body scroll
        modal.style.display = 'none';
        onSaveCallback = null; // Clear the callback
    }
}

async function applyAndSaveCrop(compressionOptions) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const image = previewImage;
    const cropRect = cropFrame.getBoundingClientRect();
    const wrapperRect = previewContainer.querySelector('.me-image-crop-wrapper').getBoundingClientRect();

    const cropX = cropRect.left - wrapperRect.left;
    const cropY = cropRect.top - wrapperRect.top;
    const cropWidth = cropRect.width;
    const cropHeight = cropRect.height;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const currentTransform = image.style.transform;
    const rotateMatch = currentTransform.match(/rotate\((-?\d+\.?\d*)deg\)/);
    const scaleXMatch = currentTransform.match(/scaleX\((-?\d+)\)/);
    const scaleYMatch = currentTransform.match(/scaleY\((-?\d+)\)/);
    
    const rotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
    const scaleX = scaleXMatch ? parseInt(scaleXMatch[1]) : 1;
    const scaleY = scaleYMatch ? parseInt(scaleYMatch[1]) : 1;

    const originalTransform = image.style.transform;
    image.style.transform = `scale(${imageScale}) translate(${imagePosX}px, ${imagePosY}px)`;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    const displayToNaturalRatio = image.naturalWidth / image.width;
    const sourceX = (cropX - imagePosX) * displayToNaturalRatio;
    const sourceY = (cropY - imagePosY) * displayToNaturalRatio;
    const sourceWidth = cropWidth * displayToNaturalRatio;
    const sourceHeight = cropHeight * displayToNaturalRatio;

    drawImageToCanvas(ctx, image, sourceX, sourceY, sourceWidth, sourceHeight, cropWidth, cropHeight);

    image.style.transform = originalTransform;

    const finalFormat = compressionOptions.format || 'image/jpeg';

    let compressedBlob;
    if (compressionOptions.type === 'general') {
        compressedBlob = await compressImageGeneral(canvas, compressionOptions.minSizeKB, compressionOptions.maxSizeKB, compressionOptions.minQuality, finalFormat);
    } else {
        compressedBlob = await compressImage(canvas, compressionOptions.targetSizeKB, compressionOptions.minQuality, finalFormat);
    }

    if (onSaveCallback) onSaveCallback(compressedBlob);
    
    closeModal();
}

function drawImageToCanvas(ctx, image, sx, sy, sWidth, sHeight, dWidth, dHeight) {
    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
}

async function compressImage(sourceCanvas, targetSizeKB, minQuality, format) {
    const targetSizeBytes = targetSizeKB * 1024;
    let quality = 0.9;
    let compressedBlob = null;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;
    tempCtx.drawImage(sourceCanvas, 0, 0);

    for (let i = 0; i < 10; i++) {
        compressedBlob = await new Promise(resolve => tempCanvas.toBlob(resolve, format, quality));
        if (compressedBlob.size <= targetSizeBytes || quality <= minQuality) break;
        quality -= 0.1;
    }
    return compressedBlob;
}

async function compressImageGeneral(sourceCanvas, minSizeKB, maxSizeKB, minQuality, format) {
    const minBytes = minSizeKB * 1024;
    const maxBytes = maxSizeKB * 1024;
    let lowerBound = minQuality;
    let upperBound = 1.0;
    let currentQuality = 0.9;
    let bestBlob = null;

    const initialBlob = await new Promise(resolve => sourceCanvas.toBlob(resolve, format, 1.0));
    if (initialBlob.size < minBytes) {
        return initialBlob;
    }

    for (let i = 0; i < 7; i++) {
        const blob = await new Promise(resolve => sourceCanvas.toBlob(resolve, format, currentQuality));
        if (blob.size > maxBytes) {
            upperBound = currentQuality;
            currentQuality = (lowerBound + upperBound) / 2;
        } else if (blob.size < minBytes) {
            bestBlob = blob;
            lowerBound = currentQuality;
            currentQuality = (lowerBound + upperBound) / 2;
        } else {
            bestBlob = blob;
            break;
        }
    }
    return bestBlob;
}

function loadImage(src) {
    const img = new Image();
    img.src = src;
    img.onload = function() {
        currentImage = img;
        previewImage.src = src;
        
        let wrapper = previewContainer.querySelector('.me-image-crop-wrapper');
        let area = previewContainer.querySelector('.me-preview-area');

        cropFrame.innerHTML = `
            <div class="me-crop-handle top-left"></div><div class="me-circle-overlay"></div>
            <div class="me-crop-handle top-right"></div><div class="me-crop-handle bottom-left"></div>
            <div class="me-crop-handle bottom-right"></div><div class="me-crop-handle top"></div>
            <div class="me-crop-handle bottom"></div><div class="me-crop-handle left"></div>
            <div class="me-crop-handle right"></div>`;
        
        const parentRect = wrapper.getBoundingClientRect();
        const size = Math.min(parentRect.width, parentRect.height) * 0.8;
        
        cropFrame.style.width = size + 'px';
        cropFrame.style.height = size + 'px';
        cropFrame.style.left = (parentRect.width - size) / 2 + 'px';
        cropFrame.style.top = (parentRect.height - size) / 2 + 'px';
        
        imageScale = 1;
        imagePosX = 0;
        imagePosY = 0;
        previewImage.style.transform = 'rotate(0deg) scaleX(1) scaleY(1) scale(1) translate(0px, 0px)';

        updateCropFrameAspectRatio();
    };
}

function updateCropFrameAspectRatio() {
    if (currentAspectRatio === null) return; // Free aspect ratio
    const currentWidth = parseInt(cropFrame.style.width);
    let newHeight = currentWidth / currentAspectRatio;
    
    const wrapper = previewContainer.querySelector('.me-image-crop-wrapper');
    if (wrapper && newHeight > wrapper.offsetHeight) {
        newHeight = wrapper.offsetHeight;
        const newWidth = newHeight * currentAspectRatio;
        cropFrame.style.width = newWidth + 'px';
    }

    cropFrame.style.height = newHeight + 'px';
}

function applyTransform(type, value) {
    if (!previewImage.src) return;
    const currentTransform = previewImage.style.transform || 'rotate(0deg) scaleX(1) scaleY(1) scale(1) translate(0px, 0px)';
    let [_, currentRotation] = currentTransform.match(/rotate\((-?\d+)deg\)/) || [0, 0];
    let [__, currentScaleX] = currentTransform.match(/scaleX\((-?\d+)\)/) || [0, 1];
    let [___, currentScaleY] = currentTransform.match(/scaleY\((-?\d+)\)/) || [0, 1];

    currentRotation = parseInt(currentRotation);
    currentScaleX = parseInt(currentScaleX);
    currentScaleY = parseInt(currentScaleY);

    if (type === 'rotate') {
        currentRotation += value;
    } else if (type === 'flip') {
        if (value === 'horizontal') currentScaleX *= -1;
        else currentScaleY *= -1;
    }

    previewImage.style.transform = `rotate(${currentRotation}deg) scaleX(${currentScaleX}) scaleY(${currentScaleY}) scale(${imageScale}) translate(${imagePosX}px, ${imagePosY}px)`;
}

function applyEditorConfiguration(options) {
    const editorTitle = modal.querySelector('.me-header h1');
    const editorSubtitle = modal.querySelector('.me-header p');
    editorTitle.textContent = options.title || 'Photo Editor';
    editorSubtitle.textContent = options.subtitle || 'Crop, adjust, and export your image';

    const editorFooter = modal.querySelector('.me-footer');
    editorFooter.innerHTML = '';
    let finalButtonsAdded = false;
    
    if (options.controls && Array.isArray(options.controls)) {
        options.controls.forEach(rowConfig => {
            const rowElement = document.createElement('div');
            
            if (rowConfig.ratios && options.aspectRatios && options.aspectRatios.length > 0) {
                rowElement.className = 'me-ratio-selector';
                options.aspectRatios.forEach(ratio => {
                    const btn = document.createElement('button');
                    btn.className = 'me-ratio-btn';
                    btn.dataset.ratio = String(ratio.value);
                    btn.textContent = ratio.label;
                    btn.addEventListener('click', function() {
                        rowElement.querySelectorAll('.me-ratio-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        currentAspectRatio = this.dataset.ratio === 'null' ? null : parseFloat(this.dataset.ratio);
                        updateCropFrameAspectRatio();
                    });
                    rowElement.appendChild(btn);
                });
            } else {
                rowElement.className = 'me-action-buttons';
                if (rowConfig.zoom) {
                    rowElement.appendChild(controls.zoomInBtn);
                    rowElement.appendChild(controls.zoomOutBtn);
                }
                if (rowConfig.rotate) {
                    rowElement.appendChild(controls.rotateLeftBtn);
                    rowElement.appendChild(controls.rotateRightBtn);
                }
                if (rowConfig.flip) {
                    rowElement.appendChild(controls.flipHorizontalBtn);
                    rowElement.appendChild(controls.flipVerticalBtn);
                }
                if (rowConfig.circle) rowElement.appendChild(controls.circleCropBtn);
                if (rowConfig.fullscreen) rowElement.appendChild(controls.fullscreenBtn);

                if (rowConfig.final) {
                    rowElement.appendChild(controls.closeBtn);
                    rowElement.appendChild(controls.saveBtn);
                    finalButtonsAdded = true;
                }
            }
            editorFooter.appendChild(rowElement);
        });
    }

    if (!finalButtonsAdded) {
        const finalActionsRow = document.createElement('div');
        finalActionsRow.className = 'me-action-buttons';
        finalActionsRow.appendChild(controls.closeBtn);
        finalActionsRow.appendChild(controls.saveBtn);
        editorFooter.appendChild(finalActionsRow);
    }

    currentAspectRatio = options.initialAspectRatio === null ? null : (options.initialAspectRatio || 1);
    const initialRatioBtn = editorFooter.querySelector(`.me-ratio-btn[data-ratio="${currentAspectRatio}"]`);
    if (initialRatioBtn) {
        editorFooter.querySelectorAll('.me-ratio-btn').forEach(b => b.classList.remove('active'));
        initialRatioBtn.classList.add('active');
    }

    cropFrame.classList.toggle('circle', !!options.isCircle);
    if (controls.circleCropBtn) {
        controls.circleCropBtn.classList.toggle('active', !!options.isCircle);
    }

    onSaveCallback = options.onSave;
    if (controls.saveBtn) {
        controls.saveBtn.onclick = () => applyAndSaveCrop(options.compression);
    }
}

// --- Event Handlers ---
function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = cropFrame.offsetLeft;
    startTop = cropFrame.offsetTop;
    startWidth = cropFrame.offsetWidth;
    startHeight = cropFrame.offsetHeight;

    if (e.target.classList.contains('me-crop-handle')) {
        isResizing = true;
        resizeHandle = Array.from(e.target.classList).find(c => c !== 'me-crop-handle');
    } else {
        isDragging = true;
    }
}

function onTouchStartCropFrame(e) {
    if (e.touches.length > 1) return; // Ignore multi-touch gestures on the frame
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startLeft = cropFrame.offsetLeft;
    startTop = cropFrame.offsetTop;
    startWidth = cropFrame.offsetWidth;
    startHeight = cropFrame.offsetHeight;

    if (e.target.classList.contains('me-crop-handle')) {
        isResizing = true;
        resizeHandle = Array.from(e.target.classList).find(c => c !== 'me-crop-handle');
    } else {
        isDragging = true;
    }
}

function onMouseMove(e) {
    if (!isDragging && !isResizing) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const wrapper = previewContainer.querySelector('.me-image-crop-wrapper');
    if (!wrapper) return;
    const parentRect = wrapper.getBoundingClientRect();

    if (isDragging) {
        let newLeft = Math.max(0, Math.min(startLeft + dx, parentRect.width - startWidth));
        let newTop = Math.max(0, Math.min(startTop + dy, parentRect.height - startHeight));
        cropFrame.style.left = `${newLeft}px`;
        cropFrame.style.top = `${newTop}px`;
    } else if (isResizing) {
        let newWidth = startWidth, newHeight = startHeight, newLeft = startLeft, newTop = startTop;

        if (resizeHandle.includes('right')) newWidth = Math.max(50, Math.min(startWidth + dx, parentRect.width - startLeft));
        if (resizeHandle.includes('bottom')) newHeight = Math.max(50, Math.min(startHeight + dy, parentRect.height - startTop));
        
        if (resizeHandle.includes('left')) {
            newWidth = Math.max(50, startWidth - dx);
            newLeft = Math.min(startLeft + startWidth - 50, Math.max(0, startLeft + dx));
        }
        if (resizeHandle.includes('top')) {
            newHeight = Math.max(50, startHeight - dy);
            newTop = Math.min(startTop + startHeight - 50, Math.max(0, startTop + dy));
        }

        if (currentAspectRatio) {
            if (resizeHandle.includes('left') || resizeHandle.includes('right')) {
                newHeight = newWidth / currentAspectRatio;
            } else {
                newWidth = newHeight * currentAspectRatio;
            }
        }

        if (newLeft + newWidth > parentRect.width) {
            newWidth = parentRect.width - newLeft;
            if(currentAspectRatio) newHeight = newWidth / currentAspectRatio;
        }
        if (newTop + newHeight > parentRect.height) {
            newHeight = parentRect.height - newTop;
            if(currentAspectRatio) newWidth = newHeight * currentAspectRatio;
        }

        cropFrame.style.width = `${newWidth}px`;
        cropFrame.style.height = `${newHeight}px`;
        cropFrame.style.left = `${newLeft}px`;
        cropFrame.style.top = `${newTop}px`;
    }
}

function onTouchMoveCropFrame(e) {
    if (!isDragging && !isResizing) return;
    if (e.touches.length > 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    const wrapper = previewContainer.querySelector('.me-image-crop-wrapper');
    if (!wrapper) return;
    const parentRect = wrapper.getBoundingClientRect();

    if (isDragging) {
        let newLeft = Math.max(0, Math.min(startLeft + dx, parentRect.width - startWidth));
        let newTop = Math.max(0, Math.min(startTop + dy, parentRect.height - startHeight));
        cropFrame.style.left = `${newLeft}px`;
        cropFrame.style.top = `${newTop}px`;
    } else if (isResizing) {
        let newWidth = startWidth, newHeight = startHeight, newLeft = startLeft, newTop = startTop;

        if (resizeHandle.includes('right')) newWidth = Math.max(50, Math.min(startWidth + dx, parentRect.width - startLeft));
        if (resizeHandle.includes('bottom')) newHeight = Math.max(50, Math.min(startHeight + dy, parentRect.height - startTop));
        
        if (resizeHandle.includes('left')) {
            newWidth = Math.max(50, startWidth - dx);
            newLeft = Math.min(startLeft + startWidth - 50, Math.max(0, startLeft + dx));
        }
        if (resizeHandle.includes('top')) {
            newHeight = Math.max(50, startHeight - dy);
            newTop = Math.min(startTop + startHeight - 50, Math.max(0, startTop + dy));
        }

        if (currentAspectRatio) {
            if (resizeHandle.includes('left') || resizeHandle.includes('right')) newHeight = newWidth / currentAspectRatio;
            else newWidth = newHeight * currentAspectRatio;
        }

        if (newLeft + newWidth > parentRect.width) {
            newWidth = parentRect.width - newLeft;
            if(currentAspectRatio) newHeight = newWidth / currentAspectRatio;
        }
        if (newTop + newHeight > parentRect.height) {
            newHeight = parentRect.height - newTop;
            if(currentAspectRatio) newWidth = newHeight * currentAspectRatio;
        }

        cropFrame.style.width = `${newWidth}px`;
        cropFrame.style.height = `${newHeight}px`;
        cropFrame.style.left = `${newLeft}px`;
        cropFrame.style.top = `${newTop}px`;
    }
}

function onMouseUp() {
    isDragging = false;
    isResizing = false;
    isPanning = false;
    previewImage.style.cursor = 'default';
}

function onPanStart(e) {
    if (imageScale <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    isPanning = true;
    panStartX = e.clientX - imagePosX;
    panStartY = e.clientY - imagePosY;
    previewImage.style.cursor = 'grabbing';
}

function onPanMove(e) {
    if (!isPanning) return;
    imagePosX = e.clientX - panStartX;
    imagePosY = e.clientY - panStartY;
    updateImageZoomAndPan(true);
}

function onTouchStart(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance = getPinchDistance(e.touches);
        lastScale = imageScale;
    } else if (e.touches.length === 1 && imageScale > 1) {
        e.preventDefault();
        isPanning = true;
        panStartX = e.touches[0].clientX - imagePosX;
        panStartY = e.touches[0].clientY - imagePosY;
    }
}

function onTouchMove(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const newPinchDistance = getPinchDistance(e.touches);
        const scaleRatio = newPinchDistance / initialPinchDistance;
        imageScale = Math.max(1, lastScale * scaleRatio);
        updateImageZoomAndPan(true);
    } else if (e.touches.length === 1 && isPanning) {
        e.preventDefault();
        imagePosX = e.touches[0].clientX - panStartX;
        imagePosY = e.touches[0].clientY - panStartY;
        updateImageZoomAndPan(true);
    }
}

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
    }

function updateImageZoomAndPan(constrain = false) {
    if (constrain && imageScale > 1) {
        const pannableContainer = previewContainer.querySelector('.me-preview-area');
        if (!pannableContainer) return;

        const scaledImageWidth = previewImage.naturalWidth * imageScale;
        const extraWidth = Math.max(0, (scaledImageWidth - pannableContainer.clientWidth) / 2) / imageScale;
        const extraHeight = Math.max(0, (previewImage.naturalHeight * imageScale - previewContainer.clientHeight) / 2) / imageScale;
        imagePosX = Math.max(-extraWidth, Math.min(extraWidth, imagePosX));
        imagePosY = Math.max(-extraHeight, Math.min(extraHeight, imagePosY));
    }

    const currentTransform = previewImage.style.transform.replace(/scale\([\d.]+\)/, '').replace(/translate\([^\)]+\)/, '').trim();
    previewImage.style.transform = `${currentTransform} scale(${imageScale}) translate(${imagePosX}px, ${imagePosY}px)`;
}

/**
 * Initializes the media editor by setting up DOM elements and event listeners.
 * This function should be called once when the application starts.
 */
export function initMediaEditor() {
    // Populate DOM element variables
    modal = document.getElementById('photo-editor-modal');
    previewContainer = document.getElementById('mediaEditorPreviewContainer');
    previewImage = document.getElementById('previewImage');
    cropFrame = document.getElementById('cropFrame');

    // Populate controls from the template
    const controlIds = ['zoomInBtn', 'zoomOutBtn', 'fullscreenBtn', 'rotateLeftBtn', 'rotateRightBtn', 'flipHorizontalBtn', 'flipVerticalBtn', 'circleCropBtn', 'closeBtn', 'saveBtn'];
    controlIds.forEach(id => {
        controls[id] = document.getElementById(id);
    });

    // --- Setup Event Listeners ---
    controls.circleCropBtn.addEventListener('click', () => {
        cropFrame.classList.toggle('circle');
        controls.circleCropBtn.classList.toggle('active');
        if (cropFrame.classList.contains('circle')) {
            const ratioContainer = modal.querySelector('.me-ratio-selector');
            if (ratioContainer) {
                ratioContainer.querySelectorAll('.me-ratio-btn').forEach(b => b.classList.remove('active'));
                const oneToOneBtn = ratioContainer.querySelector('.me-ratio-btn[data-ratio="1"]');
                if (oneToOneBtn) oneToOneBtn.classList.add('active');
            }
            currentAspectRatio = 1;
            updateCropFrameAspectRatio();
        }
    });

    controls.rotateLeftBtn.addEventListener('click', () => applyTransform('rotate', -90));
    controls.rotateRightBtn.addEventListener('click', () => applyTransform('rotate', 90));
    controls.flipHorizontalBtn.addEventListener('click', () => applyTransform('flip', 'horizontal'));
    controls.flipVerticalBtn.addEventListener('click', () => applyTransform('flip', 'vertical'));

    controls.zoomInBtn.addEventListener('click', () => {
        imageScale += 0.1;
        updateImageZoomAndPan();
    });
    controls.zoomOutBtn.addEventListener('click', () => {
        imageScale = Math.max(1, imageScale - 0.1);
        if (imageScale === 1) { imagePosX = 0; imagePosY = 0; }
        updateImageZoomAndPan();
    });

    controls.fullscreenBtn.addEventListener('click', () => {
        const editorCard = modal.querySelector('.photo-editor-card');
        if (!document.fullscreenElement) {
            if (editorCard) editorCard.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const icon = controls.fullscreenBtn.querySelector('i');
        const isFullscreen = !!document.fullscreenElement;
        icon.className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    });

    controls.closeBtn.addEventListener('click', closeModal);

    cropFrame.addEventListener('mousedown', onMouseDown);
    cropFrame.addEventListener('touchstart', onTouchStartCropFrame, { passive: false });
    previewImage.addEventListener('mousedown', onPanStart);
    previewContainer.addEventListener('touchstart', onTouchStart, { passive: false });
    previewContainer.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('mousemove', onPanMove);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMoveCropFrame, { passive: false });
    window.addEventListener('mouseup', onMouseUp); // FIX: Use window to catch mouseup even if it happens outside the document
    document.addEventListener('touchend', onMouseUp); // Also handle touch end

    // Make the main function globally available
    window.openPhotoEditor = openPhotoEditor;
    console.log("✅ Media Editor Initialized and ready.");
}