/**
 * Add Item Module - Production Version
 * Manages item creation form with full functionality
 */

// Module state
let initialized = false;
const cleanupFunctions = [];
let allUnitsGlobal = [];
const allCategoriesGlobal = [
    { code: "electronics", displayName: "Electronics", type: "Standard" },
    { code: "clothing", displayName: "Clothing", type: "Standard" },
    { code: "food", displayName: "Food & Beverages", type: "Standard" },
    { code: "furniture", displayName: "Furniture", type: "Standard" },
];
const allBrandsGlobal = [
    { code: "local", displayName: "Local", type: "Common" },
    { code: "brand1", displayName: "Brand A", type: "Premium" },
    { code: "brand2", displayName: "Brand B", type: "Premium" },
];

/**
 * Initialize the module
 */
/**
 * Load units from JSON file
 */
function loadUnits() {
    console.log("Fetching units from ../localstore/jsons/units.json...");
    fetch("../localstore/jsons/units.json")
        .then((response) => response.json())
        .then((data) => {
            populateUnitsGlobal(data);
        })
        .catch((error) => {
            console.error("Error loading units:", error);
            // Don't alert, just log the error
        });
}

/**
 * Populate global units array
 */
function populateUnitsGlobal(data) {
    allUnitsGlobal = [];
    data.forEach((group) => {
        group.subunits.forEach((unit) => {
            allUnitsGlobal.push({
                ...unit,
                type: group.meta.type,
                displayName: unit.title || unit.code,
            });
        });
    });
}

export function init(force = false) {
    if (initialized && !force) {
        console.log('✅ Add Item already initialized');
        return;
    }

    console.log('🚀 Initializing Add Item module...');

    initializeAllComponents();
    loadUnits();

    initialized = true;
    console.log('✅ Add Item module initialized');
}

/**
 * Cleanup function
 */
export function cleanup() {
    console.log('🧹 Cleaning up Add Item module...');
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.length = 0;
    initialized = false;
    console.log('✅ Add Item cleaned up');
}

/**
 * Add event listener with cleanup tracking
 */
function addTrackedListener(element, event, handler, options) {
    if (!element) return;
    element.addEventListener(event, handler, options);
    cleanupFunctions.push(() => element.removeEventListener(event, handler, options));
}

/**
 * Initialize all components
 */
