/**
 * Item Media Handler - Handles camera, gallery, and photo upload functionality
 */

import { uploadToCloudinary, getCloudinaryPath, deleteFromCloudinary, buildCloudinaryUrl } from '../../../../api/cloudinary.js';
import { localCache } from '../../../../utils/data-manager.js';

export class ItemMediaHandler {
    static instance = null;

    constructor() {
        this.activePhotoSlot = null;
        this.currentStream = null;
        this.html5QrCode = null; // For barcode scanner
        this.uploadedImages = {
            thumbnail: null, // { publicId, url, file }
            gallery: [] // Array of { publicId, url, file }
        };
        this.openModals = new Set(); // Track open modals
        this.setupMobileBackNavigation();
        ItemMediaHandler.instance = this;
    }

    /**
     * Setup mobile back navigation handling
     */
    setupMobileBackNavigation() {
        // Handle mobile back button to close modals instead of navigating away
        const handlePopState = (e) => {
            // Check if any modals are open
            if (ItemMediaHandler.instance.openModals.size > 0) {
                e.preventDefault();
                // Close the most recently opened modal
                const modalToClose = Array.from(ItemMediaHandler.instance.openModals).pop();
                if (modalToClose === 'mediaModal') {
                    ItemMediaHandler.instance.closeMediaModal();
                } else if (modalToClose === 'cameraModal') {
                    ItemMediaHandler.instance.closeCameraModal();
                } else if (modalToClose === 'photoActionModal') {
                    ItemMediaHandler.instance.closePhotoActionModal();
                }
                // Prevent the default back navigation
                window.history.pushState(null, '', window.location.href);
            }
        };

        window.addEventListener('popstate', handlePopState);
    }

    /**
     * Close media modal (called from mobile back navigation)
     */
    closeMediaModal() {
        const modal = document.getElementById("mediaUploadModal");
        if (modal) {
            // Restore background scrolling
            document.body.style.overflow = '';
            ItemMediaHandler.instance.openModals.delete('mediaModal');

            modal.classList.remove("active");
            modal.style.opacity = "0";
            const container = modal.querySelector(".mstore-selection-container");
            if (container) container.style.transform = "scale(0.95)";
            setTimeout(() => {
                modal.style.visibility = "hidden";
                modal.style.display = "none";
            }, 300);
        }
    }

    /**
     * Close camera modal (called from mobile back navigation)
     */
    closeCameraModal() {
        const modal = document.getElementById("customCameraModal");
        if (modal) {
            // Stop camera stream if active
            if (this.currentStream) {
                this.currentStream.getTracks().forEach((track) => track.stop());
                this.currentStream = null;
            }
            // Restore background scrolling
            document.body.style.overflow = '';
            ItemMediaHandler.instance.openModals.delete('cameraModal');

            modal.style.display = "none";
        }
    }

    /**
     * Close photo action modal (called from mobile back navigation)
     */
    closePhotoActionModal() {
        const modal = document.getElementById("photoActionModal");
        if (modal) {
            modal.classList.remove("active");
            // Restore background scrolling
            document.body.style.overflow = '';
            ItemMediaHandler.instance.openModals.delete('photoActionModal');
        }
    }

    /**
     * Get uploaded images data for form submission
     */
    static getUploadedImages() {
        return this.instance ? this.instance.uploadedImages : { thumbnail: null, gallery: [] };
    }

    /**
     * Clear all uploaded images
     */
    static clearUploadedImages() {
        if (this.instance) {
            this.instance.uploadedImages = { thumbnail: null, gallery: [] };
        }
    }

