/**
 * QR Code Scanner Module - Reusable Component
 * Provides a modern, full-screen QR code scanning interface
 */

class QRScanner {
    constructor(options = {}) {
        this.options = {
            onScanSuccess: options.onScanSuccess || (() => {}),
            onScanError: options.onScanError || (() => {}),
            onClose: options.onClose || (() => {}),
            onManualEntry: options.onManualEntry || (() => {}),
            fps: options.fps || 10,
            qrbox: options.qrbox || { width: 280, height: 280 },
            ...options
        };

        this.html5QrCode = null;
        this.isInitialized = false;
        this.isScanning = false;
        this.modalElement = null;
        this.readerElement = null;
        this.flashlightEnabled = false;

        this.init();
    }

    /**
     * Initialize the scanner component
     */
    async init() {
        try {
            // Load the HTML structure if not already present
            await this.loadScannerHTML();

            // Load Html5Qrcode library if not already loaded
            await this.loadLibrary();

            // Initialize DOM elements
            this.initializeElements();

            // Set up event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('✅ QR Scanner initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize QR Scanner:', error);
            throw error;
        }
    }

    /**
     * Load the scanner HTML structure
     */
    async loadScannerHTML() {
        // Check if modal already exists
        if (document.getElementById('qrScannerModal')) {
            console.log('✅ QR Scanner HTML already loaded');
            return;
        }

        try {
            console.log('📥 Loading QR Scanner HTML...');
            const response = await fetch('./source/modals/scan-barcode/qr-scanner.html');
            if (!response.ok) {
                throw new Error(`Failed to load scanner HTML: ${response.status}`);
            }

            const html = await response.text();
            console.log('📄 QR Scanner HTML fetched, length:', html.length);

            // Insert the HTML into the document body
            document.body.insertAdjacentHTML('beforeend', html);

            // Wait a bit for DOM to update
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('✅ QR Scanner HTML loaded and inserted');
        } catch (error) {
            console.error('❌ Failed to load scanner HTML:', error);
            throw error;
        }
    }