function initializeAllComponents() {
    // Product/Service Toggle
    const productToggle = document.getElementById("productToggle");
    const serviceToggle = document.getElementById("serviceToggle");
    const toggleGroup = document.getElementById("toggleGroup");

    productToggle.addEventListener("click", () => {
        productToggle.classList.add("active");
        serviceToggle.classList.remove("active");
        toggleGroup.classList.remove("service-mode");
        updateItemStatusUI();
    });

    serviceToggle.addEventListener("click", () => {
        serviceToggle.classList.add("active");
        productToggle.classList.remove("active");
        toggleGroup.classList.add("service-mode");
        updateItemStatusUI();
    });

    // Item Status Toggle Logic
    const itemStatusToggle = document.getElementById("itemStatusToggle");
    const itemStatusLabel = document.getElementById("itemStatusLabel");

    function updateItemStatusUI() {
        const isService = serviceToggle.classList.contains("active");
        const isChecked = itemStatusToggle.checked;

        if (isService) {
            itemStatusLabel.textContent = isChecked ? "Available" : "Unavailable";
            itemStatusLabel.style.color = isChecked ? "#10b981" : "#ef4444"; // Green / Red
        } else {
            itemStatusLabel.textContent = isChecked ? "In Stock" : "Out of Stock";
            itemStatusLabel.style.color = isChecked ? "#10b981" : "#ef4444"; // Green / Red
        }
    }

    itemStatusToggle.addEventListener("change", updateItemStatusUI);

    // Initialize Status UI
    updateItemStatusUI();

    // Secondary Unit Toggle
    const secondaryUnitToggle = document.getElementById("secondaryUnitToggle");
    const secondaryUnitSection = document.getElementById("secondaryUnitSection");

    secondaryUnitToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            secondaryUnitSection.classList.add("active");
        } else {
            secondaryUnitSection.classList.remove("active");
        }
    });

    // Wholesale Price Toggle
    const wholesalePriceToggle = document.getElementById("wholesalePriceToggle");
    const wholesalePriceSection = document.getElementById("wholesalePriceSection");

    wholesalePriceToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            wholesalePriceSection.classList.add("active");
        } else {
            wholesalePriceSection.classList.remove("active");
        }
    });

    // Tab Switching for Pricing, Stock, and More Details
    const tabs = document.querySelectorAll(".mstore-tab");
    const pricingContent = document.getElementById("pricingTabContent");
    const stockContent = document.getElementById("stockTabContent");
    const moreContent = document.getElementById("moreTabContent");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            // Remove active class from all tabs
            tabs.forEach((t) => t.classList.remove("active"));
            // Add active class to clicked tab
            tab.classList.add("active");

            // Hide all tab contents
            pricingContent.classList.remove("active");
            stockContent.classList.remove("active");
            moreContent.classList.remove("active");

            // Show target content
            const tabName = tab.getAttribute("data-tab");
            if (tabName === "pricing") {
                pricingContent.classList.add("active");
            } else if (tabName === "stock") {
                stockContent.classList.add("active");
            } else if (tabName === "more") {
                moreContent.classList.add("active");
            }
        });
    });

    // Brand Toggle Logic
    const brandToggle = document.getElementById("brandToggle");
    const brandSection = document.getElementById("brandSection");

    brandToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            brandSection.classList.add("active");
        } else {
            brandSection.classList.remove("active");
        }
    });

    // Detailed Tracking Toggle
    const detailedTrackingToggle = document.getElementById(
        "detailedTrackingToggle"
    );
    const detailedTrackingSection = document.getElementById(
        "detailedTrackingSection"
    );

    detailedTrackingToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            detailedTrackingSection.classList.add("active");
        } else {
            detailedTrackingSection.classList.remove("active");
        }
    });

    // Initialize As of Date with today's date
    const asOfDateInput = document.getElementById("asOfDateInput");
    const today = new Date().toISOString().split("T")[0];
    asOfDateInput.value = today;

    // Dynamic Attributes Logic
    const attributesContainer = document.getElementById("attributesContainer");
    const addAttributeBtn = document.getElementById("addAttributeBtn");

    addAttributeBtn.addEventListener("click", () => {
        const lastAttributeRow = attributesContainer.querySelector(
            ".attribute-row:last-child"
        );
        if (lastAttributeRow) {
            const inputs = lastAttributeRow.querySelectorAll("input");
            const nameInput = inputs[0];
            const valueInput = inputs[1];

            if (nameInput.value.trim() === "" || valueInput.value.trim() === "") {
                // Optional: Shake animation or border color to indicate fields are required
                lastAttributeRow.style.animation = "shake 0.5s";
                setTimeout(() => (lastAttributeRow.style.animation = ""), 500);
                return; // Don't add a new row if the last one is empty
            }
        }

        const newRow = document.createElement("div");
        newRow.className = "mstore-row attribute-row";
        newRow.style.marginBottom = "10px";
        newRow.style.alignItems = "center";
        newRow.style.gap = "8px";
        newRow.style.gridTemplateColumns = "1fr 1fr auto";

        newRow.innerHTML = `
                <div class="mstore-input-wrapper" style="margin-top: 0;">
                    <input type="text" class="mstore-input" placeholder="Name">
                </div>
                <div class="mstore-input-wrapper" style="margin-top: 0;">
                    <input type="text" class="mstore-input" placeholder="Value">
                </div>
                <button type="button" class="delete-attr-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
                    <i class="fas fa-trash"></i>
                </button>
            `;

        attributesContainer.appendChild(newRow);
    });

    attributesContainer.addEventListener("click", (e) => {
        if (e.target.closest(".delete-attr-btn")) {
            e.target.closest(".attribute-row").remove();
        }
    });

    // Assign Code Functionality
    const assignCodeBtn = document.getElementById("assignCodeBtn");
    const itemCodeInput = document.getElementById("itemCodeInput");

    assignCodeBtn.addEventListener("click", () => {
        // Generate unique code: PREFIX + TIMESTAMP + RANDOM
        const prefix = "ITM";
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits
        const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
        const generatedCode = `${prefix}-${timestamp}-${random}`;

        // Set the generated code to input
        itemCodeInput.value = generatedCode;

        // Optional: Add a brief highlight effect
        itemCodeInput.style.background = "#dbeafe";
        setTimeout(() => {
            itemCodeInput.style.background = "";
        }, 500);
    });

    // Private Note Toggle
    const privateNoteToggle = document.getElementById("privateNoteToggle");
    const privateNoteSection = document.getElementById("privateNoteSection");

    privateNoteToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            privateNoteSection.classList.add("active");
        } else {
            privateNoteSection.classList.remove("active");
        }
    });

    // MRP Toggle Logic
    const mrpToggle = document.getElementById("mrpToggle");
    const mrpSection = document.getElementById("mrpSection");

    mrpToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            mrpSection.classList.add("active");
        } else {
            mrpSection.classList.remove("active");
        }
    });

    // --- Barcode Scanner Logic ---
    const scanCodeBtn = document.getElementById("scanCodeBtn");
    const scannerModal = document.getElementById("scannerModal");
    const closeScannerBtn = document.getElementById("closeScannerBtn");
    let html5QrCode;

    scanCodeBtn.addEventListener("click", () => {
        // Show Modal
        scannerModal.style.display = "flex";

        // Initialize Scanner
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        // Start Camera
        html5QrCode
            .start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    // Success
                    itemCodeInput.value = decodedText;

                    // Feedback
                    itemCodeInput.style.background = "#d1fae5"; // Light green
                    setTimeout(() => (itemCodeInput.style.background = ""), 500);

                    // Stop and Close
                    stopScanner();
                },
                (errorMessage) => {
                    // Parse error, ignore common read errors
                }
            )
            .catch((err) => {
                console.error("Error starting scanner", err);
                alert(
                    "Could not start camera. Please ensure camera permissions are allowed."
                );
                scannerModal.style.display = "none";
            });
    });

    closeScannerBtn.addEventListener("click", () => {
        stopScanner();
    });

    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode
                .stop()
                .then(() => {
                    scannerModal.style.display = "none";
                })
                .catch((err) => {
                    console.error("Failed to stop scanner", err);
                    scannerModal.style.display = "none";
                });
        } else {
            scannerModal.style.display = "none";
        }
    }

    // --- Stock Logic Integration ---
    const stockTrackingToggle = document.getElementById("stockTrackingToggle");
    const stockDetailsSection = document.getElementById("stockDetailsSection");
    const openingStockInput = document.querySelector(
        '#stockDetailsSection input[placeholder="Enter count"]'
    );
    let openingStockEl = openingStockInput; // Use the more specific selector

    function handleStockTrackingToggle() {
        if (stockTrackingToggle.checked) {
            stockDetailsSection.classList.add("active");
        } else {
            stockDetailsSection.classList.remove("active");
        }
    }

    function syncStockStatus() {
        // Only sync if Stock Tracking is ON and NOT in Service mode
        if (
            stockTrackingToggle.checked &&
            !serviceToggle.classList.contains("active") &&
            openingStockEl
        ) {
            const qty = parseInt(openingStockEl.value) || 0;
            if (qty > 0) {
                itemStatusToggle.checked = true;
            } else {
                itemStatusToggle.checked = false;
            }
            updateItemStatusUI();
        }
    }

    // Listen for Tracking Toggle Change
    stockTrackingToggle.addEventListener("change", () => {
        handleStockTrackingToggle();
        syncStockStatus();
    });

    // Initialize on page load
    handleStockTrackingToggle();

    // Listen for Quantity Change
    if (openingStockEl) {
        openingStockEl.addEventListener("input", syncStockStatus);
    }

    // Hook into Service/Product toggle to reset/re-evaluate
    // (Existing listener at line 1172/1179 handles UI text, but we might want to re-trigger sync)

    // Add ID to Opening Stock Input for future safety in the DOM
    if (openingStockEl) openingStockEl.id = "openingStockInput";

    // Elements
    const primaryUnitInput = document.getElementById("primaryUnit");
    const primaryUnitDisplay = document.getElementById("primaryUnitInputDisplay");
    const primaryUnitIcon = document.getElementById("primaryUnitIcon");
    const primaryUnitDropdown = document.getElementById("primaryUnitDropdown");

    const secondaryUnitInput = document.getElementById("secondaryUnit");
    const secondaryUnitDisplay = document.getElementById(
        "secondaryUnitInputDisplay"
    );
    const secondaryUnitIcon = document.getElementById("secondaryUnitIcon");
    const secondaryUnitDropdown = document.getElementById("secondaryUnitDropdown");

    const conversionInput = document.getElementById("conversionInput");

    // Modal Elements
    const selectionModal = document.getElementById("selectionModal");
    const modalSearch = document.getElementById("modalSearch");
    const modalList = document.getElementById("modalList");
    const modalClose = document.getElementById("modalClose");

    // Modal State
    let currentCallback = null;
    let currentOptions = [];

    // --- Hybrid Combobox Logic ---

    function setupCombobox(
        inputEl,
        iconEl,
        dropdownEl,
        hiddenInputEl,
        onSelectCallback,
        config = {}
    ) {
        const title = config.title || "Select Option";
        const enableCreate = config.enableCreate || false;
        const multiSelect = config.multiSelect || false;

        // 1. Icon Click -> Open Full Modal

        iconEl.addEventListener("click", (e) => {
            e.stopPropagation();
            // Determine options source based on Config or default to Units
            const sourceData = config.data || allUnitsGlobal;

            // Get currently selected codes from hidden input
            const currentVal = hiddenInputEl.value || "";
            const initialSelection = currentVal ? currentVal.split(",") : [];

            openSelectionModal(
                sourceData,
                (selected) => {
                    selectUnit(selected, inputEl, hiddenInputEl, onSelectCallback);
                },
                title,
                enableCreate,
                multiSelect,
                initialSelection
            );
        });

        // Make Input Click also open the modal
        inputEl.addEventListener("click", (e) => {
            e.preventDefault();
            inputEl.blur();
            const sourceData = config.data || allUnitsGlobal;

            const currentVal = hiddenInputEl.value || "";
            const initialSelection = currentVal ? currentVal.split(",") : [];

            openSelectionModal(
                sourceData,
                (selected) => {
                    selectUnit(selected, inputEl, hiddenInputEl, onSelectCallback);
                },
                title,
                enableCreate,
                multiSelect,
                initialSelection
            );
        });

        // 2. Input Typing -> Filter Mini Dropdown
        inputEl.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const sourceData = config.data || allUnitsGlobal;

            if (!term) {
                dropdownEl.classList.remove("active");
                return;
            }

            const filtered = sourceData.filter((opt) => {
                const label = (opt.displayName || opt.label || opt.value).toLowerCase();
                const code = (opt.code || "").toLowerCase();
                return label.includes(term) || code.includes(term);
            });

            renderMiniDropdown(filtered, dropdownEl, (selected) => {
                selectUnit(selected, inputEl, hiddenInputEl, onSelectCallback);
                dropdownEl.classList.remove("active");
            });

            if (filtered.length > 0) {
                dropdownEl.classList.add("active");
            } else {
                dropdownEl.classList.remove("active");
            }
        });

        // 3. Blur -> Hide Mini Dropdown (Delayed to allow click)
        inputEl.addEventListener("blur", () => {
            setTimeout(() => {
                dropdownEl.classList.remove("active");
            }, 200);
        });
    }

    // --- Photo Upload Logic (Moved from inside setupCombobox) ---
    (function initPhotoUpload() {
        const photoGrid = document.querySelector(".mstore-photo-grid");
        const mediaUploadModal = document.getElementById("mediaUploadModal");
        const closeMediaUploadModal = document.getElementById(
            "closeMediaUploadModal"
        );

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

        function showMediaModal(slot) {
            activePhotoSlot = slot;
            if (!mediaUploadModal) return;

            mediaUploadModal.classList.add("active"); // Vital for desktop CSS visibility
            mediaUploadModal.style.display = "flex";
            requestAnimationFrame(() => {
                mediaUploadModal.style.opacity = "1";
                mediaUploadModal.style.visibility = "visible";
                const container = mediaUploadModal.querySelector(
                    ".mstore-selection-container"
                );
                if (container) {
                    container.style.transform = "scale(1)";
                    container.style.opacity = "1"; // Ensure opacity is 1
                }
            });
        }

        function hideMediaModal() {
            if (!mediaUploadModal) return;

            mediaUploadModal.classList.remove("active");
            mediaUploadModal.style.opacity = "0";
            const container = mediaUploadModal.querySelector(
                ".mstore-selection-container"
            );
            if (container) container.style.transform = "scale(0.95)";
            setTimeout(() => {
                mediaUploadModal.style.visibility = "hidden";
                mediaUploadModal.style.display = "none";
            }, 300);
        }

        // --- Custom Camera Functions ---
        function openCameraStream() {
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
        }

        function stopCameraStream() {
            if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop());
                currentStream = null;
            }
            if (cameraFeed) cameraFeed.srcObject = null;
            if (customCameraModal) customCameraModal.style.display = "none";

            // If we didn't capture, we should probably respawn the selection modal?
            // But for "Close" button, yes.
        }

        function capturePhoto() {
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
        }

        function applyPhoto(src) {
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
        }

        // Listeners
        if (photoGrid) {
            photoGrid.addEventListener("click", (e) => {
                const photoItem = e.target.closest(".mstore-photo-item");
                if (photoItem) {
                    showMediaModal(photoItem);
                }
            });
        }

        if (closeMediaUploadModal)
            closeMediaUploadModal.addEventListener("click", hideMediaModal);

        if (mediaUploadModal) {
            mediaUploadModal.addEventListener("click", (e) => {
                if (e.target.id === "mediaUploadModal") hideMediaModal();
            });
        }

        if (openGalleryBtn && mediaInput) {
            openGalleryBtn.addEventListener("click", () => {
                mediaInput.click();
            });
        }

        if (openCameraBtn) {
            openCameraBtn.addEventListener("click", () => {
                console.log("DEBUG: Camera button clicked");
                // Start Camera Flow
                // Check if Secure Context or Localhost
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    console.log("DEBUG: Calling openCameraStream");
                    openCameraStream();
                } else {
                    console.warn(
                        "DEBUG: navigator.mediaDevices not supported, fallback to input"
                    );
                    // Fallback
                    if (cameraInput) cameraInput.click();
                }
            });
        }

        // Custom Camera Controls
        if (closeCameraModalBtn) {
            closeCameraModalBtn.addEventListener("click", () => {
                stopCameraStream();
                // Re-show selection modal? Or just close?
                // User probably wants to go back to selection if they cancelled camera
                // But for simplicity, let's just close camera.
                // If we want to reshow:
                // mediaUploadModal.style.opacity = '1';
            });
        }

        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener("click", capturePhoto);
        }

        function handleFileSelect(e) {
            console.log("DEBUG: handleFileSelect", e.target.id);
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log("DEBUG: File selected", file.name);
                if (file && activePhotoSlot) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        // Open media editor instead of directly applying
                        openMediaEditor(event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            }
            e.target.value = "";
        }

        // Open media editor with product-specific configuration
        function openMediaEditor(imageSrc) {
            if (!window.openPhotoEditor) {
                console.error("Media editor not loaded yet");
                // Fallback: apply directly without editing
                applyPhoto(imageSrc);
                hideMediaModal();
                return;
            }

            // Hide the camera/gallery selection modal
            hideMediaModal();

            window.openPhotoEditor(imageSrc, {
                title: "Edit Product Photo",
                subtitle: "Crop and adjust your image",
                aspectRatios: [
                    { label: "1:1", value: 1 },
                    { label: "4:3", value: 4 / 3 },
                    { label: "16:9", value: 16 / 9 },
                    { label: "Free", value: null },
                ],
                initialAspectRatio: 1,
                controls: [
                    { ratios: true },
                    { zoom: true, rotate: true, flip: true },
                    { fit: true, reset: true, final: true },
                ],
                compression: {
                    targetSizeKB: 150,
                    minQuality: 0.7,
                    format: "image/jpeg",
                },
                onSave: (blob) => {
                    // Convert blob to data URL and apply to photo slot
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        applyPhoto(e.target.result);
                    };
                    reader.readAsDataURL(blob);
                },
            });
        }

        if (mediaInput) mediaInput.addEventListener("change", handleFileSelect);
        if (cameraInput) cameraInput.addEventListener("change", handleFileSelect);
    })();

    // Category & Brand data already defined at module top

    // --- Init Elements for Category & Brand ---

    // --- Init Elements for Category & Brand ---
    const categoryInput = document.getElementById("itemCategory");
    const categoryDisplay = document.getElementById("categoryInputDisplay");
    const categoryIcon = document.getElementById("categoryIcon");
    const categoryDropdown = document.getElementById("categoryDropdown");

    const brandInput = document.getElementById("itemBrand");
    const brandDisplay = document.getElementById("brandInputDisplay");
    const brandIcon = document.getElementById("brandIcon");
    const brandDropdown = document.getElementById("brandDropdown");

    setupCombobox(
        categoryDisplay,
        categoryIcon,
        categoryDropdown,
        categoryInput,
        () => {
            // Callback after category selection
            console.log("Category selected:", categoryInput.value);
        },
        {
            title: "Select Category",
            data: allCategoriesGlobal,
            enableCreate: true,
            multiSelect: true,
        }
    );

    setupCombobox(brandDisplay, brandIcon, brandDropdown, brandInput, null, {
        title: "Select Brand",
        data: allBrandsGlobal,
        enableCreate: false,
        multiSelect: false,
    });

    function renderMiniDropdown(options, container, onSelect) {
        container.innerHTML = "";
        // Limit to 5 results for mini dropdown
        const limit = options.slice(0, 5);

        limit.forEach((opt) => {
            const div = document.createElement("div");
            div.className = "mstore-combobox-option";
            div.textContent = `${opt.displayName} (${opt.symbol})`;
            div.addEventListener("click", () => onSelect(opt));
            container.appendChild(div);
        });
    }

    function selectUnit(unit, inputEl, hiddenInputEl, callback) {
        // Handle Multi-Select Array
        if (Array.isArray(unit)) {
            // Multi-select
            const displays = unit
                .map((u) => {
                    let d = u.displayName || u.label || u.value;
                    if (u.symbol) d += ` (${u.symbol})`;
                    return d;
                })
                .join(", ");

            const codes = unit.map((u) => u.code).join(",");

            inputEl.value = displays;
            hiddenInputEl.value = codes;
        } else {
            // Single select
            let display = unit.displayName || unit.label || unit.value;
            if (unit.symbol) display += ` (${unit.symbol})`;

            inputEl.value = display;
            hiddenInputEl.value = unit.code;
        }
        if (callback) callback();
    }

    // Initialize Comboboxes
    // Wait for units to load? Logic handles empty list gracefully.

    setupCombobox(
        primaryUnitDisplay,
        primaryUnitIcon,
        primaryUnitDropdown,
        primaryUnitInput,
        handlePrimaryUnitChange
    );
    setupCombobox(
        secondaryUnitDisplay,
        secondaryUnitIcon,
        secondaryUnitDropdown,
        secondaryUnitInput,
        handleSecondaryUnitChange
    );

    // --- Modal Logic (Updated) ---
    const modalTitle = document.getElementById("modalTitle");

    let currentCreateCallback = null;
    let currentSelectedCodes = new Set();
    let currentMultiSelectMode = false;

    // --- Create New Item Modal Logic (Moved before renderModalOptions) ---
    function getCreateItemModalElements() {
        const modal = document.getElementById("createItemModal");
        const input = document.getElementById("newItemInput");
        const closeBtn = document.getElementById("closeCreateItemModal");
        const saveBtn = document.getElementById("saveCreateItemModal");
        
        // Debug logging
        if (!modal) console.warn("createItemModal not found in DOM");
        if (!input) console.warn("newItemInput not found in DOM");
        
        return {
            modal: modal,
            input: input,
            closeBtn: closeBtn,
            saveBtn: saveBtn,
        };
    }

    function openCreateItemModal() {
        // Try multiple times with increasing delays
        let attempts = 0;
        const maxAttempts = 5;
        
        function tryOpen() {
            const elements = getCreateItemModalElements();
            if (elements.modal && elements.input) {
                showCreateItemModal(elements);
                return;
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(tryOpen, 100 * attempts); // Increasing delay: 100ms, 200ms, 300ms, etc.
            } else {
                console.error("Create item modal elements not found after", maxAttempts, "attempts");
                // Fallback: try to create modal dynamically if it doesn't exist
                if (!document.getElementById("createItemModal")) {
                    console.warn("Modal not in DOM, attempting to create dynamically");
                    createModalDynamically();
                }
            }
        }
        
        tryOpen();
    }

    function createModalDynamically() {
        // Create modal if it doesn't exist in DOM
        const modal = document.createElement("div");
        modal.id = "createItemModal";
        modal.className = "mstore-selection-modal";
        modal.style.cssText = "z-index: 2200; background: var(--bg-overlay-dark); display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: opacity 0.3s; position: fixed; top: 0; left: 0; width: 100%; height: 100%;";
        
        modal.innerHTML = `
            <div class="mstore-selection-container" style="width: 90%; max-width: 300px; height: auto; max-height: none; transform: scale(0.95); transition: transform 0.2s; border-radius: 12px; margin: auto; padding: 16px; position: relative; background: var(--bg-secondary); box-shadow: var(--shadow-elevation-large);">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">Create New Category</h3>
                <div class="mstore-input-wrapper" style="margin-bottom: 20px;">
                    <input type="text" id="newItemInput" class="mstore-input" style="border: none; padding: 12px 10px; color: var(--text-primary);" placeholder="Enter category name" autofocus>
                </div>
                <div style="display: flex; gap: 10px; width: 100%;">
                    <button class="mstore-action-btn secondary" id="closeCreateItemModal" style="flex: 1; justify-content: center; padding: 8px; font-size: 13px;">Cancel</button>
                    <button class="mstore-action-btn primary" id="saveCreateItemModal" style="flex: 1; justify-content: center; padding: 8px; font-size: 13px;">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Now try to open it
        setTimeout(() => {
            const elements = getCreateItemModalElements();
            if (elements.modal && elements.input) {
                showCreateItemModal(elements);
            }
        }, 50);
    }

    function showCreateItemModal(elements) {
        if (!elements.modal || !elements.input) {
            console.error("Cannot show modal: elements missing", elements);
            return;
        }
        
        const container = elements.modal.querySelector(".mstore-selection-container");
        
        // Add active class and set visibility
        elements.modal.classList.add("active");
        elements.modal.style.visibility = "visible";
        elements.modal.style.opacity = "1";
        elements.modal.style.display = "flex";
        
        // Lock body scroll
        document.body.style.overflow = "hidden";
        
        if (container) {
            container.style.transform = "scale(1)";
        }
        
        elements.input.value = "";
        setTimeout(() => {
            if (elements.input) {
                elements.input.focus();
            }
        }, 100);
    }

    function closeCreateItemUI() {
        const elements = getCreateItemModalElements();
        if (!elements.modal) return;
        
        const container = elements.modal.querySelector(".mstore-selection-container");
        elements.modal.classList.remove("active");
        elements.modal.style.opacity = "0";
        
        // Restore body scroll
        document.body.style.overflow = "";
        
        if (container) {
            container.style.transform = "scale(0.95)";
        }
        
        setTimeout(() => {
            elements.modal.style.visibility = "hidden";
            elements.modal.style.display = "none";
        }, 300);
    }

    // Setup event listeners for create item modal using event delegation
    // This works even if elements are loaded dynamically
    document.addEventListener("click", (e) => {
        // Handle close button
        if (e.target && (e.target.id === "closeCreateItemModal" || e.target.closest("#closeCreateItemModal"))) {
            e.preventDefault();
            e.stopPropagation();
            closeCreateItemUI();
            return;
        }

        // Handle save button
        if (e.target && (e.target.id === "saveCreateItemModal" || e.target.closest("#saveCreateItemModal"))) {
            e.preventDefault();
            e.stopPropagation();
            
            const elements = getCreateItemModalElements();
            if (!elements.input) {
                console.error("Create item input not found");
                return;
            }
            
            const newName = elements.input.value.trim();
            if (!newName) return; // Simple validation

            const newCode = newName.toLowerCase().replace(/\s+/g, "_");

            const newObj = { displayName: newName, code: newCode, type: "Custom" };

            // Add to Global List
            allCategoriesGlobal.push(newObj);

            // Add to Current Options context
            if (!currentOptions.find((o) => o.code === newCode)) {
                currentOptions.push(newObj);
            }

            if (currentMultiSelectMode) {
                // Auto-select
                currentSelectedCodes.add(newCode);

                // Re-calculate selected objects
                const selectedObjects = currentOptions.filter((o) =>
                    currentSelectedCodes.has(o.code)
                );

                // Call selectUnit directly to update the UI and hidden input
                selectUnit(selectedObjects, categoryDisplay, categoryInput, null);

                // Refresh the modal list options
                renderModalOptions(currentOptions, true);
            } else {
                // Single select
                if (currentCallback) currentCallback(newObj);
                closeSelectionModal();
            }

            closeCreateItemUI();
        }
        
        // Handle clicking outside modal to close it
        const modal = document.getElementById("createItemModal");
        if (modal && modal.classList.contains("active") && e.target === modal) {
            closeCreateItemUI();
        }
    });

    function openSelectionModal(
        options,
        onSelect,
        titleText = "Select Option",
        enableCreate = false,
        multiSelect = false,
        initialSelection = []
    ) {
        currentOptions = options;
        currentCallback = onSelect;
        currentMultiSelectMode = multiSelect;

        // Initialize selection state
        currentSelectedCodes = new Set(initialSelection);

        modalTitle.textContent = titleText;
        renderModalOptions(options, enableCreate);

        selectionModal.classList.add("active");
        document.body.style.overflow = "hidden"; // Lock background scroll

        // Push history state to handle back button
        history.pushState({ mstoreModalOpen: true }, "");

        modalSearch.value = "";
    }

    function closeSelectionModal() {
        // Close modal directly without using history.back() to prevent page refresh
        hideModalUI();
        // Remove the history state we added if it exists
        if (history.state && history.state.mstoreModalOpen) {
            // Replace current state instead of going back
            history.replaceState(null, "");
        }
    }

    function hideModalUI() {
        if (selectionModal) {
            selectionModal.classList.remove("active");
        }
        document.body.style.overflow = ""; // Restore background scroll
        currentCallback = null;
    }

    // Handle Browser Back Button
    function handlePopState(event) {
        // If we are navigating back, and modal is active, close it
        if (selectionModal && selectionModal.classList.contains("active")) {
            hideModalUI();
        }
    }
    
    window.addEventListener("popstate", handlePopState);
    cleanupFunctions.push(() => {
        window.removeEventListener("popstate", handlePopState);
    });

    function renderModalOptions(options, enableCreate = false) {
        modalList.innerHTML = "";

        // Optional: Add "Create New" Button at the top
        if (enableCreate) {
            const createBtn = document.createElement("div");
            createBtn.className = "mstore-selection-option";
            createBtn.style.color = "#3b82f6";
            createBtn.style.fontWeight = "500";
            // Updated Alignment: Text Left, Icon Right (fa-plus-circle)
            createBtn.innerHTML = `<span>Create New Category</span> <i class="fas fa-plus-circle"></i>`;
            createBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent bubbling selection logic
                openCreateItemModal();
            });
            modalList.appendChild(createBtn);
        }

        // Group by type if available
        const grouped = options.reduce((acc, opt) => {
            const type = opt.type
                ? opt.type.charAt(0).toUpperCase() + opt.type.slice(1).replace(/_/g, " ")
                : "Others";
            if (!acc[type]) acc[type] = [];
            acc[type].push(opt);
            return acc;
        }, {});

        for (const type in grouped) {
            // Only show group title if there are actually groups (don't show "Others" if it's the only one)
            if (Object.keys(grouped).length > 1 || type !== "Others") {
                const title = document.createElement("div");
                title.className = "mstore-selection-group-title";
                title.setAttribute("data-group-type", type);
                
                // Create title content with expand/collapse button
                const titleContent = document.createElement("div");
                titleContent.style.display = "flex";
                titleContent.style.justifyContent = "space-between";
                titleContent.style.alignItems = "center";
                titleContent.style.width = "100%";
                
                const titleText = document.createElement("span");
                titleText.textContent = type;
                
                const expandBtn = document.createElement("button");
                expandBtn.className = "mstore-group-expand-btn";
                expandBtn.style.background = "none";
                expandBtn.style.border = "none";
                expandBtn.style.color = "var(--text-secondary)";
                expandBtn.style.cursor = "pointer";
                expandBtn.style.padding = "4px 8px";
                expandBtn.style.display = "flex";
                expandBtn.style.alignItems = "center";
                expandBtn.style.gap = "4px";
                expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                
                // Determine initial state: Standard is collapsed, others are expanded
                const isCollapsed = type === "Standard";
                const groupOptions = grouped[type];
                const optionsContainer = document.createElement("div");
                optionsContainer.className = "mstore-group-options";
                optionsContainer.style.display = isCollapsed ? "none" : "block";
                
                if (isCollapsed) {
                    expandBtn.querySelector("i").classList.remove("fa-chevron-down");
                    expandBtn.querySelector("i").classList.add("fa-chevron-right");
                }
                
                expandBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const isCurrentlyCollapsed = optionsContainer.style.display === "none";
                    optionsContainer.style.display = isCurrentlyCollapsed ? "block" : "none";
                    const icon = expandBtn.querySelector("i");
                    if (isCurrentlyCollapsed) {
                        icon.classList.remove("fa-chevron-right");
                        icon.classList.add("fa-chevron-down");
                    } else {
                        icon.classList.remove("fa-chevron-down");
                        icon.classList.add("fa-chevron-right");
                    }
                });
                
                titleContent.appendChild(titleText);
                titleContent.appendChild(expandBtn);
                title.appendChild(titleContent);
                modalList.appendChild(title);
                modalList.appendChild(optionsContainer);
                
                // Move options rendering inside the container
                grouped[type].forEach((opt) => {
                    const row = document.createElement("div");
                    row.className = "mstore-selection-option";

                    // Label logic
                    let label = opt.displayName || opt.label || opt.value;
                    if (opt.symbol) label += ` (${opt.symbol})`;

                    const isChecked = currentSelectedCodes.has(opt.code);

                    // Render Layout: Label Left, Checkbox/Icon Right
                    // If MultiSelect -> Show Checkbox
                    // If Single -> Maybe show Check if selected? Or nothing.

                    const iconHtml = currentMultiSelectMode
                        ? `<i class="fas ${isChecked ? "fa-check-square" : "fa-square"
                        } mstore-checkbox-icon ${isChecked ? "checked" : ""}"></i>`
                        : isChecked
                            ? `<i class="fas fa-check" style="color: var(--accent-primary);"></i>`
                            : "";

                    row.innerHTML = `<span>${label}</span> ${iconHtml}`;

                    row.addEventListener("click", () => {
                        if (currentMultiSelectMode) {
                            // Toggle Logic
                            if (currentSelectedCodes.has(opt.code)) {
                                currentSelectedCodes.delete(opt.code);
                            } else {
                                currentSelectedCodes.add(opt.code);
                            }

                            // Trigger Callback with full array
                            const selectedObjects = currentOptions.filter((o) =>
                                currentSelectedCodes.has(o.code)
                            );
                            if (currentCallback) currentCallback(selectedObjects);

                            // Re-render this row or whole list? Re-rendering whole list is safer/easier
                            renderModalOptions(currentOptions, enableCreate);
                        } else {
                            // Single Select
                            if (currentCallback) currentCallback(opt);
                            closeSelectionModal();
                        }
                    });
                    optionsContainer.appendChild(row);
                });
            } else {
                // If no group title, render options directly
                grouped[type].forEach((opt) => {
                    const row = document.createElement("div");
                    row.className = "mstore-selection-option";

                    // Label logic
                    let label = opt.displayName || opt.label || opt.value;
                    if (opt.symbol) label += ` (${opt.symbol})`;

                    const isChecked = currentSelectedCodes.has(opt.code);

                    const iconHtml = currentMultiSelectMode
                        ? `<i class="fas ${isChecked ? "fa-check-square" : "fa-square"
                        } mstore-checkbox-icon ${isChecked ? "checked" : ""}"></i>`
                        : isChecked
                            ? `<i class="fas fa-check" style="color: var(--accent-primary);"></i>`
                            : "";

                    row.innerHTML = `<span>${label}</span> ${iconHtml}`;

                    row.addEventListener("click", () => {
                        if (currentMultiSelectMode) {
                            // Toggle Logic
                            if (currentSelectedCodes.has(opt.code)) {
                                currentSelectedCodes.delete(opt.code);
                            } else {
                                currentSelectedCodes.add(opt.code);
                            }

                            // Trigger Callback with full array
                            const selectedObjects = currentOptions.filter((o) =>
                                currentSelectedCodes.has(o.code)
                            );
                            if (currentCallback) currentCallback(selectedObjects);

                            // Re-render this row or whole list? Re-rendering whole list is safer/easier
                            renderModalOptions(currentOptions, enableCreate);
                        } else {
                            // Single Select
                            if (currentCallback) currentCallback(opt);
                            closeSelectionModal();
                        }
                    });
                    modalList.appendChild(row);
                });
            }
        }
    }

    // Search Filter (Modal)
    modalSearch.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = currentOptions.filter((opt) => {
            const label = (opt.displayName || opt.label || opt.value).toLowerCase();
            const code = (opt.code || "").toLowerCase();
            return label.includes(term) || code.includes(term);
        });
        renderModalOptions(filtered);
    });

    // Back button closes modal
    const modalCloseActionBtn = document.getElementById("modalCloseActionBtn");
    if (modalCloseActionBtn) {
        modalCloseActionBtn.addEventListener("click", closeSelectionModal);
    }

    // Also allow clicking outside to close (Optional, but good UX)
    selectionModal.addEventListener("click", (e) => {
        if (e.target === selectionModal) {
            closeSelectionModal();
        }
    });

    // --- Unit Selection Logic ---

    // Update calls to openSelectionModal with Titles
    function handlePrimaryUnitChange() {
        const primaryCode = primaryUnitInput.value;
        if (!primaryCode) return;

        // Smart Default Logic for Secondary
        const primaryUnitObj = allUnitsGlobal.find((u) => u.code === primaryCode);
        if (primaryUnitObj) {
            // Try to find a default secondary
            let defaultSecondary = null;

            // 1. Piece if container
            if (
                ["wholesale_packaging", "lot_bundle", "item_count"].includes(
                    primaryUnitObj.type
                )
            ) {
                defaultSecondary = allUnitsGlobal.find(
                    (u) => u.code === "pc" || u.code === "pcs"
                );
            }

            // 2. Different unit of same type
            if (!defaultSecondary) {
                defaultSecondary = allUnitsGlobal.find(
                    (u) => u.type === primaryUnitObj.type && u.code !== primaryCode
                );
            }

            if (defaultSecondary) {
                // Auto set Custom Trigger (Hybrid Input)
                secondaryUnitInput.value = defaultSecondary.code;
                secondaryUnitDisplay.value = `${defaultSecondary.displayName} (${defaultSecondary.symbol})`;
            }
        }

        calculateConversionFactor();
        updateConversionDisplay();
    }

    function handleSecondaryUnitChange() {
        calculateConversionFactor();
        updateConversionDisplay();
    }

    function calculateConversionFactor() {
        const pCode = primaryUnitInput.value;
        const sCode = secondaryUnitInput.value;

        if (!pCode || !sCode) return;

        const pUnit = allUnitsGlobal.find((u) => u.code === pCode);
        const sUnit = allUnitsGlobal.find((u) => u.code === sCode);

        if (pUnit && sUnit && pUnit.type === sUnit.type) {
            const factor = pUnit.toBase / sUnit.toBase;
            const cleanFactor = parseFloat(factor.toPrecision(10));
            conversionInput.value = cleanFactor;
        }
    }

    function updateConversionDisplay() {
        const pCode = primaryUnitInput.value;
        const sCode = secondaryUnitInput.value;
        const factor = conversionInput.value;

        const pUnit = allUnitsGlobal.find((u) => u.code === pCode);
        const sUnit = allUnitsGlobal.find((u) => u.code === sCode);

        const pSym = pUnit ? pUnit.symbol : pCode;
        const sSym = sUnit ? sUnit.symbol : sCode;

        const badgeBtn = document.getElementById("conversionBadgeBtn");
        const badgeText = document.getElementById("conversionBadgeText");

        if (badgeBtn && badgeText) {
            if (factor && pCode && sCode) {
                badgeText.textContent = `1 ${pSym} = ${factor} ${sSym}`;
                badgeBtn.style.display = "inline-flex";
                badgeBtn.style.alignItems = "center";
            } else {
                badgeBtn.style.display = "none";
            }
        }
    }

    // --- Conversion Modal Logic ---
    const conversionBadgeBtn = document.getElementById("conversionBadgeBtn");
    const conversionModal = document.getElementById("conversionModal");
    const closeConversionModal = document.getElementById("closeConversionModal");
    const saveConversionModal = document.getElementById("saveConversionModal");
    const modalConversionInput = document.getElementById("modalConversionInput");
    const modalPrimaryUnitLabel = document.getElementById("modalPrimaryUnitLabel");
    const modalSecondaryUnitLabel = document.getElementById(
        "modalSecondaryUnitLabel"
    );

    if (conversionBadgeBtn) {
        conversionBadgeBtn.addEventListener("click", () => {
            const pCode = primaryUnitInput.value;
            const sCode = secondaryUnitInput.value;
            const pUnit = allUnitsGlobal.find((u) => u.code === pCode);
            const sUnit = allUnitsGlobal.find((u) => u.code === sCode);

            // Use Full Display Names for the modal logic as requested
            const pName = pUnit ? pUnit.displayName : pCode || "Unit";
            const sName = sUnit ? sUnit.displayName : sCode || "Unit";

            // Update Labels
            if (modalPrimaryUnitLabel) modalPrimaryUnitLabel.textContent = pName;
            if (modalSecondaryUnitLabel) modalSecondaryUnitLabel.textContent = sName;

            modalConversionInput.value = conversionInput.value;

            // Show modal
            conversionModal.classList.add("active");
            conversionModal.style.visibility = "visible";
            conversionModal.style.opacity = "1";

            // Focus input after a small delay
            setTimeout(() => modalConversionInput.focus(), 100);
        });
    }

    if (closeConversionModal) {
        closeConversionModal.addEventListener("click", () => {
            conversionModal.classList.remove("active");
            conversionModal.style.visibility = "hidden";
            conversionModal.style.opacity = "0";
        });
    }

    if (saveConversionModal) {
        saveConversionModal.addEventListener("click", () => {
            const newVal = modalConversionInput.value;
            if (newVal && newVal > 0) {
                conversionInput.value = newVal;
                updateConversionDisplay();
            }
            conversionModal.classList.remove("active");
            conversionModal.style.visibility = "hidden";
            conversionModal.style.opacity = "0";
        });
    }

    if (conversionInput) {
        conversionInput.addEventListener("input", updateConversionDisplay);
    }

    // --- Drag and Drop Photo Reordering ---
    document.addEventListener("DOMContentLoaded", () => {
        const photoGrid = document.querySelector(".mstore-photo-grid");
        if (!photoGrid) return;

        photoGrid.addEventListener("dragstart", (e) => {
            if (
                e.target.classList.contains("mstore-photo-item") &&
                !e.target.classList.contains("primary")
            ) {
                setTimeout(() => e.target.classList.add("dragging"), 0);
            }
        });

        photoGrid.addEventListener("dragend", (e) => {
            if (e.target.classList.contains("dragging")) {
                e.target.classList.remove("dragging");
            }
        });

        photoGrid.addEventListener("dragover", (e) => {
            e.preventDefault();
            const draggingItem = photoGrid.querySelector(".dragging");
            if (!draggingItem) return;

            const afterElement = getDragAfterElement(photoGrid, e.clientX);

            if (afterElement == null) {
                photoGrid.appendChild(draggingItem);
            } else {
                photoGrid.insertBefore(draggingItem, afterElement);
            }
        });

        function getDragAfterElement(container, x) {
            const draggableElements = [
                ...container.querySelectorAll(
                    ".mstore-photo-item:not(.primary):not(.dragging)"
                ),
            ];

            return draggableElements.reduce(
                (closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = x - box.left - box.width / 2;
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                },
                { offset: Number.NEGATIVE_INFINITY }
            ).element;
        }
    });

    // Verify modal elements exist after initialization
    const modalCheck = getCreateItemModalElements();
    if (modalCheck.modal && modalCheck.input) {
        console.log('✅ Create item modal elements found');
    } else {
        console.warn('⚠️ Create item modal elements not found during initialization');
    }

    // End of initialization
}

// Module exports already at top
