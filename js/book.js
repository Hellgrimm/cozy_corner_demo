// 1. Глобальні змінні
import { getBooks } from '/cozy_corner_demo/js/common.js';
const books = await getBooks(); // тут завжди отримаєш одну і ту саму "копію"
console.log('Книги для books.js:', books);

// Отримати книги за списком ID
export async function fetchBooksByIds(bookIds) {
    const cachedBooks = JSON.parse(localStorage.getItem('books')) || [];
    return bookIds.map(id => cachedBooks.find(book => book.id === id)).filter(Boolean);
}
window.fetchBooksByIds = fetchBooksByIds;

// 3. Функції роботи з даними

// Створення фільтрів
export function createFilters(books) {
    const filters = document.querySelector('.book-filters');
    const filterCategories = ['book_genre', 'publisher', 'book_language', 'book_rating', 'book_quantity'];
    const filterNames = {
        'book_genre': 'Жанри',
        'publisher': 'Видавництво',
        'book_language': 'Мова',
        'book_rating': 'Оцінка',
        'book_quantity': 'Наявність'
    };

    filterCategories.forEach(filterKey => {
        let filterBlock = document.createElement('div');
        filterBlock.classList.add('book-filter');

        let uniqueValues;
        if (filterKey === 'book_rating') {
            // Завжди включаємо всі категорії (1-5)
            uniqueValues = new Set(['1', '2', '3', '4', '5']);

            books.forEach(book => {
                if (book.book_rating !== undefined) {
                    let ratingCategory;
                    if (book.book_rating >= 0.0 && book.book_rating < 1.0) {
                        ratingCategory = '0';
                    } else if (book.book_rating >= 1.0 && book.book_rating < 2.0) {
                        ratingCategory = '1';
                    } else if (book.book_rating >= 2.0 && book.book_rating < 3.0) {
                        ratingCategory = '2';
                    } else if (book.book_rating >= 3.0 && book.book_rating < 4.0) {
                        ratingCategory = '3';
                    } else if (book.book_rating >= 4.0 && book.book_rating < 5.0) {
                        ratingCategory = '4';
                    } else if (book.book_rating === 5.0) {
                        ratingCategory = '5';
                    }
                    uniqueValues.add(ratingCategory);
                }
            });

            uniqueValues = [...uniqueValues].sort((a, b) => a - b).map(value => ({
                value: value,
                label: value
            }));

        } else if (filterKey === 'book_quantity') {
            // Фільтр за кількістю книг
            const quantityCategories = {
                none: 'Немає в наявності',
                low: 'Закінчується',
                high: 'В наявності'
            };

            uniqueValues = new Set(['none', 'low', 'high']); // Завжди включаємо всі категорії

            books.forEach(book => {
                if (book.book_quantity !== undefined) {
                    let category = book.book_quantity === 0 ? 'none' :
                        book.book_quantity <= 5 ? 'low' :
                            'high';
                    uniqueValues.add(category);
                }
            });

            uniqueValues = [...uniqueValues].map(value => ({
                value: value,
                label: quantityCategories[value]
            }));
        } else {
            uniqueValues = [...new Set(books.flatMap(book => book[filterKey] || []))].map(value => ({
                value: value,
                label: value
            }));
        }

        filterBlock.innerHTML = `
            <div class="book-filter-header">
                <div class="filter-title-container">
                    <span class="filter-title">${filterNames[filterKey]}</span>
                </div>
                <button class="filter-button"></button>
            </div>
            <div class="filter-options">
                ${uniqueValues.length > 8 ? `
                    <input type="text" class="filter-search" placeholder="Пошук...">` : ''}
                ${uniqueValues.map(option => `
                    <div class="filter-option">
                        <label>
                            <input type="checkbox" id="${filterKey}-${option.value}" name="${filterKey}" value="${option.value}">
                            ${option.label}
                        </label>
                    </div>`).join('')}
            </div>
        `;

        filters.appendChild(filterBlock);

        // Додаємо функціональність відкриття/закриття
        const header = filterBlock.querySelector('.book-filter-header');
        const options = filterBlock.querySelector('.filter-options');

        header.addEventListener('click', () => {
            const isVisible = options.classList.toggle('visible');
            options.style.display = isVisible ? 'block' : 'none';

            // Додаємо або видаляємо клас для обертання стрілки
            filterBlock.classList.toggle('active', isVisible);
        });

        // Додаємо пошук, якщо є більше 8 значень
        if (uniqueValues.length > 8) {
            const searchField = filterBlock.querySelector('.filter-search');
            const optionsList = filterBlock.querySelectorAll('.filter-option');

            searchField.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                optionsList.forEach(option => {
                    const text = option.textContent.toLowerCase();
                    option.style.display = text.includes(query) ? 'flex' : 'none';
                });
            });
        }
    });

    // Додаємо слухач на зміну фільтрів
    filters.addEventListener('change', () => {
        updateURLParams(); // Оновлюємо URL
        filterBooks(true); // Фільтруємо книги без повторного оновлення URL
    });

}

