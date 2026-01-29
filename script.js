// ========== КОНФИГУРАЦИЯ ==========
const API_URL = 'https://dino-game-backend--lisofoxa.replit.app'; // ✅ ТВОЙ БЭКЕНД

// ========== СОСТОЯНИЕ ==========
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let farmData = null;
let refreshInterval = null;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    if (authToken) {
        showFarmScreen();
        loadFarm();
        // Автообновление каждые 30 секунд
        refreshInterval = setInterval(loadFarm, 30000);
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
    
    // Кнопка сбора ресурсов
    document.getElementById('collect-all-btn')?.addEventListener('click', collectAllResources);
    
    // Кнопка выхода
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        logout();
    });
    
    // Заглушки для будущих функций
    document.querySelector('.btn-secondary')?.addEventListener('click', () => {
        showNotification('🥚 Инкубатор будет доступен в следующем обновлении!', 'info', 'Скоро!');
    });
    
    document.querySelector('.btn-gems')?.addEventListener('click', () => {
        showNotification('🎁 Сундук удачи будет доступен в следующем обновлении!', 'info', 'Скоро!');
    });
    
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
        collect: '🌾',
        feed: '🍖'
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
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
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
            showFarmScreen();
            loadFarm();
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
            showFarmScreen();
            loadFarm();
            showNotification(`Добро пожаловать на ферму, ${data.user.username}!`, 'success', 'Регистрация успешна');
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
    const logoutBtn = document.getElementById('logout-btn');
    
    if (currentUser && userInfo && logoutBtn) {
        // Показываем имя пользователя
        userInfo.innerHTML = `<span>👤 ${currentUser.username}</span>`;
        
        // Показываем кнопку выхода
        logoutBtn.style.display = 'block';
    } else if (logoutBtn) {
        // Скрываем кнопку выхода
        logoutBtn.style.display = 'none';
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    if (refreshInterval) clearInterval(refreshInterval);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showAuthScreen();
    showNotification('Вы успешно вышли из аккаунта', 'info', 'До встречи!');
}

// ========== ЭКРАНЫ ==========
function showAuthScreen() {
    document.getElementById('auth-screen')?.classList.add('active');
    document.getElementById('farm-screen')?.classList.remove('active');
}

function showFarmScreen() {
    document.getElementById('auth-screen')?.classList.remove('active');
    document.getElementById('farm-screen')?.classList.add('active');
}

// ========== ЗАГРУЗКА ФЕРМЫ ==========
async function loadFarm() {
    try {
        const response = await fetch(`${API_URL}/api/dino/farm`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            farmData = data;
            displayFarm(data);
        } else {
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
        console.error('Ошибка загрузки фермы:', error);
        showNotification('Не удалось загрузить ферму', 'error', 'Ошибка');
    }
}

function displayFarm(data) {
    // Отображение ресурсов
    document.getElementById('grain-count').textContent = data.farm.resources.grain;
    document.getElementById('water-count').textContent = data.farm.resources.water;
    document.getElementById('gems-count').textContent = data.farm.resources.gems || 0;
    document.getElementById('chests-count').textContent = 
        data.farm.chests.common + data.farm.chests.rare + 
        data.farm.chests.epic + data.farm.chests.legendary;
    
    // Отображение названия фермы
    document.getElementById('farm-name').textContent = data.farm.farmName;
    
    // Отображение зданий
    displayBuildings(data.buildings);
    
    // Отображение динозавров
    displayDinosaurs(data.dinosaurs);
}

function displayBuildings(buildings) {
  const container = document.getElementById('buildings-list');
  if (!container) return;
  
  if (buildings.length === 0) {
    container.innerHTML = '<div class="building-item"><div class="building-info">Нет зданий</div></div>';
    return;
  }
  
  container.innerHTML = buildings.map(building => `
    <div class="building-item" data-id="${building.id}">
      <div class="building-icon">${building.icon}</div>
      <div class="building-info">
        <div class="building-name">${building.displayName}</div>
        <div class="building-level">Уровень: ${building.level}</div>
      </div>
      <button class="btn btn-small building-collect-btn" data-building-id="${building.id}" ${building.canCollect ? '' : 'disabled'}>
        ${building.canCollect ? 'Собрать' : '⏳ Ждём...'}
      </button>
    </div>
  `).join('');
  
  // Добавляем обработчики кнопок
  document.querySelectorAll('.building-collect-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const buildingId = e.currentTarget.dataset.buildingId;
      collectBuilding(buildingId);
    });
  });
}

// В конце setupEventListeners добавь:
function setupEventListeners() {
  // ... существующий код ...
  
  // Заглушки для будущих функций
  document.querySelector('.btn-secondary')?.addEventListener('click', () => {
    showNotification('🥚 Инкубатор будет доступен в следующем обновлении!', 'info', 'Скоро!');
  });
  
  document.querySelector('.btn-gems')?.addEventListener('click', () => {
    showNotification('🎁 Сундук удачи будет доступен в следующем обновлении!', 'info', 'Скоро!');
  });
}

