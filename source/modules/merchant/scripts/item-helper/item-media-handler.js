/**
 * Item Media Handler - Handles camera, gallery, and photo upload functionality
 */

export class ItemMediaHandler {
    constructor() {
        this.activePhotoSlot = null;
        this.currentStream = null;
        this.html5QrCode = null; // For barcode scanner
    }

    /**
     * Initialize photo upload functionality
     */
    static initializePhotoUpload() {
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

        const showMediaModal = (slot) => {
            activePhotoSlot = slot;
            if (!mediaUploadModal) return;

            mediaUploadModal.classList.add("active"); // Vital for desktop CSS visibility
            mediaUploadModal.style.display = "flex";
            requestAnimationFrame(() => {
                mediaUploadModal.style.opacity = "1";
                mediaUploadModal.style.visibility = "visible";
                const container = mediaUploadModal.querySelector(".mstore-selection-container");
                if (container) {
                    container.style.transform = "scale(1)";
                    container.style.opacity = "1"; // Ensure opacity is 1
                }
            });
        };

        const hideMediaModal = () => {
            if (!mediaUploadModal) return;

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
            if (customCameraModal) customCameraModal.style.display = "none";

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

        const applyPhoto = (src) => {
            if (!activePhotoSlot) return;
            activePhotoSlot.innerHTML = "";

            const img = document.createElement("img");
            img.src = src;
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
        };

        const openMediaEditor = (dataUrl) => {
            if (window.openPhotoEditor) {
                window.openPhotoEditor(dataUrl, {
                    title: "Edit Photo",
                    subtitle: "Crop and adjust your photo",
                    footer: "Save Photo",
                    aspectRatio: null, // Allow free form
                    compression: "100-500KB",
                    onSave: (editedImageData) => {
                        applyPhoto(editedImageData);
                    },
                    onCancel: () => {
                        // Optional: Handle cancel
                    }
                });
            } else {
                // Fallback if media editor not available
                applyPhoto(dataUrl);
            }
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
            console.log("DEBUG: handleMultipleFileSelect", e.target.id);
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                const photoGrid = document.querySelector(".mstore-photo-grid");
                if (!photoGrid) return;

                let slotIndex = 0;
                const photoSlots = Array.from(photoGrid.querySelectorAll(".mstore-photo-item"));

                files.forEach((file, index) => {
                    if (slotIndex >= photoSlots.length) {
                        console.warn("Maximum 5 images allowed");
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const slot = photoSlots[slotIndex];
                        if (slot) {
                            activePhotoSlot = slot;
                            openMediaEditor(event.target.result);
                            slotIndex++;
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
            e.target.value = "";
        };

        // Event Listeners
        if (photoGrid) {
            photoGrid.addEventListener("click", (e) => {
                const photoItem = e.target.closest(".mstore-photo-item");
                if (photoItem) {
                    showMediaModal(photoItem);
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