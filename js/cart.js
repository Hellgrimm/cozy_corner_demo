// Кошик

// Instead of immediate removal, mark item as pending deletion
export function markForDeletion(bookId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    bookId = bookId.toString();
    let item = cart.find(item => item.id === bookId);
    if (item) {
        item.pendingDeletion = true;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartHeader();
    }
}

// Undo deletion: remove the pendingDeletion flag
export function cancelDeletion(bookId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    bookId = bookId.toString();
    let item = cart.find(item => item.id === bookId);
    if (item) {
        item.pendingDeletion = false;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartHeader();
    }
}

// Main UI update: render page content, update header, modal, and final totals
export function updateCartUI() {
    renderCartPageContent();
    if (typeof updateCartHeader === 'function') {
        updateCartHeader();
    }
    if (document.getElementById('cartModal')) {
        renderCartModalContent();
    }

    // Check if we're on the cart page before updating final total.
    if (window.location.pathname.includes('/cart')) {
        updateFinalTotal();
    }
}

// Permanently remove an item
export function removeFromCart(bookId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    bookId = bookId.toString();
    cart = cart.filter(item => item.id !== bookId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    updateCartHeader();
}

const MAX_ATTEMPTS = 5;
function attachPurchaseFormListener(attempt = 1) { 
    const purchaseForm = document.getElementById('purchase-form');

    if (purchaseForm) { 
        console.log('[DEBUG] Purchase form found via polling, attaching listener.'); 
        purchaseForm.addEventListener('submit', function(event) { 
            console.log('[DEBUG] Purchase form submitted.'); 
            handlePurchase(event); 
        }); 
    } else { 
        if (attempt < MAX_ATTEMPTS) { 
            console.log('[DEBUG] Purchase form not found; retrying in 500ms. (Attempt '+attempt+' of '+MAX_ATTEMPTS); 
            setTimeout(() => attachPurchaseFormListener(attempt + 1), 500); 
        } else { 
            console.log('[DEBUG] Purchase form not found after '+MAX_ATTEMPTS+' attempts; stopping polling.'); 
        } 
    } 
}

attachPurchaseFormListener();
  
export function handlePurchase(event) { 
    event.preventDefault();
    // Get user_name and user_email from the form.
    const userName = document.getElementById('userName').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();
    if (!userName || !userEmail) {
        console.error('[PURCHASE] Ім\'я або електронна пошта не вказані.');
        return;
    }

    // Get delivery details
    const shippingAddress = document.getElementById('mailingAddress').value.trim();
    if (!shippingAddress) {
        console.error('[PURCHASE] Адреса доставки не введена.');
        return;
    }
    const selectedShipping = document.querySelector('input[name="mailing-format"]:checked');
    if (!selectedShipping) {
        console.error('[PURCHASE] Не обрано спосіб доставки.');
        return;
    }
    const shippingType = selectedShipping.value;
    let shippingCost = (shippingType === "відділення") ? 70 : 50;

    // Get cart items from localStorage
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    if (cartItems.length === 0) {
        console.error('[PURCHASE] Кошик порожній.');
        return;
    }

    // Build order_items array using book details and quantity
    const order_items = cartItems.map(item => {
        const book = window.getBookDetailsById(item.id);
        if (book) {
            return {
                book_id: book.id,
                quantity: item.quantity,
                unit_price: parseFloat(book.price)
            };
        }
        return null;
    }).filter(item => item != null);

    if (order_items.length === 0) {
        console.error('[PURCHASE] Немає валідних товарів для замовлення.');
        return;
    }

    // Calculate totals
    const itemsTotal = order_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const finalPrice = itemsTotal + shippingCost;

    // Form API payload using user_name and user_email instead of user_id.
    const payload = {
        user_name: userName,
        user_email: userEmail,
        shipping_type: shippingType,
        shipping_cost: shippingCost,
        final_price: finalPrice,
        shipping_address: shippingAddress,
        order_items: order_items
    };

    console.log('[PURCHASE] Sending order payload:', payload);

    // Send the order POST request to your API endpoint.
    fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/order_placement', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        // Check that the status is 200 OK.
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('API returned error status ' + response.status);
        }
      })
      .then(data => {
        // If we reach here, the response was 200, so we treat it as success.
        console.log('[PURCHASE] Замовлення успішно створено:', data);

        fetchBooks().then(updatedBooks => {
            localStorage.setItem('books', JSON.stringify(updatedBooks));
            localStorage.setItem('booksLastUpdate', Date.now().toString());
            // Оновити UI карток з актуальними залишками
            if (window.updateCartUI) window.updateCartUI();
            if (window.updateCartHeader) window.updateCartHeader();
        });
        // Clear the local cart.
        localStorage.removeItem('cart');
        // Also update the DB cart to be empty.
        const userId = localStorage.getItem('user_id');
        if (userId) {
          updateCartInDB([], userId);
        }
        if (window.updateCartUI) {
          window.updateCartUI();
        }
        const successModalEl = document.getElementById('purchaseSuccessModal');
        if (successModalEl) {
          let successModal = new bootstrap.Modal(successModalEl);
          successModal.show();
        }
      })
      .catch(error => {
        console.error('[PURCHASE] Error sending order request:', error);
        const errorModalEl = document.getElementById('orderErrorModal');
        if (errorModalEl) {
          let errorModal = new bootstrap.Modal(errorModalEl);
          errorModal.show();
        }
      });
}

// =================== // UPDATE CART USER INFO // ===================

// If user data is available in localStorage, fill in the purchase form inputs // and set email input to read-only. For unregistered users these inputs remain editable. 

export function updateCartUserInfo() { 
    console.log('[updateCartUserInfo] Function started.'); 
    const userNameInput = document.getElementById('userName'); 
    const userEmailInput = document.getElementById('userEmail'); 
    let loginNotification = document.getElementById('loginNotification');

    const username = localStorage.getItem('username');
    const userEmail = localStorage.getItem('user_email');

    if (username && userEmail) {
    if (userNameInput) userNameInput.value = username;
    if (userEmailInput) {
        userEmailInput.value = userEmail;
        userEmailInput.readOnly = true; // Locked if logged in
    }
    if (loginNotification) {
        loginNotification.style.display = 'none';
    }
    } else {
    // No stored user info – allow editing and show notification suggesting login.
    if (userNameInput) {
        userNameInput.value = '';
        userNameInput.readOnly = false;
    }
    if (userEmailInput) {
        userEmailInput.value = '';
        userEmailInput.readOnly = false;
    }

    if (!loginNotification) {
        loginNotification = document.createElement('div');
        loginNotification.id = 'loginNotification';
        loginNotification.style.background = '#ffecb3';
        loginNotification.style.padding = '10px';
        loginNotification.style.marginBottom = '10px';
        loginNotification.innerHTML = `Ви можете <a href="#" onclick="showLoginModal(); return false;">увійти</a>, щоб автоматично заповнити дані. <span style="cursor:pointer;" onclick="this.parentElement.style.display='none';">✖</span>`;
        const formElement = document.getElementById('purchase-form');
        if (formElement && formElement.parentElement) {
        formElement.parentElement.insertBefore(loginNotification, formElement);
        }
    } else {
        loginNotification.style.display = 'block';
    }
    }
}

document.addEventListener('DOMContentLoaded', updateCartUserInfo);


window.updateCartUI = updateCartUI;
window.removeFromCart = removeFromCart;
window.markForDeletion = markForDeletion;
window.cancelDeletion = cancelDeletion;
window.updateCartUserInfo = updateCartUserInfo;

