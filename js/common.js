let books = [];
let booksPromise = null;

// Завантаження книг з API
export async function fetchBooks() {
    console.log('Виклик fetchBooks()...');
    if (books.length > 0) {
        console.log('Використання кешованих книг:', books);
        return books;
    }

    const cachedBooks = JSON.parse(localStorage.getItem('books'));
    const lastUpdate = parseInt(localStorage.getItem('booksLastUpdate'), 10) || 0;
    const now = Date.now();

    if (cachedBooks && (now - lastUpdate < 60 * 1000)) {
        console.log('Книги завантажені з кешу:', cachedBooks);
        books = cachedBooks;
        return books;
    }

    try {
        const response = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db');
        if (!response.ok) throw new Error('Помилка завантаження книг');
        books = await response.json();

        localStorage.setItem('books', JSON.stringify(books));
        localStorage.setItem('booksLastUpdate', now.toString());
        return books;
    } catch (error) {
        console.error('Помилка у fetchBooks:', error);
        if (cachedBooks) {
            console.warn('Використання кешу через помилку:', cachedBooks);
            books = cachedBooks;
            return books;
        }
    }
}
window.fetchBooks = fetchBooks;
// Публічна функція, яка гарантує 1 виклик fetchBooks()
export async function getBooks() {
    if (!booksPromise) {
        booksPromise = fetchBooks();
    }
    return booksPromise;
}

//Передзавантаження елементів сторінки (хедер, футер тощо)
function loadReusableComponent(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (container) {
        console.log(`%c[REUSABLE] Завантаження ${filePath} в ${containerId}`, 'color: green;');
        return fetch(filePath)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`%c[REUSABLE] Network response was not ok for ${filePath}`, 'color: red;');
                }
                return response.text();
            })
            .then((html) => {
                container.innerHTML = html;
                console.log(`%c[REUSABLE] Файл ${filePath} успішно завантажено в ${containerId}`, 'color: green;');
            })
            .catch((error) =>
                console.error(`[REUSABLE] Помилка завантаження ${filePath}: `, error)
            );
    } else {
        return Promise.reject(`%c[REUSABLE] Container з ID ${containerId} не знайдено.`, 'color: red;');
    }
}

// Завантаження хедера
export function loadHeader() {
    return loadReusableComponent('headerDiv', '/cozy_corner_demo/reusable/header.html');
}

// Завантаження футера
export function loadFooter() {
    return loadReusableComponent('footerDiv', '/cozy_corner_demo/reusable/footer.html');
}


// Функція для глобального пошуку
export function setupHeaderSearch(books) {
    const searchInput = document.getElementById('headerSearchInput');
    const searchModalElement = document.getElementById('searchModal');
    const modalSearchInput = document.getElementById('modalSearchInput');
    const modalDescriptionSearch = document.getElementById('modalDescriptionSearch');
    const modalSearchResults = document.getElementById('modalSearchResults');
    const categoryList = document.getElementById('categoryList');
    const goToLibraryButton = document.getElementById('goToLibraryButton');
    const searchResultsCount = document.getElementById('searchResultsCount');

    const searchModal = new bootstrap.Modal(searchModalElement, {
        backdrop: true,
        keyboard: true,
    });

    let selectedCategory = null;
    let totalFilteredBooks = books; // Відфільтровані книги
    let maxBooksToShow = getMaxBooksBasedOnScreenHeight();

    function getBookDeclension(count) {
        if (count % 10 === 1 && count % 100 !== 11) return "книжка";
        if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return "книжки";
        return "книг";
    }

    function updateSearchResults() {
        updateSearchResultsCount();
        updateVisibleBooks();
        displayCategories(); // Виклик `displayCategories()` лише після оновлення списку книг
    }

    function updateSearchResultsCount() {
        searchResultsCount.textContent = `Знайдено ${totalFilteredBooks.length} ${getBookDeclension(totalFilteredBooks.length)}`;
    }

    function updateVisibleBooks() {
        const maxBooks = getMaxBooksBasedOnScreenHeight();
        modalSearchResults.innerHTML = totalFilteredBooks.slice(0, maxBooks).map(createBookItem).join('');
    }

    function getMaxBooksBasedOnScreenHeight() {
        const screenHeight = window.innerHeight;
        const bookHeight = 120;
        const headerOffset = 200;
        return Math.floor((screenHeight - headerOffset) / bookHeight);
    }

    window.addEventListener('resize', () => {
        const newMaxBooks = getMaxBooksBasedOnScreenHeight();
        if (newMaxBooks !== maxBooksToShow) {
            maxBooksToShow = newMaxBooks;
            updateVisibleBooks(); // Оновлюємо тільки відображені книги
        }
    });

    searchInput.addEventListener('focus', () => {
        resetFilters();
        totalFilteredBooks = books; // Повертаємо всі книги
        maxBooksToShow = getMaxBooksBasedOnScreenHeight();
        updateSearchResults(); // Оновлення списку книг + категорій одним викликом
        modalSearchInput.value = "";
        searchModal.show();
    });

    modalDescriptionSearch.addEventListener('click', () => {
        modalDescriptionSearch.classList.toggle('active');
        performModalSearch();
    });

    modalSearchInput.addEventListener('input', debounce(performModalSearch, 300));

    function displayCategories() {
        if (!categoryList) return;

        const genresCount = {};
        const selectedCategoryElement = document.querySelector('.category-item.active');
        const selectedGenre = selectedCategoryElement ? selectedCategoryElement.getAttribute('data-genre') : null;

        totalFilteredBooks.forEach(book => {
            book.book_genre.forEach(genre => {
                genresCount[genre] = (genresCount[genre] || 0) + 1;
            });
        });

        categoryList.innerHTML = Object.entries(genresCount)
            .map(([genre, count]) => `
                <li class="list-group-item d-flex justify-content-between align-items-center category-item ${selectedGenre === genre ? 'active' : ''}" 
                    data-genre="${genre}">
                    ${genre}
                    <span class="badge bg-primary rounded-pill">${count}</span>
                </li>
            `)
            .join('');

        if (selectedGenre && !genresCount[selectedGenre]) {
            categoryList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center category-item active"
                    data-genre="${selectedGenre}">
                    ${selectedGenre}
                    <span class="badge bg-primary rounded-pill">0</span>
                </li>
            `;
        }

        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                const clickedGenre = item.getAttribute('data-genre');
                if (selectedGenre === clickedGenre) {
                    item.classList.remove('active');
                    selectedCategory = null;
                } else {
                    document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    selectedCategory = clickedGenre;
                }

                performModalSearch();
            });
        });
    }

    function createBookItem(book) {
        return `
            <div class="book-item">
                <img src="${book.image_link || '/img/book-placeholder.png'}" alt="${book.book_name}" class="book-item-image">
                <div class="book-item-info">
                    <h5 class="book-item-title">${book.book_name}</h5>
                    <p class="book-item-author">${book.writer_name}</p>
                    <div class="book-item-footer">
                        ${book.book_quantity === 0
                ? '<span class="book-item-status out-of-stock">Не в наявності</span>'
                : book.book_quantity <= 3
                    ? '<span class="book-item-status limited">Закінчується</span>'
                    : `<span class="book-item-price">${book.price} ₴</span>`}
                    </div>
                </div>
            </div>
        `;
    }

    function performModalSearch() {
        const query = modalSearchInput.value.toLowerCase().trim();
        const searchByDescription = modalDescriptionSearch.classList.contains('active');

        totalFilteredBooks = books.filter(book => {
            const titleMatch = book.book_name.toLowerCase().includes(query);
            const authorMatch = book.writer_name.toLowerCase().includes(query);
            const descriptionMatch = searchByDescription && book.description.toLowerCase().includes(query);
            const categoryMatch = selectedCategory ? book.book_genre.includes(selectedCategory) : true;
            return (titleMatch || authorMatch || descriptionMatch) && categoryMatch;
        });

        updateSearchResults(); // Оновлення результатів пошуку + категорій одним викликом
    }

    goToLibraryButton.addEventListener('click', () => {
        const query = modalSearchInput.value.trim();
        const searchByDescription = modalDescriptionSearch.classList.contains('active');

        const params = new URLSearchParams();
        if (query) params.set('search', query);
        if (selectedCategory) params.set('book_genre', selectedCategory);
        if (searchByDescription) params.set('desc', 'true');

        window.location.href = `/home/library/?${params.toString()}`;
    });

    function debounce(func, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function resetFilters() {
        selectedCategory = null;
        modalDescriptionSearch.classList.remove('active');
        modalSearchInput.value = "";
    }
}

export function getBookDetailsById(bookId) {
    const books = JSON.parse(localStorage.getItem('books')) || [];
    return books.find(book => book.id.toString() === bookId.toString());
}

// Function to create the cart modal (if it doesn't exist)
function createCartModal() {
    if (!document.getElementById('cartModal')) {
        const modalHTML = `
        <div id="cartModal" class="cart-modal" style="
              position: fixed;
              top: 0;
              right: -100%;
              width: 600px;
              height: 100%;
              background: #fff;
              box-shadow: -2px 0 5px rgba(0,0,0,0.3);
              transition: right 0.3s ease;
              z-index: 1050;
            ">
          <div class="cart-modal-content" style="padding: 20px;">
            <span id="closeCartModal" style="cursor: pointer; font-size: 24px;">&times;</span>
            <h2>Ваш кошик</h2>
            <div id="cartModalItems"></div>
            <div id="cartModalSummary" style="margin-top: 20px;">
              <p>Разом: <span id="cartTotalPrice">0</span> ₴</p>
              <button id="checkoutButton">Перейти до оформлення</button>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Set up close event
        document.getElementById('closeCartModal').addEventListener('click', hideCartModal);
        // Set up checkout button event to redirect to the checkout page
        document.getElementById('checkoutButton').addEventListener('click', () => {
            window.location.href = '/cozy_corner_demo/home/cart/index.html';
        });
    }
}

// Function to display the cart modal (slide in from right)
export function showCartModal() {
    createCartModal();
    renderCartModalContent();
    const modal = document.getElementById('cartModal');
    modal.style.right = '0';
}

// Function to hide the cart modal
export function hideCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.style.right = '-100%';
    }
}

