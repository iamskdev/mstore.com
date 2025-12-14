/**
 * Item UI Components - Handles all UI interactions and components
 */

export class ItemUIComponents {
    /**
     * Initialize all UI components
     */
    static initializeAllComponents() {
        this.initializeBackButton();
        this.initializeProductServiceToggle();
        this.initializeSecondaryUnitToggle();
        this.initializeWholesalePriceToggle();
        this.initializeConversionBadgeModal();
        this.initializeTabSwitching();
        this.initializeBrandToggle();
        this.initializeDetailedTrackingToggle();
        this.initializeDynamicAttributes();
        this.initializeAssignCodeFunctionality();
        this.initializePrivateNoteToggle();
        this.initializeMRPToggle();
        this.initializeBarcodeScanner();
        this.initializeStockLogic();
        this.initializeDateInputs();
    }

    /**
     * Initialize back button handler
     */
    static initializeBackButton() {
        const headerBack = document.querySelector(".mstore-header-back");
        if (headerBack) {
            headerBack.addEventListener("click", () => {
                if (window.routeManager) {
                    window.routeManager.switchView('merchant', 'add');
                } else {
                    window.history.back();
                }
            });
        }
    }

    /**
     * Initialize Product/Service toggle
     */
    static initializeProductServiceToggle() {
        const productToggle = document.getElementById("productToggle");
        const serviceToggle = document.getElementById("serviceToggle");
        const toggleGroup = document.getElementById("toggleGroup");

        if (productToggle && serviceToggle && toggleGroup) {
            productToggle.addEventListener("click", () => {
                productToggle.classList.add("active");
                serviceToggle.classList.remove("active");
                toggleGroup.classList.remove("service-mode");
                this.updateItemStatusUI();
            });

            serviceToggle.addEventListener("click", () => {
                serviceToggle.classList.add("active");
                productToggle.classList.remove("active");
                toggleGroup.classList.add("service-mode");
                this.updateItemStatusUI();
            });
        }
    }

    /**
     * Update item status UI based on product/service mode
     */
    static updateItemStatusUI() {
        const serviceToggle = document.getElementById("serviceToggle");
        const itemStatusToggle = document.getElementById("itemStatusToggle");
        const itemStatusLabel = document.getElementById("itemStatusLabel");

        if (!itemStatusToggle || !itemStatusLabel) return;

        const isService = serviceToggle?.classList.contains("active") || false;
        const isChecked = itemStatusToggle.checked;

        if (isService) {
            itemStatusLabel.textContent = isChecked ? "Available" : "Unavailable";
            itemStatusLabel.style.color = isChecked ? "#10b981" : "#ef4444"; // Green / Red
        } else {
            itemStatusLabel.textContent = isChecked ? "In Stock" : "Out of Stock";
            itemStatusLabel.style.color = isChecked ? "#10b981" : "#ef4444"; // Green / Red
        }
    }

    /**
     * Initialize Item Status Toggle
     */
    static initializeItemStatusToggle() {
        const itemStatusToggle = document.getElementById("itemStatusToggle");

        if (itemStatusToggle) {
            itemStatusToggle.addEventListener("change", () => this.updateItemStatusUI());
            // Initialize Status UI
            this.updateItemStatusUI();
        }
    }

    /**
     * Initialize Secondary Unit Toggle
     */
    static initializeSecondaryUnitToggle() {
        const secondaryUnitToggle = document.getElementById("secondaryUnitToggle");
        const secondaryUnitSection = document.getElementById("secondaryUnitSection");
        const conversionBadgeBtn = document.getElementById("conversionBadgeBtn");

        console.log("🔧 Setting up secondary unit toggle", secondaryUnitToggle, secondaryUnitSection);

        if (secondaryUnitToggle && secondaryUnitSection) {
            secondaryUnitToggle.addEventListener("change", (e) => {
                console.log("🔄 Secondary unit toggle changed:", e.target.checked);
                if (e.target.checked) {
                    secondaryUnitSection.classList.add("active");
                    console.log("✅ Secondary section activated, classes:", secondaryUnitSection.className);

                    // Badge visibility is now handled by CSS
                    const badgeText = document.getElementById("conversionBadgeText");
                    if (badgeText && !badgeText.textContent.includes("=")) {
                        badgeText.textContent = "Set Conversion";
                    }
                } else {
                    secondaryUnitSection.classList.remove("active");
                    console.log("❌ Secondary section deactivated, classes:", secondaryUnitSection.className);
                    // Badge visibility is now handled by CSS
                }
            });
        }
    }

