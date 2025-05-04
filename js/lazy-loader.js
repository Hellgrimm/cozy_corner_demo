// (() => ['log', 'info', 'warn', 'error', 'debug']
//     .forEach(m => {
//         const o = console[m];
//         console[m] = (...a) =>
//             (localStorage.getItem('is_admin') === 'true' || localStorage.getItem('is_moderator') === 'true')
//             && o.apply(console, a);
//     })
// )();

const currentPath = window.location.pathname;
console.log('%c[MAIN] Поточний шлях сторінки: ', 'color: cyan;', currentPath);
const normalizedPath = currentPath
  .replace(/\/index\.html$/, '')  // /home/index.html → /home
  .replace(/\/$/, '');            // /home/          → /home

const globalCSSFiles = [
    '../css/base.css',
    '../css/colors.css',
    '../css/fonts.css',
    '../css/header-footer.css',
    '../css/login.css',
    '../home/cart/cart.css'
];

const pageSpecificCSS = {
    '/home/': ['../home/home.css', '../css/books.css'],
    '/library/': ['../home/library/library.css', '../css/books.css'],
    '/cart.html': ['../home/cart/cart.css'],
    '/test-all.html': ['../css/books.css']
};

globalCSSFiles.forEach(file => loadCSS(file));

Object.keys(pageSpecificCSS).forEach(path => {
    if (currentPath.includes(path)) {
        pageSpecificCSS[path].forEach(file => loadCSS(file));
    }
});

function loadCSS(file) {
    if (!document.querySelector(`link[href="${file}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = file;
        document.head.appendChild(link);
    }
}

import('/js/common.js')
    .then(async (module) => {
        await module.loadHeader();
        module.updateCartHeader(); // update the cart header immediately
        await module.loadFooter();
        await module.loadLoginModal().then(() => {
            module.setupLoginEventListeners();
        });
        console.log('%c[JS] common.js loaded', 'color: lightgreen; font-weight: bold;');

        module.checkLoginStatus();

        import('../js/cart.js')
            .then(cartModule => {
                if (cartModule.updateCartUI) {
                    cartModule.updateCartUI();
                    console.log('%c[JS] updateCartUI() called after cart.js loaded', 'color: lightgreen; font-weight: bold;');
                } else {
                    console.warn('%c[JS] cart.js does not contain expected functions', 'color: yellow;');
                }

                if (cartModule.updateCartUserInfo) {
                    console.log('[LAZY LOADER] Calling updateCartUserInfo() from cart.js...');
                    cartModule.updateCartUserInfo();
                } else {
                    console.warn('[LAZY LOADER] updateCartUserInfo() not found in cart.js');
                }
            })
            .catch(err => console.error('Error loading cart.js:', err));

        const cartIconContainer = document.getElementById('cartIconContainer');
        if (cartIconContainer) {
            cartIconContainer.addEventListener('click', () => {
                module.showCartModal();
            });
        } else {
            console.warn('Cart icon container not found.');
        }

        setTimeout(() => {
            const subMenu = document.getElementById("subMenu");
            if (!subMenu) {
                console.error('[ERROR] subMenu not found after header load!');
                return;
            }

            console.log('%c[DEBUG] subMenu found, adding toggle event listener', 'color: green;');

            function toggleSubMenu() {
                subMenu.classList.toggle("open-menu");
            }

            const userPic = document.querySelector(".user-pic");
            if (userPic) {
                userPic.addEventListener("click", toggleSubMenu);
            } else {
                console.error('[ERROR] .user-pic element not found!', 'color: red;');
            }
        }, 500);

        if (normalizedPath === '/home') {
            // Динамічно імпортуємо модулі тільки на головній
            import('../js/book.js')
              .then(bookModule => {
                window.updateOffcanvas = bookModule.updateOffcanvas;
                console.log('%c[JS] book.js for home loaded', 'color: lightgreen;');
              })
              .catch(err => console.error('Error loading book.js for home:', err));
          
            import('../js/home.js')
              .then(async homeModule => {
                await homeModule.setupHomePage();
                console.log('%c[JS] home.js loaded', 'color: lightgreen;');
              })
              .catch(err => console.error('Error loading home.js:', err));
          }

        if (currentPath.includes('/library/')) {
            import('../js/book.js')
                .then(async (bookModule) => {
                    console.log('%c[LIBRARY] Starting to load book.js', 'color: orange; font-weight: bold;');
                    await bookModule.initializeLibraryPage();
                    window.updateOffcanvas = bookModule.updateOffcanvas;
                    console.log('%c[JS] book.js for library loaded', 'color: lightgreen;');
                })
                .catch(err => console.error('Error loading book.js for library:', err));
        }

        const books = await module.getBooks();
        module.setupHeaderSearch(books);
        console.log('%c[SEARCH] Global search initialized', 'color: lightblue; font-weight: bold;');
    })
    .catch(err => console.error('Error loading common.js:', err));

document.addEventListener("DOMContentLoaded", () => {
    const loadingScreen = document.getElementById("loading-screen");
    const loadingLogo = document.getElementById("loading-logo");

    function animateLoaderOut() {
        loadingScreen.classList.add("shrink");

        setTimeout(() => {
            loadingLogo.classList.add("shrink-logo");
        }, 1000);

        setTimeout(() => {
            loadingScreen.remove();
        }, 1500);
    }

    // чекаємо справжнього завантаження всіх ресурсів
    window.addEventListener("load", animateLoaderOut);
});


function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(interval);
            reject(new Error(`Element "${selector}" not found within ${timeout} ms`));
        }, timeout);
    });
}

waitForElement('#orderHistoryItem')
    .then((orderHistoryItem) => {
        orderHistoryItem.addEventListener('click', async function (e) {
            e.preventDefault();

            createOrderHistoryModal();

            const orders = await fetchOrderHistory();
            renderOrderHistory(orders);

            const modalElement = document.getElementById('orderHistoryModal');
            const orderModal = new bootstrap.Modal(modalElement);
            orderModal.show();

            startOrderHistoryPolling(60000);
        });
    })
    .catch((error) => {
        console.error(error);
    });