// Фільтрація книг
export function filterBooks(skipURLUpdate = false) {
    console.log('%c[filterBooks] Фільтруємо книги...', 'color: cyan; font-weight: bold;');

    let filteredBooks = [...books];

    const params = new URLSearchParams(window.location.search);
    console.log('%c[filterBooks] URL параметри:', 'color: orange;', params.toString());

    const searchQuery = params.get('search') ? decodeURIComponent(params.get('search')).toLowerCase() : '';

    const searchByDescription = params.get('desc') === 'true';

    const filterCategories = ['book_genre', 'publisher', 'book_language', 'book_rating', 'book_quantity'];
    const activeFilters = {};

    filterCategories.forEach(category => {
        const values = params.get(category) ? decodeURIComponent(params.get(category)).split(',') : [];
        if (values.length > 0) activeFilters[category] = values;
    });

    console.log('%c[filterBooks] Розібрані параметри:', 'color: lightblue;', activeFilters);

    filteredBooks = filteredBooks.filter(book => {
        return filterCategories.every(category => {
            if (!activeFilters[category]) return true;

            if (category === 'book_rating') {
                // Перетворення book_rating у відповідний фільтр
                let ratingCategory;
                if (book.book_rating >= 0.0 && book.book_rating < 1.0) {
                    ratingCategory = '0';
                } else if (book.book_rating >= 1.0 && book.book_rating < 2.0) {
                    ratingCategory = '1';
                } else if (book.book_rating >= 2.0 && book.book_rating < 3.0) {
                    ratingCategory = '2';
                } else if (book.book_rating >= 3.0 && book.book_rating < 4.0) {
                    ratingCategory = '3';
                } else if (book.book_rating >= 4.0 && book.book_rating < 5.0) {
                    ratingCategory = '4';
                } else if (book.book_rating === 5.0) {
                    ratingCategory = '5';
                }
                return activeFilters[category].includes(ratingCategory);
            }

            if (category === 'book_quantity') {
                // Перетворення book_quantity у відповідний фільтр
                let quantityCategory = book.book_quantity === 0 ? 'none' :
                    book.book_quantity <= 5 ? 'low' :
                        'high';
                return activeFilters[category].includes(quantityCategory);
            }

            if (Array.isArray(book[category])) {
                return book[category].some(value => activeFilters[category].includes(value));
            } else {
                return activeFilters[category].includes(book[category]);
            }
        });
    });

    if (searchQuery) {
        console.log('%c[filterBooks] Виконуємо пошук по запиту:', 'color: yellow;', searchQuery);

        filteredBooks = filteredBooks.filter(book => {
            const titleMatch = book.book_name.toLowerCase().includes(searchQuery);
            const authorMatch = book.writer_name.toLowerCase().includes(searchQuery);
            const descriptionMatch = searchByDescription
                && book.description.toLowerCase().includes(searchQuery);
            return titleMatch || authorMatch || descriptionMatch;
        });
    }

    console.log('%c[filterBooks] Результати після фільтрації:', 'color: yellow;', filteredBooks);

    // **Зберігаємо відфільтрований список у sessionStorage**
    sessionStorage.setItem('filteredBooks', JSON.stringify(filteredBooks));

    displayBooks(filteredBooks);
    extractAvailableFilters(filteredBooks);

    if (!skipURLUpdate) {
        console.log('%c[filterBooks] Оновлення URL...', 'color: lightgreen;');
        updateURLParams();
    }
}