    /**
     * Initialize photo upload functionality
     */
    static initializePhotoUpload() {
        // Create instance if not exists
        if (!this.instance) {
            new ItemMediaHandler();
        }

        const photoGrid = document.querySelector(".mstore-photo-grid");
        const mediaUploadModal = document.getElementById("mediaUploadModal");
        const closeMediaUploadModal = document.getElementById("closeMediaUploadModal");

        const openCameraBtn = document.getElementById("openCameraBtn");
        const openGalleryBtn = document.getElementById("openGalleryBtn");
        const mediaInput = document.getElementById("mediaInput");
        const cameraInput = document.getElementById("cameraInput");

        // Custom Camera Elements
        const customCameraModal = document.getElementById("customCameraModal");
        const cameraFeed = document.getElementById("cameraFeed");
        const capturePhotoBtn = document.getElementById("capturePhotoBtn");
        const closeCameraModalBtn = document.getElementById("closeCameraModalBtn");
        const cameraCanvas = document.getElementById("cameraCanvas");

        let activePhotoSlot = null;
        let currentStream = null;
        let photoForAction = null; // For photo action modal

        const showMediaModal = (slot) => {
            console.log("showMediaModal called with slot:", slot);
            activePhotoSlot = slot;

            // Try to get the modal, either from cached reference or dynamic lookup
            let modal = mediaUploadModal || document.getElementById("mediaUploadModal");
            console.log("Using modal:", modal);

            if (!modal) {
                console.error("Media upload modal not found!");
                return;
            }

            console.log("Resetting media modal state...");
            // Reset modal state first to ensure clean state
            modal.classList.remove("active");
            modal.style.display = "none";
            modal.style.opacity = "0";
            modal.style.visibility = "hidden";

            // Force reflow
            modal.offsetHeight;

            console.log("Showing media modal...");
            // Prevent background scrolling and interaction
            document.body.style.overflow = 'hidden';
            ItemMediaHandler.instance.openModals.add('mediaModal');

            // Now show it
            modal.classList.add("active");
            modal.style.display = "flex";
            requestAnimationFrame(() => {
                modal.style.opacity = "1";
                modal.style.visibility = "visible";
                console.log("Media modal should now be visible");
            });
        };

        const hideMediaModal = () => {
            if (!mediaUploadModal) return;

            // Restore background scrolling
            document.body.style.overflow = '';
            ItemMediaHandler.instance.openModals.delete('mediaModal');

            mediaUploadModal.classList.remove("active");
            mediaUploadModal.style.opacity = "0";
            const container = mediaUploadModal.querySelector(".mstore-selection-container");
            if (container) container.style.transform = "scale(0.95)";
            setTimeout(() => {
                mediaUploadModal.style.visibility = "hidden";
                mediaUploadModal.style.display = "none";
            }, 300);
        };

        // --- Custom Camera Functions ---
        const openCameraStream = () => {
            console.log("DEBUG: openCameraStream called");
            if (!customCameraModal) {
                console.error("DEBUG: customCameraModal not found");
                return;
            }

            // Hide Selection Modal first
            mediaUploadModal.classList.remove("active"); // CSS class toggle
            mediaUploadModal.style.visibility = "hidden";
            mediaUploadModal.style.opacity = "0";
            mediaUploadModal.style.display = "none"; // Force hide

            // Show Camera Modal
            customCameraModal.classList.add("active"); // Add active class if any CSS depends on it
            customCameraModal.style.display = "block"; // Force block first
            customCameraModal.style.visibility = "visible";
            customCameraModal.style.opacity = "1";

            // Prevent background scrolling and interaction
            document.body.style.overflow = 'hidden';
            ItemMediaHandler.instance.openModals.add('cameraModal');

            // Ensure it's fixed and covers screen (inline styles usually handle this, but re-enforcing)
            customCameraModal.style.position = "fixed";
            customCameraModal.style.top = "0";
            customCameraModal.style.left = "0";
            customCameraModal.style.zIndex = "20000";

            // Constraints
            const constraints = {
                video: {
                    facingMode: { ideal: "environment" }, // Use ideal so it works on Laptop (Webcam) too
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            };

            console.log("DEBUG: Calling getUserMedia with constraints", constraints);
            navigator.mediaDevices
                .getUserMedia(constraints)
                .then((stream) => {
                    console.log("DEBUG: getUserMedia success, stream obtained");
                    currentStream = stream;
                    cameraFeed.srcObject = stream;

                    // Play video explicitly
                    cameraFeed.onloadedmetadata = () => {
                        cameraFeed
                            .play()
                            .catch((e) => console.error("DEBUG: Play failed", e));
                    };
                })
                .catch((err) => {
                    console.error("DEBUG: Camera access failed:", err);

                    // User Feedback
                    if (
                        err.name === "NotAllowedError" ||
                        err.name === "PermissionDeniedError"
                    ) {
                        alert(
                            "Camera permission was denied. Please allow camera access in your browser settings to use the in-app camera.\n\nOpening system file picker instead."
                        );
                    } else if (err.name === "NotFoundError") {
                        alert("No camera device found. Opening system file picker instead.");
                    } else {
                        alert(
                            "Camera error: " +
                            err.message +
                            "\nOpening system file picker instead."
                        );
                    }

                    // Fallback to native input if permission denied or error
                    stopCameraStream();
                    if (cameraInput) {
                        // Restore selection modal slightly so fallback doesn't feel jarring?
                        // Actually just Trigger Input.
                        cameraInput.click();
                    } else {
                        alert("Camera not accessible.");
                    }
                });
        };

        const stopCameraStream = () => {
            if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop());
                currentStream = null;
            }
            if (cameraFeed) cameraFeed.srcObject = null;
            if (customCameraModal) {
                customCameraModal.style.display = "none";
                // Restore background scrolling
                document.body.style.overflow = '';
                ItemMediaHandler.instance.openModals.delete('cameraModal');
            }

            // If we didn't capture, we should probably respawn the selection modal?
            // But for "Close" button, yes.
        };

