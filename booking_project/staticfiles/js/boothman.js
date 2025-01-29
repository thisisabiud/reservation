const BoothManager = {
  state: {
    selectedBooths: new Set(),
    processingBooths: new Set(),
    booths: new Map(),
    eventId: null,
    selectedIds: new Set(),
    paymentMethods: [], // Initialize as empty array
    selectedPaymentMethod: null,
  },

  async init(eventId, boothType = "all") {
    console.log("Initializing BoothManager:", { eventId, boothType });
    this.state.eventId = eventId;
    await Promise.all([
      this.fetchBooths(boothType),
      this.fetchPaymentMethods(),
    ]);
    this.setupEventListeners();
  },

  async fetchBooths(boothType = "all") {
    // Show loading state
    Swal.fire({
        title: 'Loading Booths...',
        text: 'Please wait while we fetch the booth information',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Update URL with new booth type
        const url = new URL(window.location.href);
        url.searchParams.set("booth_type", boothType);
        window.history.pushState({}, "", url);

        // Update floor plan
        this.updateFloorPlan(boothType);

        // Fetch booths
        const apiUrl = new URL("/api/booths", window.location.origin);
        apiUrl.searchParams.append("event_id", this.state.eventId);
        apiUrl.searchParams.append("booth_type", boothType);

        const response = await fetch(apiUrl);
        const boothsData = await response.json();

        if (!response.ok) {
            throw new Error(boothsData.error || "Failed to fetch booths");
        }

        // Clear and update booths collection
        this.state.booths.clear();
        boothsData.forEach((booth) => {
            this.state.booths.set(booth.booth_number, booth);
        });

        // Render the fetched booths
        this.renderBooths();

        // Show success message
        Swal.fire({
            title: 'Success!',
            text: 'Booths loaded successfully',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });

        return boothsData;
    } catch (error) {
        console.error("Error fetching booths:", error);
        Swal.fire({
            title: "Error Loading Booths",
            text: error.message,
            icon: "error",
            confirmButtonText: 'Retry',
            showCancelButton: true
        }).then((result) => {
            if (result.isConfirmed) {
                this.fetchBooths(boothType);
            }
        });
        return [];
    }
},

  async fetchPaymentMethods() {
    try {
      const response = await fetch(`/api/events/${this.state.eventId}/`);
      if (!response.ok) throw new Error("Failed to fetch payment methods");

      const data = await response.json();
      console.log("Fetched event data:", data);

      // Extract payment_methods array from response
      if (data.payment_methods && Array.isArray(data.payment_methods)) {
        this.state.paymentMethods = data.payment_methods;
        console.log("Updated payment methods:", this.state.paymentMethods);
      } else {
        console.warn("No payment methods found in response");
        this.state.paymentMethods = [];
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      this.state.paymentMethods = [];
    }
  },

  updateFloorPlan(boothType) {
    const container = document.getElementById("floorPlanContainer");
    const imageContainer =
      container.querySelector("img") || container.querySelector(".flex");

    if (boothType === "premium" && container.dataset.premiumPlan) {
      imageContainer.outerHTML = `
            <img src="${container.dataset.premiumPlan}" 
                 alt="Premium Floor Plan"
                 class="w-full h-auto rounded-lg">
        `;
    } else if (boothType === "standard" && container.dataset.standardPlan) {
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
    console.log("Rendering booths, total:", this.state.booths.size);
    const $floorContainer = $(".floor-container");
    if (!$floorContainer.length) {
      console.error("Floor container not found");
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

    console.log("Booths by row:", [...boothsByRow.entries()]);

    boothsByRow.forEach((booths, row) => {
      const $rowDiv = $("<div>", {
        class: "flex flex-wrap justify-center mb-4",
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
        `,
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
          booth.status === "reserved"
            ? "text-red-500 dark:text-red-400"
            : "text-blue-600 dark:text-blue-400"
        }">
            ${booth.status === "reserved" ? "Reserved" : `TZS ${booth.price}`}
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

      if (
        boothData.status === "reserved" ||
        boothData.status === "processing"
      ) {
        return;
      }

      if (this.state.selectedBooths.has(boothId)) {
        this.state.selectedBooths.delete(boothId);
        boothData.status = "available";
      } else {
        this.state.selectedBooths.add(boothId);
        boothData.status = "selected";
      }

      this.renderBooths();
      this.updateSelectedBoothsList();
    });

    // Add payment type change listener
    $(document).on("change", 'input[name="payment_type"]', function () {
      const isMobile = $(this).val() === "mobile";
      $("#mobileProviders").toggleClass("hidden", !isMobile);
      console.log("Payment type changed:", {
        isMobile,
        methods: BoothManager.state.paymentMethods,
      });
    });
  },

  // Show checkout modal
  showCheckoutModal() {
    const isMobile = window.innerWidth < 1024;
    const modalHtml = `
        <div id="checkoutModal" class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 
                    flex ${
                      isMobile ? "items-end" : "items-center"
                    } justify-center">
            <div class="bg-white dark:bg-gray-800 
                        ${
                          isMobile
                            ? "w-full rounded-t-2xl max-h-[90vh]"
                            : "rounded-2xl w-11/12 max-w-4xl max-h-[90vh]"
                        }
                        shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out
                        ${isMobile ? "translate-y-0" : "scale-100"}">
                
                ${
                  isMobile
                    ? `
                    <!-- Mobile Drag Handle -->
                    <div class="sticky top-0 bg-white dark:bg-gray-800 pt-4 pb-2 px-6 flex justify-center">
                        <div class="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    </div>
                `
                    : ""
                }

                <!-- Modal Header -->
                <div class="sticky top-${
                  isMobile ? "10" : "0"
                } bg-white dark:bg-gray-800 
                            border-b border-gray-200 dark:border-gray-700 px-6 py-4 
                            flex justify-between items-center z-10">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Reservation</h2>
                    <button id="closeCheckoutModal" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <svg class="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <!-- Modal Content -->
                <div class="p-6">
                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- Selected Booths Section -->
                        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
        Selected Booths
    </h3>
    <div id="checkoutSelectedBooths" class="space-y-3">
        <!-- Booths will be populated here -->
    </div>

    <!-- Summary Box -->
    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-between mb-2">
            <span class="text-gray-600 dark:text-gray-400">Number of Booths:</span>
            <span id="summaryBoothCount" class="font-semibold text-gray-900 dark:text-white">0</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="font-semibold text-gray-900 dark:text-white">Total Amount:</span>
            <span id="summaryTotal" class="text-lg font-bold text-blue-600 dark:text-blue-400">TZS 0</span>
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
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        Contact Information
    </h3>

                                 <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
        <input type="text" name="company" required 
            class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 
                   border border-gray-300 dark:border-gray-600 
                   text-gray-900 dark:text-white 
                   placeholder-gray-500 dark:placeholder-gray-400
                   rounded-lg focus:outline-none focus:ring-2 
                   focus:ring-blue-500 dark:focus:ring-blue-400
                   focus:border-transparent transition-colors">
    </div>

                                        <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
            <input type="text" name="contact" required 
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 
                       border border-gray-300 dark:border-gray-600 
                       text-gray-900 dark:text-white 
                       placeholder-gray-500 dark:placeholder-gray-400
                       rounded-lg focus:outline-none focus:ring-2 
                       focus:ring-blue-500 dark:focus:ring-blue-400
                       focus:border-transparent transition-colors">
        </div>
        <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <input type="tel" name="phone" required 
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 
                       border border-gray-300 dark:border-gray-600 
                       text-gray-900 dark:text-white 
                       placeholder-gray-500 dark:placeholder-gray-400
                       rounded-lg focus:outline-none focus:ring-2 
                       focus:ring-blue-500 dark:focus:ring-blue-400
                       focus:border-transparent transition-colors">
        </div>
    </div>

                                <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
        <input type="email" name="email" required 
            class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 
                   border border-gray-300 dark:border-gray-600 
                   text-gray-900 dark:text-white 
                   placeholder-gray-500 dark:placeholder-gray-400
                   rounded-lg focus:outline-none focus:ring-2 
                   focus:ring-blue-500 dark:focus:ring-blue-400
                   focus:border-transparent transition-colors">
    </div>
<!-- Exhibitors -->
<div class="mt-6">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Exhibitors</label>
    <div id="exhibitorsContainer" class="space-y-3">
        <!-- First field without delete -->
        <div class="exhibitor-field flex items-center gap-2">
            <input type="text" 
                name="exhibitors[]" 
                placeholder="Exhibitor"
                required 
                class="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 
                       border border-gray-300 dark:border-gray-600 
                       text-gray-900 dark:text-white 
                       placeholder-gray-500 dark:placeholder-gray-400
                       rounded-lg focus:outline-none focus:ring-2 
                       focus:ring-blue-500 dark:focus:ring-blue-400
                       focus:border-transparent transition-all duration-200">
        </div>
    </div>
    
    <button type="button" 
        id="addExhibitor"
        class="mt-4 px-5 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400
               hover:text-blue-700 dark:hover:text-blue-300
               flex items-center gap-2 transition-colors duration-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Add Exhibitor
    </button>
</div>
                                </div>
                                <div class="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                        <h3 class="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                            <svg class="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            Payment Method
                        </h3>

                        <div class="space-y-4">
                            <!-- Payment Options -->
                            <div class="grid grid-cols-2 gap-4">
                                <!-- Cash Option -->
                                <label class="relative group">
                                    <input type="radio" name="payment_method" value="cash" class="peer sr-only">
                                    <div class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer
                                                transition-all duration-300 hover:border-blue-500/50 dark:hover:border-blue-400/50
                                                peer-checked:border-blue-500 dark:peer-checked:border-blue-400
                                                peer-checked:bg-blue-50/50 dark:peer-checked:bg-blue-900/20">
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:scale-110 transition-transform">
                                                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <p class="font-medium text-gray-900 dark:text-white">Cash Payment</p>
                                                <p class="text-sm text-gray-500 dark:text-gray-400">Pay at our office</p>
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                <!-- Mobile Money Option -->
                                <label class="relative group">
                                    <input type="radio" name="payment_method" value="mobile" class="peer sr-only">
                                    <div class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer
                                                transition-all duration-300 hover:border-blue-500/50 dark:hover:border-blue-400/50
                                                peer-checked:border-blue-500 dark:peer-checked:border-blue-400
                                                peer-checked:bg-blue-50/50 dark:peer-checked:bg-blue-900/20">
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:scale-110 transition-transform">
                                                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <p class="font-medium text-gray-900 dark:text-white">Mobile Money</p>
                                                <p class="text-sm text-gray-500 dark:text-gray-400">Pay via mobile money</p>
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <!-- Mobile Money Providers (Hidden by default) -->
                            <div id="mobileProviders" class="hidden space-y-4 animate-fadeIn">
                                <p class="text-sm text-yellow-600 dark:text-yellow-500">
                                    ⚠️ Complete payment within 15 minutes to secure your booking
                                </p>
                                <div class="grid grid-cols-2 gap-4">
                                    ${this.renderPaymentMethods()}
                                </div>
                            </div>
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

    if (isMobile) {
      const modal = document.getElementById("checkoutModal");
      const modalContent = modal.querySelector(".bg-white");
      let startY;
      let currentY;

      modalContent.addEventListener("touchstart", (e) => {
        startY = e.touches[0].clientY;
      });

      modalContent.addEventListener("touchmove", (e) => {
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
          modalContent.style.transform = `translateY(${diff}px)`;
        }
      });

      modalContent.addEventListener("touchend", (e) => {
        if (currentY - startY > 150) {
          this.closeCheckoutModal();
        } else {
          modalContent.style.transform = "";
        }
      });
    }

    // Setup modal event listeners
    $("#closeCheckoutModal, #cancelCheckout").on("click", () =>
      this.closeCheckoutModal()
    );
    $("#completeReservation").on("click", () => this.processCheckout());

    this.updateCheckoutSummary();
    // Exhibitor field handling
    $(document).off("click", "#addExhibitor");

    // Setup single event handler for add exhibitor
    $("#addExhibitor").on("click", () => {
      this.addExhibitorField();
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

    this.setupPaymentListeners();
  },

  setupPaymentListeners() {
    // Listen for payment method radio button changes
    $('input[name="payment_method"]').on('change', function() {
      const isMobile = $(this).val() === 'mobile';
      $('#mobileProviders').toggleClass('hidden', !isMobile);
      
      if (isMobile) {
        // Re-render payment methods when mobile is selected
        const providersHtml = BoothManager.renderPaymentMethods();
        $('#mobileProviders .grid').html(providersHtml);
      }
    });

    // Delegate click handler for payment method cards
    $(document).on('click', '.payment-method-card', function() {
      // Remove selected state from all cards
      $('.payment-method-card').attr('data-selected', 'false');
      // Add selected state to clicked card
      $(this).attr('data-selected', 'true');

      const methodId = $(this).data('method-id');
      BoothManager.state.selectedPaymentMethod = methodId;
    });

    // Handle copy button clicks
    $(document).on('click', '.copy-btn', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const number = $(this).data('number');
      const $feedback = $(this).find('.copy-feedback');

      navigator.clipboard.writeText(number)
        .then(() => {
          $feedback.css('opacity', '1');
          setTimeout(() => {
            $feedback.css('opacity', '0');
          }, 1500);
        })
        .catch(() => {
          $feedback.text('Failed to copy').css('opacity', '1');
          setTimeout(() => {
            $feedback.css('opacity', '0');
            setTimeout(() => {
              $feedback.text('Copied!');
            }, 200);
          }, 1500);
        });
    });
  },

  renderPaymentMethods() {
    if (!Array.isArray(this.state.paymentMethods) || this.state.paymentMethods.length === 0) {
      return '<p class="text-gray-500 dark:text-gray-400">No payment methods available</p>';
    }

    return this.state.paymentMethods.map(method => `
      <div class="payment-method-card group" data-method-id="${method.id}" data-selected="false">
        <div class="relative p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700
                    hover:border-blue-500/50 dark:hover:border-blue-400/50
                    hover:shadow-lg hover:-translate-y-0.5
                    transition-all duration-300 ease-out">
            
            <!-- Selection Indicator -->
            <div class="absolute top-3 right-3 opacity-0 scale-0 group-data-[selected=true]:opacity-100 
                        group-data-[selected=true]:scale-100 transition-all duration-300">
                <div class="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <!-- Provider Details -->
                <div class="flex-1">
                    <p class="font-medium text-gray-900 dark:text-white mb-1">${method.name}</p>
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-500 dark:text-gray-400">${method.number}</span>
                        <button class="copy-btn p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                                     transition-all duration-200"
                                data-number="${method.number}">
                            <svg class="w-4 h-4 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 
                                      transition-colors duration-200" 
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                            <span class="copy-feedback absolute -bottom-8 left-1/2 transform -translate-x-1/2
                                       px-2 py-1 bg-black/75 text-white text-xs rounded
                                       opacity-0 transition-opacity duration-200">
                                Copied!
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    `).join('');
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
                <div class="flex justify-between items-center bg-gray-100 dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 
            transition-colors duration-200">
    <div>
        <span class="font-bold text-gray-900 dark:text-white">
            Booth ${booth.booth_number}
        </span>
        <span class="text-sm text-gray-600 dark:text-gray-400 ml-2">
            ${this.formatBoothType(booth.booth_type)}
        </span>
    </div>
    <span class="text-blue-600 dark:text-blue-400 font-medium">
        TZS ${parseFloat(booth.price).toLocaleString()}
    </span>
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
      payment_method: formData.find((f) => f.name === "payment_method").value,
      exhibitors: formData
        .filter((f) => f.name === "exhibitors[]")
        .map((f) => f.value),
    };
    console.log(payload);
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
      $listElement.html(
        '<p class="text-gray-500 dark:text-gray-400">No booths selected</p>'
      );
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
  // Add method for adding new exhibitor fields
  addExhibitorField() {
    const currentFields = $("#exhibitorsContainer .exhibitor-field").length;

    const newField = `
    <div class="exhibitor-field flex items-center gap-2 group animate-fadeIn">
        <input type="text" 
            name="exhibitors[]" 
            placeholder="Exhibitor"
            required 
            class="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 
                   border border-gray-300 dark:border-gray-600 
                   text-gray-900 dark:text-white 
                   placeholder-gray-500 dark:placeholder-gray-400
                   rounded-lg focus:outline-none focus:ring-2 
                   focus:ring-blue-500 dark:focus:ring-blue-400
                   focus:border-transparent transition-all duration-200">
        <button type="button" 
            class="remove-exhibitor p-2 text-gray-400 dark:text-gray-500 
                   hover:text-red-500 dark:hover:text-red-400 
                   rounded-lg opacity-100
                   transition-all duration-200 flex items-center justify-center"
            onclick="$(this).closest('.exhibitor-field').remove()">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
        </button>
    </div>`;

    $("#exhibitorsContainer").append(newField);
  },
};
