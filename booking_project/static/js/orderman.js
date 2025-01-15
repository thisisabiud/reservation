document.addEventListener('DOMContentLoaded', () => {
    // Store scroll position and lock scrolling without disrupting layout
let scrollPosition = 0;
const body = document.body;
const modalBackdrop = document.createElement('div');
modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40';
modalBackdrop.style.display = 'none';
document.body.appendChild(modalBackdrop);

function viewReceipt(orderId) {
    // Store current scroll position
    scrollPosition = window.pageYOffset;
    
    // Show modal backdrop
    modalBackdrop.style.display = 'block';
    
    // Lock scrolling with padding to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.paddingRight = `${scrollbarWidth}px`;
    body.style.overflow = 'hidden';
    
    // Fetch and display receipt content
    fetch(`/order/${orderId}/receipt/`)
        .then(response => response.text())
        .then(html => {
            const modal = document.getElementById('receiptModal');
            const receiptContent = document.getElementById('receiptContent');
            const downloadButton = document.getElementById('downloadReceiptButton');
            
            receiptContent.innerHTML = html;
            downloadButton.href = `/order/${orderId}/receipt/?download=true`;
            modal.classList.remove('hidden');
        });
}

function closeModal() {
    const modal = document.getElementById('receiptModal');
    
    // Hide modal and backdrop
    modal.classList.add('hidden');
    modalBackdrop.style.display = 'none';
    
    // Restore scrolling and layout
    body.style.overflow = '';
    body.style.paddingRight = '';
    
    // Restore scroll position smoothly
    window.scrollTo({
        top: scrollPosition,
        behavior: 'instant'
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('receiptModal');
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
});
});