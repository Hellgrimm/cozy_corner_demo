console.log("moder-panel.js запущено!");

const BooksModule = (() => {
    let inited = false;
    let books = [];
    let isListView = true;

    let selectedModalGenres    = new Set();
    let selectedModalLanguages = new Set();

    let existingGenres = new Set();
    let existingLanguages = new Set();
    let globalGenres = [];
    let globalLanguages = [];
    let selectedGenres = new Set();
    let selectedLanguages = new Set();

    const DOM = {};
  
    function init() {
        if (inited) return;
        inited = true;
        cacheDOM();
        bindEvents();
        loadBooks();
    }

    function cacheDOM() {
        DOM.container           = document.getElementById('moderBooksContainer');
        DOM.searchInput         = document.getElementById('moderSearchInput');
        DOM.addBtn              = document.getElementById('addBookBtn');
        DOM.listViewBtn         = document.getElementById('listViewBtn');
        DOM.tableViewBtn        = document.getElementById('tableViewBtn');

        // модалки
        DOM.addModal            = document.getElementById('addBookModal');
        DOM.editModal           = document.getElementById('editBookModal');
        DOM.saveNewBookBtn      = document.getElementById('saveNewBook');
        DOM.saveChangesBtn      = document.getElementById('saveBookChanges');

        // теги в редагуванні
        DOM.genreContainer      = document.getElementById('genreContainer');
        DOM.genreInput          = document.getElementById('genreInput');
        DOM.genreSuggestions    = document.getElementById('genreSuggestions');
        DOM.addGenreBtn         = document.getElementById('addGenreButton');
        DOM.languageContainer   = document.getElementById('languageContainer');
        DOM.languageInput       = document.getElementById('languageInput');
        DOM.languageSuggestions = document.getElementById('languageSuggestions');
        DOM.addLanguageBtn      = document.getElementById('addLanguageButton');

        // теги в додаванні
        DOM.newGenreContainer      = document.getElementById('addGenreContainer');
        DOM.newGenreInput          = document.getElementById('newGenreInput');
        DOM.newGenreSuggestions    = document.getElementById('newGenreSuggestions');
        DOM.addNewGenreBtn         = document.getElementById('addNewGenreButton');
        DOM.newLanguageContainer   = document.getElementById('addLanguageContainer');
        DOM.newLanguageInput       = document.getElementById('newLanguageInput');
        DOM.newLanguageSuggestions = document.getElementById('newLanguageSuggestions');
        DOM.addNewLanguageBtn      = document.getElementById('addNewLanguageButton');
    }
  
    function bindEvents() {
        // показати / сховати
        DOM.addBtn.addEventListener('click', showAddBookModal);
        DOM.saveNewBookBtn.addEventListener('click', saveNewBook);
        DOM.saveChangesBtn.addEventListener('click', saveBookChanges);
    
        // пошук та вигляд
        DOM.searchInput.addEventListener('input', onSearch);
        DOM.listViewBtn.addEventListener('click', () => switchView(true));
        DOM.tableViewBtn.addEventListener('click', () => switchView(false));
    
        // делегований клік по книгам
        DOM.container.addEventListener('click', onContainerClick);
    
        // автодоповнення і додавання тегів
        setupTagAddition( DOM.newGenreInput, DOM.addNewGenreBtn, DOM.newGenreContainer, 'genre');
        setupTagAddition(DOM.genreInput, DOM.addGenreBtn, DOM.genreContainer, 'genre');
        setupTagAddition(DOM.newLanguageInput, DOM.addNewLanguageBtn, DOM.newLanguageContainer, 'language');
        setupTagAddition(DOM.languageInput, DOM.addLanguageBtn, DOM.languageContainer, 'language');

        setupAutoSuggest(DOM.genreInput,    DOM.genreSuggestions,    'genre');
        setupAutoSuggest(DOM.newGenreInput, DOM.newGenreSuggestions, 'genre');
        setupAutoSuggest(DOM.languageInput,    DOM.languageSuggestions,    'language');
        setupAutoSuggest(DOM.newLanguageInput, DOM.newLanguageSuggestions, 'language');
    }

    async function loadBooks() {
        const CACHE_TIME = 5 * 60 * 1000;
        const raw = localStorage.getItem('books');
        const ts  = localStorage.getItem('booksFetchTime');
        if (raw && ts && Date.now() - Number(ts) < CACHE_TIME) {
            books = JSON.parse(raw);
        } else {
            const res = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db');
            if (!res.ok) throw new Error('Помилка завантаження книг');
            books = await res.json();
            localStorage.setItem('books', JSON.stringify(books));
            localStorage.setItem('booksFetchTime', String(Date.now()));
        }
        extractGenresAndLanguages();
        displayBooks(books);
    }

    function extractGenresAndLanguages() {
        existingGenres.clear();
        existingLanguages.clear();
        books.forEach(b => {
            (b.book_genre || []).forEach(g => existingGenres.add(g.trim()));
            (b.book_language || []).forEach(l => existingLanguages.add(l.trim()));
        });
        globalGenres    = [...existingGenres];
        globalLanguages = [...existingLanguages];
    }

    function displayBooks(list) {
        DOM.container.innerHTML = '';
        DOM.container.className = isListView
            ? 'books-list-view'
            : 'books-table-view';

        list.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-item';
            div.innerHTML = `
                <img src="${book.image_link}" alt="${book.book_name}">
                <div class="book-info">
                <h3>${book.book_name}</h3>
                <p>${book.writer_name}</p>
                </div>
                <button class="btn btn-primary btn-edit-book"   data-id="${book.id}">Редагувати</button>
                <button class="btn btn-danger  btn-delete-book ms-2" data-id="${book.id}">Видалити</button>
            `;
            DOM.container.appendChild(div);
        });
    }

    function onContainerClick(e) {
        const id = e.target.dataset.id;
        if (e.target.matches('.btn-edit-book')) {
        showEditBookModal(id);
        }
        if (e.target.matches('.btn-delete-book')) {
        deleteBookWithConfirm(id);
        }
    }

    function onSearch(e) {
        const q = e.target.value.toLowerCase();
        displayBooks(books.filter(b => b.book_name.toLowerCase().includes(q)));
    }

    function switchView(listView) {
        isListView = listView;
        DOM.listViewBtn.classList.toggle('active', listView);
        DOM.tableViewBtn.classList.toggle('active', !listView);
        displayBooks(books);
    }

    function showAddBookModal() {
        // Скинути стан
        selectedModalGenres.clear();
        selectedModalLanguages.clear();

        // Оновити UI (пусті контейнери тегів)
        updateTagDisplay(DOM.newGenreContainer,    selectedModalGenres,    'genre');
        updateTagDisplay(DOM.newLanguageContainer, selectedModalLanguages, 'language');

        // Очистити автопідказки
        DOM.newGenreSuggestions.innerHTML    = '';
        DOM.newLanguageSuggestions.innerHTML = '';

        // Показати
        new bootstrap.Modal(DOM.addModal).show();
    }

    async function saveNewBook() {
        const newBook = {
        book_name:     document.getElementById('newBookName').value.trim(),
        writer_name:   document.getElementById('newWriterName').value.trim(),
        page_count:    Number(document.getElementById('newPageCount').value) || 0,
        writing_date:  Number(document.getElementById('newWritingDate').value) || 1900,
        publisher:     document.getElementById('newPublisher').value.trim(),
        description:   document.getElementById('newDescription').value.trim(),
        price:         parseFloat(document.getElementById('newPrice').value)   || 0,
        book_rating:   parseFloat(document.getElementById('newBookRating').value).toFixed(1) || '0.0',
        book_quantity: Number(document.getElementById('newBookQuantity').value) || 0,
        book_genre:    [...selectedGenres],
        book_language: [...selectedLanguages],
        image_link:    document.getElementById('newImageLink').value.trim()
        };
        const res = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db', {
        method: 'POST',
        headers: {
            'Content-Type':'application/json',
            'Authorization':`Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(newBook)
        });
        if (!res.ok) return alert('Не вдалось створити книгу');
        await loadBooks();
        bootstrap.Modal.getInstance(DOM.addModal).hide();
    }

    function showEditBookModal(bookId) {
        const book = books.find(b => b.id === +bookId);
        if (!book) return console.error('Книга не знайдена');
        // заповнюємо поля
        document.getElementById("editBookName").value      = book.book_name;
        document.getElementById("editWriterName").value    = book.writer_name;
        document.getElementById("editPageCount").value     = book.page_count;
        document.getElementById("editWritingDate").value   = book.writing_date;
        document.getElementById("editPublisher").value     = book.publisher;
        document.getElementById("editDescription").value   = book.description;
        document.getElementById("editPrice").value         = book.price;
        document.getElementById("editBookRating").value    = book.book_rating;
        document.getElementById("editBookQuantity").value  = book.book_quantity;
        document.getElementById("previousImageLink").value = book.image_link;
        document.getElementById("editBookPreview").src     = book.image_link;
        document.getElementById("editImageLink").value     = '';

        // Ініціалізувати стан
        selectedModalGenres    = new Set(book.book_genre   || []);
        selectedModalLanguages = new Set(book.book_language|| []);
        // Оновити UI
        updateTagDisplay(DOM.genreContainer,    selectedModalGenres,    'genre');
        updateTagDisplay(DOM.languageContainer, selectedModalLanguages, 'language');
        // Очистити автопідказки
        DOM.genreSuggestions.innerHTML    = '';
        DOM.languageSuggestions.innerHTML = '';
        // Запустити
        DOM.editModal.dataset.bookId = bookId;
        new bootstrap.Modal(DOM.editModal).show();
    }

    async function saveBookChanges() {
        const bookId = DOM.editModal.dataset.bookId;
        const updated = { id: +bookId };
        // збираємо з інпутів так само, як у saveNewBook()
        // …
        const res = await fetch(
            `https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db/${bookId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(updated)
        }
        );
        if (!res.ok) return console.error('Помилка збереження');
        await loadBooks();
        bootstrap.Modal.getInstance(DOM.editModal).hide();
    }

    function deleteBookWithConfirm(bookId) {
        if (!confirm('Ви дійсно хочете видалити книгу?')) return;
        deleteBook(bookId);
    }

    async function deleteBook(bookId) {
        const res = await fetch(
          `https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db/${bookId}`,
          { method:'DELETE',
            headers:{ 'Authorization':`Bearer ${localStorage.getItem('authToken')}` }
          }
        );
        if (!res.ok) {
          console.error('Не вдалось видалити книгу');
          return;
        }
      
        // 1) Оновлюємо локальний масив
        books = books.filter(b => b.id !== +bookId);
      
        // 2) Оновлюємо кеш
        localStorage.setItem('books', JSON.stringify(books));
        localStorage.setItem('booksFetchTime', String(Date.now()));
      
        // 3) Перерендерюємо поточний вигляд
        displayBooks(books);
      }      

    // **TAG HELPERS**

    function setupTagAddition(inputEl, buttonEl, containerEl, type) {
        const isGenre = type === 'genre';
    
        function addTag() {
        const tag = inputEl.value.trim();
        if (!tag) return;
        // додаємо в єдиний набір
        if (isGenre) selectedModalGenres.add(tag);
        else         selectedModalLanguages.add(tag);
    
        // оновлюємо відображення
        updateTagDisplay(containerEl,
            isGenre ? selectedModalGenres : selectedModalLanguages,
            type
        );
        inputEl.value = '';
        }
    
        buttonEl.addEventListener('click', addTag);
        inputEl.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
        });
    }

    function updateTagDisplay(container, tagSet, type) {
        container.innerHTML = '';
        tagSet.forEach(tag => {
        const span = document.createElement('span');
        span.className = `${type}-tag`;
        span.textContent = tag;
    
        const btn = document.createElement('button');
        btn.textContent = '✖';
        btn.addEventListener('click', () => {
            tagSet.delete(tag);
            updateTagDisplay(container, tagSet, type);
        });
    
        span.appendChild(btn);
        container.appendChild(span);
        });
    }     

    function setupAutoSuggest(input, suggestionBox, type) {
        input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        if (!q) {
            suggestionBox.style.display = 'none';
            return;
        }
        // динамічно беремо список
        const list = type === 'genre' ? globalGenres : globalLanguages;
        const matches = list.filter(tag => tag.toLowerCase().startsWith(q));
    
        suggestionBox.innerHTML = matches
            .map(tag => `<li>${tag}</li>`)
            .join('');
    
        suggestionBox.querySelectorAll('li').forEach(li =>
            li.addEventListener('click', () => {
            input.value = li.textContent;
            suggestionBox.style.display = 'none';
            })
        );
    
        suggestionBox.style.display = matches.length ? 'block' : 'none';
        });
    
        input.addEventListener('blur', () =>
        setTimeout(() => suggestionBox.style.display = 'none', 200)
        );
    }

    return { init };
})();

