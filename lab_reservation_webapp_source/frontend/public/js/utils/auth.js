// 认证相关工具函数

// 当前用户信息
let currentUser = null;

// 获取当前用户信息 - 每次调用都重新获取，确保根据当前页面路径正确计算角色
async function getCurrentUser() {
    console.log('getCurrentUser called');
    
    // 如果已经有缓存的用户信息，优先使用缓存
    if (currentUser) {
        console.log('Returning cached currentUser:', currentUser);
        return currentUser;
    }
    
    try {
        console.log('Calling api.auth.getCurrentUser()');
        const response = await api.auth.getCurrentUser();
        console.log('Received response from API:', response);
        
        if (response && response.status === 401) {
            // 处理401未授权错误
            console.error('获取用户信息失败: 未授权访问', response);
            // 清理无效的认证信息
            cleanupInvalidAuth();
            return null;
        }
        
        if (response && response.success) {
            currentUser = response.data;
            console.log('Setting currentUser to:', currentUser);
            // 存储到localStorage，确保页面刷新后也能保持一致性
            localStorage.setItem('userInfo', JSON.stringify(currentUser));
            return currentUser;
        }
        return null;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        // 发生错误时清理可能的无效认证信息
        cleanupInvalidAuth();
        return null;
    }
}

/**
 * 设置当前用户信息（用于跨模块同步）
 * @param {Object} userInfo 用户信息对象
 */
function setCurrentUser(userInfo) {
    currentUser = userInfo;
    // 存储到localStorage，确保页面刷新后也能保持一致性
    if (userInfo) {
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
    }
}

// 清理无效的令牌和用户信息
function cleanupInvalidAuth() {
    console.log('DEBUG: cleanupInvalidAuth called');
    
    // 检查当前token是否为模拟token
    const currentToken = localStorage.getItem('authToken');
    console.log('DEBUG: 当前token:', currentToken);
    
    // 使用多种方法检测模拟token，增加可靠性
    let isMockToken = false;
    if (currentToken) {
        try {
            // 主要检测方法：正则表达式
            const mockTokenRegex = /^mock_token_/;
            isMockToken = mockTokenRegex.test(currentToken);
            console.log('DEBUG: 正则表达式检测:', isMockToken);
            
            // 辅助检测方法：字符串indexOf
            if (!isMockToken) {
                isMockToken = currentToken.indexOf('mock_token_') === 0;
                console.log('DEBUG: indexOf辅助检测:', isMockToken);
            }
            
            // 辅助检测方法：startsWith
            if (!isMockToken) {
                isMockToken = currentToken.startsWith('mock_token_');
                console.log('DEBUG: startsWith辅助检测:', isMockToken);
            }
            
        } catch (error) {
            console.error('DEBUG: 模拟token检测错误:', error);
            isMockToken = false;
        }
    }
    
    console.log('DEBUG: 最终模拟token检测结果:', isMockToken);
    
    // 如果是模拟token，不清理认证信息
    if (isMockToken) {
        console.log('DEBUG: 检测到模拟token，跳过认证信息清理');
        return;
    }
    
    // 不是模拟token，清理认证信息
    currentUser = null;
    console.log('DEBUG: currentUser set to null');
    
    // 清理所有可能的认证相关存储
    localStorage.removeItem('userInfo');
    console.log('DEBUG: Removed userInfo from localStorage');
    
    localStorage.removeItem('authToken');
    console.log('DEBUG: Removed authToken from localStorage');
    
    // 清理其他可能的相关存储
    localStorage.removeItem('lastActivity');
    console.log('DEBUG: Removed lastActivity from localStorage');
    
    // 清理会话存储
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('lastActivity');
    console.log('DEBUG: Cleaned all sessionStorage auth related items');
    
    // 打印清理后的状态
    console.log('DEBUG: cleanupInvalidAuth completed');
    console.log('DEBUG: localStorage after cleanup:', {
        userInfo: localStorage.getItem('userInfo'),
        authToken: localStorage.getItem('authToken'),
        lastActivity: localStorage.getItem('lastActivity')
    });
    console.log('DEBUG: sessionStorage after cleanup:', {
        userInfo: sessionStorage.getItem('userInfo'),
        authToken: sessionStorage.getItem('authToken'),
        lastActivity: sessionStorage.getItem('lastActivity')
    });
}

// 检查用户是否已登录
async function isAuthenticated() {
    // 快速检查缓存
    if (currentUser) {
        return true;
    }
    
    // 检查令牌是否存在
    const token = localStorage.getItem('authToken');
    if (!token) {
        cleanupInvalidAuth();
        return false;
    }
    
    // 优先从API获取最新的登录状态
    const user = await getCurrentUser();
    
    if (user) {
        // API返回已登录，更新缓存
        currentUser = user;
        return true;
    } else {
        // API返回未登录，清除本地存储
        cleanupInvalidAuth();
        return false;
    }
}

