// ========== КОНФИГУРАЦИЯ ==========
const API_URL = 'https://dino-game-backend-production.up.railway.app'; // ЗАМЕНИ НА ТВОЙ URL С REPL.IT
// const API_URL = 'https://твой-проект.repl.co'; // Раскомментируй и вставь свой URL

// ========== СОСТОЯНИЕ ==========
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    if (authToken) {
        showGameScreen();
        loadDinosaur();
    } else {
        showAuthScreen();
    }
});

// ========== НАСТРОЙКА СЛУШАТЕЛЕЙ ==========
function setupEventListeners() {
    // Переключение вкладок аутентификации
    document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
    document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));
    
    // Формы
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Кнопки в игре
    document.getElementById('feed-btn').addEventListener('click', feedDinosaur);
    document.getElementById('rename-btn').addEventListener('click', () => showModal('rename-modal'));
    
    // Модальное окно
    document.getElementById('save-name-btn').addEventListener('click', saveNewName);
    document.getElementById('cancel-name-btn').addEventListener('click', () => hideModal('rename-modal'));
    
    // Закрытие модалки по клику вне
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// ========== АУТЕНТИФИКАЦИЯ ==========
function switchTab(tab) {
    // Переключение кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    // Переключение форм
    document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
    
    // Скрыть ошибки
    hideError('auth-error');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            saveAuthData(data.token, data.user);
            showGameScreen();
            loadDinosaur();
        } else {
            showError('auth-error', data.error || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('auth-error', 'Не удалось подключиться к серверу');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            saveAuthData(data.token, data.user);
            showGameScreen();
            loadDinosaur();
        } else {
            showError('auth-error', data.error || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('auth-error', 'Не удалось подключиться к серверу');
    }
}

function saveAuthData(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    updateUserInfo();
}

function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (currentUser) {
        userInfo.innerHTML = `
            <span>👤 ${currentUser.username}</span>
            <button onclick="logout()" class="btn btn-secondary" style="padding: 5px 15px; font-size: 0.8rem;">Выйти</button>
        `;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showAuthScreen();
}

// ========== ЭКРАНЫ ==========
function showAuthScreen() {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('game-screen').classList.remove('active');
}

function showGameScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
}

// ========== ЗАГРУЗКА ДИНОЗАВРА ==========
async function loadDinosaur() {
    try {
        const response = await fetch(`${API_URL}/api/dino/my`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayDinosaur(data.dino);
        } else {
            // Если токен невалидный
            if (data.error === 'Неверный или просроченный токен') {
                logout();
                showError('auth-error', 'Сессия истекла, войдите снова');
                showAuthScreen();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки динозавра:', error);
    }
}

function displayDinosaur(dino) {
    document.getElementById('dino-name').textContent = dino.name;
    document.getElementById('dino-species').textContent = dino.speciesName;
    document.getElementById('dino-level').textContent = dino.level;
    
    // Прогресс опыта
    document.getElementById('xp-text').textContent = `${dino.xp} / ${dino.xpToNextLevel}`;
    document.getElementById('xp-progress').style.width = `${dino.xpProgress}%`;
    
    // Изображение динозавра
    const imageMap = {
        'compsognathus': 'https://i.imgur.com/JZvLxQl.png',
        'triceratops': 'https://i.imgur.com/5XKzH9E.png',
        'velociraptor': 'https://i.imgur.com/8WYVf9P.png',
        'trex': 'https://i.imgur.com/QwZ3FgD.png'
    };
    
    document.getElementById('dino-image').src = imageMap[dino.species] || imageMap.compsognathus;
}

// ========== КОРМЛЕНИЕ ==========
async function feedDinosaur() {
    const btn = document.getElementById('feed-btn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '🍖 Кормим...';
    
    try {
        const response = await fetch(`${API_URL}/api/dino/feed`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Анимация
            const dinoImg = document.getElementById('dino-image');
            dinoImg.style.animation = 'none';
            setTimeout(() => {
                dinoImg.style.animation = 'pulse 0.5s';
            }, 10);
            
            // Обновить данные
            displayDinosaur(data.dino);
            
            // Сообщение об эволюции
            if (data.dino.evolved) {
                alert(`🎉 Поздравляем! Твой ${data.dino.speciesName} эволюционировал на уровень ${data.dino.level}!`);
            }
        } else {
            if (data.cooldown) {
                alert(`⏳ ${data.error}`);
            } else {
                alert(`❌ ${data.error}`);
            }
        }
    } catch (error) {
        console.error('Ошибка кормления:', error);
        alert('Не удалось покормить динозавра');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ========== ПЕРЕИМЕНОВАНИЕ ==========
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('new-name').value = document.getElementById('dino-name').textContent;
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    hideError('rename-error');
}

async function saveNewName() {
    const newName = document.getElementById('new-name').value.trim();
    
    if (!newName || newName.length < 2) {
        showError('rename-error', 'Имя должно быть не менее 2 символов');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/dino/rename`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            hideModal('rename-modal');
            displayDinosaur(data.dino);
            alert('✅ Динозавр переименован!');
        } else {
            showError('rename-error', data.error || 'Ошибка переименования');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('rename-error', 'Не удалось подключиться к серверу');
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.add('active');
}

function hideError(elementId) {
    const el = document.getElementById(elementId);
    el.classList.remove('active');
    el.textContent = '';
}