const UsersModule = (() => {
    let inited = false;
    let allUsers = [];
    let sortAsc = true;

    const DOM = {};

    function init() {
        if (inited) return;
        inited = true;
        cacheDOM();
        bindEvents();
        fetchUsers();
    }

    function cacheDOM() {
        DOM.container       = document.getElementById('moderUsersContainer');
        DOM.searchInput     = document.getElementById('userSearchInput');
        DOM.createdAtHeader = document.getElementById('createdAtHeader');
        DOM.sortIcon        = document.getElementById('sortIcon');
        DOM.deleteModalEl   = document.getElementById('deleteUserModal');
        DOM.deleteReason    = document.getElementById('deleteReason');
        DOM.confirmBtn      = document.getElementById('confirmDeleteUser');
    }

    function bindEvents() {
        // Фільтрація по email
        DOM.searchInput.addEventListener('input', renderUsers);
    
        // Делегуємо клік по контейнеру на дві речі:
        DOM.container.addEventListener('click', e => {
        // 1) Сортування по даті
        if (e.target.closest('#createdAtHeader')) {
            sortAsc = !sortAsc;
            renderUsers();
            return;
        }
        // 2) Видалення користувача
        if (e.target.matches('.delete-user')) {
            openDeleteModal(e.target.dataset.id);
        }
        });
    
        // Підтвердження видалення
        DOM.confirmBtn.addEventListener('click', confirmDeleteUser);
    }
      

    async function fetchUsers() {
        try {
            const resp = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!resp.ok) throw new Error('Не вдалося завантажити користувачів');
            allUsers = await resp.json();
            renderUsers();
        } catch (err) {
            console.error('fetchUsers:', err);
            DOM.container.innerHTML =
            '<p class="text-danger">Помилка завантаження даних.</p>';
        }
    }

    function renderUsers() {
        let users = [...allUsers];
        const term = DOM.searchInput.value.trim().toLowerCase();
        if (term) {
            users = users.filter(u => u.email.toLowerCase().includes(term));
        }
        users.sort((a, b) => {
            const da = new Date(a.created_at),
            db = new Date(b.created_at);
            return sortAsc ? da - db : db - da;
        });
        displayUsers(users);
    }

    function displayUsers(users) {
        if (!users.length) {
            DOM.container.innerHTML = '<p>Користувачі не знайдено.</p>';
            return;
        }
        DOM.container.innerHTML = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Ім’я</th>
                        <th>Email</th>
                        <th id="createdAtHeader" style="cursor:pointer">
                            Дата створення <span id="sortIcon">${sortAsc?'▲':'▼'}</span>
                        </th>
                        <th>Дія</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                    <tr>
                        <td>${u.username}</td>
                        <td>${u.email}</td>
                        <td>${new Date(u.created_at).toLocaleString()}</td>
                        <td>
                        <button 
                            class="btn btn-sm btn-danger delete-user" 
                            data-id="${u.id}"
                        >
                            Видалити
                        </button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function openDeleteModal(userId) {
        DOM.deleteModalEl.dataset.userId = userId;
        DOM.deleteReason.value = '';
        new bootstrap.Modal(DOM.deleteModalEl).show();
    }

    async function confirmDeleteUser() {
        const userId = DOM.deleteModalEl.dataset.userId;
        const reason = DOM.deleteReason.value.trim();
        if (!reason) {
            alert('Будь ласка, введіть причину видалення.');
            return;
        }
        try {
            const resp = await fetch(
            `https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/user/${userId}`, {
                method: 'DELETE',
                headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            }
            );
            const result = await resp.json();
            if (!resp.ok) {
            const msg = result.error || result.message || 'Не вдалося видалити користувача';
            alert(`Помилка: ${msg}`);
            return;
            }
            alert(result.message || 'Користувача успішно видалено');
            bootstrap.Modal.getInstance(DOM.deleteModalEl).hide();
            await fetchUsers();
        } catch (err) {
            console.error('confirmDeleteUser:', err);
            alert('Сталася помилка при видаленні.');
        }
    }

    return { init };
})();