// Updated renderCartModalContent function in cart.js
export function renderCartModalContent() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartModalItems = document.getElementById('cartModalItems');
    cartModalItems.innerHTML = '';
    let overallTotal = 0;

    cart.forEach(item => {
        const book = getBookDetailsById(item.id);
        if (book) {
            const quantity = item.quantity || 1;
            const singlePrice = parseFloat(book.price);
            const itemTotal = singlePrice * quantity;
            overallTotal += itemTotal;

            let quantityControlsHTML = '';
            if (quantity > 1) {
                quantityControlsHTML = `
                    <button class="qty-decrement" onclick="decrementBookQuantityModal('${book.id}')">-</button>
                    <span id="modal-quantity-${book.id}">${quantity}</span>
                    <button class="qty-increment" onclick="incrementBookQuantity('${book.id}')">+</button>
                `;
            } else if (quantity === 1) {
                if (item.pendingDeletion) {
                    // When pending deletion, show both "Return" and "Delete" buttons vertically centered.
                    quantityControlsHTML = `
                        <div class="deletion-controls" style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
                            <button class="undo-delete" onclick="cancelDeletion('${book.id}')" title="Return" style="background-color: green; color: white; margin-bottom: 5px;">&#8634;</button>
                            <button class="delete-item" onclick="removeFromCart('${book.id}')" title="Delete" style="background-color: red; color: white;">&times;</button>
                        </div>
                    `;
                } else {
                    // Normal control when quantity is 1 and not flagged
                    quantityControlsHTML = `
                        <button class="qty-decrement" onclick="decrementBookQuantityModal('${book.id}')">-</button>
                        <span id="modal-quantity-${book.id}">${quantity}</span>
                        <button class="qty-increment" onclick="incrementBookQuantity('${book.id}')">+</button>
                    `;
                }
            }

            cartModalItems.innerHTML += `
              <div class="cart-item ${item.pendingDeletion ? 'pending-deletion' : ''}" id="cart-item-${book.id}" style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #ccc;">
                <img src="${book.image_link}" alt="${book.book_name}" style="width: 60px; height: auto; margin-right: 10px;">
                <div style="flex: 1;">
                  <p>${book.book_name}</p>
                  <p>Одинична ціна: ${singlePrice.toFixed(2)} ₴</p>
                  <p>Кількість: ${quantityControlsHTML}</p>
                  <p>Разом: <span id="item-total-${book.id}">${itemTotal.toFixed(2)}</span> ₴</p>
                </div>
              </div>
            `;
        }
    });

    document.getElementById('cartTotalPrice').textContent = overallTotal.toFixed(2);
}

// Function to update the header cart icon with total quantity and price
// Оновлена функція updateCartHeader
export function updateCartHeader() {
    // 1. Безпечне парсення cart
    let cart;
    try {
      cart = JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
      console.error('Invalid cart JSON in localStorage:', e);
      cart = [];
    }
  
    let totalQuantity = 0;
    let totalPrice = 0;
  
    // 2. Проходимося по cart, пропускаємо null/undefined
    cart.forEach(item => {
      if (!item) return;
      // 3. Дефолт 0, якщо quantity відсутнє або нечислове
      const qty = parseInt(item.quantity || 0, 10);
      totalQuantity += qty;
  
      // 4. Безпечне вичитування ціни книги
      const book = getBookDetailsById(item.id);
      const price = book && !isNaN(parseFloat(book.price))
        ? parseFloat(book.price)
        : 0;
      totalPrice += qty * price;
    });
  
    // 5. Оновлюємо DOM
    const cartBadge = document.getElementById('cartBadge');
    const cartSum   = document.getElementById('cartSum');
    if (cartBadge) cartBadge.textContent = totalQuantity;
    if (cartSum)   cartSum.textContent   = totalPrice.toFixed(2) + ' ₴';
  }
  

