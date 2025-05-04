const doConsole = false;

// Набори для відстеження вже доданих змінних
const addedColorVariables = new Set();
const addedNonColorVariables = new Set();

document.addEventListener('DOMContentLoaded', () => {
    console.log("colors.js завантажено");
    generateColorBoxes();
});

function generateColorBoxes() {
    console.log('викликано generateColorBoxes');
    const styles = getComputedStyle(document.documentElement);
    const colorContainer = document.getElementById('color-display');
    const nonColorContainer = document.getElementById('non-color-display');
    const variables = Array.from(document.styleSheets)
        .filter(sheet => !sheet.href || sheet.href.includes('colors.css')) // Фільтруємо потрібний файл
        .flatMap(sheet => Array.from(sheet.cssRules || []))
        .filter(rule => rule.selectorText === ':root') // Знаходимо правила для :root
        .flatMap(rule => Array.from(rule.style).filter(name => name.startsWith('--'))); // Отримуємо змінні
    
    if (doConsole) console.log("Знайдено змінні:", variables);

    variables.forEach(property => {
        const value = styles.getPropertyValue(property).trim();
        if (value) {
            if (doConsole) console.log(`Змінна: ${property}, значення: ${value}`);
            
            if (value.match(/^#|rgb|linear-gradient/)) {
                if (!addedColorVariables.has(property)) { // Перевірка, чи вже додана змінна
                    createColorBox(colorContainer, property, value); // Кольорові змінні
                    addedColorVariables.add(property); // Додаємо до набору
                }
            } else {
                if (!addedNonColorVariables.has(property)) { // Перевірка, чи вже додана змінна
                    createNonColorBox(nonColorContainer, property, value); // Некольорові змінні
                    addedNonColorVariables.add(property); // Додаємо до набору
                }
            }
        }
    });
}

function createColorBox(container, name, value) {
    const colorBox = document.createElement('div');
    colorBox.className = 'color-box';
    colorBox.style.background = value;
    colorBox.style.color = getContrastColor(value);

    colorBox.innerHTML = `
        <strong>${name}</strong>
        <span>${value}</span>
    `;

    container.appendChild(colorBox);
    if (doConsole) console.log(`Додано блок кольору для змінної: ${name}`);
}

function createNonColorBox(container, name, value) {
    const nonColorBox = document.createElement('div');
    nonColorBox.className = 'color-box';
    nonColorBox.style.background = '#f0f0f0'; // Світлий фон
    nonColorBox.style.color = '#333'; // Темний текст

    nonColorBox.innerHTML = `
        <strong>${name}</strong>
        <span>${value}</span>
    `;

    container.appendChild(nonColorBox);
    if (doConsole) console.log(`Додано блок для некольорової змінної: ${name}`);
}

function getContrastColor(hexColor) {
    if (hexColor.startsWith('#')) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 125 ? '#000000' : '#FFFFFF';
    }
    return '#000000'; // Чорний за замовчуванням
}