// 检查用户是否是管理员
async function isAdmin() {
    const user = await getCurrentUser();
    return user && user.role === '管理员';
}

// 检查用户是否是管理员或教师
async function isAdminOrTeacher() {
    const user = await getCurrentUser();
    return user && (user.role === '管理员' || user.role === '教师');
}

// 退出登录
async function logout() {
    console.log('logout function called');
    try {
        await api.auth.logout();
        console.log('Logout API call completed');
    } catch (error) {
        console.error('退出登录API调用失败:', error);
    } finally {
        // 确保清除所有本地状态
        currentUser = null;
        localStorage.removeItem('userInfo');
        localStorage.removeItem('authToken'); // 同时清除认证令牌
        console.log('Local storage cleared');
        // 重定向到登录页
        console.log('Redirecting to index.html');
        window.location.href = 'index.html';
    }
}

// 页面加载时检查登录状态
async function requireAuth() {
    try {
        const authenticated = await isAuthenticated();
        // 检查认证状态，如果未认证则重定向到登录页面
        if (!authenticated) {
            console.log('未认证状态，重定向到登录页面');
            window.location.href = 'index.html'; // 重定向到登录页面（index.html）
        }
        return authenticated;
    } catch (error) {
        console.error('检查认证状态失败:', error);
        // API错误时重定向到登录页面
        window.location.href = 'index.html';
        return false;
    }
}

// 根据用户角色显示或隐藏菜单
function updateMenuByRole(role) {
    // 如果没有提供角色但有当前用户，使用当前用户角色
    if (!role && currentUser) {
        role = currentUser.role;
        
        // 更新用户信息显示
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');
        if (userNameElement) userNameElement.textContent = currentUser.username;
        if (userRoleElement) userRoleElement.textContent = currentUser.role;
    }
    
    if (!role) return;
    
    // 根据角色显示或隐藏菜单
    const adminOnlyMenus = ['labs-menu', 'devices-menu', 'reports-menu'];
    const adminTeacherMenus = ['all-reservations-menu'];
    
    // 支持中英文角色名称
    const roleMap = {
        '管理员': '管理员',
        'admin': '管理员',
        '教师': '教师',
        'teacher': '教师',
        '学生': '学生',
        'student': '学生'
    };
    
    const normalizedRole = roleMap[role] || '学生';
    
    console.log('Current role:', role, 'Normalized role:', normalizedRole);
    console.log('Admin only menus:', adminOnlyMenus);
    console.log('Admin teacher menus:', adminTeacherMenus);
    
    // 首先隐藏所有受限制的菜单
    const allRestrictedMenus = [...adminOnlyMenus, ...adminTeacherMenus];
    allRestrictedMenus.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log('Hiding menu:', id);
            element.style.display = 'none';
        }
    });
    
    if (normalizedRole === '管理员') {
        // 管理员可以看到所有菜单
        console.log('User is admin, showing all menus');
        adminOnlyMenus.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log('Showing admin menu:', id);
                element.style.display = 'block';
            }
        });
        adminTeacherMenus.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log('Showing admin/teacher menu:', id);
                element.style.display = 'block';
            }
        });
    } else if (normalizedRole === '教师') {
        // 教师可以看到部分菜单
        console.log('User is teacher, showing teacher menus');
        adminTeacherMenus.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log('Showing teacher menu:', id);
                element.style.display = 'block';
            }
        });
    } else {
        // 学生只能看到基本菜单
        console.log('User is student, hiding all restricted menus');
    }
}

// 初始化页面认证
async function initAuth(callback) {
    console.log('initAuth called');
    
    // 尝试从localStorage恢复用户信息，提高页面加载速度
    const savedUser = localStorage.getItem('userInfo');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('Loaded user from localStorage:', currentUser);
        } catch (e) {
            // 解析失败，清除无效数据
            localStorage.removeItem('userInfo');
            currentUser = null;
            console.error('Failed to parse userInfo from localStorage:', e);
        }
    }
    
    // 检查登录状态
    const authenticated = await requireAuth();
    
    // 更新菜单和用户信息
    if (authenticated) {
        console.log('User is authenticated, updating menu by role');
        await updateMenuByRole(currentUser.role);
        
        // 如果提供了回调函数，在认证成功后调用
        if (typeof callback === 'function') {
            const user = await getCurrentUser();
            callback(user);
        }
    }
    
    // 无论是否认证，都尝试绑定退出登录事件
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        console.log('Binding logout event to logout-btn');
        // 先移除可能存在的事件监听器，避免重复绑定
        logoutBtn.removeEventListener('click', logout);
        logoutBtn.addEventListener('click', logout);
    }
}

// 暴露认证相关函数到全局
window.auth = {
    getCurrentUser,
    setCurrentUser,
    isAuthenticated,
    isAdmin,
    isAdminOrTeacher,
    logout,
    requireAuth,
    initAuth,
    updateMenuByRole,
    cleanupInvalidAuth
};