// Updated addToCart: now adds a book with quantity and a pendingDeletion flag
export function addToCart(bookId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    bookId = bookId.toString();
    let item = cart.find(item => item.id === bookId);
    const book = window.getBookDetailsById(bookId);
    if (!book) return;
    const maxQuantity = parseInt(book.book_quantity);

    if (item) {
        if (item.quantity < maxQuantity) {
            item.quantity = parseInt(item.quantity) + 1;
        } else {
            updateBookCardQuantity(bookId, item.quantity);
            return;
        }
    } else {
        cart.push({ id: bookId, quantity: 1, pendingDeletion: false });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    updateCartHeader();

    if (!document.getElementById(`quantity-${bookId}`)) {
        window.renderAddToCartControls(book);
        setTimeout(() => {
            updateBookCardQuantity(bookId, 1);
        }, 0);
    } else {
        updateBookCardQuantity(bookId, item ? item.quantity : 1);
    }
}

export function renderCartPageContent() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let overallTotal = 0;

    cart.forEach(item => {
        const book = window.getBookDetailsById(item.id);
        if (book) {
            const quantity = item.quantity || 1;
            const singlePrice = parseFloat(book.price);
            const itemTotal = singlePrice * quantity;
            overallTotal += itemTotal;
            cartItemsContainer.innerHTML += `
              <div class="book-item" id="cart-item-${book.id}">
                <img src="${book.image_link}" alt="${book.book_name}" class="cart-book-img">
                <div class="cart-book-info">
                  <p>${book.book_name}</p>
                  <p>Ціна: ${singlePrice.toFixed(2)} ₴</p>
                  <p>Кількість:
                    <button class="quantity-decrement" onclick="decrementBookQuantityCard('${book.id}')">-</button>
                    <span id="quantity-${book.id}">${quantity}</span>
                    <button class="quantity-increment" onclick="incrementBookQuantity('${book.id}')">+</button>
                  </p>
                  <p>Разом: <span id="item-total-${book.id}">${itemTotal.toFixed(2)}</span> ₴</p>
                </div>
                <div class="cart-price-cancel">
                  <button class="close-btn" onclick="removeFromCart('${book.id}')">&times;</button>
                </div>
              </div>
            `;
        }
    });
}

// Update overall prices including delivery cost
function calculateTotalBooksPrice() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const books = JSON.parse(localStorage.getItem('books')) || [];
    return cart.reduce((sum, item) => {
        const book = books.find(book => book.id.toString() === item.id.toString());
        return book ? sum + (parseFloat(book.price) * item.quantity) : sum;
    }, 0);
}

function updateFinalTotal() {
    // Try to fetch the necessary DOM elements
    const totalBooksPriceEl = document.getElementById('total-books-price');
    const mailingCostEl = document.getElementById('mailing-cost');
    const finalTotalEl = document.getElementById('final-total');

    // If any element is not found, we assume we are not on the cart page and abort.
    if (!totalBooksPriceEl || !mailingCostEl || !finalTotalEl) {
        return;
    }

    const totalBooksPrice = calculateTotalBooksPrice();
    // Convert the mailing cost text to a float (it might include the currency symbol, so you might strip that)
    const mailingCost = parseFloat(mailingCostEl.textContent) || 0;
    const finalTotal = totalBooksPrice + mailingCost;

    totalBooksPriceEl.textContent = totalBooksPrice.toFixed(2) + ' ₴';
    finalTotalEl.textContent = finalTotal.toFixed(2) + ' ₴';
}

// Returns the current quantity for the given book from localStorage.
function getBookQuantity(bookId) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const item = cart.find(item => item.id === bookId.toString());
    return item ? parseInt(item.quantity) : 0;
}

function updateBookCardQuantity(bookId, quantity) {
    // Update the quantity text
    const quantityEl = document.getElementById(`quantity-${bookId}`);
    if (quantityEl) {
        quantityEl.textContent = quantity;
    }

    // Instead of using parentElement, use a container selector based on the book card's container ID
    const container = document.querySelector(`#add-to-cart-${bookId} .quantity-container`);
    if (container) {
        const incrementBtn = container.querySelector('.quantity-increment');
        if (incrementBtn) {
            const book = window.getBookDetailsById(bookId);
            if (!book) return;
            const maxQuantity = parseInt(book.book_quantity, 10);
            if (quantity >= maxQuantity) {
                // Add the muted class and disable the button if at max
                incrementBtn.classList.add('muted');
                incrementBtn.disabled = true;
            } else {
                // Otherwise, remove the muted class and enable the button
                incrementBtn.classList.remove('muted');
                incrementBtn.disabled = false;
            }
        }
    }
}

// Update quantity if user changes number directly
export function updateCartQuantity(bookId, newQuantity) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    bookId = bookId.toString();
    newQuantity = parseInt(newQuantity);
    let item = cart.find(item => item.id === bookId);
    if (item) {
        item.quantity = newQuantity;
        if (newQuantity <= 0) {
            cart = cart.filter(i => i.id !== bookId);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartHeader();
        updateBookCardQuantity(bookId, newQuantity);
    }
}

export function incrementBookQuantity(bookId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    bookId = bookId.toString();
    let item = cart.find(item => item.id === bookId);
    if (!item) return;

    const book = window.getBookDetailsById(bookId);
    if (!book) return;
    const maxQuantity = parseInt(book.book_quantity);

    if (item.quantity < maxQuantity) {
        item.quantity = parseInt(item.quantity) + 1;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartHeader();
        updateBookCardQuantity(bookId, item.quantity);
    } else {
        updateBookCardQuantity(bookId, item.quantity);
    }
}

export function decrementBookQuantity(bookId, isModal = false) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    bookId = bookId.toString();
    let item = cart.find(item => item.id === bookId);
    if (!item) return;

    if (item.quantity > 1) {
        item.quantity = parseInt(item.quantity) - 1;
    } else if (isModal && item.quantity === 1 && !item.pendingDeletion) {
        // For modals, mark pending deletion rather than removing immediately.
        item.pendingDeletion = true;
    } else {
        // Remove the item if quantity is 1 and no pending deletion (for card, e.g.).
        cart = cart.filter(item => item.id !== bookId);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    updateCartHeader();

    // Check if the book card is on the page and update its controls.
    const cardContainer = document.getElementById(`add-to-cart-${bookId}`);
    if (cardContainer) {
        const book = getBookDetailsById(bookId);
        if (book) {
            renderAddToCartControls(book);
        }
    }
}

// Renders the add-to-cart controls in the container for a given book.
function renderAddToCartControls(book) {
    const container = document.getElementById(`add-to-cart-${book.id}`);
    if (!container) return;

    const quantity = getBookQuantity(book.id);

    if (quantity > 0) {
        // For the book card, when a book is in the cart, the "-" button immediately removes the book.
        container.innerHTML = `
        <div class="quantity-container">
            <button class="quantity-decrement book-card-quantity" onclick="decrementBookQuantityCard('${book.id}')">-</button>
            <div id="quantity-${book.id}" class="book-card-quantity-number" style="margin: 0 5px;">${quantity}</div>
            <button class="quantity-increment book-card-quantity" onclick="incrementBookQuantity('${book.id}')">+</button>
        </div>
        <button class="btn-book-card ${book.book_quantity === 0 ? 'out-of-stock' : ''}"
            ${book.book_quantity === 0 ? 'disabled' : ''}
            onclick="addToCart('${book.id}'); getBookDetailsById('${book.id}');">
            <span class="price-text">${book.price} ₴</span>
            <span class="add-to-cart-text">Додати ще</span>
        </button>
        `;
    } else {
        // If not in cart, display the default "В кошик" button.
        container.innerHTML = `
        <button class="btn-book-card ${book.book_quantity === 0 ? 'out-of-stock' : ''}"
                ${book.book_quantity === 0 ? 'disabled' : ''}
                onclick="addToCart('${book.id}'); getBookDetailsById('${book.id}');">
          <span class="price-text">${book.price} ₴</span>
          <span class="add-to-cart-text">${book.book_quantity === 0 ? 'Не в наявності' : 'В кошик'}</span>
        </button>
      `;
    }
}

