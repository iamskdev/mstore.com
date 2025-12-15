/**
 * Item UI Components - Handles all UI interactions and components
 */

// QR Scanner will be available globally via window.QRScanner
// It loads itself dynamically to avoid import path issues

export class ItemUIComponents {
    /**
     * Initialize all UI components
     */
    static async initializeAllComponents() {
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
        await this.initializeBarcodeScanner();
        this.initializeStockLogic();
        this.initializeDateInputs();
    }

    /**
     * Initialize back button handler
     */
    static initializeBackButton() {
        // Note: Back button is now handled by the top navigation's view-back-btn
        // This method is kept for compatibility but uses the top navigation back button
        console.log("Back button initialization - using top navigation back button");
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

                    // Force check badge visibility after activation
                    setTimeout(() => {
                        const badgeBtn = document.getElementById("conversionBadgeBtn");
                        if (badgeBtn) {
                            console.log("📍 Badge visibility after toggle:", window.getComputedStyle(badgeBtn).display);
                            console.log("📍 Badge classes after toggle:", badgeBtn.className);
                        }
                    }, 100);
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
        console.log("🔧 Initializing conversion badge modal...");

        // Simple approach: wait for modal to be available
        const initModal = () => {
            const conversionBadgeBtn = document.getElementById("conversionBadgeBtn");
            let conversionModal = document.getElementById("conversionModal");

            // Try to find modal in current view if not found globally
            if (!conversionModal) {
                const currentView = document.querySelector('.page-view-area.view-active');
                if (currentView) {
                    conversionModal = currentView.querySelector("#conversionModal");
                }
            }

            console.log("Badge element:", conversionBadgeBtn);
            console.log("Modal element:", conversionModal);
            console.log("Current view:", document.querySelector('.page-view-area.view-active'));

            // If still not found after several attempts, create the modal
            if (!conversionModal) {
                console.log("🔧 Creating modal manually since it's not found in DOM");
                const modalHTML = `
                    <div id="conversionModal" class="mstore-conversion-modal">
                        <div class="mstore-conversion-container">
                            <h3 class="mstore-conversion-modal-title">Conversion Rate</h3>
                            <div class="mstore-radio-option">
                                <div class="mstore-radio-circle">
                                    <div class="mstore-radio-circle-inner"></div>
                                </div>
                                <div class="mstore-conversion-equation">
                                    <span class="mstore-conversion-text">1 <span id="modalPrimaryUnitLabel" class="mstore-unit-label">Unit</span> = </span>
                                    <input type="number" id="modalConversionInput" class="mstore-conversion-input" placeholder="0">
                                    <span id="modalSecondaryUnitLabel" class="mstore-unit-label">Unit</span>
                                </div>
                            </div>
                            <div class="mstore-modal-actions-compact">
                                <button class="mstore-action-btn secondary mstore-modal-btn-compact" id="closeConversionModal">Cancel</button>
                                <button class="mstore-action-btn primary mstore-modal-btn-compact" id="saveConversionModal">Save</button>
                            </div>
                        </div>
                    </div>
                `;

                // Append to body
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                conversionModal = document.getElementById("conversionModal");
                console.log("✅ Modal created manually:", conversionModal);
            }

            if (!conversionModal) {
                console.log("⚠️ Modal still not ready, retrying...");
                setTimeout(initModal, 200);
                return;
            }

            if (conversionBadgeBtn && conversionModal) {
                console.log("✅ Setting up modal handlers");

                // Add visual indicator
                conversionBadgeBtn.style.cursor = 'pointer';

                // Get modal elements
                const closeConversionModal = document.getElementById("closeConversionModal");
                const saveConversionModal = document.getElementById("saveConversionModal");
                const modalConversionInput = document.getElementById("modalConversionInput");
                const modalPrimaryUnitLabel = document.getElementById("modalPrimaryUnitLabel");
                const modalSecondaryUnitLabel = document.getElementById("modalSecondaryUnitLabel");

                // Badge click handler
                conversionBadgeBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    console.log("🎯 Badge clicked");

                    // Check if secondary unit section is active
                    const secondarySection = document.getElementById("secondaryUnitSection");
                    if (!secondarySection || !secondarySection.classList.contains("active")) {
                        console.log("❌ Secondary section not active");
                        return;
                    }

                    // Update modal labels with current units
                    if (modalPrimaryUnitLabel && modalSecondaryUnitLabel) {
                        const primaryUnitValue = document.getElementById("primaryUnit")?.value;
                        const secondaryUnitValue = document.getElementById("secondaryUnit")?.value;

                        modalPrimaryUnitLabel.textContent = primaryUnitValue || "Unit";
                        modalSecondaryUnitLabel.textContent = secondaryUnitValue || "Unit";
                    }

                    // Set current conversion value
                    if (modalConversionInput) {
                        const existingConversion = document.getElementById("conversionInput")?.value;
                        modalConversionInput.value = existingConversion || "1";
                    }

                    // Show modal
                    conversionModal.classList.add("active");
                    conversionModal.style.display = "flex";
                    conversionModal.style.opacity = "1";
                    conversionModal.style.visibility = "visible";
                    console.log("✅ Modal opened");

                    // Focus on input
                    if (modalConversionInput) {
                        setTimeout(() => {
                            modalConversionInput.focus();
                            modalConversionInput.select();
                        }, 100);
                    }
                });

                // Close modal handlers
                if (closeConversionModal) {
                    closeConversionModal.addEventListener("click", () => {
                        conversionModal.classList.remove("active");
                        conversionModal.style.display = "none";
                        conversionModal.style.opacity = "0";
                        conversionModal.style.visibility = "hidden";
                        console.log("❌ Modal closed via cancel button");
                    });
                }

                if (saveConversionModal) {
                    saveConversionModal.addEventListener("click", () => {
                        if (modalConversionInput) {
                            const conversionValue = modalConversionInput.value;
                            if (conversionValue && parseFloat(conversionValue) > 0) {
                                // Update hidden conversion input
                                const conversionInput = document.getElementById("conversionInput");
                                if (conversionInput) {
                                    conversionInput.value = conversionValue;
                                }

                                // Update badge text
                                const badgeText = document.getElementById("conversionBadgeText");
                                if (badgeText && modalPrimaryUnitLabel && modalSecondaryUnitLabel) {
                                    const roundedValue = Math.round(parseFloat(conversionValue) * 10000) / 10000;
                                    badgeText.textContent = `1 ${modalPrimaryUnitLabel.textContent} = ${roundedValue} ${modalSecondaryUnitLabel.textContent}`;
                                }

                                console.log("💾 Conversion saved:", conversionValue);
                            }
                        }

                        // Close modal
                        conversionModal.classList.remove("active");
                        conversionModal.style.display = "none";
                        conversionModal.style.opacity = "0";
                        conversionModal.style.visibility = "hidden";
                        console.log("✅ Modal closed via save button");
                    });
                }

                // Click outside to close
                conversionModal.addEventListener("click", (e) => {
                    if (e.target === conversionModal) {
                        conversionModal.classList.remove("active");
                        conversionModal.style.display = "none";
                        conversionModal.style.opacity = "0";
                        conversionModal.style.visibility = "hidden";
                        console.log("🎯 Modal closed via outside click");
                    }
                });
            }
        };

        // Start initialization
        initModal();

        // Keyboard shortcut for testing
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                console.log("🎯 Manual modal trigger via keyboard shortcut");
                const modal = document.getElementById("conversionModal");
                if (modal) {
                    modal.classList.add("active");
                    modal.style.display = "flex";
                    modal.style.opacity = "1";
                    modal.style.visibility = "visible";
                }
            }
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
    static async initializeBarcodeScanner() {
        const scanCodeBtn = document.getElementById("scanCodeBtn");
        const itemCodeInput = document.getElementById("itemCodeInput");

        if (!scanCodeBtn || !itemCodeInput) return;

        // Load QR Scanner dynamically if not already loaded
        if (!window.QRScanner) {
            try {
                console.log('📥 Loading QR Scanner...');
                await this.loadQRScannerScript();
                console.log('✅ QR Scanner loaded');
            } catch (error) {
                console.error('❌ Failed to load QR Scanner:', error);
                return;
            }
        }

        // Initialize QR Scanner
        this.qrScanner = new window.QRScanner({
            onScanSuccess: (decodedText, decodedResult) => {
                console.log('✅ QR code scanned successfully:', decodedText);

                // Set the scanned value to input
                itemCodeInput.value = decodedText;

                // Visual feedback
                itemCodeInput.style.background = "#d1fae5"; // Light green
                itemCodeInput.style.borderColor = "#10b981";
                setTimeout(() => {
                    itemCodeInput.style.background = "";
                    itemCodeInput.style.borderColor = "";
                }, 1000);

                // Show success toast if available
                if (window.showToast) {
                    window.showToast('QR Code scanned successfully!', 'success');
                }
            },
            onScanError: (error) => {
                console.error('❌ QR scan error:', error);
                if (window.showToast) {
                    window.showToast('Failed to scan QR code. Please try again.', 'error');
                }
            },
            onClose: () => {
                console.log('📱 QR Scanner closed');
            },
            onManualEntry: () => {
                console.log('📝 Manual entry requested');
                // Focus on input field
                itemCodeInput.focus();
            }
        });

        // Add click event to scan button
        scanCodeBtn.addEventListener("click", async () => {
            try {
                await this.qrScanner.show();
            } catch (error) {
                console.error('❌ Failed to show QR scanner:', error);
                alert('Unable to start QR scanner. Please check camera permissions.');
            }
        });
    }

    /**
     * Load QR Scanner script dynamically
     */
    static loadQRScannerScript() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.QRScanner) {
                resolve();
                return;
            }

            // Create script element
            const script = document.createElement('script');
            script.src = '/source/modals/scan-barcode/qr-scanner.js';
            script.type = 'module';
            script.onload = () => {
                console.log('✅ QR Scanner script loaded');
                resolve();
            };
            script.onerror = (error) => {
                console.error('❌ Failed to load QR Scanner script:', error);
                reject(error);
            };

            // Append to head
            document.head.appendChild(script);
        });
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