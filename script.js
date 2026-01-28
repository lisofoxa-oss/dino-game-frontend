// ========== КОНФИГУРАЦИЯ ==========
const API_URL = 'https://dino-game-backend--lisofoxa.replit.app'; // ✅ ТВОЙ БЭКЕНД

// ========== СОСТОЯНИЕ ==========
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// ========== ТАЙМЕР КУЛДАУНА (из базы данных) ==========
let cooldownTimer = null;
let lastFedTime = null;
const COOLDOWN_MINUTES = 5; // 5 минут кулдаун

// Вычисляем оставшееся время до следующего кормления
function calculateRemainingTime(lastFed) {
    if (!lastFed) return null;
    
    const now = new Date();
    const lastFedDate = new Date(lastFed);
    const elapsedMinutes = (now - lastFedDate) / (1000 * 60);
    const remainingMinutes = COOLDOWN_MINUTES - elapsedMinutes;
    
    return Math.max(0, remainingMinutes * 60 * 1000); // В миллисекундах
}

function startCooldownFromServer(lastFed) {
    lastFedTime = lastFed ? new Date(lastFed) : null;
    
    if (!lastFedTime) {
        stopCooldown();
        return;
    }
    
    const remaining = calculateRemainingTime(lastFed);
    
    if (remaining && remaining > 0) {
        // Кулдаун ещё активен
        updateCooldownUI(remaining);
        
        // Запускаем таймер для обновления интерфейса
        if (cooldownTimer) clearInterval(cooldownTimer);
        cooldownTimer = setInterval(() => {
            const newRemaining = calculateRemainingTime(lastFedTime);
            if (newRemaining && newRemaining > 0) {
                updateCooldownUI(newRemaining);
            } else {
                stopCooldown();
            }
        }, 1000);
    } else {
        // Кулдаун закончился
        stopCooldown();
    }
}

function updateCooldownUI(remainingMilliseconds) {
    const minutes = Math.floor(remainingMilliseconds / 60000);
    const seconds = Math.floor((remainingMilliseconds % 60000) / 1000)
                      .toString()
                      .padStart(2, '0');
    
    // Обновляем интерфейс
    const timerEl = document.getElementById('timer-value');
    const cooldownEl = document.getElementById('cooldown-timer');
    const feedBtn = document.getElementById('feed-btn');
    
    if (timerEl && cooldownEl && feedBtn) {
        timerEl.textContent = `${minutes}:${seconds}`;
        cooldownEl.style.display = 'flex';
        cooldownEl.classList.add('active');
        feedBtn.classList.add('cooldown');
        feedBtn.disabled = true;
    }
}

