const BoothManager = {
    // State management
    state: {
        selectedBooths: new Set(),
        processingBooths: new Set(),
        booths: new Map(),
        eventId: null,
        selectedIds: new Set()
    },

    // Initialize the floor plan
    async init(eventId) {
        this.state.eventId = eventId;
        await this.fetchBooths();
        this.renderBooths();
        this.setupEventListeners();
        // this.showSelectedId();
    },

    // Fetch booths from API
    async fetchBooths() {
        try {
            const response = await fetch(`/api/booths/?event_id=${this.state.eventId}`);
            if (!response.ok) throw new Error('Failed to fetch booths');

            const boothsData = await response.json();
            this.state.booths.clear();
            boothsData.forEach(booth => {
                this.state.booths.set(booth.booth_number, booth);
            });
        } catch (error) {
            console.error('Error fetching booths:', error);
            this.showAlert('Failed to load booths. Please refresh the page.', 'danger');
        }
    },

    // Render booths on the floor plan
    renderBooths() {
        const floorContainer = document.querySelector('.floor-container');
        if (!floorContainer) return;

        // Clear existing booths
        const existingBooths = floorContainer.querySelectorAll('.booth');
        existingBooths.forEach(booth => booth.remove());

        // Group booths by row (A, B, etc.)
        const boothsByRow = new Map();
        this.state.booths.forEach(booth => {
            const row = booth.booth_number.charAt(0);
            if (!boothsByRow.has(row)) {
                boothsByRow.set(row, []);
            }
            boothsByRow.get(row).push(booth);
        });

        // Render each row
        boothsByRow.forEach((booths, row) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'd-flex flex-wrap justify-content-center';

            booths.sort((a, b) => {
                return parseInt(a.booth_number.slice(1)) - parseInt(b.booth_number.slice(1));
            }).forEach(booth => {
                rowDiv.appendChild(this.createBoothElement(booth));
            });

            // Add aisle after each row except the last
            if (row !== Array.from(boothsByRow.keys()).pop()) {
                const aisle = document.createElement('div');
                aisle.className = 'aisle';
                floorContainer.appendChild(rowDiv);
                floorContainer.appendChild(aisle);
            } else {
                floorContainer.appendChild(rowDiv);
            }
        });

        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    },

    // Create a single booth element
    createBoothElement(booth) {
        $('#checkoutButton').prop('disabled', !this.state.selectedBooths.size);
        const div = document.createElement('div');
        div.className = `booth ${booth.status}`;
        div.dataset.booth = booth.booth_number;
        div.dataset.price = booth.price;
        div.dataset.id = booth.id;

        let boothContent = '';

        if (booth.status === 'reserved' && booth.reservation_info) {
            boothContent = `
                <span class="booth-info">${booth.booth_type.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();})}</span>
                <span class="reserved-text">Reserved</span>
               
                
            `;

            const tooltipContent = `
                <div class="reservation-details">
                    <strong>Booth:</strong> ${booth.booth_number}<br>
                    <strong>Company:</strong> ${booth.reservation_info.company_name}<br>
                    <strong>Contact:</strong> ${booth.reservation_info.contact_person}<br>
                    ${booth.reservation_info.email ? `<strong>Email:</strong> ${booth.reservation_info.email}<br>` : ''}
                    ${booth.reservation_info.phone ? `<strong>Phone:</strong> ${booth.reservation_info.phone}` : ''}
                </div>
            `;

            div.setAttribute('data-bs-toggle', 'tooltip');
            div.setAttribute('data-bs-html', 'true');
            div.setAttribute('data-bs-placement', 'top');
            div.setAttribute('title', tooltipContent);
        } else {
            boothContent = `
                <span class="booth-info">${booth.booth_type.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();})}</span>
                ${booth.booth_number}
                <span class="booth-price">TZS ${parseFloat(booth.price).toLocaleString()}</span>
            `;
        }

        div.innerHTML = boothContent;
        return div;
    },

    // Set up event listeners
    setupEventListeners() {
        document.querySelector('.floor-container').addEventListener('click', (e) => {
            const boothElement = e.target.closest('.booth');
            if (!boothElement) return;

            const boothId = boothElement.dataset.booth;
            const boothData = this.state.booths.get(boothId);

            if (boothData.status === 'reserved' || boothData.status === 'processing') {
                return;
            }

            if (boothElement.classList.contains('selected')) {
                boothElement.classList.remove('selected');
                this.state.selectedBooths.delete(boothId);
            } else {
                boothElement.classList.add('selected');
                this.state.selectedBooths.add(boothId);
            }

            this.updateSelectedBoothsList();
        });
    },

    // Show checkout modal
    showCheckoutModal() {
        const modalHtml = `
            <div class="checkout-modal" id="checkoutModal">
                <div class="checkout-container">
                    <div class="checkout-header mb-2">
                        <h2 class="checkout-title">Complete Your Reservation</h2>
                        <p class="checkout-subtitle mb-0">You're just a few steps away from securing your booth space</p>
                        <button class="checkout-close" onclick="BoothManager.closeCheckoutModal()">&times;</button>
                    </div>
                    
                    <div class="checkout-body">
                        <div class="checkout-section mb-2">
                            <h3 class="checkout-section-title mb-2">Selected Booths</h3>
                            <div class="selected-booths mb-2" id="checkoutSelectedBooths"></div>
                            
                            <div class="checkout-summary p-3 bg-light rounded">
                                <div class="summary-row d-flex justify-content-between mb-2">
                                    <span class="fw-medium">Number of Booths:</span>
                                    <span id="summaryBoothCount" class="fw-bold">0</span>
                                </div>
                                <div class="summary-row summary-total d-flex justify-content-between">
                                    <span class="fw-medium">Total Amount:</span>
                                    <span id="summaryTotal" class="fw-bold">TZS 0</span>
                                </div>
                            </div>
                        </div>
                        <div class="checkout-section">
                            <h3 class="checkout-section-title mb-3">Contact Information</h3>
                            <form class="checkout-form" id="checkoutForm">
                                <input type="hidden" name="csrfmiddlewaretoken" value="${this.getCSRFToken() || ''}">
                                <div class="form-group full-width mb-1">
                                    <label class="form-label">Company Name</label>
                                    <input type="text" class="form-input" name="company" required>
                                </div>
                                <div class="row mb-1">
                                    <div class="col-md-6">
                                        <label class="form-label">Contact Person</label>
                                        <input type="text" class="form-input" name="contact" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Phone Number</label>
                                        <input type="tel" class="form-input" name="phone" required>
                                    </div>
                                </div>
                                <div class="form-group full-width mb-1">
                                    <label class="form-label">Email Address</label>
                                    <input type="email" class="form-input" name="email" required>
                                </div>
                            </form>
                        </div>
                        <div class="checkout-footer mb-2 pb-2 d-flex justify-content-end gap-3">
                            <button class="btn btn-secondary" onclick="BoothManager.closeCheckoutModal()">Cancel</button>
                            <button class="btn btn-primary" onclick="BoothManager.processCheckout()">Complete Reservation</button>
                        </div>
                    </div>                 
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        requestAnimationFrame(() => {
            const modal = document.getElementById('checkoutModal');
            modal.classList.add('active');
            this.updateCheckoutSummary();
        });
    },

    // Close checkout modal
    closeCheckoutModal() {
        const modal = document.getElementById('checkoutModal');
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    },

    // Update checkout summary
    updateCheckoutSummary() {
        const selectedBooths = Array.from(this.state.selectedBooths);
        const boothsContainer = document.getElementById('checkoutSelectedBooths');
        const summaryBoothCount = document.getElementById('summaryBoothCount');
        const summaryTotal = document.getElementById('summaryTotal');

        // console.log(`Selected Booths: ${selectedBooths}`);

        // Update selected booths display
        boothsContainer.innerHTML = selectedBooths.map(boothId => {
            const booth = this.state.booths.get(boothId);
            // console.log(`Booth: ${booth.id}`);
            // console.log(boothId);
            return `
                <div class="selected-booth-item d-flex justify-content-between align-items-center p-2 border-bottom">
                    <div>
                        <span class="booth-number fw-bold">Booth ${booth.booth_number}</span>
                        <span class="booth-type text-muted ms-2">${booth.booth_type}</span>
                    </div>
                    <span class="booth-price">TZS ${parseFloat(booth.price).toLocaleString()}</span>
                </div>
            `;
        }).join('');

        // Update summary
        let totalPrice = 0;
        selectedBooths.forEach(boothId => {
            totalPrice += parseFloat(this.state.booths.get(boothId).price);
        });

        summaryBoothCount.textContent = selectedBooths.length;
        summaryTotal.textContent = `TZS ${totalPrice.toLocaleString()}`;
    },

    // Process checkout
    async processCheckout() {
        const form = document.getElementById('checkoutForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);

        const selectedBoothsArray = Array.from(this.state.selectedBooths);

        const ids = selectedBoothsArray.map(
            booth => {
                const boothdata = this.state.booths.get(booth);
                return boothdata.id;
            }
        );


        // console.log(`Selected Booths list: ${ids}`);
        // console.log(` booths: ${JSON.stringify(ids)},
        //     event_id: ${this.state.eventId},
        //     company: ${formData.get('company')},
        //     contact: ${formData.get('contact')},
        //     email: ${formData.get('email')},
        //     phone: ${formData.get('phone')}`);

        // console.group(
        //    JSON.stringify({
        //             booths: ids,
        //             event_id: this.state.eventId,
        //             company: formData.get('company'),
        //             contact: formData.get('contact'),
        //             email: formData.get('email'),
        //             phone: formData.get('phone')
        //         })
        //     );

        try {
            const csrfToken = this.getCSRFToken();
            const headers = {
                'Content-Type': 'application/json'
            };

            if (csrfToken) {
                headers['X-CSRFToken'] = csrfToken;
            }

            const response = await fetch('/api/booking/', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    booths: ids,
                    company: formData.get('company'),
                    contact: formData.get('contact'),
                    email: formData.get('email'),
                    phone: formData.get('phone')
                })
            });

            $.ajax({
                url: '/api/booking/?event_id=' + this.state.eventId,
                method: 'POST',
                headers: headers,
                contentType: 'application/json',
                data: JSON.stringify({
                    booths: ids,
                    company: formData.get('company'),
                    contact: formData.get('contact'),
                    email: formData.get('email'),
                    phone: formData.get('phone')
                }),
                success: function(response) {
                    console.log('Success:', response);
                    BoothManager.closeCheckoutModal();
                    BoothManager.showAlert(
                      "Booking successful! Your selected booths have been reserved.",
                      "success"
                    );
                    BoothManager.state.selectedBooths.clear();
                    BoothManager.fetchBooths().then(() => {
                        BoothManager.renderBooths();
                        BoothManager.updateSelectedBoothsList();
                    });
                },
                error: function(jqXHR, textStatus, errorThrown) 
                { 
                    console.error('Error:', textStatus, errorThrown); 
                    BoothManager.showAlert('Booking failed. Please try again.', 'danger'); 
                } }); 
            } catch (error) { 
                console.error('Booking error:', error); 
                this.showAlert('Booking failed. Please try again.', 'danger');    
          }    
    },

    // Update selected booths list
    updateSelectedBoothsList() {
        $('#checkoutButton').prop('disabled', !this.state.selectedBooths.size);
        const listElement = document.getElementById('selectedBoothsList');
        const totalElement = document.getElementById('totalPrice');

        if (this.state.selectedBooths.size === 0) {
            listElement.innerHTML = '<p class="text-muted">No booths selected</p>';
            totalElement.textContent = 'TZS 0';
            return;
        }

        let html = '<div class="list-group">';
        let totalPrice = 0;

        this.state.selectedBooths.forEach(boothId => {
            const boothData = this.state.booths.get(boothId);
            totalPrice += parseFloat(boothData.price);

            

            html += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Booth ${boothId}</strong>
                        <small class="d-block text-muted">${boothData.booth_type}</small>
                    </div>
                    <span class="price">TZS ${parseFloat(boothData.price).toLocaleString()}</span>
                </div>
            `;
            // this.state.selectedIds.add(boothData.id);
        });

        html += '</div>';
        listElement.innerHTML = html;
        totalElement.textContent = `TZS ${totalPrice.toLocaleString()}`;
        // this.showSelectedId();
    },

    // showSelectedId(){
    //     this.state.selectedBooths.forEach(booth => {
    //         const boothData = this.state.booths.get(booth);
    //         this.state.selectedIds.add(boothData.id)
    //     });
    //     this.state.selectedIds.forEach(id => {
    //         console.log(`Id :` + id);
    //     })
    // },

    // Show alert messages
    showAlert(message, type) {
        const alert = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        document.querySelector('.side-panel').insertAdjacentHTML('afterbegin', alert);
    },

    // Get CSRF token with improved error handling
    getCSRFToken() {
        // First try to get from hidden input
        const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfInput) {
            return csrfInput.value;
        }

        // Then try to get from cookie
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];

        if (cookieValue) {
            return cookieValue;
        }

        // If no CSRF token found, log a warning
        console.warn('No CSRF token found. Make sure you have included {% csrf_token %} in your template.');
        return null;
    },
};