export function updateFilterAvailability(availableFilters) {
    console.log('%c[updateFilterAvailability] Оновлення доступності фільтрів...', 'color: lightblue;');

    const filterCategories = ['book_genre', 'publisher', 'book_language', 'book_rating', 'book_quantity'];

    filterCategories.forEach(category => {
        document.querySelectorAll(`.book-filters .filter-option`).forEach(option => {
            const checkbox = option.querySelector(`input[name="${category}"]`);
            if (!checkbox) return;

            const value = checkbox.value;
            const label = option.querySelector('label');

            // Видаляємо попередній лічильник (якщо є)
            let counter = option.querySelector('.filter-counter');
            if (counter) {
                counter.remove();
            }

            // Отримуємо кількість книг для цього фільтра
            const bookCount = countBooksForFilter(category, value);

            // Додаємо лічильник (завжди, навіть якщо 0)
            const counterElement = document.createElement('span');
            counterElement.classList.add('filter-counter');
            counterElement.textContent = bookCount;
            label.appendChild(counterElement);

            // Жанри завжди доступні, інші фільтри блокуються, якщо їх немає
            if (category === 'book_genre' || availableFilters[category].includes(value)) {
                checkbox.disabled = false;
                option.style.opacity = '1';
            } else {
                checkbox.disabled = true;
                option.style.opacity = '0.5';
            }
        });
    });

    console.log('%c[updateFilterAvailability] Фільтри оновлено.', 'color: green;');
}

// Функція підрахунку книг за конкретним фільтром
function countBooksForFilter(category, value) {
    const filteredBooks = JSON.parse(sessionStorage.getItem('filteredBooks')) || [];
    return filteredBooks.filter(book => {
        if (category === 'book_rating') {
            let ratingCategory = getRatingCategory(book.book_rating);
            return ratingCategory === value;
        }
        if (category === 'book_quantity') {
            let quantityCategory = getQuantityCategory(book.book_quantity);
            return quantityCategory === value;
        }
        if (category === 'book_genre') {
            return book.book_genre.includes(value);
        }
        if (Array.isArray(book[category])) {
            return book[category].includes(value);
        }
        return book[category] === value;
    }).length;
}

// Функція конвертації оцінок у фільтровані значення
function getRatingCategory(rating) {
    if (rating >= 0.0 && rating < 1.0) return '0';
    if (rating >= 1.0 && rating < 2.0) return '1';
    if (rating >= 2.0 && rating < 3.0) return '2';
    if (rating >= 3.0 && rating < 4.0) return '3';
    if (rating >= 4.0 && rating < 5.0) return '4';
    if (rating === 5.0) return '5';
}

// Функція конвертації кількості книг у фільтровані значення
function getQuantityCategory(quantity) {
    if (quantity === 0) return 'none';
    if (quantity <= 5) return 'low';
    return 'high';
}

