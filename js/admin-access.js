// (() => ['log', 'info', 'warn', 'error', 'debug']
//     .forEach(m => {
//         const o = console[m];
//         console[m] = (...a) =>
//             (localStorage.getItem('is_admin') === 'true' || localStorage.getItem('is_moderator') === 'true')
//             && o.apply(console, a);
//     })
// )();

function checkAdminAccess() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        return; // Просто залишаємо 404, не робимо зайвих запитів
    }

    fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/auth/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(userData => {
        if (!userData.is_administrator && !userData.is_moderator) {
            return; // Якщо немає доступу, нічого не завантажуємо
        }

        // Якщо є права – динамічно завантажуємо сторінку
        loadAdminPanel(userData);
    })
    .catch(() => {});
}

function checkAdminAccess() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        return; // Якщо немає токену, залишаємо 404
    }

    fetch('https://x8ki-letl-twmt.n7.xano.io/api:ZOHOxVVb/auth/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(userData => {
        if (!userData.is_administrator && !userData.is_moderator) {
            return; // Якщо немає прав – залишаємо 404
        }

        // Якщо є права – завантажуємо відповідний контент
        loadAdminPanel(userData);
    })
    .catch(() => {});
}

function loadAdminPanel(userData) {
    document.body.innerHTML = ''; // Очищуємо сторінку

    // Завантаження модераторського інтерфейсу
    if (userData.is_moderator) {
        fetch('/fragments/moder-panel.html')
            .then(response => response.text())
            .then(html => {
                document.body.innerHTML += html;
                loadCSSFiles([
                    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
                    '/css/base.css', '/css/colors.css', '/css/fonts.css', '/css/header-footer.css', '/css/moder-panel.css'
                ]);
                loadJSFiles([
                    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js'
                ]);
                loadModeratorScripts();
                updateModeratorHeader(userData.username);
            })
            .catch(error => console.error("Помилка завантаження moder-panel.html:", error));
    }

    // Завантаження адміністративного інтерфейсу
    if (userData.is_administrator) {
        fetch('/fragments/admin-panel.html')
            .then(response => response.text())
            .then(html => {
                document.body.innerHTML += html;
                loadCSSFiles([
                    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
                    '/css/base.css', '/css/colors.css', '/css/fonts.css', '/css/header-footer.css', 
                    '/css/admin-panel.css'
                ]);
                loadJSFiles([
                    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js'
                ]);
                loadAdminScripts();
            })
            .catch(error => console.error("Помилка завантаження admin-panel.html:", error));
    }
}

// 🛠 Функція для динамічного підключення кількох CSS-файлів
function loadCSSFiles(files) {
    files.forEach(file => {
        if (!document.querySelector(`link[href="${file}"]`)) { // Запобігаємо дублюванню
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = file;
            link.crossOrigin = "anonymous"; // Додаємо crossorigin для зовнішніх ресурсів
            document.head.appendChild(link);
        }
    });
}

// 🛠 Функція для динамічного підключення JS-файлів
function loadJSFiles(files) {
    files.forEach(file => {
        if (!document.querySelector(`script[src="${file}"]`)) { // Запобігаємо дублюванню
            const script = document.createElement('script');
            script.src = file;
            script.crossOrigin = "anonymous"; // Додаємо crossorigin для зовнішніх ресурсів
            script.defer = true;
            document.body.appendChild(script);
        }
    });
}

// Оновлення тексту в хедері для модератора
function updateModeratorHeader(username) {
    const nameElement = document.getElementById('moderatorName');
    if (nameElement) {
        nameElement.textContent = username;
    }
}

// Динамічне підключення JS після підтвердження ролі
function loadAdminScripts() {
    const script = document.createElement('script');
    script.src = '/js/admin-panel.js';
    document.body.appendChild(script);
}

function loadModeratorScripts() {
    console.log("moder-panel.js підключається...");
    const script = document.createElement('script');
    script.src = '/js/moder-panel.js';
    script.defer = true; // Додає відкладене завантаження
    script.onload = () => console.log("moder-panel.js завантажено!");
    document.body.appendChild(script);
}


// Запускаємо перевірку при старті сторінки
checkAdminAccess();