function stopCooldown() {
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = null;
    lastFedTime = null;
    
    // Обновляем интерфейс
    const cooldownEl = document.getElementById('cooldown-timer');
    const feedBtn = document.getElementById('feed-btn');
    
    if (cooldownEl && feedBtn) {
        cooldownEl.style.display = 'none';
        cooldownEl.classList.remove('active');
        feedBtn.classList.remove('cooldown');
        feedBtn.disabled = false;
    }
}

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
    document.getElementById('tab-login')?.addEventListener('click', () => switchTab('login'));
    document.getElementById('tab-register')?.addEventListener('click', () => switchTab('register'));
    
    // Формы
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    
    // Кнопки в игре
    document.getElementById('feed-btn')?.addEventListener('click', feedDinosaur);
    document.getElementById('rename-btn')?.addEventListener('click', () => showModal('rename-modal'));
    
    // Модальное окно переименования
    document.getElementById('save-name-btn')?.addEventListener('click', saveNewName);
    document.getElementById('cancel-name-btn')?.addEventListener('click', () => hideModal('rename-modal'));
    
    // Закрытие модалки по клику вне
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// ========== СИСТЕМА УВЕДОМЛЕНИЙ ==========
function showNotification(message, type = 'info', title = null) {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    // Иконки для разных типов
    const icons = {
        success: '✅',
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        wait: '⏳'
    };
    
    // Цвета
    const colors = {
        success: '#4ade80',
        info: '#3b82f6',
        warning: '#fbbf24',
        error: '#ef4444',
        wait: '#fbbf24'
    };
    
    // Создаём уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-content">
            ${title ? `<div class="notification-title">${title}</div>` : ''}
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Добавляем в контейнер
    container.prepend(notification);
    
    // Добавляем класс для анимации
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500);
    }, 5000);
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
            showNotification(`Добро пожаловать, ${data.user.username}!`, 'success', 'Успешный вход');
        } else {
            showError('auth-error', data.error || 'Ошибка входа');
            showNotification(data.error || 'Ошибка входа', 'error', 'Ошибка');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('auth-error', 'Не удалось подключиться к серверу');
        showNotification('Не удалось подключиться к серверу', 'error', 'Ошибка соединения');
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
            showNotification(`Добро пожаловать в мир динозавров, ${data.user.username}!`, 'success', 'Регистрация успешна');
        } else {
            showError('auth-error', data.error || 'Ошибка регистрации');
            showNotification(data.error || 'Ошибка регистрации', 'error', 'Ошибка');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('auth-error', 'Не удалось подключиться к серверу');
        showNotification('Не удалось подключиться к серверу', 'error', 'Ошибка соединения');
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
    if (currentUser && userInfo) {
        userInfo.innerHTML = `
            <span>👤 ${currentUser.username}</span>
            <button onclick="logout()" class="btn btn-secondary" style="padding: 5px 15px; font-size: 0.8rem; margin-left: 10px;">Выйти</button>
        `;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showAuthScreen();
    showNotification('Вы успешно вышли из аккаунта', 'info', 'До встречи!');
}

// ========== ЭКРАНЫ ==========
function showAuthScreen() {
    document.getElementById('auth-screen')?.classList.add('active');
    document.getElementById('game-screen')?.classList.remove('active');
}

function showGameScreen() {
    document.getElementById('auth-screen')?.classList.remove('active');
    document.getElementById('game-screen')?.classList.add('active');
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
            // Запускаем кулдаун на основе данных из базы
            startCooldownFromServer(data.dino.lastFed);
        } else {
            // Если токен невалидный
            if (data.error === 'Неверный или просроченный токен') {
                logout();
                showError('auth-error', 'Сессия истекла, войдите снова');
                showNotification('Сессия истекла, войдите снова', 'error', 'Ошибка авторизации');
                showAuthScreen();
            } else {
                console.error('Ошибка загрузки:', data);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки динозавра:', error);
        showNotification('Не удалось загрузить данные динозавра', 'error', 'Ошибка');
    }
}

function displayDinosaur(dino) {
    document.getElementById('dino-name').textContent = dino.name;
    document.getElementById('dino-species').textContent = dino.speciesName;
    document.getElementById('dino-level').textContent = dino.level;
    
    // Прогресс опыта
    document.getElementById('xp-text').textContent = `${dino.xp} / ${dino.xpToNextLevel}`;
    document.getElementById('xp-progress').style.width = `${dino.xpProgress}%`;
    
    // Изображение динозавра (НОВЫЕ КАРТИНКИ!)
    const imageMap = {
        'compsognathus': '/images/compy.png',
        'triceratops': '/images/trike.png',
        'velociraptor': '/images/raptor.png',
        'trex': '/images/trex.png'
    };
    
    document.getElementById('dino-image').src = imageMap[dino.species] || '/images/compy.png';
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
            // Анимация кнопки
            btn.classList.add('success');
            setTimeout(() => btn.classList.remove('success'), 500);
            
            // Анимация динозавра
            const dinoImg = document.getElementById('dino-image');
            dinoImg.style.animation = 'none';
            setTimeout(() => {
                dinoImg.style.animation = 'pulse 0.5s';
            }, 10);
            
            // Обновить данные
            displayDinosaur(data.dino);
            
            // Запустить кулдаун на основе данных из базы
            startCooldownFromServer(data.dino.lastFed);
            
            // Сообщение о кормлении
            showNotification(`+10 опыта! Прогресс: ${data.dino.xpProgress}%`, 'success', 'Динозавр накормлен');
            
            // Сообщение об эволюции
            if (data.dino.evolved) {
                showNotification(`🎉 Поздравляем! Твой ${data.dino.speciesName} эволюционировал на уровень ${data.dino.level}!`, 'success', 'ЭВОЛЮЦИЯ!');
                
                // Вибрация для мобильных устройств
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
            }
        } else {
            if (data.cooldown) {
                // Сервер вернул кулдаун — обновляем интерфейс
                showNotification(`Подождите ещё ${data.waitMinutes} минут(ы) до следующего кормления`, 'wait', 'Слишком рано');
                // Обновляем данные из базы
                loadDinosaur();
            } else {
                showNotification(data.error || 'Не удалось покормить динозавра', 'error', 'Ошибка');
            }
        }
    } catch (error) {
        console.error('Ошибка кормления:', error);
        showNotification('Не удалось покормить динозавра', 'error', 'Ошибка соединения');
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
        showNotification('Имя должно быть от 2 до 20 символов', 'warning', 'Неверное имя');
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
            showNotification(`Динозавр теперь зовётся "${newName}"`, 'success', 'Имя изменено');
        } else {
            showError('rename-error', data.error || 'Ошибка переименования');
            showNotification(data.error || 'Ошибка переименования', 'error', 'Ошибка');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError('rename-error', 'Не удалось подключиться к серверу');
        showNotification('Не удалось подключиться к серверу', 'error', 'Ошибка соединения');
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('active');
    }
}

function hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.remove('active');
        el.textContent = '';
    }
}