// Оновлюємо `extractAvailableFilters`, додаючи виклик `updateFilterAvailability`
export function extractAvailableFilters(filteredBooks) {
    console.log('%c[extractAvailableFilters] Аналізуємо доступні фільтри...', 'color: cyan; font-weight: bold;');

    const filterCategories = ['publisher', 'book_language', 'book_rating', 'book_quantity'];
    const availableFilters = {};

    // Ініціалізація об'єкта доступних фільтрів
    filterCategories.forEach(category => {
        availableFilters[category] = new Set();
    });

    // Заповнюємо доступні фільтри на основі відфільтрованих книг
    filteredBooks.forEach(book => {
        filterCategories.forEach(category => {
            if (category === 'book_rating' && book.book_rating !== undefined) {
                let ratingCategory;
                if (book.book_rating >= 0.0 && book.book_rating < 1.0) {
                    ratingCategory = '0';
                } else if (book.book_rating >= 1.0 && book.book_rating < 2.0) {
                    ratingCategory = '1';
                } else if (book.book_rating >= 2.0 && book.book_rating < 3.0) {
                    ratingCategory = '2';
                } else if (book.book_rating >= 3.0 && book.book_rating < 4.0) {
                    ratingCategory = '3';
                } else if (book.book_rating >= 4.0 && book.book_rating < 5.0) {
                    ratingCategory = '4';
                } else if (book.book_rating === 5.0) {
                    ratingCategory = '5';
                }
                availableFilters[category].add(ratingCategory);
            } else if (category === 'book_quantity' && book.book_quantity !== undefined) {
                let quantityCategory = book.book_quantity === 0 ? 'none' :
                    book.book_quantity <= 5 ? 'low' :
                        'high';
                availableFilters[category].add(quantityCategory);
            } else if (Array.isArray(book[category])) {
                book[category].forEach(value => availableFilters[category].add(value));
            } else if (book[category]) {
                availableFilters[category].add(book[category]);
            }
        });
    });

    // Конвертуємо множини у масиви для зручності відображення
    const filtersOutput = {};
    filterCategories.forEach(category => {
        filtersOutput[category] = Array.from(availableFilters[category]);
    });

    console.log(`%c[extractAvailableFilters] Відфільтровано ${filteredBooks.length} книжок. Доступні фільтри:`, 'color: yellow;', filtersOutput);

    // Викликаємо `updateFilterAvailability` після оновлення списку доступних фільтрів
    updateFilterAvailability(filtersOutput);

    return filtersOutput;
}

// Функція сортування книг
function sortBooks(type) {
    console.log('%c[Sorting] Виконується сортування:', 'color: orange;', type);

    // Отримуємо поточний список відфільтрованих книг (ті, які зараз відображені)
    let filteredBooks = JSON.parse(sessionStorage.getItem('filteredBooks')) || books;

    if (filteredBooks.length === 0) {
        console.warn('%c[Sorting] Список книг порожній або не визначений, сортуємо всі книги.', 'color: red;');
        filteredBooks = [...books];
    }

    // Виконуємо сортування
    switch (type) {
        case 'alphabet-asc':
            filteredBooks.sort((a, b) => a.book_name.localeCompare(b.book_name));
            break;
        case 'alphabet-desc':
            filteredBooks.sort((a, b) => b.book_name.localeCompare(a.book_name));
            break;
        case 'price-asc':
            filteredBooks.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredBooks.sort((a, b) => b.price - a.price);
            break;
        case 'rating-asc':
            filteredBooks.sort((a, b) => a.book_rating - b.book_rating);
            break;
        case 'rating-desc':
            filteredBooks.sort((a, b) => b.book_rating - a.book_rating);
            break;
        case 'year-asc':
            filteredBooks.sort((a, b) => a.writing_date - b.writing_date);
            break;
        case 'year-desc':
            filteredBooks.sort((a, b) => b.writing_date - a.writing_date);
            break;
        default:
            console.warn('Unknown sort type:', type);
            return;
    }

    console.log('%c[Sorting] Результат сортування:', 'color: lightblue;', filteredBooks);

    // Оновлюємо список у sessionStorage
    sessionStorage.setItem('filteredBooks', JSON.stringify(filteredBooks));

    // Відображаємо відсортовані книги
    displayBooks(filteredBooks);
    updateURLParams();
}


