import { getBooks } from '/cozy_corner_demo/js/common.js';
import { updateRecentlyViewedSection, getRecentlyViewedBooks } from '/cozy_corner_demo/js/common.js';
import { fetchBooksByIds } from '/cozy_corner_demo/js/book.js';


const books = await getBooks();
console.log('Книги для home.js:', books);


// Публічний режим (не залогінений)
function publicHomeMarkup() {
    return `
      <section class="high-ratings mb-5">
        <h2 class="mb-4">Найвищі рейтинги</h2>
        <div class="row" id="topRatedSection"></div>
      </section>
  
      <section class="mb-5">
        <h2 class="mb-4">Наші тарифи</h2>
        <div class="row" id="plansSection">
          <!-- Тут cards з ілюстраціями і текстом -->
        </div>
        <p>* - можна взяти до двох книжок за раз з собою, і повернути їх не пізніше ніж 30 днів після отримання<p/>
      </section>
  
      <section class="mb-5 about-section">
        <div class="row align-items-center">
          <!-- Ліва колонка: текст -->
          <div class="col-md-6">
            <h2>Про проєкт Cozy Corner</h2>
            <p>Cozy Corner — це ваш персональний онлайн-куточок для найкращих книжок:</p>

            <p>📚 У нас ви знайдете понад <strong>10 000</strong> видань у <strong>20+</strong> жанрах:</p>
            <ul>
              <li>Художня література</li>
              <li>Нон-фікшн</li>
              <li>Дитяча література</li>
              <li>Класика</li>
            </ul>

            <p>✨ Наші фішки:</p>
            <ol class="text-start">
              <li>Швидке оформлення замовлень за кілька кліків</li>
              <li>Особистий кабінет з історією замовлень</li>
              <li>Персональні рекомендації</li>
              <li>Оновлення каталогу щотижня</li>
            </ol>

            <button class="btn btn-primary mt-3" onclick="window.location.href='/about'">
              Дізнатися більше
            </button>
          </div>

          <!-- Права колонка: логотип -->
          <div class="col-md-6 text-center">
            <img 
              src="/img/cozy_corner_logo_circl.png" 
              alt="Cozy Corner Logo" 
              class="img-fluid mw-100" 
              style="max-height: 500px;"
              onerror="this.onerror=null; this.src='/cozy_corner_demo/img/book-things/no-image.png';"
            >
          </div>
        </div>
      </section>
  
      <section class="mb-5">
        <h2 class="mb-4">Наші партнери</h2>
        <div class="d-flex flex-wrap justify-content-center" id="partnersSection">
          <!-- Логотипи партнерів -->
        </div>
      </section>
    `;
}

// Приватний режим (залогінений)
function privateHomeMarkup(username) {
    return `
      <section class="mb-5">
        <h2 class="mb-4">Ласкаво просимо, ${username}!</h2>
        <div class="row" id="userStatsSection">
          <!-- Ваш баланс, кількість прочитаних книг тощо -->
        </div>
      </section>
  
      <section class="mb-5">
        <h2 class="mb-4">Персональні рекомендації</h2>
        <div class="row" id="recommendationsSection"></div>
      </section>
    `;
}

// Забираємо статус логіну
function isUserLoggedIn() {
    return localStorage.getItem('is_logged') === 'true';
}

// Основна функція
export async function setupHomePage() {
    console.log('setupHomePage викликано');
    const container = document.getElementById('homeContent');
    container.innerHTML = ''; // очищуємо

    await updateRecentlyViewedSection(fetchBooksByIds, 'recentlyViewedSection');

    // Якщо список порожній — сховаємо секцію
    if (!getRecentlyViewedBooks().length) {
        const section = document
            .getElementById('recentlyViewedSection')
            .closest('section');
        if (section) section.style.display = 'none';
    }
  
    if (!isUserLoggedIn()) {
      // --- ПУБЛІЧНИЙ РЕЖИМ ---
      container.innerHTML = publicHomeMarkup();
  
      // 2) Секція "Найвищі рейтинги"
      displayTopRated();
  
      // 3) Секція "Тарифи"
      renderPlansSection();
  
      // 4) Секція "Партнери"
      renderPartnersSection();
    } else {
      // --- ПРИВАТНИЙ РЕЖИМ ---
      const username = localStorage.getItem('username') || 'Користувач';
      container.innerHTML = privateHomeMarkup(username);
  
      // 1) Заповнити статистику користувача
      renderUserStats();
  
      // 2) Завантажити персональні рекомендації
    //   await renderRecommendations();
    }
  
    // Якщо немає нещодавніх переглядів — сховаємо секцію
    const recent = getRecentlyViewedBooks();
    if (!recent.length) {
      const sec = document
        .getElementById('recentlyViewedSection')
        .closest('section');
      if (sec) sec.style.display = 'none';
    }
  
    console.log('homeContent відображено');
}
  
// Приклад допоміжних функцій:
function displayTopRated() {
    // Можна використати displayCategories(), але витягнути тільки високі рейтинги:
    const books = JSON.parse(localStorage.getItem('books')) || [];
    const top = books.filter(b => b.book_rating === 5).slice(0, 6);
    const row = document.getElementById('topRatedSection');
    top.forEach(book => {
        row.innerHTML += `
        <div class="col-md-4 mb-4">
          <div class="card h-100">
            <img src="${book.image_link}" class="card-img-top" alt="${book.book_name}">
            <div class="card-body">
              <h5 class="card-title">${book.book_name}</h5>
              <p class="card-text">${book.writer_name}</p>
            </div>
          </div>
        </div>`;
    });
}

function renderPlansSection() {
    const plans = [
        { name: 'Базовий', price: '0 ₴', perks: ['Доступ до каталогу', 'Доступ до івентів'] },
        { name: 'Читач', price: '500 ₴/міс', perks: ['Все з пакету <b>"Базовий"</b>', '2 книжки з собою*'] },
        { name: 'Бібліотекар', price: '800 ₴/міс', perks: ['Все з пакету <b>"Читач"</b>', 'до -5% знижки на Каталог', '3 кави на місяць безкоштовно'] },
    ];
    const row = document.getElementById('plansSection');
    plans.forEach(p => {
        row.innerHTML += `
        <div class="col-md-4 mb-4">
          <div class="card text-center h-100 p-3">
            <div class="card-header"><h4>${p.name}</h4></div>
            <div class="card-body">
              <h2 class="card-title">${p.price}</h2>
              <ul class="list-unstyled">
                ${p.perks.map(item => `<li>✔ ${item}</li>`).join('')}
              </ul>
            </div>
            <div class="card-footer">
              <button class="btn btn-primary">Обрати</button>
            </div>
          </div>
        </div>`;
    });
}

function renderPartnersSection() {
    const partners = [
        '/cozy_corner_demo/img/partners/pub1.png',
        '/cozy_corner_demo/img/partners/pub2.png',
        '/cozy_corner_demo/img/partners/pub3.jpg',
    ];
    const wr = document.getElementById('partnersSection');
    partners.forEach(src => {
        wr.innerHTML += `<img src="${src}" class="m-2" style="height:140px;" alt="Partner">`;
    });
}

function renderUserStats() {
    const stats = [
        { label: 'Прочитано книг', value: 12 },
        { label: 'Знижка за планом', value: '10%' },
        { label: 'Бонусні бали', value: 250 },
    ];
    const row = document.getElementById('userStatsSection');
    stats.forEach(s => {
        row.innerHTML += `
        <div class="col-md-4 mb-3">
          <div class="border p-3 text-center">
            <h3>${s.value}</h3>
            <p>${s.label}</p>
          </div>
        </div>`;
    });
}
