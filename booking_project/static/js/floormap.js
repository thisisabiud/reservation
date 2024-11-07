class FloorMap {
    constructor(containerId, eventId) {
        if (!containerId || !eventId) {
            throw new Error('Container ID and Event ID are required');
        }
        
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID "${containerId}" not found`);
        }
        
        this.eventId = eventId;
        this.selectedBooths = new Set();
        this.boothData = null;
        this.isLoading = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.init();
    }

    async init() {
        try {
            this.showLoadingState();
            await this.loadBoothData();
            this.setupEventListeners();
            this.initializeTooltips();
        } catch (error) {
            this.handleInitializationError(error);
        } finally {
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        this.isLoading = true;
        // Add loading indicator
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading floor map...</p>
        `;
        this.container.appendChild(loader);
    }

    hideLoadingState() {
        this.isLoading = false;
        const loader = this.container.querySelector('.loading-spinner');
        if (loader) {
            loader.remove();
        }
    }

    async loadBoothData() {
        console.log('Loading booth data...');

        try {
            const response = await fetch(`/api/booths/?event_id=${this.eventId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.boothData = await response.json();
            this.renderFloorMap(this.boothData);
        } catch (error) {
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                await this.retryLoadingData();
            } else {
                // If all retries fail, try loading fallback data
                await this.loadFallbackData();
            }
        }
    }

    async retryLoadingData() {
        const backoffTime = Math.min(1000 * Math.pow(2, this.retryAttempts), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.loadBoothData();
    }

    async loadFallbackData() {
        // Load fallback data from localStorage if available
        const fallbackData = localStorage.getItem(`floormap_${this.eventId}`);
        if (fallbackData) {
            try {
                this.boothData = JSON.parse(fallbackData);
                this.renderFloorMap(this.boothData);
                this.showWarning('Using cached data. Some information may be outdated.');
            } catch (error) {
                this.handleFallbackError();
            }
        } else {
            this.handleFallbackError();
        }
    }

    handleFallbackError() {
        // Create empty booth structure with default values
        this.showError('Unable to load booth data. Please try again later.');
        this.renderEmptyFloorMap();
    }

    renderEmptyFloorMap() {
        const booths = this.container.querySelectorAll('.booth');
        booths.forEach(booth => {
            const boothNumber = booth.dataset.booth;
            this.updateBoothDisplay(booth, {
                booth_number: boothNumber,
                status: 'available',
                booth_type: 'Standard',
                price: 0,
                reservation_info: null
            });
            booth.classList.add('unavailable');
        });
    }

    handleInitializationError(error) {
        console.error('Initialization error:', error);
        this.showError('Failed to initialize floor map. Please refresh the page.');
        this.container.innerHTML = `
            <div class="error-state text-center p-4">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h5>Unable to Load Floor Map</h5>
                <p class="text-muted">Please check your connection and try again.</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">
                    Retry
                </button>
            </div>
        `;
    }

    renderFloorMap(boothData) {
        if (!boothData || !Array.isArray(boothData)) {
            this.showError('Invalid booth data received');
            return;
        }

        // Cache the data for fallback
        try {
            localStorage.setItem(`floormap_${this.eventId}`, JSON.stringify(boothData));
        } catch (error) {
            console.warn('Failed to cache booth data:', error);
        }

        boothData.forEach(booth => {
            const boothElement = document.querySelector(`[data-booth="${booth.booth_number}"]`);
            if (boothElement) {
                this.updateBoothDisplay(boothElement, booth);
            }
        });
    }

    showWarning(message) {
        this.showAlert(message, 'warning');
    }

    // ... rest of the existing methods remain the same ...

    // Add method to check if booth data is stale
    isDataStale() {
        const lastUpdate = localStorage.getItem(`floormap_${this.eventId}_lastUpdate`);
        if (!lastUpdate) return true;
        
        const staleThreshold = 5 * 60 * 1000; // 5 minutes
        return Date.now() - parseInt(lastUpdate) > staleThreshold;
    }

    // Add method to validate booth data
    validateBoothData(boothData) {
        if (!Array.isArray(boothData)) return false;
        return boothData.every(booth => 
            booth.booth_number &&
            typeof booth.status === 'string' &&
            typeof booth.price === 'number'
        );
    }

    // Add cleanup method
    destroy() {
        // Remove event listeners
        document.querySelectorAll('.booth').forEach(booth => {
            booth.removeEventListener('click', this.handleBoothClick);
        });
        
        // Clear any tooltips
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(tooltip);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });

        // Clear selected booths
        this.selectedBooths.clear();
        this.updateSelectedBoothsList();
    }
}