const OrdersModule = (() => {
    let inited = false;
    let ordersCache = [];
    const DOM = {};
    const statuses = {
            processing: 'Очікується',
            shipped:    'Відправлено',
            completed:  'Виконано',
            cancelled:  'Скасовано'
      };
  
    function init() {
        if (inited) return;
        inited = true;
        cacheDOM();
        bindEvents();
        loadOrders();
    }
  
    function cacheDOM() {
        DOM.container     = document.getElementById('moderOrdersContainer');
        DOM.filterStatus  = document.getElementById('orderFilterStatus');
        DOM.filterUser    = document.getElementById('orderFilterUser');
        DOM.sortButtons   = document.querySelectorAll('.orders-sort button');
        DOM.usersDatalist = document.getElementById('orderUsersList');
    }
  
    function bindEvents() {
        DOM.filterStatus.addEventListener('change', applyFilters);
        DOM.filterUser.addEventListener('input', applyFilters);
        DOM.sortButtons.forEach(btn =>
            btn.addEventListener('click', () => applySort(btn.dataset.sort))
        );
    }
  
    async function loadOrders() {
        ordersCache = await fetchModeratorOrders();
        populateFilters();
        renderOrders(ordersCache);
    }
  
    // === 1. Отримати всі замовлення ===
    async function fetchModeratorOrders() {
        const authToken = localStorage.getItem('authToken');
        const res = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_orders_db', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const raw = await res.json();
        return raw.map(item => {
            try {
                return typeof item === 'string' ? JSON.parse(item) : item;
            } catch {
                console.warn('Не змогли розпарсити order:', item);
                return null;
            }
        }).filter(Boolean);
    }

    // Заповнюємо даталіст користувачів і список статусів
    function populateFilters() {
        DOM.usersDatalist.innerHTML = [...new Set(ordersCache.map(o => o.user_email))]
        .map(email => `<option value="${email}">`)
        .join('');
        DOM.filterStatus.innerHTML = `<option value="">Усі статуси</option>` +
        Object.entries(statuses)
        .map(([key, label]) => `<option value="${key}">${label}</option>`)
        .join('');
    }

    // === 2. Рендер замовлень ===
    function renderOrders(list) {
        if (!DOM.container) return;
        if (list.length === 0) {
            DOM.container.innerHTML = '<p>Немає замовлень.</p>';
            return;
        }

        const getBookDetailsById = bookId => {
            const allBooks = JSON.parse(localStorage.getItem('books') || '[]');
            return allBooks.find(b => String(b.id) === String(bookId));
        };

        DOM.container.innerHTML = `
            <div class="accordion" id="modOrdersAccordion">
                ${list.map((o, i) => {
                    const date = new Date(Number(o.order_date));
                    const dateStr = date.toLocaleDateString() + ' ' +
                        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const badge = `<span class="order-status-badge status-${o.status}">${statuses[o.status]}</span>`;
                    const controls = Object.entries(statuses).map(
                    ([val, label]) => `
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio"
                                name="status-${o.id}" id="status-${o.id}-${val}"
                                value="${val}" ${o.status === val ? 'checked' : ''}>
                            <label class="form-check-label" for="status-${o.id}-${val}">${label}</label>
                        </div>`
                    ).join('');

                    return `
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="heading${i}">
                                <button class="accordion-button collapsed" type="button"
                                    data-bs-toggle="collapse" data-bs-target="#collapse${i}"
                                    aria-expanded="false" aria-controls="collapse${i}">
                                    <div class="d-flex w-100 justify-content-between align-items-center">
                                        <span>№${o.id} — ${o.user_email}</span>
                                        ${badge}
                                        <span>${dateStr}</span>
                                    </div>
                                </button>
                            </h2>
                            <div id="collapse${i}" class="accordion-collapse collapse"
                                aria-labelledby="heading${i}" data-bs-parent="#modOrdersAccordion">
                                <div class="accordion-body">
                                    ${o.order_items.map(item => {
                                        const book = getBookDetailsById(item.book_id) || {};
                                        return `
                                        <div class="d-flex align-items-center mb-2">
                                            <img src="${book.image_link || '/img/book-things/no-image.png'}"
                                                width="40" class="me-2">
                                            <div>
                                            <strong>${book.book_name || 'Н/Д'}</strong>
                                            — ${item.quantity} × ${parseFloat(item.unit_price).toFixed(2)} ₴
                                            </div>
                                        </div>`;
                                    }).join('')}
                                    <p><strong>Доставка:</strong> ${o.shipping_type} (${parseFloat(o.shipping_cost).toFixed(2)} ₴)</p>
                                    <p><strong>Адреса:</strong> ${o.shipping_address}</p>
                                    <p><strong>Всього:</strong> ${parseFloat(o.final_price).toFixed(2)} ₴</p>
                                <hr>
                                <div class="mb-3">
                                    <label class="form-label">Змінити статус:</label><br>
                                        ${controls}
                                </div>
                                <button class="btn btn-sm btn-primary save-order-status" data-id="${o.id}">
                                    Зберегти
                                </button>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;

        // Навішуємо обробники на кнопки «Зберегти статус»
        DOM.container.querySelectorAll('.save-order-status').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const selector = `input[name="status-${id}"]:checked`;
            const newStatus = DOM.container.querySelector(selector).value;
            await updateOrderStatus(id, newStatus);
            // оновлюємо бейдж в UI
            const idx = list.findIndex(o => String(o.id) === id);
            const badge = DOM.container.querySelector(`#heading${idx} .order-status-badge`);
            badge.textContent = statuses[newStatus];
            badge.className = `order-status-badge status-${newStatus}`;
        });
        });
    }

    // === 3. Оновлення статусу на бекенді ===
    async function updateOrderStatus(orderId, newStatus) {
        const authToken = localStorage.getItem('authToken');
        try {
        await fetch(
            `https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_orders_db/${orderId}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ order_status: newStatus })
            }
        );
        // Оновимо локальний кеш
        const idx = ordersCache.findIndex(o => String(o.id) === String(orderId));
        if (idx > -1) ordersCache[idx].status = newStatus;
        } catch {
            alert('Не вдалося змінити статус');
        }
    }

    // === 4. Фільтрація та сортування ===
    function applyFilters() {
        const userQ   = DOM.filterUser.value.trim().toLowerCase();
        const statusF = DOM.filterStatus.value;
        const filtered = ordersCache.filter(o => {
        if (userQ && !o.user_email.toLowerCase().includes(userQ)) return false;
            if (statusF && o.status !== statusF) return false;
            return true;
        });
        renderOrders(filtered);
    }

    function applySort(key) {
        const sorted = [...ordersCache].sort((a, b) => {
            const da = new Date(Number(a.order_date));
            const db = new Date(Number(b.order_date));
            if (key === 'date-asc')  return da - db;
            if (key === 'date-desc') return db - da;
            return 0;
        });
        renderOrders(sorted);
    }

    return { init };
})();


if (document.readyState === "loading") {
    console.log("Сторінка ще завантажується, чекаємо DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", initModerPanel);
} else {
    console.log("DOMContentLoaded вже відбулося, ініціалізуємо панель...");
    initModerPanel();
}


function initModerPanel() {
    console.log("Панель модератора ініціалізується...");

    bindSectionToggles();
    bindBackButtons();

    // Оновлюємо ім'я модератора
    const moderatorName = localStorage.getItem('username') || "Модератор";
    document.getElementById("moderatorName").textContent = moderatorName;
    console.log("Ім'я модератора встановлено:", moderatorName);

}



function bindSectionToggles() {
    document.querySelectorAll('.section-toggle')
    .forEach(btn => btn.addEventListener('click', onSectionToggle));
}

function onSectionToggle(e) {
    e.preventDefault();
    const sectionId = e.currentTarget.dataset.section;
    hideAllSections();
    document.getElementById(sectionId).style.display = 'block';

    switch (sectionId) {
        case 'moder-books':
            BooksModule.init();
            break;
        case 'moder-users':
            UsersModule.init();
            break;
        case 'moder-orders':
            OrdersModule.init();
            break;
    }
}

function hideAllSections() {
    document.querySelectorAll('.moder-section')
    .forEach(sec => sec.style.display = 'none');
}

function bindBackButtons() {
    document.querySelectorAll('.back-to-main')
    .forEach(btn => btn.addEventListener('click', () => {
        hideAllSections();
        document.getElementById('moderPanelMain').style.display = 'block';
    }));
}