function displayDinosaurs(dinosaurs) {
    const container = document.getElementById('dinosaurs-grid');
    if (!container) return;
    
    if (dinosaurs.length === 0) {
        container.innerHTML = '<div class="dinosaur-card"><div class="dino-info">Нет динозавров</div></div>';
        return;
    }
    
    // Маппинг видов → папок
    const folderMap = {
        'compsognathus': 'compy',
        'triceratops': 'trike',
        'velociraptor': 'raptor',
        'trex': 'trex'
    };
    
    container.innerHTML = dinosaurs.map(dino => {
        // Статус голода
        const hungerText = {
            fed: '✅ Сыт',
            hungry_soon: '⚠️ Скоро проголодается',
            hungry: '❌ Голоден!'
        };
        
        const hungerClass = {
            fed: 'fed',
            hungry_soon: 'hungry_soon',
            hungry: 'hungry'
        };
        
        // Определяем картинку по уровню (1-10)
        // Уровень 1-10 → картинка 1-10
        // Уровень 11+ → картинка 10 (максимум)
        const imageLevel = Math.min(10, Math.max(1, dino.level));
        const folder = folderMap[dino.species] || 'compy';
        const imagePath = `images/${folder}/${folder}-${imageLevel}.png`;
        
        return `
            <div class="dinosaur-card" data-id="${dino.id}">
                <div class="dino-header">
                    <div class="dino-name">${dino.name}</div>
                    <div class="dino-rarity">${dino.rarityIcon}</div>
                </div>
                <div class="dino-species">${dino.speciesName}</div>
                
                <div class="dino-level">
                    <span class="dino-level-label">Уровень:</span>
                    <span class="dino-level-value">${dino.level}</span>
                </div>
                
                <div class="xp-bar-container">
                    <div class="xp-bar-label">
                        <span>Опыт:</span>
                        <span>${dino.xp} / ${dino.xpToNextLevel}</span>
                    </div>
                    <div class="xp-bar">
                        <div class="xp-progress" style="width: ${dino.xpProgress}%"></div>
                    </div>
                </div>
                
                <div class="hunger-status ${hungerClass[dino.hungerStatus]}">
                    ${hungerText[dino.hungerStatus]}
                </div>
                
                <div class="dino-image-container">
                    <img src="${imagePath}" alt="${dino.speciesName}" class="dino-image" onerror="this.style.display='none'">
                </div>
                
                <button class="btn btn-action feed-btn" ${dino.hungerStatus !== 'hungry' ? 'disabled' : ''}>
                    🍖 Покормить (${dino.hungerCooldown}ч)
                </button>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики кнопок кормления
    document.querySelectorAll('.feed-btn').forEach(btn => {
        btn.addEventListener('click', () => feedDinosaur(btn.closest('.dinosaur-card').dataset.id));
    });
}

// ========== СБОР РЕСУРСОВ ==========
async function collectAllResources() {
    const btn = document.getElementById('collect-all-btn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '🌾 Собираем...';
    
    try {
        // Собираем со всех зданий, где можно собрать
        const buildingsToCollect = farmData.buildings
            .filter(b => b.canCollect)
            .map(b => b.id);
        
        if (buildingsToCollect.length === 0) {
            showNotification('Нет зданий для сбора. Подождите 2 часа!', 'warning', 'Нечего собирать');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        const response = await fetch(`${API_URL}/api/dino/collect`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ buildingIds: buildingsToCollect })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`✅ Собрано: ${data.resources.grain}🌾 зерна, ${data.resources.water}💧 воды`, 'success', 'Урожай собран!');
            
            // Показать выпавшие сундуки
            if (data.chests.common > 0 || data.chests.rare > 0 || data.chests.epic > 0 || data.chests.legendary > 0) {
                let chestMessage = '🎁 Выпало сундуков:';
                if (data.chests.common > 0) chestMessage += `\n🟢 Обычных: ${data.chests.common}`;
                if (data.chests.rare > 0) chestMessage += `\n🟡 Редких: ${data.chests.rare}`;
                if (data.chests.epic > 0) chestMessage += `\n🔵 Эпических: ${data.chests.epic}`;
                if (data.chests.legendary > 0) chestMessage += `\n🟣 Легендарных: ${data.chests.legendary}`;
                
                showNotification(chestMessage, 'info', 'УДАЧА!');
            }
            
            // Обновить ферму
            loadFarm();
        } else {
            showNotification(data.error || 'Не удалось собрать ресурсы', 'error', 'Ошибка');
        }
    } catch (error) {
        console.error('Ошибка сбора:', error);
        showNotification('Не удалось собрать ресурсы', 'error', 'Ошибка соединения');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function collectBuilding(buildingId) {
    try {
        const response = await fetch(`${API_URL}/api/dino/collect`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ buildingIds: [buildingId] })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`✅ Собрано: ${data.resources.grain}🌾, ${data.resources.water}💧`, 'success', 'Ресурсы собраны!');
            loadFarm();
        } else {
            showNotification(data.error || 'Не удалось собрать', 'error', 'Ошибка');
        }
    } catch (error) {
        console.error('Ошибка сбора:', error);
        showNotification('Не удалось собрать ресурсы', 'error', 'Ошибка соединения');
    }
}

// ========== КОРМЛЕНИЕ ДИНОЗАВРА ==========
async function feedDinosaur(dinoId) {
    const card = document.querySelector(`.dinosaur-card[data-id="${dinoId}"]`);
    const btn = card.querySelector('.feed-btn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '🍖 Кормим...';
    
    try {
        const response = await fetch(`${API_URL}/api/dino/feed`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dinoId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`✅ ${data.message}`, 'success', 'Динозавр накормлен!');
            // Обновить ферму
            loadFarm();
        } else {
            showNotification(data.error || 'Не удалось покормить', 'error', 'Ошибка');
            // Обновить кнопку
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Ошибка кормления:', error);
        showNotification('Не удалось покормить динозавра', 'error', 'Ошибка соединения');
        btn.disabled = false;
        btn.innerHTML = originalText;
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