    /**
     * Initialize Wholesale Price Toggle
     */
    static initializeWholesalePriceToggle() {
        const wholesalePriceToggle = document.getElementById("wholesalePriceToggle");
        const wholesalePriceSection = document.getElementById("wholesalePriceSection");

        if (wholesalePriceToggle && wholesalePriceSection) {
            wholesalePriceToggle.addEventListener("change", (e) => {
                if (e.target.checked) {
                    wholesalePriceSection.classList.add("active");
                } else {
                    wholesalePriceSection.classList.remove("active");
                }
            });
        }
    }

    /**
     * Initialize Conversion Badge Modal
     */
    static initializeConversionBadgeModal() {
        // Add a small delay to ensure DOM is fully loaded
        setTimeout(() => {
            const conversionBadgeBtn = document.getElementById("conversionBadgeBtn");
            const conversionModal = document.getElementById("conversionModal");
            const closeConversionModal = document.getElementById("closeConversionModal");
            const saveConversionModal = document.getElementById("saveConversionModal");
            const modalConversionInput = document.getElementById("modalConversionInput");
            const modalPrimaryUnitLabel = document.getElementById("modalPrimaryUnitLabel");
            const modalSecondaryUnitLabel = document.getElementById("modalSecondaryUnitLabel");

            if (conversionBadgeBtn && conversionModal) {
                // Add a visual indicator that the badge is clickable
                conversionBadgeBtn.style.cursor = 'pointer';
                conversionBadgeBtn.style.userSelect = 'none';
            // Show modal on badge click
            conversionBadgeBtn.addEventListener("click", (e) => {
                // Check if secondary unit section is active
                const secondarySection = document.getElementById("secondaryUnitSection");
                if (!secondarySection || !secondarySection.classList.contains("active")) {
                    return;
                }

                // Import dataManager dynamically to get unit data
                import('./item-data-manager.js').then(({ ItemDataManager }) => {
                    const dataManager = new ItemDataManager();
                    const primaryUnitValue = document.getElementById("primaryUnit")?.value;
                    const secondaryUnitValue = document.getElementById("secondaryUnit")?.value;

                    const primaryUnit = dataManager.getUnits().find(u => u.code === primaryUnitValue);
                    const secondaryUnit = dataManager.getUnits().find(u => u.code === secondaryUnitValue);

                    // Update modal labels
                    if (modalPrimaryUnitLabel) {
                        modalPrimaryUnitLabel.textContent = primaryUnit ? primaryUnit.title || primaryUnit.name : primaryUnitValue || "Primary Unit";
                    }
                    if (modalSecondaryUnitLabel) {
                        modalSecondaryUnitLabel.textContent = secondaryUnit ? secondaryUnit.title || secondaryUnit.name : secondaryUnitValue || "Secondary Unit";
                    }

                    // Pre-fill existing conversion value
                    const existingConversion = document.getElementById("conversionInput")?.value;
                    if (modalConversionInput) {
                        modalConversionInput.value = existingConversion || "";
                    }

                        // Show modal
                        conversionModal.classList.add("active");

                        // Focus on input
                        if (modalConversionInput) {
                            setTimeout(() => {
                                modalConversionInput.focus();
                                modalConversionInput.select();
                            }, 100);
                        }
                });
            });
        }

        // Close modal events
        if (closeConversionModal) {
            closeConversionModal.addEventListener("click", () => {
                conversionModal.classList.remove("active");
            });
        }

        // Save conversion
        if (saveConversionModal && modalConversionInput) {
            saveConversionModal.addEventListener("click", () => {
                const conversionValue = modalConversionInput.value;
                if (conversionValue && conversionValue > 0) {
                    // Update hidden conversion input
                    const conversionInput = document.getElementById("conversionInput");
                    if (conversionInput) {
                        conversionInput.value = conversionValue;
                    }

                    // Update badge text
                    const badgeText = document.getElementById("conversionBadgeText");
                    const modalPrimaryUnitLabel = document.getElementById("modalPrimaryUnitLabel");
                    const modalSecondaryUnitLabel = document.getElementById("modalSecondaryUnitLabel");

                    if (badgeText && modalPrimaryUnitLabel && modalSecondaryUnitLabel) {
                        // Round the saved value for display
                        const roundedValue = Math.round(parseFloat(conversionValue) * 10000) / 10000;
                        badgeText.textContent = `1 ${modalPrimaryUnitLabel.textContent} = ${roundedValue} ${modalSecondaryUnitLabel.textContent}`;
                    }

                    // Close modal
                    conversionModal.classList.remove("active");
                }
            });
        }

        // Close on outside click
        if (conversionModal) {
            conversionModal.addEventListener("click", (e) => {
                if (e.target === conversionModal) {
                    conversionModal.classList.remove("active");
                }
            });
        }
        }, 100); // Small delay to ensure DOM is loaded
    }