    /**
     * Load Html5Qrcode library dynamically
     */
    async loadLibrary() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.Html5Qrcode) {
                resolve();
                return;
            }

            // Create script element
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode';
            script.type = 'text/javascript';
            script.onload = () => {
                console.log('✅ Html5Qrcode library loaded');
                resolve();
            };
            script.onerror = (error) => {
                console.error('❌ Failed to load Html5Qrcode library:', error);
                reject(error);
            };

            // Append to head
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        console.log('🔍 Looking for QR Scanner elements...');
        this.modalElement = document.getElementById('qrScannerModal');
        this.readerElement = document.getElementById('qrScannerReader');

        console.log('📋 Modal element:', this.modalElement);
        console.log('📋 Reader element:', this.readerElement);

        if (!this.modalElement || !this.readerElement) {
            console.error('❌ QR Scanner elements not found:', {
                modal: !!this.modalElement,
                reader: !!this.readerElement
            });
            throw new Error('QR Scanner HTML elements not found');
        }

        console.log('✅ QR Scanner elements found');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const closeBtn = document.getElementById('qrScannerCloseBtn');
        const retryBtn = document.getElementById('qrScannerRetryBtn');
        const assignBtn = document.getElementById('qrScannerAssignBtn');
        const flashBtn = document.getElementById('qrScannerFlashBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }

        if (assignBtn) {
            assignBtn.addEventListener('click', () => {
                this.close();
                this.options.onManualEntry(); // Reuse the same callback for assign code
            });
        }

        if (flashBtn) {
            flashBtn.addEventListener('click', () => this.toggleFlashlight());
        }

        // Close on background click
        if (this.modalElement) {
            this.modalElement.addEventListener('click', (e) => {
                if (e.target === this.modalElement) {
                    this.close();
                }
            });
        }

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isScanning) {
                this.close();
            }
        });
    }

    /**
     * Start the scanning line animation immediately
     */
    startScanLineAnimation() {
        const scanLine = document.querySelector('.qr-scanner-line');
        if (scanLine) {
            // Force animation restart by removing and re-adding the class
            scanLine.style.animation = 'none';
            scanLine.offsetHeight; // Trigger reflow
            scanLine.style.animation = 'qrScanLine 2s ease-in-out infinite';
        }
    }

    /**
     * Update the instruction text dynamically
     */
    updateInstructions(mainText, subText) {
        const mainTextEl = document.querySelector('.qr-scanner-main-text');
        const subTextEl = document.querySelector('.qr-scanner-sub-text');

        if (mainTextEl) mainTextEl.textContent = mainText;
        if (subTextEl) subTextEl.textContent = subText;
    }

    /**
     * Toggle flashlight on/off
     */
    async toggleFlashlight() {
        if (!this.isScanning || !this.html5QrCode) {
            console.log('⚠️ Cannot toggle flashlight - scanner not active');
            return;
        }

        try {
            const flashBtn = document.getElementById('qrScannerFlashBtn');
            const icon = flashBtn ? flashBtn.querySelector('i') : null;

            if (this.flashlightEnabled) {
                // Turn off flashlight
                await this.html5QrCode.setTorch(false);
                this.flashlightEnabled = false;

                if (flashBtn) flashBtn.classList.remove('active');
                if (icon) icon.className = 'fas fa-bolt';

                console.log('🔦 Flashlight turned OFF');
            } else {
                // Turn on flashlight
                await this.html5QrCode.setTorch(true);
                this.flashlightEnabled = true;

                if (flashBtn) flashBtn.classList.add('active');
                if (icon) icon.className = 'fas fa-bolt';

                console.log('🔦 Flashlight turned ON');
            }
        } catch (error) {
            console.error('❌ Failed to toggle flashlight:', error);
            // Show user-friendly message
            if (error.message.includes('not supported')) {
                alert('Flashlight not supported on this device');
            } else {
                alert('Failed to toggle flashlight');
            }
        }
    }

    /**
     * Show the scanner modal
     */
    async show() {
        if (!this.isInitialized) {
            throw new Error('QR Scanner not initialized');
        }

        console.log('📱 Showing QR Scanner modal...');

        // Show modal immediately with rectangle visible
        this.modalElement.classList.add('active');

        // Start the scanning line animation immediately for instant feedback
        this.startScanLineAnimation();

        // Update instructions to show ready state
        this.updateInstructions('Scan QR Code', 'Position code in the rectangle');

        console.log('✅ Modal classes:', this.modalElement.className);
        console.log('✅ Modal computed style:', window.getComputedStyle(this.modalElement).display);

        // Start scanning immediately without delay
        this.startScanning().catch(error => {
            console.error('❌ Failed to start scanning:', error);
            this.showError(error.message);
        });
    }

    /**
     * Close the scanner modal
     */
    async close() {
        await this.stopScanning();
        this.modalElement.classList.remove('active');

        // Stop the scanning line animation
        const scanLine = document.querySelector('.qr-scanner-line');
        if (scanLine) {
            scanLine.style.animation = 'none';
        }

        // Turn off flashlight if it was on
        if (this.flashlightEnabled) {
            this.flashlightEnabled = false;
            const flashBtn = document.getElementById('qrScannerFlashBtn');
            if (flashBtn) {
                flashBtn.classList.remove('active');
                const icon = flashBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-bolt';
            }
        }

        this.options.onClose();
    }

    /**
     * Start the scanning process
     */
    async startScanning() {
        // Don't show loading initially - rectangle is already visible
        // this.showLoading();

        // Check if Html5Qrcode is available
        if (typeof Html5Qrcode === 'undefined') {
            console.error('❌ Html5Qrcode library not loaded');
            this.showError('Scanner library not loaded');
            return;
        }

        // Create scanner instance
        this.html5QrCode = new Html5Qrcode('qrScannerReader');

        // Configure scanner with mobile-friendly settings
        const config = {
            fps: this.options.fps,
            qrbox: this.options.qrbox,
            aspectRatio: 2.0, // Changed to horizontal (width/height = 2:1)
            disableFlip: false,
            supportedScanTypes: ["qr_code"],
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        console.log('🚀 Starting QR scanner...');

        // Start scanning and return the promise for proper error handling
        return this.html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                console.log('✅ QR code scanned:', decodedText);
                this.onScanSuccess(decodedText, decodedResult);
            },
            (errorMessage) => {
                // Ignore common scanning errors
                console.log('📝 Scanner status:', errorMessage);
            }
        ).then(() => {
            this.isScanning = true;
            // Don't hide loading since it wasn't shown initially
            this.hideError();
            // Update instructions to indicate camera is ready
            this.updateInstructions('Ready to scan', 'Position QR code and scan automatically');
            console.log('✅ QR scanner started successfully');
        }).catch((error) => {
            console.error('❌ Failed to start scanning:', error);
            this.showError(error.message);
            this.options.onScanError(error);
            throw error; // Re-throw to maintain promise chain
        });
    }

    /**
     * Stop the scanning process
     */
    async stopScanning() {
        if (this.html5QrCode && this.isScanning) {
            try {
                await this.html5QrCode.stop();
                this.isScanning = false;
                console.log('✅ QR scanner stopped');
            } catch (error) {
                console.error('❌ Error stopping scanner:', error);
            }
        }
    }

    /**
     * Retry scanning after an error
     */
    async retry() {
        this.hideError();
        await this.startScanning();
    }

    /**
     * Handle successful scan
     */
    onScanSuccess(decodedText, decodedResult) {
        // Provide haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // Stop scanning
        this.stopScanning();

        // Call success callback
        this.options.onScanSuccess(decodedText, decodedResult);

        // Close modal after a short delay
        setTimeout(() => {
            this.close();
        }, 500);
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loadingEl = document.getElementById('qrScannerLoading');
        const errorEl = document.getElementById('qrScannerError');
        const retryBtn = document.getElementById('qrScannerRetryBtn');

        if (loadingEl) loadingEl.style.display = 'flex';
        if (errorEl) errorEl.style.display = 'none';
        if (retryBtn) retryBtn.style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingEl = document.getElementById('qrScannerLoading');
        if (loadingEl) loadingEl.style.display = 'none';
    }

    /**
     * Show error state
     */
    showError(message) {
        const loadingEl = document.getElementById('qrScannerLoading');
        const errorEl = document.getElementById('qrScannerError');
        const errorTextEl = document.getElementById('qrScannerErrorText');
        const retryBtn = document.getElementById('qrScannerRetryBtn');

        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'flex';
        if (errorTextEl) errorTextEl.textContent = message || 'Camera access failed';
        if (retryBtn) retryBtn.style.display = 'inline-flex';
    }

    /**
     * Hide error state
     */
    hideError() {
        const errorEl = document.getElementById('qrScannerError');
        const retryBtn = document.getElementById('qrScannerRetryBtn');

        if (errorEl) errorEl.style.display = 'none';
        if (retryBtn) retryBtn.style.display = 'none';
    }

    /**
     * Check if scanner is currently active
     */
    isActive() {
        return this.isScanning;
    }

    /**
     * Get scanner instance (for advanced usage)
     */
    getScannerInstance() {
        return this.html5QrCode;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopScanning();
        this.isInitialized = false;

        // Remove event listeners (simplified cleanup)
        const modal = document.getElementById('qrScannerModal');
        if (modal) {
            modal.remove();
        }
    }
}

// Export for use in other modules
export default QRScanner;

// Global access for simple usage
window.QRScanner = QRScanner;