// 4. Функції відображення даних
export function renderBookCard(book) {
    return `
      <div class="book-card">
        <div class="book-card-separator"
             data-bs-toggle="offcanvas"
             data-bs-target="#offcanvasBottom"
             onclick="updateOffcanvas(${book.id})">
          <img src="${book.image_link}" alt="${book.book_name}"
               onerror="this.onerror=null;this.src='/cozy_corner_demo/img/book-things/no-image.png'">
          <h3>${book.book_name}</h3>
          <p>${book.writer_name}</p>
        </div>
        <div class="book-card-bottom">
          <div class="book-card-rating">
            <img src="/cozy_corner_demo/img/book-things/star.png" alt="star">
            <p>${book.book_rating}</p>
          </div>
          <div class="book-card-price-button">
            <div id="add-to-cart-${book.id}" class="add-to-cart-wrapper"></div>
          </div>
        </div>
      </div>
    `;
}

// Відображення списку книг
export function displayBooks(books) {
    const container = document.querySelector('.books-list');
    if (!container) {
        console.error('.books-list не знайдено в DOM.');
        return;
    }

    console.log('Відображення книг:', books);
    container.innerHTML = '';

    if (books.length === 0) {
        container.innerHTML = `
        <div class="no-books-message">
          Не знайдено книг за обраними фільтрами.
        </div>
      `;
        return;
    }

    // 2.1) Малюємо всі картки через єдиний шаблон
    container.innerHTML = books
        .map(book => renderBookCard(book))
        .join('');

    // 2.2) Ініціалізуємо кнопки "+" / "–" для кожної картки
    books.forEach(book => {
        renderAddToCartControls(book);
    });
}

window.renderBookCard = renderBookCard;

// Відображення категорій
export function displayCategories(books) {
    const categories = {
        newcomes: {
            title: 'Новинки',
            books: books.slice(0, 5) // Беремо перші 5 книг
        },
        bestsellers: {
            title: 'Бестселери',
            books: books.filter(book => book.is_bestseller).slice(0, 5)
        },
        readerChoice: {
            title: 'Вибір читачів',
            books: books.sort((a, b) => b.book_rating - a.book_rating).slice(0, 5)
        },
        bestStars: {
            title: 'Найвищі рейтинги',
            books: books.filter(book => book.book_rating === 5).slice(0, 5)
        }
    };

    Object.keys(categories).forEach(categoryKey => {
        const { title, books } = categories[categoryKey];
        const categoryContainer = document.querySelector(`.${categoryKey}-container .category-books-list`);

        if (!categoryContainer) {
            console.error(`Контейнер для категорії ${categoryKey} не знайдено`);
            return;
        }

        categoryContainer.innerHTML = books.map(book => `
            <div class="book-card">
                <div class="book-card-separator" data-bs-toggle="offcanvas" data-bs-target="#offcanvasBottom" onclick="updateOffcanvas(${book.id})">
                    <img src="${book.image_link}" alt="${book.book_name}" onerror="this.onerror=null;this.src='/cozy_corner_demo/img/book-things/no-image.png';">
                    <h3>${book.book_name}</h3>
                    <p>${book.writer_name}</p>
                </div>
                <div class="book-card-bottom">
                    <div class="book-card-rating">
                        <img src="/cozy_corner_demo/img/book-things/star.png" alt="star">
                        <p>${book.book_rating}</p>
                    </div>
                    <div class="book-card-price-button">
                        <button class="btn-book-card ${book.book_quantity === 0 ? 'out-of-stock' : ''}" ${book.book_quantity === 0 ? 'disabled' : ''}  onclick="addToCart('${book.id}')">
                            <span class="price-text">${book.price} ₴</span>
                            <span class="add-to-cart-text">${book.book_quantity === 0 ? 'Не в наявності' : 'В кошик'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `)
            .join('');
    });
}
window.displayCategories = displayCategories;