function updateAddToCartControls(bookId, bookPrice) {
    const container = document.getElementById(`add-to-cart-${bookId}`);
    const quantity = getBookQuantity(bookId);
    if (quantity > 0) {
        container.innerHTML = `
        <button class="quantity-decrement" onclick="decrementBookQuantityCard('${bookId}')">-</button>
        <span id="quantity-${bookId}">${quantity}</span>
        <button class="quantity-increment" onclick="incrementBookQuantity('${bookId}')">+</button>
      `;
    }
}

export function createOrderHistoryModal() {
    // Check if the modal already exists
    if (document.getElementById('orderHistoryModal')) return;

    const modalHTML = `
      <div class="modal fade order-history-modal" id="orderHistoryModal" tabindex="-1" aria-labelledby="orderHistoryModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-right">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="orderHistoryModalLabel">Історія замовлень</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрити"></button>
            </div>
            <div class="modal-body" id="orderHistoryContent">
              <!-- Order history details will be injected here -->
              <p>Завантаження замовлень...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

export async function fetchOrderHistory() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) return [];

    const authToken = localStorage.getItem('authToken');
    try {
        const response = await fetch(`https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_orders_db/${user_id}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        // The response is an array of JSON strings, so we need to parse each element.
        const data = await response.json();
        console.log('Fetched orders data:', data);
        const orders = data.map(item => JSON.parse(item));
        return orders;
    } catch (error) {
        console.error('[Order History] Помилка отримання даних:', error);
        return [];
    }
}

export function renderOrderHistory(orders) {
    orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

    const container = document.getElementById('orderHistoryContent');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p>Немає замовлень.</p>';
        return;
    }

    let html = '<div class="accordion" id="orderHistoryAccordion">';
    orders.forEach((order, index) => {
        // Map order status to user-friendly text and set the background color for the status label.
        let statusText = order.status;
        let statusColor = 'gray';
        switch (order.status) {
            case 'processing':
                statusText = 'Очікується';
                statusColor = 'orange';
                break;
            case 'shipped':
                statusText = 'Відправлено';
                statusColor = 'blue';
                break;
            case 'completed':
                statusText = 'Виконано';
                statusColor = 'green';
                break;
            case 'cancelled':
                statusText = 'Скасовано';
                statusColor = 'red';
                break;
        }

        // Format order_date to a readable date without seconds.
        const dateObj = new Date(order.order_date);
        const orderDateFormatted = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}`;

        const totalPrice = parseFloat(order.final_price).toFixed(2);
        const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

        // Create miniatures for each order item.
        const miniatures = orderItems.map(item => {
            const book = window.getBookDetailsById(item.book_id);
            return book ? `<img src="${book.image_link}" alt="${book.book_name}" style="width:30px; height:auto; margin-left:5px;" onerror="this.onerror=null; this.src='/img/book-things/no-image.png';">` : '';
        }).join('');

        // Build header HTML with two rows:
        // The first row includes order id, total price, date, and the status label.
        // The second row shows the book covers.
        const headerHTML = `
        <div class="accordion-header-info" style="display: block; width:100%;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center;">
                <span style="margin-left: 10px; background-color:${statusColor}; color:white; padding: 2px 6px; border-radius:4px; font-weight:bold;">
                    ${statusText}
                </span>
                <span style="font-weight:bold;">Замовлення №${order.id}</span>
                <span style="margin-left: 10px; font-weight:bold;">${totalPrice} ₴</span>
            </div>
            <div>
              <span>${orderDateFormatted}</span>
            </div>
          </div>
        </div>
        <div class="accordion-header-covers" style="display: block; margin-top: 5px;">
          ${miniatures}
        </div>
      `;

        // Build the content inside the collapsed accordion.
        // For each order item, display book cover, title, quantity, and API unit_price.
        const orderItemsHTML = orderItems.map(item => {
            const book = window.getBookDetailsById(item.book_id);
            return `
          <div class="order-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div class="order-item-image" style="flex-shrink:0;">
                <img
                    src="${book && book.image_link ? book.image_link : '/img/book-things/no-image.png'}"
                    alt="${book ? book.book_name : 'Невідома книга'}"
                    style="width:50px; height:auto;"
                    onerror="this.onerror=null; this.src='/img/book-things/no-image.png';"
                >
                </div>
            <div class="order-item-details">
              <h5 style="margin:0; font-size:16px;">${book ? book.book_name : 'Невідома книга'}</h5>
              <p style="margin:2px 0;">Кількість: ${item.quantity}</p>
              <p style="margin:2px 0;">Ціна: ${parseFloat(item.unit_price).toFixed(2)} ₴</p>
            </div>
          </div>
        `;
        }).join('');

        // Delivery and shipping address info.
        const deliverySummaryHTML = `
        <p style="margin-top:10px; font-weight:bold;">Доставка: ${order.shipping_type} (${parseFloat(order.shipping_cost).toFixed(2)} ₴)</p>
        <p style="margin-bottom:0;">Адреса доставки: ${order.shipping_address}</p>
      `;

        html += `
        <div class="accordion-item">
          <h2 class="accordion-header" id="heading${index}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
              ${headerHTML}
            </button>
          </h2>
          <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" data-bs-parent="#orderHistoryAccordion">
            <div class="accordion-body" style="padding:15px;">
              ${orderItemsHTML}
              ${deliverySummaryHTML}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
}

let orderPollingInterval;

export function startOrderHistoryPolling(interval = 60000) { // 60000ms = 1 minute
    if (orderPollingInterval) clearInterval(orderPollingInterval);

    orderPollingInterval = setInterval(async () => {
        const orders = await fetchOrderHistory();
        renderOrderHistory(orders);
    }, interval);
}

function stopOrderHistoryPolling() {
    if (orderPollingInterval) {
        clearInterval(orderPollingInterval);
        orderPollingInterval = null;
    }
}

// Stop polling when modal is hidden (using Bootstrap's event)
document.getElementById('orderHistoryModal')?.addEventListener('hidden.bs.modal', stopOrderHistoryPolling);


/**
 * Displays a forced modal overlay where the user can choose how to merge
 * the previously saved DB cart and the current local cart.
 * 
 * @param {Array} dbCart - Array of cart items from the DB (previous session).
 * @param {Array} localCart - Array of cart items from the current site.
 */