        const capturePhoto = () => {
            console.log("DEBUG: capturePhoto called");
            if (!currentStream || !cameraFeed || !activePhotoSlot) {
                console.warn("DEBUG: capturePhoto failed preconditions", {
                    stream: !!currentStream,
                    feed: !!cameraFeed,
                    slot: !!activePhotoSlot,
                });
                return;
            }

            // Set canvas dimensions to match video
            // VideoWidth might be 0 if not ready, check readyState
            if (cameraFeed.readyState === cameraFeed.HAVE_ENOUGH_DATA) {
                cameraCanvas.width = cameraFeed.videoWidth;
                cameraCanvas.height = cameraFeed.videoHeight;

                const ctx = cameraCanvas.getContext("2d");
                ctx.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);

                // Convert to data URL
                const dataUrl = cameraCanvas.toDataURL("image/jpeg", 0.85);

                // Stop camera and open media editor
                stopCameraStream();
                openMediaEditor(dataUrl);
            } else {
                console.log("DEBUG: Camera feed not ready");
            }
        };

        const applyPhoto = async (src, isBlob = false) => {
            if (!activePhotoSlot) return;

            const instance = ItemMediaHandler.instance;
            if (!instance) return;

            // Show loading state
            activePhotoSlot.innerHTML = `
                <div class="mstore-photo-loading">
                    <div class="mstore-spinner"></div>
                    <span>Uploading...</span>
                </div>
            `;

            try {
                let fileToUpload;

                if (isBlob) {
                    // src is a blob URL, convert to file
                    const response = await fetch(src);
                    const blob = await response.blob();
                    fileToUpload = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                } else if (src instanceof File) {
                    fileToUpload = src;
                } else {
                    // src is a data URL, convert to blob then file
                    const response = await fetch(src);
                    const blob = await response.blob();
                    fileToUpload = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                }

                // Get merchant ID for Cloudinary path
                const merchantId = localCache.get('currentMerchantId');
                if (!merchantId) {
                    throw new Error('Merchant ID not found. Please ensure you are logged in as a merchant.');
                }

                // Determine if this is thumbnail or gallery
                const isPrimary = activePhotoSlot.classList.contains("primary");
                const imageType = isPrimary ? 'thumbnail' : 'gallery';

                // Generate Cloudinary path
                const folderPath = getCloudinaryPath('ITEM_IMAGES_FOLDER', {
                    merchantId: merchantId,
                    itemId: `temp-${Date.now()}` // Use a temporary unique identifier
                });

                // Upload to Cloudinary
                console.log(`Uploading ${imageType} image to Cloudinary...`);
                const uploadResult = await uploadToCloudinary(fileToUpload, {
                    folder: folderPath,
                    public_id: `${imageType}-${Date.now()}`, // Unique ID for this upload
                    overwrite: false
                }, 'image');

                if (!uploadResult || !uploadResult.public_id) {
                    throw new Error('Image upload failed');
                }

                // Store the uploaded image data
                const imageData = {
                    publicId: uploadResult.public_id,
                    url: buildCloudinaryUrl(uploadResult.public_id),
                    file: fileToUpload
                };

                // Initialize uploadedImages if not exists
                if (!instance.uploadedImages) {
                    instance.uploadedImages = { thumbnail: null, gallery: [] };
                }

                if (isPrimary) {
                    // Replace existing thumbnail
                    if (instance.uploadedImages.thumbnail) {
                        // Delete old thumbnail from Cloudinary (don't await to avoid blocking)
                        deleteFromCloudinary(instance.uploadedImages.thumbnail.publicId).catch(console.error);
                    }
                    instance.uploadedImages.thumbnail = imageData;
                } else {
                    // Add to gallery (limit to 4 images)
                    if (instance.uploadedImages.gallery.length >= 4) {
                        // Remove oldest gallery image
                        const oldestImage = instance.uploadedImages.gallery.shift();
                        if (oldestImage) {
                            // Delete old image from Cloudinary (don't await to avoid blocking)
                            deleteFromCloudinary(oldestImage.publicId).catch(console.error);
                        }
                    }
                    instance.uploadedImages.gallery.push(imageData);
                }

                // Update UI with uploaded image
                activePhotoSlot.innerHTML = "";

                const img = document.createElement("img");
                img.src = imageData.url; // Use Cloudinary URL
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                img.style.borderRadius = "6px";
                activePhotoSlot.appendChild(img);

                activePhotoSlot.setAttribute("draggable", "true");
                activePhotoSlot.style.borderStyle = "solid";
                activePhotoSlot.style.border = "none";

                if (activePhotoSlot.classList.contains("primary")) {
                    activePhotoSlot.style.border = "2px solid #3b82f6";
                }

                console.log(`✅ ${imageType} image uploaded successfully:`, uploadResult.public_id);

            } catch (error) {
                console.error('❌ Image upload failed:', error);

                // Show error state
                activePhotoSlot.innerHTML = `
                    <div class="mstore-photo-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Upload failed</span>
                    </div>
                `;

                // Reset after 3 seconds
                setTimeout(() => {
                    const isPrimary = activePhotoSlot.classList.contains("primary");
                    activePhotoSlot.innerHTML = `
                        <div class="mstore-photo-icon"><i class="fas fa-${isPrimary ? 'camera' : 'plus'}"></i></div>
                        <div class="mstore-photo-label">${isPrimary ? 'Thumbnail' : 'Add Photo'}</div>
                    `;
                }, 3000);
            }
        };

        const removePhoto = (photoSlot) => {
            // Clear the photo and restore the empty state
            const isPrimary = photoSlot.classList.contains("primary");
            photoSlot.innerHTML = `
                <div class="mstore-photo-icon"><i class="fas fa-${isPrimary ? 'camera' : 'plus'}"></i></div>
                <div class="mstore-photo-label">${isPrimary ? 'Thumbnail' : 'Add Photo'}</div>
            `;

            // Reset all styles to match empty state
            photoSlot.style.border = "";
            photoSlot.style.borderStyle = "";
            photoSlot.style.background = "";
            photoSlot.removeAttribute("draggable");
            photoSlot.removeAttribute("style"); // Remove all inline styles
        };

        // Photo action modal functions
        const showPhotoActionModal = (photoSlot) => {
            photoForAction = photoSlot;

            // Check if modal already exists
            let modal = document.getElementById("photoActionModal");
            if (!modal) {
                // Create modal dynamically
                modal = document.createElement("div");
                modal.id = "photoActionModal";
                modal.className = "mstore-photo-action-modal";
                modal.innerHTML = `
                    <div class="mstore-photo-action-container">
                        <div class="mstore-photo-action-header">
                            <button id="closePhotoActionModal" class="mstore-photo-action-close-btn">
                                <i class="fas fa-times"></i>
                            </button>
                            <h3 class="mstore-photo-action-title">Photo Options</h3>
                            <p class="mstore-photo-action-subtitle">Choose what you want to do with this photo</p>
                        </div>

                        <div class="mstore-photo-action-buttons">
                            <button class="mstore-action-btn primary" id="replacePhotoBtn">
                                <i class="fas fa-camera"></i>
                                Replace Photo
                            </button>
                            <button class="mstore-action-btn mstore-photo-delete-btn" id="deletePhotoBtn">
                                <i class="fas fa-trash"></i>
                                Delete Photo
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                // Add click handler to close modal when clicking background
                modal.addEventListener("click", (e) => {
                    if (e.target === modal) {
                        hidePhotoActionModal();
                    }
                });
            }

            // Always re-attach event listeners to ensure they have current photoForAction
            const replaceBtn = modal.querySelector("#replacePhotoBtn");
            const deleteBtn = modal.querySelector("#deletePhotoBtn");
            const closeBtn = modal.querySelector("#closePhotoActionModal");

            console.log("Setting up button events for:", photoForAction);

            // Clone buttons to remove existing event listeners and add fresh ones
            if (replaceBtn) {
                const newReplaceBtn = replaceBtn.cloneNode(true);
                replaceBtn.parentNode.replaceChild(newReplaceBtn, replaceBtn);

                const handleReplace = (e) => {
                    console.log("Replace button activated");
                    e.preventDefault();
                    e.stopPropagation();

                    // Capture photoForAction before hiding modal (it gets reset to null)
                    const currentPhotoSlot = photoForAction;
                    console.log("Captured photoForAction:", currentPhotoSlot);

                    hidePhotoActionModal();

                    if (currentPhotoSlot) {
                        console.log("Scheduling media modal show");
                        // Delay to ensure action modal is fully hidden
                        setTimeout(() => {
                            showMediaModal(currentPhotoSlot);
                        }, 300);
                    } else {
                        console.log("No photoForAction available");
                    }
                };

                newReplaceBtn.addEventListener("click", handleReplace);
                newReplaceBtn.addEventListener("touchend", handleReplace);
                console.log("Replace button events attached");
            } else {
                console.log("Replace button not found");
            }

            if (deleteBtn) {
                const newDeleteBtn = deleteBtn.cloneNode(true);
                deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

                const handleDelete = (e) => {
                    console.log("Delete button activated");
                    e.preventDefault();
                    e.stopPropagation();

                    // Capture photoForAction before hiding modal
                    const currentPhotoSlot = photoForAction;
                    console.log("Captured photoForAction for delete:", currentPhotoSlot);

                    if (currentPhotoSlot) {
                        removePhoto(currentPhotoSlot);
                    }
                    hidePhotoActionModal();
                };

                newDeleteBtn.addEventListener("click", handleDelete);
                newDeleteBtn.addEventListener("touchend", handleDelete);
                console.log("Delete button events attached");
            } else {
                console.log("Delete button not found");
            }

            if (closeBtn) {
                const handleClose = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    hidePhotoActionModal();
                };

                closeBtn.addEventListener("click", handleClose);
                closeBtn.addEventListener("touchend", handleClose);
                console.log("Close button events attached");
            } else {
                console.log("Close button not found");
            }

            modal.classList.add("active");
            // Prevent background scrolling and track modal state
            document.body.style.overflow = 'hidden';
            ItemMediaHandler.instance.openModals.add('photoActionModal');
        };

        const hidePhotoActionModal = () => {
            const modal = document.getElementById("photoActionModal");
            if (modal) {
                modal.classList.remove("active");
                // Restore background scrolling and remove from tracking
                document.body.style.overflow = '';
                ItemMediaHandler.instance.openModals.delete('photoActionModal');
            }
            photoForAction = null;
        };


        const openMediaEditor = (imageSrc) => {
            if (!window.openPhotoEditor) {
                console.error('Media editor not loaded yet');
                // Fallback: apply directly without editing
                applyPhoto(imageSrc);
                hideMediaModal();
                return;
            }

            // Hide the camera/gallery selection modal
            hideMediaModal();

            window.openPhotoEditor(imageSrc, {
                title: 'Edit Product Photo',
                subtitle: 'Crop and adjust your image',
                aspectRatios: [
                    { label: '1:1', value: 1 },
                    { label: '4:3', value: 4 / 3 },
                    { label: '16:9', value: 16 / 9 },
                    { label: 'Free', value: null }
                ],
                initialAspectRatio: 1,
                controls: [
                    { ratios: true },
                    { zoom: true, rotate: true, flip: true },
                    { fit: true, reset: true, final: true }
                ],
                compression: {
                    targetSizeKB: 150,
                    minQuality: 0.7,
                    format: 'image/jpeg'
                },
                onSave: (blob) => {
                    // Convert blob to data URL and apply to photo slot
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        applyPhoto(e.target.result);
                    };
                    reader.readAsDataURL(blob);
                }
            });
        };

        const handleFileSelect = (e) => {
            console.log("DEBUG: handleFileSelect", e.target.id);
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log("DEBUG: File selected:", file.name, "Size:", file.size);

                // Check file size (limit to 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    alert("File size too large. Please select a file smaller than 10MB.");
                    e.target.value = "";
                    return;
                }

                // Check file type
                if (!file.type.startsWith('image/')) {
                    alert("Please select a valid image file.");
                    e.target.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    openMediaEditor(e.target.result);
                };
                reader.readAsDataURL(file);
            }
            e.target.value = "";
        };

        const handleMultipleFileSelect = (e) => {
            console.log("DEBUG: handleMultipleFileSelect", e.target.id, "activePhotoSlot:", activePhotoSlot);
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                const photoGrid = document.querySelector(".mstore-photo-grid");
                if (!photoGrid) return;

                // If replacing a specific photo (activePhotoSlot is set and only one file)
                if (activePhotoSlot && files.length === 1) {
                    console.log("Replacing photo in specific slot:", activePhotoSlot);
                    const file = files[0];

                    // Check file size (limit to 10MB)
                    if (file.size > 10 * 1024 * 1024) {
                        alert("File size too large. Please select a file smaller than 10MB.");
                        e.target.value = "";
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        // Open media editor instead of directly applying
                        openMediaEditor(event.target.result);
                    };
                    reader.readAsDataURL(file);
                } else {
                    // Multiple files or no specific slot - use empty slots
                    const photoSlots = Array.from(photoGrid.querySelectorAll(".mstore-photo-item"));
                    let fileIndex = 0;

                    // Find available slots (empty ones)
                    const availableSlots = photoSlots.filter(slot => !slot.querySelector("img"));

                    if (availableSlots.length === 0) {
                        alert("All photo slots are filled. Remove an existing photo to add a new one.");
                        return;
                    }

                    files.forEach((file) => {
                        if (fileIndex >= availableSlots.length) {
                            console.warn("No more available slots for additional images");
                            return;
                        }

                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const slot = availableSlots[fileIndex];
                            if (slot) {
                                activePhotoSlot = slot;
                                openMediaEditor(event.target.result);
                                fileIndex++;
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                }
            }
            e.target.value = "";
        };

        // Event Listeners - Use event delegation for robustness
        if (photoGrid) {
            // Use event delegation to handle clicks on photo items (works even when items are recreated)
            photoGrid.addEventListener("click", (e) => {
                const photoItem = e.target.closest(".mstore-photo-item");
                if (!photoItem) return;

                console.log("Photo item clicked, has image:", !!photoItem.querySelector("img"));
                e.stopPropagation(); // Prevent event bubbling issues

                const photoSlots = Array.from(photoGrid.querySelectorAll(".mstore-photo-item"));
                const hasEmptySlots = photoSlots.some(slot => !slot.querySelector("img"));
                console.log("Has empty slots:", hasEmptySlots);

                if (hasEmptySlots) {
                    // If there are empty slots available
                    if (!photoItem.querySelector("img")) {
                        // Clicked slot is empty, use it
                        console.log("Showing media modal for empty slot");
                        showMediaModal(photoItem);
                    } else {
                        // Clicked slot has image, show action modal
                        console.log("Showing action modal for filled slot");
                        showPhotoActionModal(photoItem);
                    }
                } else {
                    // All slots are filled - show action modal for the clicked slot
                    if (photoItem.querySelector("img")) {
                        console.log("All filled, showing action modal");
                        showPhotoActionModal(photoItem);
                    } else {
                        // This shouldn't happen if hasEmptySlots is false, but just in case
                        alert("Maximum 5 photos allowed. Remove an existing photo to add a new one.");
                    }
                }
            });
        }

        if (closeMediaUploadModal) closeMediaUploadModal.addEventListener("click", hideMediaModal);

        if (mediaUploadModal) {
            mediaUploadModal.addEventListener("click", (e) => {
                if (e.target.id === "mediaUploadModal") hideMediaModal();
            });
        }

        if (openCameraBtn) openCameraBtn.addEventListener("click", openCameraStream);
        if (openGalleryBtn) openGalleryBtn.addEventListener("click", () => mediaInput?.click());
        if (capturePhotoBtn) capturePhotoBtn.addEventListener("click", capturePhoto);
        if (closeCameraModalBtn) closeCameraModalBtn.addEventListener("click", stopCameraStream);

        if (mediaInput) mediaInput.addEventListener("change", handleMultipleFileSelect);
        if (cameraInput) cameraInput.addEventListener("change", handleFileSelect);
    }
}