    /**
     * Initialize Tab Switching
     */
    static initializeTabSwitching() {
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
                pricingContent?.classList.remove("active");
                stockContent?.classList.remove("active");
                moreContent?.classList.remove("active");

                // Show target content
                const tabName = tab.getAttribute("data-tab");
                if (tabName === "pricing") {
                    pricingContent?.classList.add("active");
                } else if (tabName === "stock") {
                    stockContent?.classList.add("active");
                } else if (tabName === "more") {
                    moreContent?.classList.add("active");
                }
            });
        });
    }

    /**
     * Initialize Brand Toggle
     */
    static initializeBrandToggle() {
        const brandToggle = document.getElementById("brandToggle");
        const brandSection = document.getElementById("brandSection");

        if (brandToggle && brandSection) {
            brandToggle.addEventListener("change", (e) => {
                if (e.target.checked) {
                    brandSection.classList.add("active");
                } else {
                    brandSection.classList.remove("active");
                }
            });
        }
    }

    /**
     * Initialize Detailed Tracking Toggle
     */
    static initializeDetailedTrackingToggle() {
        const detailedTrackingToggle = document.getElementById("detailedTrackingToggle");
        const detailedTrackingSection = document.getElementById("detailedTrackingSection");

        if (detailedTrackingToggle && detailedTrackingSection) {
            detailedTrackingToggle.addEventListener("change", (e) => {
                if (e.target.checked) {
                    detailedTrackingSection.classList.add("active");
                } else {
                    detailedTrackingSection.classList.remove("active");
                }
            });
        }
    }

    /**
     * Initialize Dynamic Attributes Logic
     */
    static initializeDynamicAttributes() {
        const attributesContainer = document.getElementById("attributesContainer");
        const addAttributeBtn = document.getElementById("addAttributeBtn");

        if (!attributesContainer || !addAttributeBtn) return;

        addAttributeBtn.addEventListener("click", () => {
            const lastAttributeRow = attributesContainer.querySelector(".attribute-row:last-child");
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
    }

    /**
     * Initialize Assign Code Functionality
     */
    static initializeAssignCodeFunctionality() {
        const assignCodeBtn = document.getElementById("assignCodeBtn");
        const itemCodeInput = document.getElementById("itemCodeInput");

        if (!assignCodeBtn || !itemCodeInput) return;

        assignCodeBtn.addEventListener("click", () => {
            // Generate unique code: PREFIX + TIMESTAMP + RANDOM
            const prefix = "ITM";
            const timestamp = Date.now().toString().slice(-6); // Last 6 digits
            const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
            const generatedCode = `${prefix}-${timestamp}-${random}`;

            // Set the generated code to input
            itemCodeInput.value = generatedCode;

            // Optional: Add a brief highlight effect using theme variable
            const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary').trim() || '#f0f2f5';
            itemCodeInput.style.background = highlightColor;
            setTimeout(() => {
                itemCodeInput.style.background = "";
            }, 500);
        });
    }

    /**
     * Initialize Private Note Toggle
     */
    static initializePrivateNoteToggle() {
        const privateNoteToggle = document.getElementById("privateNoteToggle");
        const privateNoteSection = document.getElementById("privateNoteSection");

        if (privateNoteToggle && privateNoteSection) {
            privateNoteToggle.addEventListener("change", (e) => {
                if (e.target.checked) {
                    privateNoteSection.classList.add("active");
                } else {
                    privateNoteSection.classList.remove("active");
                }
            });
        }
    }

    /**
     * Initialize MRP Toggle
     */
    static initializeMRPToggle() {
        const mrpToggle = document.getElementById("mrpToggle");
        const mrpSection = document.getElementById("mrpSection");

        if (mrpToggle && mrpSection) {
            mrpToggle.addEventListener("change", (e) => {
                if (e.target.checked) {
                    mrpSection.classList.add("active");
                } else {
                    mrpSection.classList.remove("active");
                }
            });
        }
    }

    /**
     * Initialize Barcode Scanner
     */
    static initializeBarcodeScanner() {
        const scanCodeBtn = document.getElementById("scanCodeBtn");
        const scannerModal = document.getElementById("scannerModal");
        const closeScannerBtn = document.getElementById("closeScannerBtn");
        const itemCodeInput = document.getElementById("itemCodeInput");

        if (!scanCodeBtn || !scannerModal || !itemCodeInput) return;

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
                        this.stopScanner(html5QrCode, scannerModal);
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

        if (closeScannerBtn) {
            closeScannerBtn.addEventListener("click", () => {
                this.stopScanner(html5QrCode, scannerModal);
            });
        }
    }

    /**
     * Stop barcode scanner
     */
    static stopScanner(html5QrCode, scannerModal) {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode
                .stop()
                .then(() => {
                    if (scannerModal) scannerModal.style.display = "none";
                })
                .catch((err) => {
                    console.error("Failed to stop scanner", err);
                    if (scannerModal) scannerModal.style.display = "none";
                });
        } else {
            if (scannerModal) scannerModal.style.display = "none";
        }
    }

    /**
     * Initialize Stock Logic
     */
    static initializeStockLogic() {
        const stockTrackingToggle = document.getElementById("stockTrackingToggle");
        const stockDetailsSection = document.getElementById("stockDetailsSection");
        const serviceToggle = document.getElementById("serviceToggle");
        const itemStatusToggle = document.getElementById("itemStatusToggle");

        const openingStockInput = document.querySelector(
            '#stockDetailsSection input[placeholder="Enter count"]'
        );
        let openingStockEl = openingStockInput;

        const handleStockTrackingToggle = () => {
            if (stockTrackingToggle && stockDetailsSection) {
                if (stockTrackingToggle.checked) {
                    stockDetailsSection.classList.add("active");
                } else {
                    stockDetailsSection.classList.remove("active");
                }
            }
        };

        const syncStockStatus = () => {
            // Only sync if Stock Tracking is ON and NOT in Service mode
            if (
                stockTrackingToggle &&
                stockTrackingToggle.checked &&
                serviceToggle &&
                !serviceToggle.classList.contains("active") &&
                openingStockEl &&
                itemStatusToggle
            ) {
                const qty = parseInt(openingStockEl.value) || 0;
                if (qty > 0) {
                    itemStatusToggle.checked = true;
                } else {
                    itemStatusToggle.checked = false;
                }
                this.updateItemStatusUI();
            }
        };

        // Listen for Tracking Toggle Change
        if (stockTrackingToggle) {
            stockTrackingToggle.addEventListener("change", () => {
                handleStockTrackingToggle();
                syncStockStatus();
            });
        }

        // Initialize on page load
        handleStockTrackingToggle();

        // Listen for Quantity Change
        if (openingStockEl) {
            openingStockEl.addEventListener("input", syncStockStatus);
        }

        // Add ID to Opening Stock Input for future safety in the DOM
        if (openingStockEl) openingStockEl.id = "openingStockInput";
    }

    /**
     * Initialize Date Inputs
     */
    static initializeDateInputs() {
        // Initialize As of Date with today's date
        const asOfDateInput = document.getElementById("asOfDateInput");
        if (asOfDateInput) {
            const today = new Date().toISOString().split("T")[0];
            asOfDateInput.value = today;
        }
    }
}