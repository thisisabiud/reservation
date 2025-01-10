const BoothManager = {
  state: {
    selectedBooths: new Set(),
    processingBooths: new Set(),
    booths: new Map(),
    eventId: null,
    selectedIds: new Set(),
  },

  async init(eventId, boothType = 'all') {
    console.log('Initializing BoothManager:', { eventId, boothType });
    this.state.eventId = eventId;
    await this.fetchBooths(boothType);
    this.setupEventListeners();
  },

  async fetchBooths(boothType = 'all') {
    try {
        // Update URL with new booth type
        const url = new URL(window.location.href);
        url.searchParams.set('booth_type', boothType);
        window.history.pushState({}, '', url);

        // Update floor plan
        this.updateFloorPlan(boothType);

        // Fetch booths
        const apiUrl = new URL('/api/booths', window.location.origin);
        apiUrl.searchParams.append('event_id', this.state.eventId);
        apiUrl.searchParams.append('booth_type', boothType);

        const response = await fetch(apiUrl);
        const boothsData = await response.json();

        console.log('Fetched booth data:', boothsData);

        if (!response.ok) {
          throw new Error(boothsData.error || 'Failed to fetch booths');
        }

        // Clear and update booths collection
        this.state.booths.clear();
        boothsData.forEach((booth) => {
          console.log('Adding booth:', booth);
          this.state.booths.set(booth.booth_number, booth);
        });

        // Render the fetched booths
        this.renderBooths();
        Swal.close();
        return boothsData;

    } catch (error) {
        console.error("Error fetching booths:", error);
        Swal.fire({
          title: "Error",
          text: error.message,
          icon: "error"
        });
        return [];
    }
  },

  updateFloorPlan(boothType) {
    const container = document.getElementById('floorPlanContainer');
    const imageContainer = container.querySelector('img') || container.querySelector('.flex');
    
    if (boothType === 'premium' && container.dataset.premiumPlan) {
        imageContainer.outerHTML = `
            <img src="${container.dataset.premiumPlan}" 
                 alt="Premium Floor Plan"
                 class="w-full h-auto rounded-lg">
        `;
    } else if (boothType === 'standard' && container.dataset.standardPlan) {
        imageContainer.outerHTML = `
            <img src="${container.dataset.standardPlan}" 
                 alt="Standard Floor Plan"
                 class="w-full h-auto rounded-lg">
        `;
    } else {
        imageContainer.outerHTML = `
            <div class="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p class="text-gray-500 dark:text-gray-400">No floor plan available for ${boothType} booths</p>
            </div>
        `;
    }
},

  renderBooths() {
    console.log('Rendering booths, total:', this.state.booths.size);
    const $floorContainer = $(".floor-container");
    if (!$floorContainer.length) {
      console.error('Floor container not found');
      return;
    }

    $floorContainer.empty();

    // Group booths by row
    const boothsByRow = new Map();
    this.state.booths.forEach((booth) => {
      const row = booth.booth_number.charAt(0);
      if (!boothsByRow.has(row)) {
        boothsByRow.set(row, []);
      }
      boothsByRow.get(row).push(booth);
    });

    console.log('Booths by row:', [...boothsByRow.entries()]);

    boothsByRow.forEach((booths, row) => {
      const $rowDiv = $("<div>", {
        class: "flex flex-wrap justify-center mb-4"
      });

      booths.forEach((booth) => {
        const $boothElement = this.createBoothElement(booth);
        $rowDiv.append($boothElement);
      });

      $floorContainer.append($rowDiv);
    });
  },

  // Create a single booth element
  createBoothElement(booth) {
    $("#checkoutButton").prop("disabled", !this.state.selectedBooths.size);

    const boothStyles = {
        available: `
            bg-white dark:bg-gray-800
            hover:bg-gradient-to-br hover:from-indigo-50/80 hover:to-blue-50/80
            dark:hover:from-indigo-900/30 dark:hover:to-blue-900/30
            transform hover:scale-105 hover:-translate-y-1
            border-2 border-blue-400/50 dark:border-blue-500/50
            hover:border-gradient-to-r hover:from-blue-400 hover:to-indigo-400
            dark:hover:from-blue-500 dark:hover:to-indigo-500
            cursor-pointer
            shadow-lg hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-blue-900/30
            hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-700 hover:ring-opacity-50
        `,
        reserved: `
            bg-gray-100 dark:bg-gray-700
            border-2 border-gray-300 dark:border-gray-600
            cursor-not-allowed
            opacity-75
            grayscale
        `,
        processing: `
            bg-gradient-to-br from-yellow-50 to-yellow-100
            dark:from-yellow-900/30 dark:to-yellow-800/30
            border-2 border-yellow-400 dark:border-yellow-500
            animate-pulse
        `,
        selected: `
            bg-blue-200 dark:bg-blue-600
            border-2 border-blue-400 dark:border-blue-500
            transform scale-110 -translate-y-1
            shadow-lg shadow-blue-200/50 dark:shadow-blue-900/50
            ring-4 ring-blue-300 dark:ring-blue-600 ring-opacity-50
            z-10
            backdrop-blur-sm
            hover:shadow-xl
            hover:ring-blue-400 dark:hover:ring-blue-500
            text-gray-900 dark:text-white
            cursor-pointer
        `
    };

    const $div = $("<div>", {
        class: `
            booth 
            w-[120px] h-[120px] 
            m-[10px] 
            inline-flex flex-col 
            items-center justify-center 
            transition-all duration-300 ease-in-out 
            rounded-[12px] 
            relative 
            font-semibold text-[1.2em] 
            transform perspective-[1000px] rotate-x-[5deg] 
            p-[10px] 
            text-center 
            backdrop-blur-[5px]
            ${boothStyles[booth.status]}
        `,
        "data-booth": booth.booth_number,
        "data-price": booth.price,
        "data-id": booth.id,
    });

    let boothContent = `
        <span class="absolute top-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            ${this.formatBoothType(booth.booth_type)}
        </span>
        <span class="text-lg font-bold text-gray-800 dark:text-gray-200">
            ${booth.booth_number}
        </span>
        <span class="absolute bottom-2 text-sm font-medium ${
            booth.status === 'reserved' 
            ? 'text-red-500 dark:text-red-400' 
            : 'text-blue-600 dark:text-blue-400'
        }">
            ${booth.status === 'reserved' ? 'Reserved' : `TZS ${booth.price}`}
        </span>
    `;

    $div.html(boothContent);
    return $div;
},

  // Format booth type with proper capitalization
  formatBoothType(type) {
    return type.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },

  // Set up event listeners
  setupEventListeners() {
    $(".floor-container").on("click", ".booth", (e) => {
      const $boothElement = $(e.currentTarget);
      const boothId = $boothElement.data("booth");
      const boothData = this.state.booths.get(boothId);
      
      if (boothData.status === "reserved" || boothData.status === "processing") {
          return;
      }

      if (this.state.selectedBooths.has(boothId)) {
          this.state.selectedBooths.delete(boothId);
          boothData.status = 'available';
      } else {
          this.state.selectedBooths.add(boothId);
          boothData.status = 'selected';
      }

      this.renderBooths();
      this.updateSelectedBoothsList();
    });
  },

  // Show checkout modal
  showCheckoutModal() {
    const modalHtml = `
            <div id="checkoutModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
    <div class="bg-white rounded-xl shadow-2xl w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
        <!-- Sticky Header -->
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <h2 class="text-2xl font-bold text-gray-800">Complete Your Reservation</h2>
            <button id="closeCheckoutModal" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>

        <div class="p-6">
            <div class="grid md:grid-cols-2 gap-8">
                <!-- Selected Booths Section -->
                <div>
                    <div class="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                            Selected Booths
                        </h3>
                        <div id="checkoutSelectedBooths" class="space-y-3">
                            <!-- Dynamically populated booths -->
                        </div>
                    </div>

                    <div class="bg-blue-50 rounded-lg p-4">
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-700">Number of Booths:</span>
                            <span id="summaryBoothCount" class="font-semibold">0</span>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t border-blue-100">
                            <span class="font-semibold text-gray-900">Total Amount:</span>
                            <span id="summaryTotal" class="text-lg font-bold text-blue-600">TZS 0</span>
                        </div>
                    </div>
                </div>

                <!-- Contact Information Form -->
                <div>
                    <form id="checkoutForm" class="space-y-6">
                       <input type="hidden" name="csrfmiddlewaretoken" value="${
                         this.getCSRFToken() || ""
                       }">
                        
                        <div class="space-y-4">
                            <h3 class="text-lg font-semibold flex items-center gap-2">
                                <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                Contact Information
                            </h3>

                            <div class="form-group">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input type="text" name="company" required 
                                    class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                    <input type="text" name="contact" required 
                                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div class="form-group">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input type="tel" name="phone" required 
                                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input type="email" name="email" required 
                                    class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>

                            <!-- Exhibitors Section -->
                            <div class="mt-6">
                                <label class="block text-sm font-medium text-gray-700 mb-3">Exhibitors</label>
                                <div id="exhibitorsContainer" class="space-y-3">
                                    <div class="exhibitor-field flex items-center gap-2 group">
                                        <input type="text" 
                                            name="exhibitors[]" 
                                            placeholder="Exhibitor name"
                                            required 
                                            class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200">
                                        <button type="button" 
                                            class="remove-exhibitor p-2 text-gray-400 hover:text-red-500 rounded-lg opacity-50 group-hover:opacity-100 transition-all duration-200"
                                            style="display: none;">
                                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <button type="button" 
                                    id="addExhibitor"
                                    class="mt-4 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg 
                                    hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800
                                    transition-all duration-300 ease-in-out transform hover:scale-[1.02] 
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                    shadow-sm hover:shadow-md
                                    flex items-center justify-center gap-3">
                                    <svg class="w-4 h-4 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                    </svg>
                                    <span>Add Exhibitor</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Footer Buttons -->
            <div class="mt-8 flex justify-end gap-4">
                <button id="cancelCheckout" 
                    class="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200">
                    Cancel
                </button>
                <button id="completeReservation" 
                    class="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg
                    hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800
                    transition-all duration-300 ease-in-out transform hover:scale-[1.02] 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    shadow-sm hover:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2">
                    <span>Complete Reservation</span>
                    <svg class="w-5 h-5 animate-spin hidden" id="submitSpinner" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                </button>
            </div>
        </div>
    </div>
</div>
        `;

    $("body").append(modalHtml);

    // Setup modal event listeners
    $("#closeCheckoutModal, #cancelCheckout").on("click", () =>
      this.closeCheckoutModal()
    );
    $("#completeReservation").on("click", () => this.processCheckout());

    this.updateCheckoutSummary();
    // Exhibitor field handling
    $("#addExhibitor").on("click", function () {
      const newField = $("#exhibitorsContainer .exhibitor-field")
        .first()
        .clone();
      newField.find("input").val("");
      newField.find(".remove-exhibitor").css("display", "flex");

      // Add fade-in animation
      newField.hide();
      $("#exhibitorsContainer").append(newField);
      newField.fadeIn(300);
    });

    $("#exhibitorsContainer").on("click", ".remove-exhibitor", function () {
      if ($(".exhibitor-field").length > 1) {
        $(this)
          .closest(".exhibitor-field")
          .addClass("scale-95 opacity-0")
          .fadeOut(200, function () {
            $(this).remove();
          });
      }
    });
  },

  // Close checkout modal
  closeCheckoutModal() {
    $("#checkoutModal").remove();
  },

  // Update checkout summary
  updateCheckoutSummary() {
    const selectedBooths = Array.from(this.state.selectedBooths);
    const $boothsContainer = $("#checkoutSelectedBooths");
    const $summaryBoothCount = $("#summaryBoothCount");
    const $summaryTotal = $("#summaryTotal");

    // Update selected booths display
    $boothsContainer.html(
      selectedBooths
        .map((boothId) => {
          const booth = this.state.booths.get(boothId);
          return `
                <div class="flex justify-between items-center bg-gray-100 p-2 rounded">
                    <div>
                        <span class="font-bold">Booth ${
                          booth.booth_number
                        }</span>
                        <span class="text-sm text-gray-600 ml-2">${this.formatBoothType(
                          booth.booth_type
                        )}</span>
                    </div>
                    <span class="text-blue-600">TZS ${parseFloat(
                      booth.price
                    ).toLocaleString()}</span>
                </div>
            `;
        })
        .join("")
    );

    // Calculate total price
    const totalPrice = selectedBooths.reduce((total, boothId) => {
      return total + parseFloat(this.state.booths.get(boothId).price);
    }, 0);

    $summaryBoothCount.text(selectedBooths.length);
    $summaryTotal.text(`TZS ${totalPrice.toLocaleString()}`);
  },

  // Process checkout
  async processCheckout() {
    const $form = $("#checkoutForm");

    // Validate form
    if (!$form[0].checkValidity()) {
      $form[0].reportValidity();
      return;
    }

    const selectedBoothsArray = Array.from(this.state.selectedBooths);
    const ids = selectedBoothsArray.map((booth) => {
      const boothData = this.state.booths.get(booth);
      return boothData.id;
    });

    const formData = $form.serializeArray();
    const payload = {
      booths: ids,
      event_id: this.state.eventId,
      company: formData.find((f) => f.name === "company").value,
      contact: formData.find((f) => f.name === "contact").value,
      email: formData.find((f) => f.name === "email").value,
      phone: formData.find((f) => f.name === "phone").value,
      exhibitors: formData
        .filter((f) => f.name === "exhibitors[]")
        .map((f) => f.value),
    };

    try {
      // Show loading state
      Swal.fire({
        title: "Processing Reservation",
        html: "Please wait while we process your booking...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await $.ajax({
        url: `/api/booking/?event_id=${this.state.eventId}`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
        headers: {
          "X-CSRFToken": this.getCSRFToken(),
        },
      });

      // Close loading and show success with animation
      Swal.close();
      await Swal.fire({
        title: "Reservation Complete!",
        html: `
              <div class="mb-4">
                  <svg class="mx-auto w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
              </div>
              <p class="text-gray-600">Your booth reservation was successful!</p>
          `,
        icon: null,
        showConfirmButton: true,
        confirmButtonText: "Close",
        confirmButtonColor: "#3B82F6",
        allowOutsideClick: false,
        customClass: {
          popup: "animated fadeInUp faster",
        },
      });

      this.state.selectedBooths.clear();
      this.closeCheckoutModal();

      // Refresh booths with loading indicator
      await this.fetchBooths();
      this.renderBooths();
      this.updateSelectedBoothsList();
    } catch (error) {
      console.error("Booking error:", error);
      Swal.fire({
        title: "Reservation Failed",
        html: `
              <div class="mb-4">
                  <svg class="mx-auto w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
              </div>
              <p class="text-gray-600">There was an error processing your reservation. Please try again.</p>
          `,
        icon: null,
        confirmButtonText: "Try Again",
        confirmButtonColor: "#3B82F6",
        customClass: {
          popup: "animated fadeInUp faster",
        },
      });
    }
  },

  updateSelectedBoothsList() {
    $("#checkoutButton").prop("disabled", !this.state.selectedBooths.size);
    const $listElement = $("#selectedBoothsList");
    const $totalElement = $("#totalPrice");

    if (this.state.selectedBooths.size === 0) {
        $listElement.html('<p class="text-gray-500 dark:text-gray-400">No booths selected</p>');
        $totalElement.text("TZS 0");
        return;
    }

    let html = '<div class="space-y-2">';
    let totalPrice = 0;

    this.state.selectedBooths.forEach((boothId) => {
        const boothData = this.state.booths.get(boothId);
        totalPrice += parseFloat(boothData.price);

        html += `
            <div class="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-2 rounded transition-colors duration-200">
                <div>
                    <strong class="text-gray-800 dark:text-gray-200">Booth ${boothId}</strong>
                    <small class="block text-gray-500 dark:text-gray-400">${this.formatBoothType(
                        boothData.booth_type
                    )}</small>
                </div>
                <span class="text-blue-600 dark:text-blue-400 font-bold">TZS ${parseFloat(
                    boothData.price
                ).toLocaleString()}</span>
            </div>
        `;
    });

    html += "</div>";
    $listElement.html(html);
    $totalElement.text(`TZS ${totalPrice.toLocaleString()}`);
},
  // Utility method to get CSRF token
  getCSRFToken() {
    return (
      $("input[name=csrfmiddlewaretoken]").val() ||
      document.cookie.replace(
        /(?:(?:^|.*;\s*)csrftoken\s*\=\s*([^;]*).*$)|^.*$/,

        "$1"
      )
    );
  },
};