// Деталі книги (offcanvas)
export function updateOffcanvas(bookId) {
    const book = books.find(b => b.id === bookId) || JSON.parse(localStorage.getItem('books')).find(b => b.id === bookId);

    if (!book) {
        console.error(`Книга з ID ${bookId} не знайдена.`);
        return;
    }

    // Вираховуємо, скільки цього bookId зараз у кошику
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItem = cart.find(item => item.id === bookId.toString());
    const quantity = cartItem ? cartItem.quantity : 0;

    const offcanvasBody = document.querySelector('#offcanvasBottom .offcanvas-body');
    if (!offcanvasBody) {
        console.error('#offcanvasBottom .offcanvas-body не знайдено в DOM.');
        return;
    }

    offcanvasBody.innerHTML = `
        <div class="offcanvas-grid">
            <div class="top-block">
                <div class="top-left-block">
                    <div class="offcanvas-image">
                        <img src="${book.image_link}" alt="${book.book_name}">
                    </div>
                     <div class="add-to-cart-wrapper">
                        ${quantity > 0
            ? `
                        <div class="quantity-container">
                            <button
                                class="quantity-decrement book-card-quantity"
                                onclick="decrementBookQuantityCard('${book.id}', true); updateOffcanvas(${book.id});"
                            >−</button>
                            <span id="offcanvas-quantity-${book.id}">${quantity}</span>
                            <button
                                class="quantity-increment book-card-quantity"
                                onclick="incrementBookQuantity('${book.id}'); updateOffcanvas(${book.id});"
                            >+</button>
                        </div>
                        <button
                            class="btn-book-card ${book.book_quantity === 0 ? 'out-of-stock' : ''}"
                            ${book.book_quantity === 0 ? 'disabled' : ''}
                            onclick="addToCart('${book.id}'); updateOffcanvas(${book.id});"
                        >
                            <span class="price-text">${book.price} ₴</span>
                            <span class="add-to-cart-text">Додати ще</span>
                        </button>
                            `
            : `
                        <button
                            class="btn ${book.book_quantity === 0 ? 'btn-secondary' : 'btn-primary'}"
                            ${book.book_quantity === 0 ? 'disabled' : ''}
                            onclick="addToCart('${book.id}'); updateOffcanvas(${book.id});"
                        >
                            ${book.book_quantity === 0 ? 'Нема в наявності' : 'В кошик'}
                        </button>
                            `
        }
                    </div>
                </div>
                <div class="top-right-block">
                    <h3>${book.book_name}</h3>
                    <p><span class="static-text">Автор:</span> <span class="dynamic-text">${book.writer_name}</span></p>
                    <p><span class="static-text">Рік написання:</span> <span class="dynamic-text">${book.writing_date}</span></p>
                    <p><span class="static-text">Жанри:</span> <span class="dynamic-text">${book.book_genre.join(", ")}</span></p>
                    <p><span class="static-text">Мова:</span> <span class="dynamic-text">${book.book_language}</span></p>
                    <p><span class="static-text">Видавництво:</span> <span class="dynamic-text">${book.publisher}</span></p>
                    <p><span class="static-text">Кількість сторінок:</span> <span class="dynamic-text">${book.page_count}</span></p>
                    <p><span class="static-text">Ціна:</span> <span class="dynamic-text">${book.price} ₴</span></p>
                    <p><span class="static-text">В наявності:</span> <span class="dynamic-text">${book.book_quantity}</span></p>
                </div>
            </div>
            <div class="bottom-block">
                <h3>Опис книги</h3>
                <p>${book.description}</p>
            </div>
        </div>
    `;
    window.addToRecentlyViewed(bookId);
}


// 5. Функції взаємодії з користувачем