// Update the cart in the database (call this sparingly to avoid many API calls) 
function updateCartInDB(cart, userId) {
    // Гарантуємо, що cart — масив
    const safeCart = Array.isArray(cart) ? cart : [];
  
    // Фільтруємо й приводимо дані до коректного вигляду
    const filteredCart = safeCart
      .filter(item => item && !item.pendingDeletion)           // пропускаємо null/undefined і pendingDeletion
      .map(item => ({
        id: Number(item.id) || 0,                              // на випадок рядкових id
        quantity: parseInt(item.quantity ?? 0, 10)             // якщо quantity відсутня або null => 0
      }));
  
    return fetch(
      `https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cart_update_for_user/${userId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          saved_cart: filteredCart
        })
      }
    )
      .then(response => {
        if (!response.ok) {
          throw new Error('[DB CART UPDATE] Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('[DB CART UPDATE] Cart successfully updated:', data);
        return data;
      })
      .catch(error => {
        console.error('[DB CART UPDATE] Error updating cart in DB:', error);
      });
  }
  

// Helper: Checks if two carts have the same set of book IDs regardless of quantity.
function areCartIdsIdentical(cartA, cartB) {
    const idsA = cartA.map(item => Number(item.id)).sort((a, b) => a - b);
    const idsB = cartB.map(item => Number(item.id)).sort((a, b) => a - b);
    return JSON.stringify(idsA) === JSON.stringify(idsB);
}

// Helper: Returns true if every item in subsetCart exists in fullCart (by id)
function isSubset(subsetCart, fullCart) {
    const fullIds = fullCart.map(item => Number(item.id));
    return subsetCart.every(item => fullIds.includes(Number(item.id)));
}

// Sync cart on login: fetch DB cart and merge with local cart if necessary, 
// then update DB with the chosen final cart. 
function syncCartOnLogin() {
    const userId = localStorage.getItem('user_id');
    const localCart = JSON.parse(localStorage.getItem('cart')) || [];
    console.log('[SYNC] localCart:', localCart);

    fetch(`https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cart_get_for_user/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(dbData => {
            console.log('[SYNC] dbData:', dbData);
            // Use the correct field ("saved_cart")
            const dbCart = (dbData && Array.isArray(dbData.saved_cart)) ? dbData.saved_cart : [];
            console.log('[SYNC] dbCart:', dbCart);

            if (dbCart.length > 0 && localCart.length > 0) {
                if (isSubset(dbCart, localCart)) {
                    // All items in DB cart are already in the local cart;
                    // In that case, we simply use the local cart.
                    localStorage.setItem('cart', JSON.stringify(localCart));
                    updateCartInDB(localCart, userId).then(() => {
                        if (window.updateCartUI) window.updateCartUI();
                    });
                    console.log('[SYNC] DB cart is a subset of local cart. Using local cart.');
                } else {
                    // If they differ, call the merge modal.
                    showMergeCartModal(dbCart, localCart);
                }
            } else if (dbCart.length > 0 && localCart.length === 0) {
                // If the local cart is empty, use the DB cart.
                localStorage.setItem('cart', JSON.stringify(dbCart));
                if (window.updateCartUI) window.updateCartUI();
                console.log('[SYNC] Local cart was empty. Filled from DB.');
            } else if (localCart.length > 0 && dbCart.length === 0) {
                // Only local cart exists: update the DB.
                updateCartInDB(localCart, userId).then(() => {
                    if (window.updateCartUI) window.updateCartUI();
                    console.log('[SYNC] Only local cart exists. Updated DB.');
                });
            } else {
                console.log('[SYNC] Both local and DB carts are empty.');
            }
        })
        .catch(error => {
            console.error('[SYNC CART ON LOGIN] Error fetching DB cart:', error);
            if (localCart.length) {
                updateCartInDB(localCart, userId);
            }
        });
}

// Update the DB cart on page unload or logout. 
window.addEventListener("beforeunload", () => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
        const localCart = JSON.parse(localStorage.getItem('cart')) || [];
        if (localCart.length > 0) {
            updateCartInDB(localCart, userId);
        }
    }
});

