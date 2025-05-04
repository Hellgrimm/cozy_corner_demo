console.log("moder-panel.js запущено!");


let allUsers = [];
let sortAsc = true;
let _modOrdersCache = [];
const listViewBtn = document.getElementById("listViewBtn");
const tableViewBtn = document.getElementById("tableViewBtn");
let isListView = false; // або true за замовчуванням

const deleteUserModalEl = document.getElementById('deleteUserModal');
const deleteUserModal = bootstrap.Modal.getOrCreateInstance(deleteUserModalEl);

// Додаємо перевірку, чи документ уже завантажений
if (document.readyState === "loading") {
    console.log("Сторінка ще завантажується, чекаємо DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", initModerPanel);
} else {
    console.log("DOMContentLoaded вже відбулося, ініціалізуємо панель...");
    initModerPanel();
}

// Основна функція ініціалізації панелі модератора
function initModerPanel() {
    console.log("Панель модератора ініціалізується...");

    // Оновлюємо ім'я модератора
    const moderatorName = localStorage.getItem('username') || "Модератор";
    document.getElementById("moderatorName").textContent = moderatorName;
    console.log("Ім'я модератора встановлено:", moderatorName);

    // Отримуємо елементи
    const sectionButtons = document.querySelectorAll(".section-toggle");
    const sections = document.querySelectorAll(".moder-section");
    const backButtons = document.querySelectorAll(".back-to-main");
    const mainPanel = document.getElementById("moderPanelMain");
    const listViewBtn = document.getElementById("listViewBtn");
    const tableViewBtn = document.getElementById("tableViewBtn");
    let isListView = true; // Початковий вигляд — список

    console.log("Знайдені секції:", sections.length);
    console.log("Знайдені кнопки секцій:", sectionButtons.length);

    // Обробка перемикання секцій
    sectionButtons.forEach(button => {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            console.log("Кнопка натиснута:", this);

            const targetSection = this.dataset.section;
            console.log("Має бути відкрито секцію:", targetSection);

            sections.forEach(section => {
                console.log("Приховуємо секцію:", section.id);
                section.style.display = "none";
            });

            mainPanel.style.display = "none";

            const targetElement = document.getElementById(targetSection);
            if (targetElement) {
                console.log("Відкриваємо секцію:", targetElement.id);
                targetElement.style.display = "block";

                // Якщо це розділ "Книги", завантажуємо список
                if (targetSection === "moder-books") {
                    fetchBooks();
                    document.getElementById("saveBookChanges").addEventListener("click", async function () {
                        const bookId = document.getElementById("editBookModal").dataset.bookId;
                        const newImageUrl = document.getElementById("editImageLink").value.trim();
                        const previousImageUrl = document.getElementById("previousImageLink").value;

                        const updatedBook = {
                            id: parseInt(bookId, 10),
                            book_name: document.getElementById("editBookName").value,
                            writer_name: document.getElementById("editWriterName").value,
                            page_count: parseInt(document.getElementById("editPageCount").value, 10) || 0,
                            writing_date: parseInt(document.getElementById("editWritingDate").value, 10) || 1900,
                            publisher: document.getElementById("editPublisher").value,
                            book_language: Array.from(selectedLanguages), // Виправлено: тепер мови зберігаються коректно
                            book_genre: Array.from(selectedGenres), // Використовуємо поточний список вибраних жанрів
                            description: document.getElementById("editDescription").value,
                            price: parseFloat(document.getElementById("editPrice").value) || 0,
                            book_rating: parseFloat(document.getElementById("editBookRating").value).toFixed(1) || "0.0",
                            book_quantity: parseInt(document.getElementById("editBookQuantity").value, 10) || 0,
                        };

                        if (newImageUrl && newImageUrl !== previousImageUrl) {
                            updatedBook.image_link = newImageUrl;
                        }

                        try {
                            const response = await fetch(`https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db/${bookId}`, {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                                },
                                body: JSON.stringify(updatedBook)
                            });

                            if (!response.ok) throw new Error("Помилка оновлення книги");

                            console.log("Зміни збережено:", updatedBook);

                            books = books.map(book => (book.id === updatedBook.id ? { ...book, ...updatedBook } : book));
                            localStorage.setItem("books", JSON.stringify(books));
                            displayBooks(books);

                            bootstrap.Modal.getInstance(document.getElementById("editBookModal")).hide();
                        } catch (error) {
                            console.error("Помилка при збереженні змін:", error);
                        }
                    });
                }
                if (targetSection === "moder-users") {
                    fetchUsers();  // завантажуємо користувачів
                    setupUserListControls();
                }
                if (targetSection === "moder-orders") {
                    setupOrdersSection();
                }
            } else {
                console.error("Секція не знайдена:", targetSection);
            }
        });
    });

    // Обробка кнопок повернення
    backButtons.forEach(button => {
        button.addEventListener("click", function () {
            console.log("Повернення на головну панель модератора");

            sections.forEach(section => section.style.display = "none");
            mainPanel.style.display = "block";
            console.log("Головна панель показана");
        });
    });

    // Повернення на головну панель при натисканні "Панель модератора"
    const panelHomeButton = document.getElementById("moderPanelHome");
    if (panelHomeButton) {
        panelHomeButton.addEventListener("click", function (event) {
            event.preventDefault();
            console.log("Повернення на головну панель модератора");

            sections.forEach(section => {
                console.log("Приховуємо секцію:", section.id);
                section.style.display = "none";
            });

            mainPanel.style.display = "block";
            console.log("Головна панель показана");
        });
    } else {
        console.error("Кнопка повернення на головну не знайдена!");
    }





    const booksContainer = document.getElementById("moderBooksContainer");
    const searchInput = document.getElementById("moderSearchInput");

    const addBookBtn = document.getElementById("addBookBtn");
    addBookBtn.addEventListener("click", showAddBookModal);

    const genreContainer = document.getElementById("genreContainer");
    const genreInput = document.getElementById("genreInput");
    const genreSuggestions = document.getElementById("genreSuggestions");
    const addGenreButton = document.getElementById("addGenreButton");

    const languageContainer = document.getElementById("languageContainer");
    const languageInput = document.getElementById("languageInput");
    const languageSuggestions = document.getElementById("languageSuggestions");
    const addLanguageButton = document.getElementById("addLanguageButton");

    let existingGenres = new Set(); // Загальний список жанрів
    let existingLanguages = new Set(); // Загальний список мов
    // Ініціалізація глобальних змінних
    let globalGenres = [];
    let globalLanguages = [];
    let selectedGenres = new Set(); // Жанри поточної книги
    let selectedLanguages = new Set(); // Мови поточної книги

    let books = []; // Локальний список книг

    const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 хвилин у мілісекундах

    const cachedBooks = localStorage.getItem("books");
    const lastFetchTime = localStorage.getItem("booksFetchTime");

    if (cachedBooks && lastFetchTime) {
        const elapsedTime = Date.now() - parseInt(lastFetchTime, 10);
        if (elapsedTime < CACHE_EXPIRATION_TIME) {
            books = JSON.parse(cachedBooks);
            console.log("Книги завантажені з локального сховища:", books);
            displayBooks(books);
            return;
        }
    }
    console.log("Дані застаріли або відсутні. Виконуємо запит до API...");
    fetchBooks();

    // Функція для отримання книг
    async function fetchBooks() {
        console.log("fetchBooks: Виконання запиту до API...");
        try {
            const response = await fetch("https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db");
            if (!response.ok) throw new Error("Помилка завантаження книг");

            books = await response.json();
            console.log("fetchBooks: Отримано книги:", books);

            localStorage.setItem("books", JSON.stringify(books));
            localStorage.setItem("booksFetchTime", Date.now().toString());
            extractGenresAndLanguages();
            displayBooks(books);
        } catch (error) {
            console.error("fetchBooks: Помилка:", error);
        }
    }

    // Обробка пошуку книг
    searchInput.addEventListener("input", function () {
        const query = this.value.toLowerCase();
        const filteredBooks = books.filter(book => book.book_name.toLowerCase().includes(query));
        displayBooks(filteredBooks);
    });

    listViewBtn.addEventListener("click", function () {
        isListView = true;
        updateViewButtons();
        displayBooks(books);
    });

    tableViewBtn.addEventListener("click", function () {
        isListView = false;
        updateViewButtons();
        displayBooks(books);
    });

    function updateViewButtons() {
        listViewBtn.classList.toggle("active", isListView);
        tableViewBtn.classList.toggle("active", !isListView);
    }

    function setupEditBookListeners() {
        console.log("🔄 [DEBUG] Запуск setupEditBookListeners()...");

        // Чекаємо поки елементи з'являться у DOM
        const observer = new MutationObserver((mutations, obs) => {
            const editModal = document.getElementById("editBookModal");
            const genreButton = document.getElementById("addGenreButton");
            const languageButton = document.getElementById("addLanguageButton");

            if (editModal && genreButton && languageButton) {
                console.log("✅ Модалка та кнопки знайдені, додаємо обробники подій...");

                // Додаємо обробники подій
                genreButton.removeEventListener("click", handleGenreAddition);
                languageButton.removeEventListener("click", handleLanguageAddition);

                genreButton.addEventListener("click", handleGenreAddition);
                languageButton.addEventListener("click", handleLanguageAddition);

                console.log("🎯 Події `click` додані для кнопок Додати Жанр і Мову!");

                // Зупиняємо спостереження
                obs.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Функції, що спрацьовують при натисканні кнопок "Додати"
    function handleGenreAddition() {
        console.log("✅ [DEBUG] Натиснута кнопка Додати Жанр!");
        const inputValue = document.getElementById("genreInput").value.trim();

        if (!inputValue) {
            console.warn("⚠️ [DEBUG] Поле жанру порожнє!");
            return;
        }

        console.log(`🎯 [DEBUG] Введене значення Жанру: ${inputValue}`);
        handleTagModification("genre", "add", inputValue);
    }

    function handleLanguageAddition() {
        console.log("✅ [DEBUG] Натиснута кнопка Додати Мову!");
        const inputValue = document.getElementById("languageInput").value.trim();
        console.log(`🎯 [DEBUG] Введене значення Мови: ${inputValue}`);
    }

    // **Отримання унікальних жанрів та мов з книг**
    function extractGenresAndLanguages() {
        existingGenres.clear();
        existingLanguages.clear();

        books.forEach(book => {
            if (Array.isArray(book.book_genre)) {
                book.book_genre.forEach(genre => existingGenres.add(genre.trim()));
            }
            if (Array.isArray(book.book_language)) {
                book.book_language.forEach(language => existingLanguages.add(language.trim()));
            }
        });

        console.log("📌 Унікальні жанри:", [...existingGenres]);
        console.log("📌 Унікальні мови:", [...existingLanguages]);
    }

    // Функція для відображення книг
    function displayBooks(filteredBooks) {
        booksContainer.innerHTML = "";
        booksContainer.className = isListView ? "books-list-view" : "books-table-view";

        filteredBooks.forEach(book => {
            const bookItem = document.createElement("div");
            bookItem.className = "book-item";
            bookItem.innerHTML = `
                <img src="${book.image_link}" alt="${book.book_name}">
                <div class="book-info">
                    <h3>${book.book_name}</h3>
                    <p>${book.writer_name}</p>
                </div>
                <button class="btn btn-primary btn-edit-book" data-id="${book.id}">Редагувати</button>
                <button class="btn btn-danger btn-delete-book ms-2" data-id="${book.id}">Видалити</button>
            `;
            booksContainer.appendChild(bookItem);
        });

        document.getElementById("moderBooksContainer").addEventListener("click", async function (event) {
            if (event.target.classList.contains("btn-delete-book")) {
                const bookId = event.target.dataset.id;
                if (confirm("Ви дійсно хочете видалити книгу?")) {
                  await deleteBook(bookId);
                }
              }              
            if (event.target.classList.contains("btn-edit-book")) {
                const bookId = event.target.dataset.id;
                console.log("Натиснута кнопка редагування, ID книги:", bookId);
                showEditBookModal(bookId);
            }
        });
        setupEditBookListeners();

    }

    // **Функція оновлення відображення тегів у контейнерах**
    function updateTagDisplay(container, tagList, type) {
        container.innerHTML = ""; // Очищення контейнера перед оновленням
        console.log(`🔄 [DEBUG] Оновлення ${type}Container:`, [...tagList]);

        tagList.forEach(tag => {
            const tagElement = document.createElement("span");
            tagElement.className = `${type}-tag`;
            tagElement.textContent = tag;

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "✖";
            removeBtn.className = `remove-${type}`;
            removeBtn.addEventListener("click", () => {
                console.log(`❌ [DEBUG] Видалення ${type}:`, tag);
                handleTagModification(type, "remove", tag);
            });

            tagElement.appendChild(removeBtn);
            container.appendChild(tagElement);
        });

        console.log(`✅ [DEBUG] Вміст ${type}Container оновлено.`);
    }

    function showAddBookModal() {
        const modalHtml = `
        <!-- Модалка Додати книгу -->
            <div class="modal fade" id="addBookModal" tabindex="-1" aria-labelledby="addBookModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="addBookModalLabel">Нова книга</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="addBookForm">
                    <div class="mb-3 text-center">
                        <img id="newBookPreview" src="" alt="Обкладинка книги" class="book-preview">
                    </div>
                    <div class="mb-3">
                        <label for="previousImageLink" class="form-label">Посилання на обкладинку</label>
                        <input type="text" class="form-control" id="newImageLink" placeholder="URL обкладинки">
                        <small id="newImageErrorText" class="text-danger d-none">Посилання не вірне</small>
                    </div>
                    <div class="mb-3">
                        <label for="newBookName" class="form-label">Назва книги</label>
                        <input type="text" class="form-control" id="newBookName" required>
                    </div>
                    <div class="mb-3">
                        <label for="newWriterName" class="form-label">Автор</label>
                        <input type="text" class="form-control" id="newWriterName" required>
                    </div>
                    <div class="mb-3">
                        <label for="newPageCount" class="form-label">Кількість сторінок</label>
                        <input type="number" class="form-control" id="newPageCount" min="1" required>
                    </div>
                    <div class="mb-3">
                        <label for="newWritingDate" class="form-label">Рік написання</label>
                        <input type="number" class="form-control" id="newWritingDate" min="1900" max="2025" required>
                    </div>
                    <div class="mb-3">
                        <label for="newPublisher" class="form-label">Видавництво</label>
                        <input type="text" class="form-control" id="newPublisher">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Жанри</label>
                        <div id="addGenreContainer" class="genre-container"></div>
                        <div class="input-group mt-2">
                        <input type="text" id="newGenreInput" class="form-control" placeholder="Додати жанр...">
                        <button id="addNewGenreButton" type="button" class="btn btn-primary">Додати</button>
                        </div>
                        <ul id="newGenreSuggestions" class="genre-suggestions"></ul>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Мови</label>
                        <div id="addLanguageContainer" class="language-container"></div>
                        <div class="input-group mt-2">
                        <input type="text" id="newLanguageInput" class="form-control" placeholder="Додати мову...">
                        <button id="addNewLanguageButton" type="button" class="btn btn-primary">Додати</button>
                        </div>
                        <ul id="newLanguageSuggestions" class="language-suggestions"></ul>
                    </div>
                    <div class="mb-3">
                        <label for="newDescription" class="form-label">Опис</label>
                        <textarea class="form-control" id="newDescription" rows="3"></textarea>
                    </div>
                    <div class="mb-3">
                        <label for="newPrice" class="form-label">Ціна</label>
                        <input type="number" class="form-control" id="newPrice" min="0" required>
                    </div>
                    <div class="mb-3">
                        <label for="newBookRating" class="form-label">Рейтинг</label>
                        <input type="number" step="0.1" class="form-control" id="newBookRating" min="0" max="5">
                    </div>
                    <div class="mb-3">
                        <label for="newBookQuantity" class="form-label">Кількість книг</label>
                        <input type="number" class="form-control" id="newBookQuantity" min="0" required>
                    </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрити</button>
                    <button type="button" class="btn btn-primary" id="saveNewBook">Зберегти</button>
                </div>
                </div>
            </div>
            </div>
            `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const m = new bootstrap.Modal(document.getElementById('addBookModal'));
        m.show();
        document.getElementById('saveNewBook').addEventListener('click', saveNewBook);
    }

    async function saveNewBook() {
        const newBook = {
            book_name: document.getElementById('newBookName').value.trim(),
            writer_name: document.getElementById('newWriterName').value.trim(),
            price: parseFloat(document.getElementById('newPrice').value),
            book_quantity: parseInt(document.getElementById('newQuantity').value, 10),
            image_link: document.getElementById('newImageLink').value.trim(),
            description: document.getElementById('newDescription').value.trim()
        };
        try {
            const res = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_book_db', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(newBook)
            });
            if (!res.ok) throw new Error();
            fetchBooks(); // оновити список
            bootstrap.Modal.getInstance(document.getElementById('addBookModal')).hide();
        } catch {
            alert('Не вдалось створити книгу');
        }
    }

    function showEditBookModal(bookId) {
        console.log("showEditBookModal: Передане bookId:", bookId);

        const book = books.find(b => b.id === parseInt(bookId, 10));
        if (!book) {
            console.error("showEditBookModal: Книга не знайдена.");
            return;
        }

        document.getElementById("editBookName").value = book.book_name || "";
        document.getElementById("editWriterName").value = book.writer_name || "";
        document.getElementById("editPageCount").value = book.page_count || "";
        document.getElementById("editWritingDate").value = book.writing_date || "";
        document.getElementById("editPublisher").value = book.publisher || "";
        document.getElementById("editDescription").value = book.description || "";
        document.getElementById("editPrice").value = book.price || "";
        document.getElementById("editBookRating").value = book.book_rating || "";
        document.getElementById("editBookQuantity").value = book.book_quantity || "";

        document.getElementById("previousImageLink").value = book.image_link || "";
        document.getElementById("editBookPreview").src = book.image_link || "";
        document.getElementById("editImageLink").value = "";

        // Оновлюємо списки жанрів та мов перед автодоповненням
        globalGenres = [...existingGenres];
        globalLanguages = [...existingLanguages];

        console.log("📌 [DEBUG] Передача у setupAutoSuggest (жанри):", globalGenres);
        console.log("📌 [DEBUG] Передача у setupAutoSuggest (мови):", globalLanguages);

        setupAutoSuggest(genreInput, genreSuggestions, globalGenres);
        setupAutoSuggest(languageInput, languageSuggestions, globalLanguages);

        // Оновлення списків тегів для поточної книги
        selectedGenres = new Set(book.book_genre || []);
        selectedLanguages = new Set(book.book_language || []);

        // Оновлення відображення тегів у контейнерах
        updateTagDisplay(genreContainer, selectedGenres, "genre");
        updateTagDisplay(languageContainer, selectedLanguages, "language");

        document.getElementById("editBookModal").dataset.bookId = book.id;
        new bootstrap.Modal(document.getElementById("editBookModal")).show();
    }


    // **Функція для обробки додавання/видалення тегів**
    function handleTagModification(type, action, tag) {
        let result;

        if (type === "genre") {
            result = modifyTagList(globalGenres, selectedGenres, action, tag);
            globalGenres = result.updatedGlobalTags;
            selectedGenres = new Set(result.updatedBookTags);

            console.log(`📌 [DEBUG] Оновлений список жанрів:`, [...selectedGenres]);
            updateTagDisplay(genreContainer, selectedGenres, "genre");
        } else if (type === "language") {
            result = modifyTagList(globalLanguages, selectedLanguages, action, tag);
            globalLanguages = result.updatedGlobalTags;
            selectedLanguages = new Set(result.updatedBookTags);

            console.log(`📌 [DEBUG] Оновлений список мов:`, [...selectedLanguages]);
            updateTagDisplay(languageContainer, selectedLanguages, "language");
        }

        // Оновлення випадаючих списків після змін
        setupAutoSuggest(genreInput, genreSuggestions, globalGenres);
        setupAutoSuggest(languageInput, languageSuggestions, globalLanguages);
    }


    // **Функція додавання/видалення тегів у списках**
    function modifyTagList(globalTags, bookTags, action, tag) {
        let updatedGlobalTags = new Set(globalTags);
        let updatedBookTags = new Set(bookTags);

        if (action === "add") {
            if (updatedGlobalTags.has(tag)) {
                updatedGlobalTags.delete(tag);
            }
            updatedBookTags.add(tag);
        } else if (action === "remove") {
            updatedGlobalTags.add(tag);
            updatedBookTags.delete(tag);
        }

        return {
            updatedGlobalTags: [...updatedGlobalTags],
            updatedBookTags: [...updatedBookTags]
        };
    }

    // **Функція для автодоповнення при введенні жанру/мови**
    function setupAutoSuggest(input, suggestionBox, globalList) {
        console.log(`🔍 [DEBUG] Виклик setupAutoSuggest для ${input.id}, жанри:`, globalList);

        input.addEventListener("input", () => {
            let query = input.value.toLowerCase();
            if (!query) {
                suggestionBox.style.display = "none";
                return;
            }

            let suggestions = globalList.filter(tag => tag.toLowerCase().startsWith(query));
            console.log("🔍 [DEBUG] Випадаючий список жанрів:", suggestions);

            suggestionBox.innerHTML = "";
            suggestions.forEach(tag => {
                let item = document.createElement("li");
                item.textContent = tag;
                item.addEventListener("click", () => {
                    input.value = tag;
                    suggestionBox.style.display = "none";
                });
                suggestionBox.appendChild(item);
            });

            suggestionBox.style.display = suggestions.length ? "block" : "none";
        });

        input.addEventListener("blur", () => {
            setTimeout(() => {
                suggestionBox.style.display = "none";
            }, 200);
        });
    }



    // **Обробники подій для кнопок "Додати"**
    function setupTagAddition(type) {
        let input = type === "genre" ? genreInput : languageInput;
        let button = type === "genre" ? addGenreButton : addLanguageButton;
        let suggestionBox = type === "genre" ? genreSuggestions : languageSuggestions;

        if (!button) {
            console.error(`❌ Помилка: Кнопка ${type} не знайдена у DOM`);
            return;
        }

        console.log(`✅ Додаємо подію click для кнопки ${type}`);

        // Видаляємо попередні обробники перед додаванням нового
        button.removeEventListener("click", addTag);
        button.addEventListener("click", addTag);

        function addTag() {
            let tag = input.value.trim();
            if (!tag) {
                console.warn(`⚠️ Порожнє поле для ${type}`);
                return;
            }

            console.log(`✅ Додаємо ${type}: ${tag}`);
            handleTagModification(type, "add", tag);
            input.value = "";
            suggestionBox.style.display = "none";
        }
    }



    // **Ініціалізація обробників подій**
    document.addEventListener("DOMContentLoaded", () => {
        extractGenresAndLanguages();

        // Оновлюємо списки жанрів і мов після отримання книг
        globalGenres = [...existingGenres];
        globalLanguages = [...existingLanguages];

        console.log("📌 [DEBUG] Передача у setupAutoSuggest (жанри):", globalGenres);
        console.log("📌 [DEBUG] Передача у setupAutoSuggest (мови):", globalLanguages);

        setupAutoSuggest(genreInput, genreSuggestions, globalGenres);
        setupAutoSuggest(languageInput, languageSuggestions, globalLanguages);
        setupTagAddition("genre");
        setupTagAddition("language");
    });


    extractGenresAndLanguages();








    // -------------------- КОРИСТУВАЧІ --------------------

    // 1) Функція для отримання списку користувачів
    async function fetchUsers() {
        try {
            const response = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Не вдалося завантажити користувачів');
            allUsers = await response.json();
            renderUsers();
        } catch (err) {
            console.error('fetchUsers:', err);
            document.getElementById('moderUsersContainer').innerHTML =
                '<p class="text-danger">Помилка завантаження даних.</p>';
        }
    }

    function renderUsers() {
        let users = [...allUsers];

        // Фільтр по email
        const term = document.getElementById('userSearchInput').value.trim().toLowerCase();
        if (term) {
            users = users.filter(u => u.email.toLowerCase().includes(term));
        }

        // Сортування по даті створення
        users.sort((a, b) => {
            const da = new Date(a.created_at);
            const db = new Date(b.created_at);
            return sortAsc ? da - db : db - da;
        });

        displayUsers(users);
    }

    // 2) Відображення таблиці
    function displayUsers(users) {
        const container = document.getElementById('moderUsersContainer');
        if (!users.length) {
            container.innerHTML = '<p>Користувачі не знайдено.</p>';
            return;
        }
        container.innerHTML = `
        <table class="table table-striped">
            <thead>
            <tr>
                <th>Ім’я</th>
                <th>Email</th>
                <th id="createdAtHeader" style="cursor:pointer">
                    Дата створення <span id="sortIcon">${sortAsc ? '▲' : '▼'}</span>
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
                        data-bs-toggle="modal" 
                        data-bs-target="#deleteUserModal"
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

    function setupUserListControls() {
        // При вводі в поле пошуку — оновлюємо список
        document.getElementById('userSearchInput')
            .addEventListener('input', renderUsers);

        // Клік по заголовку «Дата створення» — тоґл напрямку сортування
        document.getElementById('moderUsersContainer')
            .addEventListener('click', e => {
                if (e.target.closest('#createdAtHeader')) {
                    sortAsc = !sortAsc;
                    renderUsers();
                }
            });

        // Делегуємо кнопку «Видалити» та підтвердження, як раніше...
        document.body.addEventListener('click', e => {
            if (e.target.classList.contains('delete-user')) {
                deleteUserModalEl.dataset.userId = e.target.dataset.id;
                const modalEl = document.getElementById('deleteUserModal');
                modalEl.dataset.userId = userId;
                document.getElementById('deleteReason').value = '';
                new bootstrap.Modal(modalEl).show();
            }
        });
        document.getElementById('confirmDeleteUser').addEventListener('click', async () => {
            const modalEl = document.getElementById('deleteUserModal');
            const user_id = deleteUserModalEl.dataset.userId;
            const reason = document.getElementById('deleteReason').value.trim();
            if (!reason) {
                alert('Будь ласка, введіть причину видалення.');
                return;
            }
            try {
                const resp = await fetch(`https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/user/${user_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });
                const result = await resp.json();

                if (!resp.ok) {
                    // відобразимо помилку з сервера, якщо є
                    const msg = result.error || result.message || 'Не вдалося видалити користувача';
                    alert(`Помилка: ${msg}`);
                    return;
                }

                // успішно видалили — виведемо, що повернув сервер
                console.log('Server response:', result);
                alert(result.message || 'Користувача успішно видалено');
                // Закриваємо модалку одразу
                deleteUserModal.hide();
                // Після успіху — перезавантажуємо список
                await fetchUsers();
                bootstrap.Modal.getInstance(modalEl).hide();
            } catch (err) {
                console.error('deleteUser:', err);
                alert('Сталася помилка при видаленні.');
            }
        });
    }

    // Не забуваємо викликати у старті:
    document.addEventListener('DOMContentLoaded', () => {
        initModerPanel();      // ваш існуючий код для переключення секцій
        setupUserListControls();
    });

    // 3) Обробка кліку на кнопку «Видалити»
    document.body.addEventListener('click', e => {
        if (e.target.classList.contains('delete-user')) {
            const userId = e.target.dataset.id;
            // Зберігаємо у модалці id і очищаємо попередню причину
            const modalEl = document.getElementById('deleteUserModal');
            modalEl.dataset.userId = userId;
            document.getElementById('deleteReason').value = '';
            new bootstrap.Modal(modalEl).show();
        }
    });



    // -------------------- ЗАМОВЛЕННЯ --------------------

    // === 1. Отримати всі замовлення ===
    async function fetchModeratorOrders() {
        const authToken = localStorage.getItem('authToken');
        const res = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/cc_orders_db', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const raw = await res.json();
        console.log('raw orders:', raw);
        // якщо елемент — рядок, парсимо його в JSON
        const orders = raw.map(item => {
            try {
                return (typeof item === 'string')
                    ? JSON.parse(item)
                    : item;
            } catch (e) {
                console.warn('Не змогли розпарсити order:', item, e);
                return null;
            }
        }).filter(Boolean);
        console.log('parsed orders:', orders);
        return orders;
    }

    // === 2. Рендер акордеону замовлень ===
    function renderModeratorOrders(orders) {
        const container = document.getElementById('moderOrdersContainer');
        if (!container) return;
        if (orders.length === 0) {
            container.innerHTML = '<p>Немає замовлень.</p>';
            return;
        }

        const statuses = {
            processing: 'Очікується',
            shipped: 'Відправлено',
            completed: 'Виконано',
            cancelled: 'Скасовано'
        };

        const statusFilter = document.getElementById('orderFilterStatus');
        const selectedStatus = statusFilter.value;
        statusFilter.innerHTML = `<option value="">Усі статуси</option>` +
            Object.entries(statuses).map(([key, label]) =>
                `<option value="${key}" ${key === selectedStatus ? 'selected' : ''}>${label}</option>`
            ).join('');

        function getBookDetailsById(bookId) {
            const books = JSON.parse(localStorage.getItem('books')) || [];
            return books.find(book => book.id.toString() === bookId.toString());
        }

        container.innerHTML = `
          <div class="accordion" id="modOrdersAccordion">
            ${orders.map((o, i) => {
            const date = new Date(Number(o.order_date));
            const dateStr = date.toLocaleDateString() + ' ' +
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            // пасивний бедж
            const badge = `<span class="order-status-badge status-${o.status}">${statuses[o.status]}</span>`;
            // радіо-кнопки всередині
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
                    ${o.order_items.map(item => `
                      <div class="d-flex align-items-center mb-2">
                        <img src="${getBookDetailsById(item.book_id)?.image_link || '/img/book-things/no-image.png'}"
                             width="40" class="me-2">
                        <div>
                          <strong>${getBookDetailsById(item.book_id)?.book_name || 'Н/Д'}</strong>
                          — ${item.quantity} × ${parseFloat(item.unit_price).toFixed(2)} ₴
                        </div>
                      </div>
                    `).join('')}
                    <p><strong>Доставка:</strong> ${o.shipping_type} (${parseFloat(o.shipping_cost).toFixed(2)} ₴)</p>
                    <p><strong>Адреса:</strong> ${o.shipping_address}</p>
                    <p><strong>Всього:</strong> ${parseFloat(o.final_price).toFixed(2)} ₴</p>
      
                    <!-- ось тут блок керування статусом -->
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

        container.querySelectorAll('.save-order-status').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = btn.dataset.id;
                const newStatus = container.querySelector(`input[name="status-${id}"]:checked`).value;
                await updateOrderStatus(id, newStatus);
                // оновлюємо бейдж
                const idx = orders.findIndex(o => o.id == id);
                const badge = container.querySelector(`#heading${idx} .order-status-badge`);
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
                    body: JSON.stringify({ status: newStatus })
                }
            );
            // Оновимо локальний кеш
            const idx = _modOrdersCache.findIndex(o => o.id.toString() === orderId.toString());
            if (idx > -1) {
                _modOrdersCache[idx].status = newStatus;
            }
        } catch {
            alert('Не вдалося змінити статус');
        }
    }

    // === 4. Фільтрація та сортування ===
    function applyOrderFilters() {
        const userQ = document.getElementById('orderFilterUser').value.toLowerCase();
        const fromD = document.getElementById('orderFilterFrom').value;
        const toD = document.getElementById('orderFilterTo').value;
        const statusF = document.getElementById('orderFilterStatus').value;

        const filtered = _modOrdersCache.filter(o => {
            if (userQ && !o.user_email.toLowerCase().includes(userQ)) return false;
            if (statusF && o.status !== statusF) return false;

            const od = new Date(Number(o.order_date)).toISOString().slice(0, 10);
            if (fromD && od < fromD) return false;
            if (toD && od > toD) return false;

            return true;
        });

        renderModeratorOrders(filtered);
    }



    function applyOrderSort(key) {
        const sorted = [..._modOrdersCache].sort((a, b) => {
            if (key === 'date-asc') return new Date(a.order_date) - new Date(b.order_date);
            if (key === 'date-desc') return new Date(b.order_date) - new Date(a.order_date);
            return 0;
        });
        renderModeratorOrders(sorted);
    }

    // === 5. Ініціалізація при відкритті секції ===
    function setupOrdersSection() {
        fetchModeratorOrders().then(orders => {
            // кешуємо й відображаємо
            _modOrdersCache = orders.sort((a, b) => b.order_date - a.order_date);

            // наповнюємо datalist
            const userList = document.getElementById('orderUsersList');
            userList.innerHTML = [...new Set(orders.map(o => o.user_email))]
                .map(e => `<option value="${e}">`).join('');

            // наповнюємо select статусів **тільки тут**
            const statuses = { processing: 'Очікується', shipped: 'Відправлено', completed: 'Виконано', cancelled: 'Скасовано' };
            const statusFilter = document.getElementById('orderFilterStatus');
            statusFilter.innerHTML = `<option value="">Усі статуси</option>` +
                Object.entries(statuses)
                    .map(([k, v]) => `<option value="${k}">${v}</option>`)
                    .join('');
            statusFilter.addEventListener('change', applyOrderFilters);

            // інпут пошуку по email
            document.getElementById('orderFilterUser')
                .addEventListener('input', applyOrderFilters);

            // кнопки сортування
            document.querySelectorAll('.orders-sort button')
                .forEach(btn => btn.addEventListener('click', () => applyOrderSort(btn.dataset.sort)));

            // перший рендер
            renderModeratorOrders(_modOrdersCache);
        });
    }



    document.querySelectorAll('.orders-sort button').forEach(btn => {
        btn.addEventListener('click', () => applyOrderSort(btn.dataset.sort));
    });

    // щоб фільтрація відбувалася відразу при зміні селекта зі статусом:
    document.getElementById('orderFilterStatus')
        .addEventListener('change', applyOrderFilters);

    // і (за бажанням) одразу при введенні email’у:
    document.getElementById('orderFilterUser')
        .addEventListener('input', applyOrderFilters);


}