const BoothManager = {
  // State management
  state: {
    selectedBooths: new Set(),
    processingBooths: new Set(),
    booths: new Map(),
    eventId: null,
    selectedIds: new Set(),
  },

  // Initialize the floor plan
  async init(eventId) {
    this.state.eventId = eventId;
    await this.fetchBooths();
    this.renderBooths();
    this.setupEventListeners();
  },

  // Fetch booths from API
  async fetchBooths() {
    Swal.fire({
      title: "Loading booths...",
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch(
        `/api/booths/?event_id=${this.state.eventId}`
      );
      const boothsData = await response.json();
      this.state.booths.clear();
      boothsData.forEach((booth) => {
        this.state.booths.set(booth.booth_number, booth);
      });

      Swal.close();
    } catch (error) {
      console.error("Error fetching booths:", error);
      Swal.close();
      Swal.fire({
        title: "Error",
        text: error.message,
        icon: "error",
      });
    }
  },

  // Render booths on the floor plan
  renderBooths() {
    const $floorContainer = $(".floor-container");
    if (!$floorContainer.length) return;

    // Clear existing booths
    $floorContainer.empty();

    // Group booths by row (A, B, etc.)
    const boothsByRow = new Map();
    this.state.booths.forEach((booth) => {
      const row = booth.booth_number.charAt(0);
      if (!boothsByRow.has(row)) {
        boothsByRow.set(row, []);
      }
      boothsByRow.get(row).push(booth);
    });

    // Render each row
    boothsByRow.forEach((booths, row) => {
      const $rowDiv = $("<div>", {
        class: "flex flex-wrap justify-center",
      });

      booths
        .sort((a, b) => {
          return (
            parseInt(a.booth_number.slice(1)) -
            parseInt(b.booth_number.slice(1))
          );
        })
        .forEach((booth) => {
          $rowDiv.append(this.createBoothElement(booth));
        });

      // Add aisle after each row except the last
      if (row !== Array.from(boothsByRow.keys()).pop()) {
        const $aisle = $("<div>", {
          class: "w-full h-4 bg-gray-200 my-2",
        });
        $floorContainer.append($rowDiv);
        $floorContainer.append($aisle);
      } else {
        $floorContainer.append($rowDiv);
      }
    });

    // Enable tooltips
    // $('[data-bs-toggle="tooltip"]').tooltip();
  },

  // Create a single booth element
  createBoothElement(booth) {
    $("#checkoutButton").prop("disabled", !this.state.selectedBooths.size);

    const $div = $("<div>", {
      class: `booth w-[120px] h-[120px] m-[10px] inline-flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-in-out rounded-[12px] relative font-semibold text-[1.2em] shadow-md transform perspective-[1000px] rotate-x-[5deg] p-[10px] text-center backdrop-blur-[5px] ${
        booth.status
      } relative border-2 p-2 m-1 cursor-pointer 
                    ${
                      booth.status === "available"
                        ? "bg-white hover:bg-blue-100"
                        : booth.status === "reserved"
                        ? "bg-gray-200 opacity-50"
                        : booth.status === "processing"
                        ? "bg-yellow-200"
                        : ""
                    }`,
      "data-booth": booth.booth_number,
      "data-price": booth.price,
      "data-id": booth.id,
    });

    let boothContent = "";

    if (booth.status === "reserved") {
      boothContent = `
                <span class="block text-xs text-gray-500">${this.formatBoothType(
                  booth.booth_type
                )}</span>
                <span class="text-red-500 font-bold">Reserved</span>
            `;

      // const tooltipContent = `
      //     <div class="text-sm">
      //         <strong>Booth:</strong> ${booth.booth_number}<br>
      //         <strong>Company:</strong> ${booth.reservation_info.company_name}<br>
      //         <strong>Contact:</strong> ${booth.reservation_info.contact_person}<br>
      //         ${booth.reservation_info.email ? `<strong>Email:</strong> ${booth.reservation_info.email}<br>` : ''}
      //         ${booth.reservation_info.phone ? `<strong>Phone:</strong> ${booth.reservation_info.phone}` : ''}
      //     </div>
      // `;

      // $div.attr({
      //     'data-bs-toggle': 'tooltip',
      //     'data-bs-html': 'true',
      //     'data-bs-placement': 'top',
      //     'title': tooltipContent
      // });
    } else {
      boothContent = `
                <span class="block text-xs text-gray-600">${this.formatBoothType(
                  booth.booth_type
                )}</span>
                <span class="font-bold">${booth.booth_number}</span>
                <span class="text-sm text-blue-600">TZS ${parseFloat(
                  booth.price
                ).toLocaleString()}</span>
            `;
    }

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

      $boothElement.toggleClass("selected bg-blue-200");

      if ($boothElement.hasClass("selected")) {
        this.state.selectedBooths.add(boothId);
      } else {
        this.state.selectedBooths.delete(boothId);
      }

      this.updateSelectedBoothsList();
    });
  },

  // Show checkout modal
  showCheckoutModal() {
    const modalHtml = `
            <div id="checkoutModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">Complete Your Reservation</h2>
                        <button id="closeCheckoutModal" class="text-gray-600 hover:text-gray-900">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-semibold mb-4">Selected Booths</h3>
                            <div id="checkoutSelectedBooths" class="space-y-2">
                                <!-- Dynamically populated booths -->
                            </div>
                            <div class="mt-4 bg-gray-100 p-3 rounded">
                                <div class="flex justify-between">
                                    <span>Number of Booths:</span>
                                    <span id="summaryBoothCount" class="font-bold">0</span>
                                </div>
                                <div class="flex justify-between mt-2">
                                    <span class="font-semibold">Total Amount:</span>
                                    <span id="summaryTotal" class="text-blue-600 font-bold">TZS 0</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-lg font-semibold mb-4">Contact Information</h3>
                            <form id="checkoutForm" class="space-y-4">
                                <input type="hidden" name="csrfmiddlewaretoken" value="${
                                  this.getCSRFToken() || ""
                                }">
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                    <input type="text" name="company" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                        <input type="text" name="contact" required 
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                        <input type="tel" name="phone" required 
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input type="email" name="email" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end space-x-4">
                        <button id="cancelCheckout" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">
                            Cancel
                        </button>
                        <button id="completeReservation" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                            Complete Reservation
                        </button>
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
    };

    try {
      const response = await $.ajax({
        url: `/api/booking/?event_id=${this.state.eventId}`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
        headers: {
          "X-CSRFToken": this.getCSRFToken(),
        },
      });

      Swal.fire({
        title: "Booking Successful!",
        text: "Your selected booths have been reserved.",
        icon: "success",
        confirmButtonText: "Close",
      }).then(() => {
        this.state.selectedBooths.clear();
        this.closeCheckoutModal();

        // Refresh booths
        this.fetchBooths().then(() => {
          this.renderBooths();
          this.updateSelectedBoothsList();
        });
      });
    } catch (error) {
      console.error("Booking error:", error);
      Swal.fire({
        title: "Error",
        text: "Booking failed. Please try again.",
        icon: "error",
        confirmButtonText: "Close",
      });
    }
  },

  updateSelectedBoothsList() {
    $("#checkoutButton").prop("disabled", !this.state.selectedBooths.size);
    const $listElement = $("#selectedBoothsList");
    const $totalElement = $("#totalPrice");

    if (this.state.selectedBooths.size === 0) {
      $listElement.html('<p class="text-gray-500">No booths selected</p>');
      $totalElement.text("TZS 0");
      return;
    }

    let html = '<div class="space-y-2">';
    let totalPrice = 0;

    this.state.selectedBooths.forEach((boothId) => {
      const boothData = this.state.booths.get(boothId);
      totalPrice += parseFloat(boothData.price);

      html += `
                <div class="flex justify-between items-center bg-gray-100 p-2 rounded">
                    <div>
                        <strong class="text-gray-800">Booth ${boothId}</strong>
                        <small class="block text-gray-500">${this.formatBoothType(
                          boothData.booth_type
                        )}</small>
                    </div>
                    <span class="text-blue-600 font-bold">TZS ${parseFloat(
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