function showMergeCartModal(dbCart, localCart) {
    // Right cart is a copy of the local cart.
    let rightCart = localCart.map(item => ({ ...item }));
    // Left cart should include only DB items that are not already present (by id) in the local cart.
    let leftCart = dbCart
        .filter(dbItem => !localCart.some(l => Number(l.id) === Number(dbItem.id)))
        .map(item => ({ ...item }));

    // Create modal overlay if it doesn't exist.
    let modal = document.getElementById('mergeCartModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mergeCartModal';
        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1100'
        });
        const modalContent = document.createElement('div');
        modalContent.id = 'mergeCartModalContent';
        Object.assign(modalContent.style, {
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '800px',
            maxHeight: '80%',
            overflowY: 'auto'
        });
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    renderMergeCartModalContent();

    // Renders the modal content based on current leftCart and rightCart.
    function renderMergeCartModalContent() {
        const content = document.getElementById('mergeCartModalContent');
        content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px;">
          Бажаєте продовжити покупки з попереднього сеансу?
        </h2>
        <div id="mergeCartColumns" style="display: flex; gap: 20px;">
          <div id="mergeCartLeft" style="flex: 1; border: 1px solid #ccc; padding: 10px; min-height: 300px;">
            <h3 style="text-align: center;">Кошик з попереднього сеансу</h3>
            ${leftCart.length === 0
                ? `<p style="text-align: center;">Порожній</p>`
                : leftCart.map(item => renderMergeCartLeftItem(item)).join('')}
          </div>
          <div id="mergeCartRight" style="flex: 1; border: 1px solid #ccc; padding: 10px; min-height: 300px;">
            <h3 style="text-align: center;">Поточний кошик</h3>
            ${rightCart.length === 0
                ? `<p style="text-align: center;">Порожній</p>`
                : rightCart.map(item => renderMergeCartRightItem(item)).join('')}
          </div>
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: space-between;">
          <button id="clearLeftButton" style="padding: 10px 20px; background-color: #ff4d4d; color: white; border: none; border-radius: 4px;">
            Видалити все з лівої
          </button>
          <button id="saveMergeButton" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px;" ${leftCart.length > 0 ? 'disabled' : ''}>
            Зберегти
          </button>
        </div>
      `;

        document.getElementById('clearLeftButton').addEventListener('click', () => {
            leftCart = [];
            updateMergeModal();
        });

        document.getElementById('saveMergeButton').addEventListener('click', () => {
            const finalCart = rightCart; // Final merged cart equals local cart.
            const userId = localStorage.getItem('user_id');
            updateCartInDB(finalCart, userId).then(() => {
                localStorage.setItem('cart', JSON.stringify(finalCart));
                hideMergeCartModal();
                updateCartUI();
                showNotification('Список замовлень оновлено');
            });
        });
        updateSaveButtonState();
    }

    // Re-render the modal columns.
    function updateMergeModal() {
        // Remove leftCart items that now exist in rightCart.
        leftCart = leftCart.filter(item => !rightCart.some(r => Number(r.id) === Number(item.id)));
        const leftDiv = document.getElementById('mergeCartLeft');
        const rightDiv = document.getElementById('mergeCartRight');
        leftDiv.innerHTML = `<h3 style="text-align: center;">Кошик з попереднього сеансу</h3>` +
            (leftCart.length === 0 ? `<p style="text-align: center;">Порожній</p>` : leftCart.map(item => renderMergeCartLeftItem(item)).join(''));
        rightDiv.innerHTML = `<h3 style="text-align: center;">Поточний кошик</h3>` +
            (rightCart.length === 0 ? `<p style="text-align: center;">Порожній</p>` : rightCart.map(item => renderMergeCartRightItem(item)).join(''));
        updateSaveButtonState();
    }

    function updateSaveButtonState() {
        const saveButton = document.getElementById('saveMergeButton');
        saveButton.disabled = leftCart.length > 0;
    }

    function renderMergeCartLeftItem(item) {
        const book = window.getBookDetailsById(item.id);
        if (!book) return '';
        return `
        <div class="merge-cart-item" id="merge-left-${item.id}" style="display: flex; align-items: center; margin-bottom: 10px;">
          <img src="${book.image_link}" alt="${book.book_name}" style="width: 50px; height: auto; margin-right: 10px;">
          <div style="flex: 1;">${book.book_name} (${item.quantity})</div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <button onclick="handleMergeDelete('${item.id}')" style="padding: 5px; background-color: #ff4d4d; color: white; border: none; border-radius: 4px;">
              Видалити
            </button>
            <button onclick="handleMergeMove('${item.id}')" style="padding: 5px; background-color: #4CAF50; color: white; border: none; border-radius: 4px;">
              Перемістити
            </button>
          </div>
        </div>
      `;
    }

    function renderMergeCartRightItem(item) {
        const book = window.getBookDetailsById(item.id);
        if (!book) return '';
        return `
        <div class="merge-cart-item" id="merge-right-${item.id}" style="display: flex; align-items: center; margin-bottom: 10px;">
          <img src="${book.image_link}" alt="${book.book_name}" style="width: 50px; height: auto; margin-right: 10px;">
          <div style="flex: 1;">${book.book_name} (${item.quantity})</div>
        </div>
      `;
    }

    // Expose handlers.
    window.handleMergeDelete = function (itemId) {
        leftCart = leftCart.filter(item => Number(item.id) !== Number(itemId));
        updateMergeModal();
    };

    window.handleMergeMove = function (itemId) {
        const index = leftCart.findIndex(item => Number(item.id) === Number(itemId));
        if (index > -1) {
            const [movedItem] = leftCart.splice(index, 1);
            // Only add to rightCart if not already present.
            if (!rightCart.some(item => Number(item.id) === Number(itemId))) {
                rightCart.push(movedItem);
            }
            updateMergeModal();
        }
    };

    function hideMergeCartModal() {
        const modal = document.getElementById('mergeCartModal');
        if (modal) {
            modal.remove();
        }
    }
}

// A simple notification function which displays a message at the top of the page.
function showNotification(message) {
    let notification = document.createElement('div');
    notification.textContent = message;
    Object.assign(notification.style, {
        position: 'fixed',
        top: '60px',      // Adjust based on your header height
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#4CAF50',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '4px',
        zIndex: '1200'
    });
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Додавання книги до локальної пам'яті
export function addToRecentlyViewed(bookId) {
    const viewedBooks = JSON.parse(localStorage.getItem('recentlyViewedBooks')) || [];
    if (!viewedBooks.includes(bookId)) {
        viewedBooks.unshift(bookId);
        if (viewedBooks.length > 5) viewedBooks.pop(); // Обмеження до 5 книг
        localStorage.setItem('recentlyViewedBooks', JSON.stringify(viewedBooks));
    }
}

// Отримання списку переглянутих книг
export function getRecentlyViewedBooks() {
    return JSON.parse(localStorage.getItem('recentlyViewedBooks')) || [];
}

export async function updateRecentlyViewedSection(fetchBooksByIds, containerId = 'recentlyViewedSection') {
    const ids = getRecentlyViewedBooks();
    if (!ids.length) return;
    const books = await fetchBooksByIds(ids);
    const container = document.getElementById(containerId);
    if (!container) return;
  
    container.innerHTML = books
      .map(book => {
        // можна обгорнути в <div class="col-…"> якщо треба сітка
        return renderBookCard(book);
      })
      .join('');
  
    // додаємо кнопки «+»/«–» (івенти) з того ж самого набору
    books.forEach(book => renderAddToCartControls(book));
  }

// Завантаження модалки логіну
export function loadLoginModal() {
    const container = document.getElementById('loginModalContainer');
    if (!container) {
        console.error('%c[LOAD LOGIN MODAL] Контейнер loginModalContainer не знайдено в DOM', 'color: orange;');
        return Promise.reject('%c[LOAD LOGIN MODAL] Контейнер loginModalContainer не знайдено', 'color: orage;');
    }

    return loadReusableComponent('loginModalContainer', '/cozy_corner_demo/reusable/login.html').then(() => {
        console.log('%c[LOAD LOGIN MODAL] Модалка логіну завантажена', 'color: orange;');
        const modalContainer = document.getElementById('loginModal');
        if (modalContainer) {
            console.log('%c[LOAD LOGIN MODAL] Модалка логіну доступна в DOM', 'color: darkorange;');
        } else {
            console.error('%c[LOAD LOGIN MODAL] Модалка логіну не знайдена після завантаження', 'color: orange;');
        }
    });
}

// Функція для встановлення обробників подій модалки логіну
export function setupLoginEventListeners() {
    const loginButton = document.getElementById('loginItem');
    const logoutButton = document.getElementById('logoutItem');
    const closeButton = document.getElementById('closeLoginModal');

    if (loginButton) {
        loginButton.addEventListener('click', showLoginModal);
        console.log('%c[LOGIN] Обробник подій для кнопки логіну додано', 'color: green; font-weight: bold;');
    } else {
        console.warn('%c[LOGIN] Кнопка логіну не знайдена', 'color: red; font-weight: bold;');
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
        console.log('%c[LOGIN] Обробник подій для кнопки виходу додано', 'color: green; font-weight: bold;');
    } else {
        console.warn('%c[LOGIN] Кнопка виходу не знайдена', 'color: red; font-weight: bold;');
    }

    if (closeButton) {
        closeButton.addEventListener('click', hideLoginModal);
        console.log('%c[LOGIN] Обробник подій для закриття модалки додано', 'color: green; font-weight: bold;');
    } else {
        console.warn('%c[LOGIN] Кнопка закриття модалки не знайдена', 'color: red; font-weight: bold;');
    }
}

// Відображення модалки для логіну
export function showLoginModal() {
    const modalContainer = document.getElementById('loginModalContainer');
    if (modalContainer) {
        modalContainer.style.display = 'flex'; // Змінюємо на flex для центрування
        console.log('%c[ACTIVE LOGIN MODAL] LOGIN: Модалка відкрита', 'color: #ffc183;');
    } else {
        console.error('[ACTIVE LOGIN MODAL] Login modal container не знайдено');
    }
}

// Приховання модалки
export function hideLoginModal() {
    const modalContainer = document.getElementById('loginModalContainer');
    const modal = document.getElementById('loginModal');

    if (modalContainer && modal) {
        modalContainer.style.display = 'none';
        console.log('%c[ACTIVE LOGIN MODAL] LOGIN: Модалка закрита', 'color: #ffc183;');
    } else {
        console.error('[ACTIVE LOGIN MODAL] Login modal або container не знайдено');
    }
}

// Обробка запиту на логін
export function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('pass').value.trim();

    if (!email || !password) {
        console.error('[LOGIN] Email або пароль не введено.');
        return;
    }

    fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(response => {
            console.log('%c[API] Відповідь сервера:', 'color: cyan;', response);
            return response.json();
        })
        .then(data => {
            if (data.authToken) {
                localStorage.setItem('is_logged', 'true');
                localStorage.setItem('authToken', data.authToken);
                localStorage.setItem('user_id', data.user.id);
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('user_email', data.user.email);

                console.log('[LOGIN] Авторизація успішна, отримано дані користувача.');
                hideLoginModal();

                // Fetch roles/info and update UI
                getUserInfo();
                // Now synchronize the cart
                syncCartOnLogin();

                updateCartUserInfo();
            } else {
                showFailModal('Помилка входу', 'Токен не отримано.');
            }
        })
        .catch(error => {
            console.error('[LOGIN] Помилка входу:', error);
            showFailModal('Помилка входу', error.message);
        });
}

export function getUserInfo() {
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
        console.warn('[USER INFO] Користувач не авторизований.');
        return;
    }

    fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/auth/me', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    })
        .then(response => response.json())
        .then(userData => {
            if (!userData || !userData.id) {
                console.warn('[USER INFO] Некоректна відповідь від сервера.');
                logoutUser();
                return;
            }

            console.log('[USER INFO] Дані користувача оновлено:', userData);

            // Використовуємо ролі без збереження в localStorage
            initializeUserInterface(true, userData.is_administrator, userData.is_moderator);
        })
        .catch(error => {
            console.error('[USER INFO] Помилка отримання інформації про користувача:', error);
            logoutUser();
        });
}

// Обробка запиту на реєстрацію
export function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('reg-user').value;
    const password = document.getElementById('reg-pass').value;
    const repeatPassword = document.getElementById('reg-repeat-pass').value;
    const email = document.getElementById('reg-email').value;

    if (password !== repeatPassword) {
        showFailModal('Помилка реєстрації', 'Паролі не збігаються.');
        return;
    }

    fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
    })
        .then(response => response.json())
        .then(data => {
            hideLoginModal();
            showFailModal('Реєстрація успішна', 'Вас успішно зареєстровано!');
        })
        .catch(error => {
            console.error('[ACTIVE REGISTER MODAL] Registration error:', error);
            showFailModal('Помилка реєстрації', error.message);
        });
}

// Перевірка статусу користувача
export function checkLoginStatus() {
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
        initializeUserInterface(false, false, false);
        return;
    }

    console.log('[LOGIN STATUS] Перевірка статусу логіну...');
    getUserInfo(); // Запитуємо інформацію про користувача з сервера
}

// Налаштування інтерфейсу користувача
export function initializeUserInterface(is_logged, is_admin, is_moderator) {
    console.log('[LOGIN STATUS] Оновлення інтерфейсу користувача.');
    console.log(
        `%c[LOGIN STATUS] Ініціалізація інтерфейсу. is_logged: ${is_logged}, is_admin: ${is_admin}, is_moderator: ${is_moderator}`,
        'color: #ffc183; font-weight: bold;'
    );

    const userNameItem = document.getElementById('userNameItem');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const loginItem = document.getElementById('loginItem'); // Кнопка "Увійти"
    const logoutItem = document.getElementById('logoutItem'); // Кнопка "Вийти"
    const adminPanelLink = document.getElementById('adminPanelLink');

    const savedItem = document.getElementById('savedItem');
    const settingsItem = document.getElementById('settingsItem');
    const userInfo = document.getElementById('user-info');
    const subMenuHR = document.getElementById('subMenuHR');
    const cartItem = document.getElementById('cartItem'); // Кошик
    const orderHistoryItem = document.getElementById('orderHistoryItem');

    if (is_logged) {
        const username = localStorage.getItem('username') || 'Користувач';

        if (userNameItem) {
            userNameItem.style.display = 'flex';
            userNameItem.textContent = username;
        }

        if (userRoleBadge) {
            userRoleBadge.style.display = 'inline-block';
            userRoleBadge.classList.remove('user-role', 'moderator-role', 'admin-role');

            if (is_admin) {
                userRoleBadge.textContent = 'Адміністратор';
                userRoleBadge.classList.add('admin-role');
                adminPanelLink.style.display = 'flex';
            } else if (is_moderator) {
                userRoleBadge.textContent = 'Модератор';
                userRoleBadge.classList.add('moderator-role');
                adminPanelLink.style.display = 'none';
            } else {
                userRoleBadge.textContent = 'Користувач';
                userRoleBadge.classList.add('user-role');
                adminPanelLink.style.display = 'none';
            }
        }

        if (userInfo) userInfo.style.display = 'flex';
        if (subMenuHR) subMenuHR.style.display = 'flex';

        if (loginItem) loginItem.style.display = 'none'; // Ховаємо кнопку "Увійти"
        if (logoutItem) logoutItem.style.display = 'flex'; // Показуємо кнопку "Вийти"

        if (savedItem) savedItem.style.display = 'flex';
        if (settingsItem) settingsItem.style.display = 'flex';

        if (orderHistoryItem) orderHistoryItem.style.display = 'flex';
    } else {
        // Якщо користувач не залогінений
        if (userNameItem) userNameItem.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        if (subMenuHR) subMenuHR.style.display = 'none';

        if (loginItem) loginItem.style.display = 'flex'; // Показуємо кнопку "Увійти"
        if (logoutItem) logoutItem.style.display = 'none'; // Ховаємо кнопку "Вийти"

        if (savedItem) savedItem.style.display = 'none';
        if (settingsItem) settingsItem.style.display = 'none';
        if (adminPanelLink) adminPanelLink.style.display = 'none';

        if (orderHistoryItem) orderHistoryItem.style.display = 'none';
    }

    // Кошик завжди видимий
    if (cartItem) {
        cartItem.style.display = 'flex';
    }

    console.log('%c[LOGIN STATUS] Інтерфейс оновлено.', 'color: #ffc183');
}

function ensureFailModalExists() {
    if (!document.getElementById('failModal')) {
        const modalHTML = `
            <div class="modal fail-login-register fade" id="failModal" tabindex="-1" aria-labelledby="failModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="failModalLabel">Login failed</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Сюди буде додаватися повідомлення -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Функція для відображення повідомлення в модалці
export function showFailModal(title, message) {
    ensureFailModalExists(); // Перевіряємо, чи існує модалка

    // Оновлюємо заголовок і повідомлення в модалці
    const modalTitle = document.getElementById('failModalLabel');
    const modalBody = document.querySelector('#failModal .modal-body');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = message;

    // Використовуємо Bootstrap методи для показу модалки
    const failModal = new bootstrap.Modal(document.getElementById('failModal'));
    failModal.show();
}

// Поведінка при виході користувача з облікового запису
export function logoutUser() {
    const userId = localStorage.getItem('user_id');
    const localCart = JSON.parse(localStorage.getItem('cart')) || [];

    // If there is a user_id and there are items in the cart, update the DB.
    if (userId && localCart.length > 0) {
        updateCartInDB(localCart, userId)
            .then(() => {
                console.log('[LOGOUT] Cart successfully updated in DB before logout.');
            })
            .catch(err => {
                console.error('[LOGOUT] Error updating cart in DB before logout:', err);
            });
    }

    // Clear user-related data but leave the cart in localStorage.
    localStorage.setItem('is_logged', 'false');
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('user_balance');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    // Notice: We do NOT remove 'cart' from localStorage.

    console.log('%c[LOGOUT] Користувач вийшов з облікового запису.', 'color: darkorange;');

    // Update the interface after logout.
    initializeUserInterface(false, false, false);
    updateCartUI();

    // Optionally, redirect to the homepage:
    // window.location.href = '/home/index.html';
}

// Додавання слухачів подій
document.body.addEventListener('submit', (event) => {
    const form = event.target; // Отримуємо цільовий елемент
    if (form.id === 'loginForm') {
        event.preventDefault();
        console.log('%c[LOGIN] Натиснута кнопка "Sign In", запускаємо handleLogin()', 'color: cyan; font-weight: bold;');
        handleLogin(event);
    }

    if (form.id === 'registerForm') {
        event.preventDefault();
        console.log('%c[REGISTER] Натиснута кнопка "Sign Up", запускаємо handleRegister()', 'color: cyan; font-weight: bold;');
        handleRegister(event);
    }
});

// Додаємо після блоку для orderHistoryItem у lazy-loader.js :contentReference[oaicite:0]{index=0}

// 1. Створення HTML-модалки
function createSettingsModal() {
    if (document.getElementById('settingsModal')) return;
  
    const modalHTML = `
    <div class="modal fade" id="settingsModal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-right">
        <div class="modal-content">
          <div class="modal-header align-items-center">
            <h5 class="modal-title" id="settingsModalLabel">Налаштування користувача</h5>
            <button type="button" class="btn btn-secondary btn-sm rounded-circle ms-2" id="editSettingsBtn" title="Редагувати">
              <img src="/img/user/edit.png" alt="✎" style="width:16px;height:20px;">
            </button>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="modal" aria-label="Закрити"></button>
          </div>
          <div class="modal-body">
            <div id="viewSettings">
            <div class="mb-3">
                <label class="form-label">Тариф</label>
                <div class="badge bg-secondary">Читач</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Ім’я користувача</label>
                <input type="text" class="form-control" id="settingsUsername" readonly>
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" id="settingsEmail" readonly>
              </div>
              
              <button type="button" class="btn btn-danger" id="deleteAccountBtn">Видалити акаунт</button>
            </div>
            <form id="settingsForm" class="d-none">
              <div class="mb-3">
                <label class="form-label" for="settingsUsernameEditable">Ім’я користувача</label>
                <input type="text" class="form-control" id="settingsUsernameEditable">
              </div>
              <div class="mb-3">
                <label class="form-label" for="settingsEmailEditable">Email</label>
                <input type="email" class="form-control" id="settingsEmailEditable">
              </div>
              <div class="mb-3">
                <label class="form-label" for="settingsNewPassword">Новий пароль</label>
                <input type="password" class="form-control" id="settingsNewPassword">
              </div>
              <div class="mb-3">
                <label class="form-label" for="settingsConfirmPassword">Підтвердіть пароль</label>
                <input type="password" class="form-control" id="settingsConfirmPassword">
              </div>
              <button type="submit" class="btn btn-primary">Зберегти</button>
              <button type="button" class="btn btn-secondary ms-2" id="cancelEditSettings">Скасувати</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 2. Наповнення полів поточними даними (обидві версії)
function populateSettingsView() {
    document.getElementById('settingsUsername').value = localStorage.getItem('username') || '';
    document.getElementById('settingsEmail').value    = localStorage.getItem('user_email') || '';
}
function populateSettingsForm() {
    document.getElementById('settingsUsernameEditable').value = localStorage.getItem('username') || '';
    document.getElementById('settingsEmailEditable').value    = localStorage.getItem('user_email') || '';
}

// 3. Відкриття модалки
waitForElement('#settingsItem').then(settingsItem => {
    settingsItem.addEventListener('click', e => {
    e.preventDefault();
    createSettingsModal();
    populateSettingsView();
    document.getElementById('viewSettings').classList.remove('d-none');
    document.getElementById('settingsForm').classList.add('d-none');
    new bootstrap.Modal('#settingsModal').show();
    });
});

// 4. Кнопка «Редагувати»
document.body.addEventListener('click', e => {
    if (e.target.closest('#editSettingsBtn')) {
    populateSettingsForm();
    document.getElementById('viewSettings').classList.add('d-none');
    document.getElementById('settingsForm').classList.remove('d-none');
    }
});

// 5. Скасування редагування
document.body.addEventListener('click', e => {
    if (e.target.id === 'cancelEditSettings') {
    e.preventDefault();
    populateSettingsView();
    document.getElementById('settingsForm').classList.add('d-none');
    document.getElementById('viewSettings').classList.remove('d-none');
    }
});

// 6. Збереження змін
document.body.addEventListener('submit', async e => {
    if (e.target.id !== 'settingsForm') return;
    e.preventDefault();

    const newName  = document.getElementById('settingsUsernameEditable').value.trim();
    const newEmail = document.getElementById('settingsEmailEditable').value.trim();
    const pwd      = document.getElementById('settingsNewPassword').value;
    const confirm  = document.getElementById('settingsConfirmPassword').value;
    if (pwd && pwd !== confirm) {
    return alert('Паролі не збігаються.');
    }

    const user_id      = localStorage.getItem('user_id');
    const token        = localStorage.getItem('authToken');
    const currentName  = localStorage.getItem('username');
    const currentEmail = localStorage.getItem('user_email');

    // Формуємо payload так, щоб завжди були обидва поля:
    const payload = {
    username: newName  || currentName,
    email:    newEmail || currentEmail,
    };
    if (pwd) {
    payload.password = pwd;
    }

    try {
    const res = await fetch(
        `https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/user_pass/${user_id}`,
        {
        method: 'PATCH',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
        }
    );
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Не вдалося зберегти зміни.');
    }

    // Оновлюємо localStorage тільки якщо прийшли нові значення
    localStorage.setItem('username', data.username);
    localStorage.setItem('user_email', data.email);

    alert('Дані оновлено.');
    // повертаємо у режим перегляду
    populateSettingsView();
    document.getElementById('settingsForm').classList.add('d-none');
    document.getElementById('viewSettings').classList.remove('d-none');

    } catch (err) {
    console.error(err);
    alert('Помилка при збереженні.');
    }
});
  
// 7. Видалення акаунту
document.body.addEventListener('click', async e => {
    if (e.target.id !== 'deleteAccountBtn') return;
    if (!confirm('Ви впевнені, що хочете видалити акаунт?')) return;

    const userId = localStorage.getItem('user_id');
    const token  = localStorage.getItem('authToken');
    const payload = {
    reason: 'Видалення акаунту за власним рішенням користувача'
    };

    try {
    const res = await fetch(
        `https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/user/${userId}`,
        {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
        }
    );
    if (!res.ok) throw new Error('Не вдалося видалити акаунт.');

    // Після успіху чистимо локальне сховище та переадресовуємо на головну
    localStorage.clear();
    window.location.href = '/home/';
    } catch (err) {
    console.error(err);
    alert('Помилка при видаленні акаунту.');
    }
});



window.getBookDetailsById = getBookDetailsById;
window.updateFinalTotal = updateFinalTotal;
window.renderCartPageContent = renderCartPageContent;
window.updateCartQuantity = updateCartQuantity;
window.addToCart = addToCart;
window.updateCartHeader = updateCartHeader;
window.renderCartModalContent = renderCartModalContent;
window.updateAddToCartControls = updateAddToCartControls;
window.renderAddToCartControls = renderAddToCartControls;
window.showLoginModal = showLoginModal;
window.incrementBookQuantity = incrementBookQuantity;
window.updateCartInDB = updateCartInDB;

window.createOrderHistoryModal = createOrderHistoryModal;
window.fetchOrderHistory = fetchOrderHistory;
window.renderOrderHistory = renderOrderHistory;
window.startOrderHistoryPolling = startOrderHistoryPolling;

window.addToRecentlyViewed = addToRecentlyViewed;
window.getRecentlyViewedBooks = getRecentlyViewedBooks;
window.updateRecentlyViewedSection = updateRecentlyViewedSection;

window.decrementBookQuantityCard = function (bookId) {
    // For book cards (non-modal), assume isModal = false.
    return decrementBookQuantity(bookId, false);
};

window.decrementBookQuantityModal = function (bookId) {
    // For modals, set isModal = true.
    return decrementBookQuantity(bookId, true);
};