// Оновлення відображення книг з локальним пошуком
export function setupLocalSearch() {
    const searchInput = document.getElementById('localSearchInput');
    const descBtn = document.getElementById('localDescriptionSearch');

    if (!searchInput) return;

    // Додаємо слухач подій на введення тексту
    searchInput.addEventListener('input', debounce(() => {
        console.log('%c[LOCAL SEARCH] Виконуємо локальний пошук...', 'color: cyan; font-weight: bold;');

        // const query = searchInput.value.trim().toLowerCase();
        const allBooks = JSON.parse(localStorage.getItem('books')) || [];

        performLocalSearch(allBooks);
        updateURLParams();
    }, 300));

    if (descBtn) {
        descBtn.addEventListener('click', () => {
            descBtn.classList.toggle('active');
            performLocalSearch();
            updateURLParams();  // за аналогією з глобальним
        });
    }
}

export function performLocalSearch(filteredBooks = books) {
    const searchInput = document.getElementById('localSearchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    console.log('%c[SEARCH] Виконується пошук:', 'color: lightblue;', query);

    if (!query) {
        displayBooks(filteredBooks); // Якщо поле порожнє, відображаємо всі книги
        extractAvailableFilters(filteredBooks);
        return;
    }

    const searchByDescription = document.getElementById('localDescriptionSearch')?.classList.contains('active');

    const finalBooks = filteredBooks.filter(book => {
        const titleMatch = book.book_name.toLowerCase().includes(query);
        const authorMatch = book.writer_name.toLowerCase().includes(query);
        const descriptionMatch = searchByDescription && book.description.toLowerCase().includes(query);
        return titleMatch || authorMatch || descriptionMatch;
    });

    console.log('%c[SEARCH] Знайдено книг:', 'color: yellow;', finalBooks.length);
    displayBooks(finalBooks); // Відображаємо результати
    extractAvailableFilters(finalBooks);
}


// 6. Ініціалізаційні функції

export async function initializeLibraryPage() {
    console.log('%c[initializeLibraryPage] Ініціалізація сторінки library', 'color: cyan; font-weight: bold;');

    // Завантаження книг
    console.log('%c[initializeLibraryPage] Книги завантажені:', 'color: lightblue;', books);

    // Отримуємо параметри URL
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('search') ? decodeURIComponent(params.get('search')) : '';

    // Якщо в URL є desc=true — додаємо клас active до кнопки «За описом»
    const descBtn = document.getElementById('localDescriptionSearch');
    if (params.get('desc') === 'true' && descBtn) {
        descBtn.classList.add('active');
    }

    // Якщо є пошуковий запит, вставляємо його в поле пошуку
    const searchInput = document.getElementById('localSearchInput');
    if (searchInput) {
        searchInput.value = searchQuery;
    }

    // Відображаємо книги
    displayBooks(books);

    // Створення фільтрів
    await createFilters(books);

    // Синхронізація фільтрів із URL
    const filterCategories = ['book_genre', 'publisher', 'book_language', 'book_rating', 'book_quantity'];
    filterCategories.forEach(category => {
        const values = params.get(category) ? decodeURIComponent(params.get(category)).split(',') : [];
        values.forEach(value => {
            const checkbox = document.querySelector(`.book-filters input[name="${category}"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
        });
    });

    // Якщо є пошуковий запит, запускаємо пошук
    if (searchQuery) {
        performLocalSearch(books);
    } else {
        filterBooks();
    }

    // Налаштовуємо локальний пошук
    setupLocalSearch();

    await updateRecentlyViewedSection(fetchBooksByIds, 'recentlyViewedLibrary');

    // Якщо список порожній — сховаємо секцію
    if (!getRecentlyViewedBooks().length) {
        const section = document
            .getElementById('recentlyViewedLibrary')
            .closest('section');
        if (section) section.style.display = 'none';
    }

    console.log('%c[initializeLibraryPage] Сторінка library успішно налаштована', 'color: green;');
}

// 7. Обробники подій

document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c[DOMContentLoaded] Ініціалізація сторінки', 'color: cyan; font-weight: bold;');

    // Викликаємо функцію ініціалізації сторінки
    await initializeLibraryPage();
});


// 8. Утиліти

// Дебаунс функція
function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

// Додавання обробників подій для кнопок сортування
document.querySelectorAll('.sort-option').forEach(option => {
    option.addEventListener('click', () => {
        console.log('%c[Sorting] Обрано сортування:', 'color: orange;', option.getAttribute('data-sort'));

        // Знімаємо активний клас з усіх кнопок
        document.querySelectorAll('.sort-option').forEach(btn => btn.classList.remove('active'));

        // Додаємо активний клас до поточного варіанту сортування
        option.classList.add('active');

        // Викликаємо сортування
        const sortType = option.getAttribute('data-sort');
        sortBooks(sortType);
    });
});

// Обробник події для кнопки "Скинути"
const resetButton = document.querySelector('.reset-btn');
if (resetButton) {
    resetButton.addEventListener('click', () => {
        console.log('%c[Sorting Reset] Скидаємо сортування...', 'color: red; font-weight: bold;');

        // Отримуємо збережений відфільтрований список
        const filteredBooks = JSON.parse(sessionStorage.getItem('filteredBooks')) || books;

        // Сортуємо за ID (базове сортування)
        filteredBooks.sort((a, b) => a.id - b.id);

        // Оновлюємо відображення
        displayBooks(filteredBooks);

        // Зберігаємо відфільтрований список назад у sessionStorage
        sessionStorage.setItem('filteredBooks', JSON.stringify(filteredBooks));

        // Видаляємо активний клас у кнопках сортування
        document.querySelectorAll('.sort-option').forEach(btn => btn.classList.remove('active'));

        updateURLParams();

        console.log('%c[Sorting Reset] Відображено початковий фільтрований список', 'color: green;');
    });
} else {
    console.log('Кнопка "Скинути" не знайдена на цій сторінці');
}

function updateURLParams() {
    console.log('%c[updateURLParams] Виклик функції', 'color: orange;');

    // Ініціалізація об'єкта URLSearchParams
    const params = new URLSearchParams();

    // Додавання пошукового запиту
    const searchInput = document.getElementById('localSearchInput');
    const searchQuery = searchInput?.value.trim();
    if (searchQuery) {
        params.set('search', searchQuery);
    }

    // Додавання вибраних фільтрів
    const filterCategories = ['book_genre', 'publisher', 'book_language', 'book_rating', 'book_quantity'];
    filterCategories.forEach(category => {
        const selectedValues = Array.from(document.querySelectorAll(`.book-filters input[name="${category}"]:checked`))
            .map(input => input.value);
        if (selectedValues.length > 0) {
            params.set(category, selectedValues.join(',')); // Додаємо в URL через кому
        }
    });

    // Додавання вибраного сортування
    const activeSort = document.querySelector('.sort-option.active');
    if (activeSort) {
        params.set('sort', activeSort.getAttribute('data-sort')); // Зчитуємо значення сортування
    }

    // 4) Пошук за описом: додаємо desc=true, якщо кнопка активна
    const descBtn = document.getElementById('localDescriptionSearch');
    if (descBtn?.classList.contains('active')) {
        params.set('desc', 'true');
    }

    // Формуємо новий URL
    const newURL = `${window.location.pathname}?${params.toString()}`;

    // Оновлюємо URL тільки якщо він змінився
    if (newURL !== window.location.href) {
        console.log('%c[updateURLParams] Оновлення URL:', 'color: lightgreen;', newURL);
        window.history.replaceState({}, '', newURL); // Оновлення URL без перезавантаження сторінки
    } else {
        console.log('%c[updateURLParams] URL залишився незмінним:', 'color: cyan;', newURL);
    }
}
