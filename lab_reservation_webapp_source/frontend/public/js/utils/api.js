// API工具函数
// 使用相对路径，避免硬编码端口号，自动适应当前服务器端口
const API_BASE_URL = '/api';

// 获取存储的token
function getToken() {
    return localStorage.getItem('authToken');
}

// 保存token
function saveToken(token) {
    localStorage.setItem('authToken', token);
}

// 清除token
function removeToken() {
    localStorage.removeItem('authToken');
}

// 通用请求函数
async function fetchApi(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();
    
    const defaultOptions = {
        credentials: 'include', // 包含cookie
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    // 内部方法：清理所有可能的冲突用户信息
    function _cleanupLegacyStorage() {
        const legacyKeys = ['user', 'currentUser', 'loggedUser', 'auth_user'];
        legacyKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`清理旧的用户信息存储: ${key}`);
                localStorage.removeItem(key);
            }
        });
    }
    
    // 如果有token，添加到请求头
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.log('未提供认证令牌，将尝试匿名访问');
    }
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        // 处理非2xx响应
    if (!response.ok) {
        console.log('非2xx响应，状态码:', response.status);
        
        // 尝试解析响应体
        const errorData = await response.json().catch(err => {
            console.error('解析错误响应体失败:', err);
            return {};
        });
        
        console.log('错误响应体:', errorData);
        
        // 对于401未授权错误，返回错误信息对象
        if (response.status === 401) {
            console.log('未授权访问，返回错误信息');
            console.log('401错误详情:', { 
                status: response.status, 
                message: errorData.message, 
                typeofMessage: typeof errorData.message
            });
            
            // 更宽松地检测'jwt malformed'错误
            const hasMalformedJwt = 
                (typeof errorData.message === 'string' && errorData.message.includes('jwt malformed')) ||
                (typeof errorData.error === 'string' && errorData.error.includes('jwt malformed')) ||
                (typeof errorData === 'string' && errorData.includes('jwt malformed'));
            
            // 检查当前token是否为模拟token
            const currentToken = getToken();
            console.log('模拟token检测信息：');
            console.log('- 当前token:', currentToken);
            
            // 使用多种方法检测模拟token，增加可靠性
            let isMockToken = false;
            if (currentToken) {
                try {
                    // 主要检测方法：正则表达式
                    const mockTokenRegex = /^mock_token_/;
                    isMockToken = mockTokenRegex.test(currentToken);
                    console.log('- 正则表达式检测:', isMockToken);
                    
                    // 辅助检测方法：字符串indexOf
                    if (!isMockToken) {
                        isMockToken = currentToken.indexOf('mock_token_') === 0;
                        console.log('- indexOf辅助检测:', isMockToken);
                    }
                    
                    // 辅助检测方法：startsWith
                    if (!isMockToken) {
                        isMockToken = currentToken.startsWith('mock_token_');
                        console.log('- startsWith辅助检测:', isMockToken);
                    }
                    
                } catch (error) {
                    console.error('- 模拟token检测错误:', error);
                    isMockToken = false;
                }
            }
            
            console.log('- 最终模拟token检测结果:', isMockToken);
            
            if (hasMalformedJwt && !isMockToken) {
                console.log('检测到jwt malformed错误，清理无效的认证信息');
                
                // 无论auth模块是否可用，都直接清理认证信息
                localStorage.removeItem('authToken');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('authLastActivity'); // 注意：这里应该使用STORAGE_KEYS.LAST_ACTIVITY
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('userInfo');
                sessionStorage.removeItem('authLastActivity'); // 注意：这里应该使用STORAGE_KEYS.LAST_ACTIVITY
                
                // 如果auth模块可用，也调用它的清理函数以确保一致性
                if (window.auth && window.auth.cleanupInvalidAuth) {
                    console.log('同时调用auth.cleanupInvalidAuth()确保一致性');
                    window.auth.cleanupInvalidAuth();
                }
                
                // 延迟1秒重定向到登录页面，让错误信息有时间返回给调用方
                setTimeout(() => {
                    console.log('重定向到登录页面...');
                    window.location.href = 'index.html';
                }, 1000);
            } else if (hasMalformedJwt && isMockToken) {
                console.log('检测到jwt malformed错误，但当前使用的是模拟token，跳过认证信息清理');
            }
            
            return {
                success: false,
                message: errorData.message || errorData.error || '未授权访问，请登录',
                status: 401
            };
        }
        // 对于404错误，不抛出异常，而是返回友好的错误信息对象
        else if (response.status === 404) {
            console.log('API端点不存在，但允许页面继续运行');
            return {
                success: false,
                message: 'API服务暂时不可用',
                status: 404
            };
        }
        // 对于其他错误，也不抛出异常，确保页面不会崩溃
        console.log(`API请求失败，状态码: ${response.status}`);
        return {
            success: false,
            message: errorData.message || `服务暂时不可用 (${response.status})`,
            status: response.status
        };
    }
        
        // 处理空响应
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return {};
    } catch (error) {
        console.error('API请求失败:', error);
        // 不抛出错误，而是返回错误信息对象，让前端页面能够继续运行
        return {
            success: false,
            message: error.message || '网络请求失败',
            error: error.toString()
        };
    }
}

// 认证相关API
const authApi = {
    // 统一的存储键名，避免多模块使用不同键名
    STORAGE_KEYS: {
        USER_INFO: 'userInfo',
        AUTH_TOKEN: 'authToken',
        LAST_ACTIVITY: 'authLastActivity'
    },
    // 用户登录
    async login(username, password) {
        // 模拟登录功能 - 用于演示和测试
        // 在实际API不可用时，使用模拟数据返回登录成功
        const mockUsers = {
            'admin': {
                password: '123456',
                user: {
                    user_id: 1,
                    username: 'admin',
                    name: '系统管理员',
                    user_name: '系统管理员', // 添加统一的user_name字段
                    role: '管理员',
                    department: '信息中心',
                    email: 'admin@example.com',
                    phone: '13800138000',
                    avatar: 'https://via.placeholder.com/40',
                    last_login: new Date().toISOString(),
                    join_date: '2023-01-01',
                    permissions: ['manage_users', 'manage_labs', 'manage_devices', 'approve_reservations', 'view_reports']
                }
            },
            'teacher1': {
                password: '123456',
                user: {
                    user_id: 2,
                    username: 'teacher1',
                    name: '李老师',
                    user_name: '李老师', // 添加统一的user_name字段
                    role: '教师',
                    department: '计算机系',
                    email: 'teacher1@example.com',
                    phone: '13900139000',
                    avatar: 'https://via.placeholder.com/40',
                    last_login: new Date().toISOString(),
                    join_date: '2023-02-15',
                    permissions: ['manage_labs', 'approve_reservations', 'view_reports']
                }
            },
            'student1': {
                password: '123456',
                user: {
                    user_id: 3,
                    username: 'student1',
                    name: '张同学',
                    user_name: '张同学', // 添加统一的user_name字段
                    role: '学生',
                    department: '计算机系',
                    email: 'student1@example.com',
                    phone: '13700137000',
                    avatar: 'https://via.placeholder.com/40',
                    last_login: new Date().toISOString(),
                    join_date: '2023-09-01',
                    permissions: ['create_reservations', 'view_own_reservations']
                }
            }
        };
        
        // 使用模拟数据进行登录验证
        if (mockUsers[username] && mockUsers[username].password === password) {
            console.log('使用模拟登录数据，登录成功');
            // 生成模拟token
            const mockToken = `mock_token_${username}_${Date.now()}`;
            console.log('登录调试：');
            console.log('- 生成的mockToken:', mockToken);
            console.log('- mockToken.startsWith(\'mock_token_\'):', mockToken.startsWith('mock_token_'));
            
            saveToken(mockToken);
            
            // 检查token是否保存成功
            const savedToken = getToken();
            console.log('- 保存后的token:', savedToken);
            console.log('- token保存成功:', savedToken === mockToken);
            
            // 标准化用户信息
            const normalizedUser = this._normalizeUser(mockUsers[username].user);
            
            // 保存用户信息到本地存储（使用统一键名）
            localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(normalizedUser));
            localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
            
            // 检查localStorage中的所有内容
            console.log('localStorage中的所有内容：');
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                console.log(`  ${key}: ${value}`);
            }
            
            // 清理可能存在的旧存储键
            this._cleanupLegacyStorage();
            
            // 清理后再次检查token
            const tokenAfterCleanup = getToken();
            console.log('- 清理旧存储后token:', tokenAfterCleanup);
            console.log('- 清理后token仍然存在:', tokenAfterCleanup === mockToken);
            
            return {
                success: true,
                message: '登录成功',
                data: {
                    token: mockToken,
                    user: normalizedUser
                }
            };
        }
        
        // 模拟登录失败
        console.log('使用模拟登录数据，登录失败');
        return {
            success: false,
            message: '用户名或密码错误',
            status: 401
        };
        
        // 以下是原始API调用代码，已注释掉
        /*
        const response = await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        
        // 保存token
        if (response.success && response.data && response.data.token) {
            saveToken(response.data.token);
        }
        
        return response;
        */
    },
    
    // 用户登出
    async logout() {
        // 模拟登出
        console.log('使用模拟登出功能');
        removeToken();
        // 清除用户信息（使用统一键名）
        localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
        localStorage.removeItem(this.STORAGE_KEYS.LAST_ACTIVITY);
        
        // 清理可能存在的旧存储键
        this._cleanupLegacyStorage();
        
        return {
            success: true,
            message: '登出成功'
        };
        
        // 以下是原始API调用代码，已注释掉
        /*
        const response = await fetchApi('/auth/logout', {
            method: 'POST',
        });
        
        // 清除token
        removeToken();
        
        return response;
        */
    },
    
    // 获取当前用户信息
    async getCurrentUser() {
        // 获取令牌
        const token = getToken();
        
        // 添加详细日志输出
        console.log('getCurrentUser调用开始，当前localStorage内容:', {
            authToken: localStorage.getItem('authToken'),
            userInfo: localStorage.getItem('userInfo'),
            lastActivity: localStorage.getItem('lastActivity')
        });
        
        console.log('获取到的令牌:', token);
        
        // 清理所有可能的冲突用户信息
        this._cleanupLegacyStorage();
        
        if (!token) {
            console.log('未检测到登录令牌，返回未登录状态');
            return {
                success: false,
                message: '未登录'
            };
        }
        
        // 检查是否使用模拟登录数据（token以mock_token_开头）
        if (token.startsWith('mock_token_')) {
            console.log('检测到模拟登录令牌，优先使用localStorage中的用户信息');
            
            // 尝试从localStorage获取用户信息
            const savedUser = localStorage.getItem(this.STORAGE_KEYS.USER_INFO);
            if (savedUser) {
                try {
                    const normalizedUser = JSON.parse(savedUser);
                    console.log('使用localStorage中的模拟用户信息:', normalizedUser);
                    
                    // 更新最后活动时间
                    localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
                    
                    return {
                        success: true,
                        data: normalizedUser
                    };
                } catch (e) {
                    console.error('解析localStorage中的用户信息失败:', e);
                    localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
                }
            }
            
            // 如果localStorage中没有用户信息，尝试从token中解析用户名并生成模拟用户
            const username = token.split('_')[2];
            console.log('从模拟令牌中解析用户名:', username);
            
            // 使用模拟用户数据
            const mockUsers = {
                'admin': {
                    user_id: 1,
                    username: 'admin',
                    name: '系统管理员',
                    user_name: '系统管理员',
                    role: '管理员',
                    department: '信息中心',
                    email: 'admin@example.com',
                    phone: '13800138000',
                    avatar: 'https://via.placeholder.com/40',
                    last_login: new Date().toISOString(),
                    join_date: '2023-01-01',
                    permissions: ['manage_users', 'manage_labs', 'manage_devices', 'approve_reservations', 'view_reports']
                },
                'teacher1': {
                    user_id: 2,
                    username: 'teacher1',
                    name: '李老师',
                    user_name: '李老师',
                    role: '教师',
                    department: '计算机系',
                    email: 'teacher1@example.com',
                    phone: '13900139000',
                    avatar: 'https://via.placeholder.com/40',
                    last_login: new Date().toISOString(),
                    join_date: '2023-02-15',
                    permissions: ['manage_labs', 'approve_reservations', 'view_reports']
                },
                'student1': {
                    user_id: 3,
                    username: 'student1',
                    name: '张同学',
                    user_name: '张同学',
                    role: '学生',
                    department: '计算机系',
                    email: 'student1@example.com',
                    phone: '13700137000',
                    avatar: 'https://via.placeholder.com/40',
                    last_login: new Date().toISOString(),
                    join_date: '2023-09-01',
                    permissions: ['create_reservations', 'view_own_reservations']
                }
            };
            
            if (mockUsers[username]) {
                const normalizedUser = this._normalizeUser(mockUsers[username]);
                
                // 存储到本地存储
                localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(normalizedUser));
                localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
                
                console.log('生成并返回模拟用户信息:', normalizedUser);
                return {
                    success: true,
                    data: normalizedUser
                };
            }
        }
        
        try {
            // 真正调用API获取用户信息
            const response = await fetchApi('/auth/me');
            
            if (response.success) {
                // 标准化用户信息以确保字段一致性
                const normalizedUser = this._normalizeUser(response.data);
                
                // 存储到本地存储
                localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(normalizedUser));
                
                // 更新最后活动时间
                localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
                
                return {
                    success: true,
                    data: normalizedUser
                };
            } else {
                // 如果API返回错误，且不是401错误，则不清除localStorage中的用户信息
                // 这样在使用模拟数据时即使API调用失败，用户信息也不会丢失
                if (response.status !== 401) {
                    console.log('API调用失败但不是401错误，保留localStorage中的用户信息');
                    const savedUser = localStorage.getItem(this.STORAGE_KEYS.USER_INFO);
                    if (savedUser) {
                        try {
                            const normalizedUser = JSON.parse(savedUser);
                            return {
                                success: true,
                                data: normalizedUser
                            };
                        } catch (e) {
                            console.error('解析localStorage中的用户信息失败:', e);
                            localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
                        }
                    }
                } else {
                    // 401错误时清除用户信息
                    localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
                }
                
                // 401错误特殊处理，返回原始错误对象以便上层处理
                if (response.status === 401) {
                    return response;
                }
                
                return {
                    success: false,
                    message: response.message || '获取用户信息失败'
                };
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            
            // 当API调用失败时，尝试使用localStorage中的用户信息
            const savedUser = localStorage.getItem(this.STORAGE_KEYS.USER_INFO);
            if (savedUser) {
                try {
                    const normalizedUser = JSON.parse(savedUser);
                    console.log('API调用失败，使用localStorage中的用户信息:', normalizedUser);
                    
                    // 更新最后活动时间
                    localStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
                    
                    return {
                        success: true,
                        data: normalizedUser
                    };
                } catch (e) {
                    console.error('解析localStorage中的用户信息失败:', e);
                    localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
                }
            }
            
            return {
                success: false,
                message: '获取用户信息失败'
            };
        }
    },
    
    // 内部方法：标准化用户对象，确保所有模块使用一致的字段名
    _normalizeUser(user) {
        if (!user) return null;
        
        // 创建标准化的用户对象，兼容多种可能的字段名
        const normalized = {
            // 基本标识
            user_id: user.user_id || user.id || 0,
            username: user.username || user.userName || user.user_name || '',
            
            // 姓名（确保同时有name和user_name字段）
            name: user.name || user.user_name || user.userName || user.username || '未知用户',
            user_name: user.name || user.user_name || user.userName || user.username || '未知用户',
            
            // 角色信息
            role: user.role || user.userRole || user.user_role || '学生',
            
            // 其他信息
            department: user.department || '',
            email: user.email || '',
            phone: user.phone || '',
            avatar: user.avatar || '',
            
            // 时间信息
            last_login: user.last_login || user.lastLogin || new Date().toISOString(),
            join_date: user.join_date || user.joinDate || new Date().toISOString(),
            
            // 权限信息
            permissions: user.permissions || []
        };
        
        return normalized;
    },
    
    // 内部方法：清理旧的存储键，避免冲突
    _cleanupLegacyStorage() {
        try {
            const legacyKeys = ['user', 'currentUser', 'loggedUser', 'auth_user'];
            for (const key of legacyKeys) {
                if (key !== this.STORAGE_KEYS.USER_INFO && localStorage.getItem(key)) {
                    console.log(`清理旧的用户信息存储: ${key}`);
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.error('清理旧存储失败:', e);
        }
    },
    
    // 更新用户信息
    async updateUserInfo(userInfo) {
        // 模拟更新用户信息
        console.log('使用模拟数据更新用户信息');
        const token = getToken();
        
        if (!token || !token.startsWith('mock_token_')) {
            return {
                success: false,
                message: '未登录或登录已过期',
                status: 401
            };
        }
        
        // 获取当前存储的用户信息
        let currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        
        // 更新用户信息
        const updatedUserInfo = {
            ...currentUserInfo,
            name: userInfo.name || currentUserInfo.name,
            email: userInfo.email || currentUserInfo.email,
            phone: userInfo.phone || currentUserInfo.phone,
            department: userInfo.department || currentUserInfo.department,
            avatar: userInfo.avatar || currentUserInfo.avatar
        };
        
        // 保存更新后的用户信息到本地存储
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        
        return {
            success: true,
            message: '用户信息更新成功',
            data: updatedUserInfo
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi('/auth/update', {
            method: 'PUT',
            body: JSON.stringify(userInfo),
        });
        */
    },
    
    // 修改密码
    async changePassword(oldPassword, newPassword) {
        // 模拟修改密码
        console.log('使用模拟数据修改密码');
        const token = getToken();
        
        if (!token || !token.startsWith('mock_token_')) {
            return {
                success: false,
                message: '未登录或登录已过期',
                status: 401
            };
        }
        
        // 从token中提取用户名
        const username = token.split('_')[2];
        
        // 模拟用户密码数据
        const mockPasswords = {
            'admin': '123456',
            'teacher1': '123456',
            'student1': '123456'
        };
        
        // 验证旧密码
        if (mockPasswords[username] !== oldPassword) {
            return {
                success: false,
                message: '旧密码错误'
            };
        }
        
        return {
            success: true,
            message: '密码修改成功，请重新登录'
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });
        */
    },
};

// 实验室相关API
const labApi = {
    // 获取所有实验室
    async getAllLabs() {
        try {
            // 检查当前token是否为模拟token
            const currentToken = getToken();
            let isMockToken = false;
            if (currentToken) {
                try {
                    const mockTokenRegex = /^mock_token_/;
                    isMockToken = mockTokenRegex.test(currentToken) || 
                                  currentToken.indexOf('mock_token_') === 0 ||
                                  currentToken.startsWith('mock_token_');
                } catch (error) {
                    console.error('模拟token检测错误:', error);
                }
            }
            
            // 如果是模拟token，优先从localStorage读取数据
            if (isMockToken) {
                console.log('使用模拟数据返回所有实验室');
                
                // 先尝试从localStorage读取数据
                const storedMockLabs = localStorage.getItem('mockLaboratories');
                if (storedMockLabs) {
                    try {
                        const labs = JSON.parse(storedMockLabs);
                        // 将localStorage中的格式转换为API期望的格式
                        return labs.map(lab => ({
                            id: lab.lab_id,
                            name: lab.lab_name,
                            location: lab.location,
                            status: lab.status === 1 ? '正常' : '维护中',
                            description: lab.description,
                            device_count: lab.device_count,
                            manager: '管理员'
                        }));
                    } catch (error) {
                        console.error('解析localStorage中的模拟实验室数据失败:', error);
                    }
                }
                
                // 如果localStorage中没有数据或解析失败，返回默认模拟数据
                const defaultMockLabs = [
                    { id: 1, name: '计算机基础实验室', location: '实验楼101', status: '正常', description: '基础计算机实验教学', device_count: 30, manager: '李老师' },
                    { id: 2, name: '网络实验室', location: '实验楼201', status: '正常', description: '网络设备配置与调试', device_count: 15, manager: '王老师' },
                    { id: 3, name: '软件实验室', location: '实验楼301', status: '正常', description: '软件开发与实践', device_count: 20, manager: '张老师' },
                    { id: 4, name: '嵌入式实验室', location: '实验楼401', status: '维护中', description: '嵌入式系统开发', device_count: 12, manager: '刘老师' }
                ];
                return defaultMockLabs;
            }
            
            // 否则调用真实API
            const response = await fetchApi('/laboratories');
            // 如果请求成功，返回数据
            if (response.success) {
                return response.data || [];
            } else if (response.status === 401) {
                // 401错误特殊处理，返回原始错误对象以便上层处理
                return response;
            } else {
                // 其他错误返回空数组
                return [];
            }
        } catch (error) {
            console.error('获取实验室列表失败:', error);
            return [];
        }
    },
    
    // 获取单个实验室信息
    async getLabById(id) {
        try {
            // 检查当前token是否为模拟token
            const currentToken = getToken();
            let isMockToken = false;
            if (currentToken) {
                try {
                    const mockTokenRegex = /^mock_token_/;
                    isMockToken = mockTokenRegex.test(currentToken) || 
                                  currentToken.indexOf('mock_token_') === 0 ||
                                  currentToken.startsWith('mock_token_');
                } catch (error) {
                    console.error('模拟token检测错误:', error);
                }
            }
            
            // 如果是模拟token，优先从localStorage读取数据
            if (isMockToken) {
                console.log('使用模拟数据返回实验室信息');
                
                // 先尝试从localStorage读取数据
                const storedMockLabs = localStorage.getItem('mockLaboratories');
                if (storedMockLabs) {
                    try {
                        const labs = JSON.parse(storedMockLabs);
                        const lab = labs.find(lab => lab.lab_id === Number(id));
                        
                        if (lab) {
                            // 将localStorage中的格式转换为API期望的格式
                            return {
                                success: true,
                                data: {
                                    id: lab.lab_id,
                                    name: lab.lab_name,
                                    location: lab.location,
                                    status: lab.status === 1 ? '正常' : '维护中',
                                    description: lab.description,
                                    device_count: lab.device_count,
                                    manager: '管理员'
                                }
                            };
                        }
                    } catch (error) {
                        console.error('解析localStorage中的模拟实验室数据失败:', error);
                    }
                }
                
                // 如果localStorage中没有数据或解析失败，返回默认模拟数据
                const defaultMockLabs = [
                    { id: 1, name: '计算机基础实验室', location: '实验楼101', status: '正常', description: '基础计算机实验教学', device_count: 30, manager: '李老师' },
                    { id: 2, name: '网络实验室', location: '实验楼201', status: '正常', description: '网络设备配置与调试', device_count: 15, manager: '王老师' },
                    { id: 3, name: '软件实验室', location: '实验楼301', status: '正常', description: '软件开发与实践', device_count: 20, manager: '张老师' },
                    { id: 4, name: '嵌入式实验室', location: '实验楼401', status: '维护中', description: '嵌入式系统开发', device_count: 12, manager: '刘老师' }
                ];
                const lab = defaultMockLabs.find(lab => lab.id === Number(id));
                return {
                    success: true,
                    data: lab || null
                };
            }
            
            // 否则调用真实API
            return await fetchApi(`/laboratories/${id}`);
        } catch (error) {
            console.error('获取实验室信息失败:', error);
            return { success: false, data: null };
        }
    },
    
    // 获取实验室设备
    async getLabDevices(labId) {
        try {
            // 检查当前token是否为模拟token
            const currentToken = getToken();
            let isMockToken = false;
            if (currentToken) {
                try {
                    const mockTokenRegex = /^mock_token_/;
                    isMockToken = mockTokenRegex.test(currentToken) || 
                                  currentToken.indexOf('mock_token_') === 0 ||
                                  currentToken.startsWith('mock_token_');
                } catch (error) {
                    console.error('模拟token检测错误:', error);
                }
            }
            
            // 如果是模拟token，使用模拟设备数据
            if (isMockToken) {
                console.log('使用模拟数据返回实验室设备');
                // 获取所有模拟设备并根据lab_id过滤
                const allDevices = await deviceApi.getAllDevices();
                const labDevices = allDevices.data.filter(device => device.lab_id === Number(labId));
                return {
                    success: true,
                    data: labDevices
                };
            }
            
            // 否则调用真实API
            return await fetchApi(`/laboratories/${labId}/devices`);
        } catch (error) {
            console.error('获取实验室设备失败:', error);
            return { success: false, data: [] };
        }
    },
    
    // 创建实验室（管理员）
    async createLab(labData) {
        return await fetchApi('/laboratories', {
            method: 'POST',
            body: JSON.stringify(labData),
        });
    },
    
    // 更新实验室（管理员）
    async updateLab(id, labData) {
        // 检查当前token是否为模拟token
        const currentToken = getToken();
        let isMockToken = false;
        if (currentToken) {
            try {
                const mockTokenRegex = /^mock_token_/;
                isMockToken = mockTokenRegex.test(currentToken) || 
                              currentToken.indexOf('mock_token_') === 0 ||
                              currentToken.startsWith('mock_token_');
            } catch (error) {
                console.error('模拟token检测错误:', error);
            }
        }
        
        // 如果是模拟token，更新localStorage中的数据
        if (isMockToken) {
            console.log('使用模拟数据更新实验室信息');
            
            // 读取localStorage中的数据
            const storedMockLabs = localStorage.getItem('mockLaboratories');
            if (storedMockLabs) {
                try {
                    const labs = JSON.parse(storedMockLabs);
                    const labIndex = labs.findIndex(lab => lab.lab_id === Number(id));
                    
                    if (labIndex !== -1) {
                        // 更新实验室数据
                        labs[labIndex] = {
                            ...labs[labIndex],
                            lab_name: labData.name,
                            location: labData.location,
                            description: labData.description || '',
                            capacity: labData.capacity,
                            status: labData.status === '正常' ? 1 : 0,
                            // 保持其他字段不变
                        };
                        
                        // 保存回localStorage
                        localStorage.setItem('mockLaboratories', JSON.stringify(labs));
                        
                        // 返回成功响应
                        return {
                            success: true,
                            data: {
                                id: labs[labIndex].lab_id,
                                name: labs[labIndex].lab_name,
                                location: labs[labIndex].location,
                                description: labs[labIndex].description,
                                status: labs[labIndex].status === 1 ? '正常' : '维护中',
                                capacity: labs[labIndex].capacity,
                                device_count: labs[labIndex].device_count
                            },
                            message: '实验室信息更新成功'
                        };
                    }
                } catch (error) {
                    console.error('更新localStorage中的模拟实验室数据失败:', error);
                }
            }
            
            // 如果localStorage中没有数据或更新失败，返回默认成功响应
            return {
                success: true,
                data: {
                    id: id,
                    ...labData
                },
                message: '实验室信息更新成功'
            };
        }
        
        // 否则调用真实API
        return await fetchApi(`/laboratories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(labData),
        });
    },
    
    // 删除实验室（管理员）
    async deleteLab(id) {
        try {
            // 检查当前token是否为模拟token
            const currentToken = getToken();
            let isMockToken = false;
            if (currentToken) {
                try {
                    const mockTokenRegex = /^mock_token_/;
                    isMockToken = mockTokenRegex.test(currentToken) || 
                                  currentToken.indexOf('mock_token_') === 0 ||
                                  currentToken.startsWith('mock_token_');
                } catch (error) {
                    console.error('模拟token检测错误:', error);
                }
            }
            
            if (isMockToken) {
                // 模拟环境：使用模拟数据删除实验室
                console.log('使用模拟数据删除实验室');
                
                // 从localStorage获取当前的模拟实验室数据
                let mockLabs = [];
                const savedLabs = localStorage.getItem('mockLaboratories');
                if (savedLabs) {
                    mockLabs = JSON.parse(savedLabs);
                }
                
                // 查找要删除的实验室
                const labIndex = mockLabs.findIndex(lab => lab.lab_id == id);
                if (labIndex === -1) {
                    return {
                        success: false,
                        message: '实验室不存在',
                        status: 404
                    };
                }
                
                // 删除实验室
                mockLabs.splice(labIndex, 1);
                
                // 保存回localStorage
                localStorage.setItem('mockLaboratories', JSON.stringify(mockLabs));
                
                return {
                    success: true,
                    message: '实验室删除成功'
                };
            } else {
                // 真实环境：调用真实API
                return await fetchApi(`/laboratories/${id}`, {
                    method: 'DELETE'
                });
            }
        } catch (error) {
            console.error('删除实验室失败:', error);
            return {
                success: false,
                message: '实验室删除失败: ' + error.message
            };
        }
    },
};

// 设备相关API
const deviceApi = {
    // 获取所有设备
    async getAllDevices() {
        try {
            // 检查当前token是否为模拟token
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            if (isMockToken) {
                // 模拟环境：从localStorage获取模拟设备数据
                console.log('使用模拟数据返回所有设备');
                
                // 从localStorage获取当前的模拟设备数据
                let mockDevices = [];
                const savedDevices = localStorage.getItem('mockDevices');
                
                if (savedDevices) {
                    mockDevices = JSON.parse(savedDevices);
                } else {
                    // 如果localStorage中没有数据，使用默认的模拟数据
                    mockDevices = [
                        { id: 101, name: '台式计算机', model: '联想ThinkStation', status: '正常', serial_number: 'SN1001', lab_id: 1, lab_name: '计算机基础实验室', purchase_date: '2023-01-15' },
                        { id: 102, name: '台式计算机', model: '联想ThinkStation', status: '正常', serial_number: 'SN1002', lab_id: 1, lab_name: '计算机基础实验室', purchase_date: '2023-01-15' },
                        { id: 103, name: '投影仪', model: '爱普生CB-X05', status: '正常', serial_number: 'PRJ2001', lab_id: 1, lab_name: '计算机基础实验室', purchase_date: '2022-09-20' },
                        { id: 201, name: '路由器', model: '思科Cisco 2960', status: '正常', serial_number: 'RT3001', lab_id: 2, lab_name: '网络实验室', purchase_date: '2023-03-10' },
                        { id: 202, name: '交换机', model: '华为S5700', status: '正常', serial_number: 'SW4001', lab_id: 2, lab_name: '网络实验室', purchase_date: '2023-03-10' },
                        { id: 203, name: '网络测试仪', model: 'Fluke MS2-100', status: '维护中', serial_number: 'NT5001', lab_id: 2, lab_name: '网络实验室', purchase_date: '2022-11-05' },
                        { id: 301, name: '开发服务器', model: 'Dell PowerEdge', status: '正常', serial_number: 'SV6001', lab_id: 3, lab_name: '软件实验室', purchase_date: '2023-05-20' },
                        { id: 302, name: '台式计算机', model: '戴尔OptiPlex', status: '正常', serial_number: 'SN2001', lab_id: 3, lab_name: '软件实验室', purchase_date: '2023-06-15' },
                        { id: 401, name: '嵌入式开发板', model: '树莓派4B', status: '维护中', serial_number: 'EM7001', lab_id: 4, lab_name: '嵌入式实验室', purchase_date: '2023-02-28' },
                        { id: 402, name: '示波器', model: '泰克TDS2014C', status: '维护中', serial_number: 'OS8001', lab_id: 4, lab_name: '嵌入式实验室', purchase_date: '2022-08-10' }
                    ];
                    
                    // 将默认模拟数据保存到localStorage
                    localStorage.setItem('mockDevices', JSON.stringify(mockDevices));
                }
                
                return {
                    success: true,
                    data: mockDevices
                };
            } else {
                // 真实环境：调用真实API
                return await fetchApi('/devices');
            }
        } catch (error) {
            console.error('获取设备列表失败:', error);
            return {
                success: false,
                message: '获取设备列表失败: ' + error.message
            };
        }
    },
    
    // 获取单个设备
    async getDeviceById(id) {
        // 模拟设备数据
        console.log(`使用模拟数据返回设备ID: ${id}`);
        const mockDevices = {
            101: {
                id: 101,
                name: '台式计算机',
                model: '联想ThinkStation',
                status: '正常',
                serial_number: 'SN1001',
                lab_id: 1,
                lab_name: '计算机基础实验室',
                purchase_date: '2023-01-15',
                warranty: '3年',
                specifications: 'i7-12700, 32GB RAM, 1TB SSD',
                last_maintenance: '2023-06-15',
                notes: '运行状态良好'
            },
            102: {
                id: 102,
                name: '台式计算机',
                model: '联想ThinkStation',
                status: '正常',
                serial_number: 'SN1002',
                lab_id: 1,
                lab_name: '计算机基础实验室',
                purchase_date: '2023-01-15',
                warranty: '3年',
                specifications: 'i7-12700, 32GB RAM, 1TB SSD',
                last_maintenance: '2023-06-15',
                notes: '运行状态良好'
            },
            103: {
                id: 103,
                name: '投影仪',
                model: '爱普生CB-X05',
                status: '正常',
                serial_number: 'PRJ2001',
                lab_id: 1,
                lab_name: '计算机基础实验室',
                purchase_date: '2022-09-20',
                warranty: '2年',
                specifications: '3600流明, 1080p分辨率',
                last_maintenance: '2023-04-10',
                notes: '灯泡使用时间约1000小时'
            },
            201: {
                id: 201,
                name: '路由器',
                model: '思科Cisco 2960',
                status: '正常',
                serial_number: 'RT3001',
                lab_id: 2,
                lab_name: '网络实验室',
                purchase_date: '2023-03-10',
                warranty: '3年',
                specifications: '24端口, Gigabit Ethernet',
                last_maintenance: '2023-09-10',
                notes: '稳定运行中'
            },
            202: {
                id: 202,
                name: '交换机',
                model: '华为S5700',
                status: '正常',
                serial_number: 'SW4001',
                lab_id: 2,
                lab_name: '网络实验室',
                purchase_date: '2023-03-10',
                warranty: '3年',
                specifications: '48端口, Gigabit Ethernet',
                last_maintenance: '2023-09-10',
                notes: '稳定运行中'
            },
            203: {
                id: 203,
                name: '网络测试仪',
                model: 'Fluke MS2-100',
                status: '维护中',
                serial_number: 'NT5001',
                lab_id: 2,
                lab_name: '网络实验室',
                purchase_date: '2022-11-05',
                warranty: '2年',
                specifications: '多功能网络测试仪',
                last_maintenance: '2023-08-20',
                notes: '电池需要更换'
            },
            301: {
                id: 301,
                name: '开发服务器',
                model: 'Dell PowerEdge',
                status: '正常',
                serial_number: 'SV6001',
                lab_id: 3,
                lab_name: '软件实验室',
                purchase_date: '2023-05-20',
                warranty: '5年',
                specifications: '2*Xeon E5, 128GB RAM, 10TB Storage',
                last_maintenance: '2023-10-05',
                notes: '主要用于开发环境'
            },
            302: {
                id: 302,
                name: '台式计算机',
                model: '戴尔OptiPlex',
                status: '正常',
                serial_number: 'SN2001',
                lab_id: 3,
                lab_name: '软件实验室',
                purchase_date: '2023-06-15',
                warranty: '3年',
                specifications: 'i5-12500, 16GB RAM, 512GB SSD',
                last_maintenance: '2023-09-15',
                notes: '开发用机'
            },
            401: {
                id: 401,
                name: '嵌入式开发板',
                model: '树莓派4B',
                status: '维护中',
                serial_number: 'EM7001',
                lab_id: 4,
                lab_name: '嵌入式实验室',
                purchase_date: '2023-02-28',
                warranty: '1年',
                specifications: '4GB RAM, 1.5GHz 64位四核处理器',
                last_maintenance: '2023-08-10',
                notes: '需要更新系统'
            },
            402: {
                id: 402,
                name: '示波器',
                model: '泰克TDS2014C',
                status: '维护中',
                serial_number: 'OS8001',
                lab_id: 4,
                lab_name: '嵌入式实验室',
                purchase_date: '2022-08-10',
                warranty: '3年',
                specifications: '4通道, 100MHz带宽',
                last_maintenance: '2023-07-20',
                notes: '校准过期'
            }
        };
        
        const device = mockDevices[id];
        if (device) {
            return {
                success: true,
                data: device
            };
        } else {
            return {
                success: false,
                message: '设备不存在',
                status: 404
            };
        }
        
        // 原始API调用，已注释
        /*
        return await fetchApi(`/devices/${id}`);
        */
    },
    
    // 创建设备
    async createDevice(deviceData) {
        try {
            // 检查当前token是否为模拟token
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            if (isMockToken) {
                // 模拟环境：使用模拟数据创建设备
                console.log('使用模拟数据创建设备');
                
                // 从localStorage获取当前的模拟设备数据
                let mockDevices = [];
                const savedDevices = localStorage.getItem('mockDevices');
                if (savedDevices) {
                    mockDevices = JSON.parse(savedDevices);
                }
                
                // 检查序列号是否已存在
                if (deviceData.serial_number) {
                    const existingDevice = mockDevices.find(device => device.serial_number === deviceData.serial_number);
                    if (existingDevice) {
                        return {
                            success: false,
                            message: '设备序列号已存在，请使用唯一的序列号',
                            status: 400
                        };
                    }
                }
                
                // 创建新设备
                const newDevice = {
                    id: Date.now(), // 使用时间戳作为唯一ID
                    ...deviceData,
                    status: deviceData.status || '正常',
                    purchase_date: deviceData.purchase_date || new Date().toISOString().split('T')[0]
                };
                
                // 添加到模拟设备列表
                mockDevices.push(newDevice);
                
                // 保存回localStorage
                localStorage.setItem('mockDevices', JSON.stringify(mockDevices));
                
                return {
                    success: true,
                    message: '设备添加成功',
                    data: newDevice
                };
            } else {
                // 真实环境：调用真实API
                return await fetchApi('/devices', {
                    method: 'POST',
                    body: JSON.stringify(deviceData),
                });
            }
        } catch (error) {
            console.error('创建设备失败:', error);
            return {
                success: false,
                message: '设备添加失败: ' + error.message
            };
        }
    },
    
    // 更新设备
    async updateDevice(id, deviceData) {
        try {
            // 检查当前token是否为模拟token
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            if (isMockToken) {
                // 模拟环境：从localStorage获取并更新模拟设备数据
                console.log(`使用模拟数据更新设备ID: ${id}`);
                
                let mockDevices = [];
                const savedDevices = localStorage.getItem('mockDevices');
                
                if (savedDevices) {
                    mockDevices = JSON.parse(savedDevices);
                }
                
                // 找到并更新设备
                const deviceIndex = mockDevices.findIndex(device => device.id == id);
                
                if (deviceIndex !== -1) {
                    console.log('更新前设备数据:', mockDevices[deviceIndex]);
                    console.log('要更新的数据:', deviceData);
                    console.log('deviceData中的status字段:', deviceData.status);
                    
                    // 创建更新后的设备对象
                    const updatedDevice = {
                        ...mockDevices[deviceIndex],
                        ...deviceData,
                        id: id
                    };
                    
                    // 确保status字段被正确设置
                    if (deviceData.status) {
                        updatedDevice.status = deviceData.status;
                    }
                    
                    console.log('更新后设备数据:', updatedDevice);
                    
                    // 更新设备数组
                    mockDevices[deviceIndex] = updatedDevice;
                    
                    // 将更新后的数据保存到localStorage
                    localStorage.setItem('mockDevices', JSON.stringify(mockDevices));
                    
                    // 验证保存结果
                    const savedData = JSON.parse(localStorage.getItem('mockDevices'));
                    const verifyDevice = savedData.find(d => d.id == id);
                    console.log('localStorage中保存的设备数据:', verifyDevice);
                    console.log('localStorage中设备的status字段:', verifyDevice.status);
                    
                    return {
                        success: true,
                        message: '设备更新成功',
                        data: updatedDevice
                    };
                } else {
                    return {
                        success: false,
                        message: '设备不存在',
                        status: 404
                    };
                }
            } else {
                // 真实环境：调用真实API
                return await fetchApi(`/devices/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(deviceData),
                });
            }
        } catch (error) {
            console.error('更新设备失败:', error);
            return {
                success: false,
                message: '设备更新失败: ' + error.message
            };
        }
    },
    
    // 更新设备状态
    async updateDeviceStatus(id, status) {
        // 模拟更新设备状态
        console.log(`使用模拟数据更新设备ID: ${id}的状态为: ${status}`);
        return {
            success: true,
            message: '设备状态更新成功',
            data: {
                id: id,
                status: status
            }
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi(`/devices/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
        */
    },
    
    // 删除设备
    async deleteDevice(id) {
        try {
            // 检查当前token是否为模拟token
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            if (isMockToken) {
                // 模拟环境：使用模拟数据删除设备
                console.log('使用模拟数据删除设备');
                
                // 从localStorage获取当前的模拟设备数据
                let mockDevices = [];
                const savedDevices = localStorage.getItem('mockDevices');
                if (savedDevices) {
                    mockDevices = JSON.parse(savedDevices);
                }
                
                // 查找要删除的设备
                const deviceIndex = mockDevices.findIndex(device => device.id == id);
                if (deviceIndex === -1) {
                    return {
                        success: false,
                        message: '设备不存在',
                        status: 404
                    };
                }
                
                // 删除设备
                mockDevices.splice(deviceIndex, 1);
                
                // 保存回localStorage
                localStorage.setItem('mockDevices', JSON.stringify(mockDevices));
                
                return {
                    success: true,
                    message: '设备删除成功'
                };
            } else {
                // 真实环境：调用真实API
                return await fetchApi(`/devices/${id}`, {
                    method: 'DELETE'
                });
            }
        } catch (error) {
            console.error('删除设备失败:', error);
            return {
                success: false,
                message: '设备删除失败: ' + error.message
            };
        }
    },
};

// 预约相关API
const reservationApi = {
    // 获取当前用户的预约
    async getUserReservations() {
        // 模拟预约数据
        console.log('使用模拟数据返回当前用户的预约');
        const userResult = await authApi.getCurrentUser();
        const user = userResult.success ? userResult.data : null;
        const username = user ? user.username : 'student1'; // 默认学生账户
        
        // 获取localStorage中的预约数据
        let localStorageReservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
        
        // 根据不同用户返回不同的预约数据（包括localStorage中的数据）
        let mockReservations = [];
        
        if (username === 'student1') {
            mockReservations = [
                {
                    id: 1001,
                    reservation_id: 1001,
                    lab_id: 1,
                    lab_name: '计算机基础实验室',
                    reservation_date: '2023-12-05',
                    start_time: '09:00',
                    end_time: '11:00',
                    purpose: '数据结构课程实验',
                    status: '已批准',
                    created_at: '2023-12-01T08:30:00',
                    approved_by: '李老师',
                    approval_comment: '批准使用',
                    username: 'student1',
                    user_name: 'student1',
                    user_role: 'student'
                },
                {
                    id: 1002,
                    reservation_id: 1002,
                    lab_id: 3,
                    lab_name: '软件实验室',
                    reservation_date: '2023-12-07',
                    start_time: '14:00',
                    end_time: '17:00',
                    purpose: '软件开发课程项目讨论',
                    status: '待审批',
                    created_at: '2023-12-02T15:20:00',
                    username: 'student1',
                    user_name: 'student1',
                    user_role: 'student'
                },
                {
                    id: 1003,
                    reservation_id: 1003,
                    lab_id: 2,
                    lab_name: '网络实验室',
                    reservation_date: '2023-12-01',
                    start_time: '10:00',
                    end_time: '12:00',
                    purpose: '网络协议实验',
                    status: '已完成',
                    created_at: '2023-11-28T09:15:00',
                    approved_by: '张老师',
                    approval_comment: '批准使用',
                    completed_at: '2023-12-01T12:05:00',
                    username: 'student1',
                    user_name: 'student1',
                    user_role: 'student'
                }
            ];
        } else if (username === 'teacher1') {
            mockReservations = [
                {
                    id: 1004,
                    reservation_id: 1004,
                    lab_id: 3,
                    lab_name: '软件实验室',
                    reservation_date: '2023-12-06',
                    start_time: '08:30',
                    end_time: '12:30',
                    purpose: '软件工程课程教学',
                    status: '已批准',
                    created_at: '2023-11-30T10:00:00',
                    approved_by: '系统管理员',
                    approval_comment: '自动批准教师预约',
                    username: 'teacher1',
                    user_name: 'teacher1',
                    user_role: 'teacher'
                },
                {
                    id: 1005,
                    reservation_id: 1005,
                    lab_id: 1,
                    lab_name: '计算机基础实验室',
                    reservation_date: '2023-12-10',
                    start_time: '13:30',
                    end_time: '16:30',
                    purpose: '计算机组成原理实验教学',
                    status: '已批准',
                    created_at: '2023-12-01T14:30:00',
                    approved_by: '系统管理员',
                    approval_comment: '自动批准教师预约',
                    username: 'teacher1',
                    user_name: 'teacher1',
                    user_role: 'teacher'
                }
            ];
        } else if (username === 'admin') {
            mockReservations = [
                {
                    id: 1006,
                    reservation_id: 1006,
                    lab_id: 4,
                    lab_name: '嵌入式实验室',
                    reservation_date: '2023-12-15',
                    start_time: '09:00',
                    end_time: '18:00',
                    purpose: '实验室设备维护',
                    status: '已批准',
                    created_at: '2023-12-03T11:00:00',
                    approved_by: '系统管理员',
                    approval_comment: '管理员自审批',
                    username: 'admin',
                    user_name: 'admin',
                    user_role: 'admin'
                }
            ];
        }
        
        // 合并localStorage中的预约数据（仅包含当前用户的预约）
        const userLocalReservations = localStorageReservations.filter(res => res.username === username);
        const allReservations = [...mockReservations, ...userLocalReservations];
        
        return {
            success: true,
            data: allReservations
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi('/reservations/my');
        */
    },
    
    // 获取所有预约（管理员/教师）
    async getAllReservations() {
        // 模拟所有预约数据
        console.log('使用模拟数据返回所有预约');
        const mockReservations = [
            {
                id: 1001,
                reservation_id: 1001,
                user_id: 3,
                username: 'student1',
                user_name: '张同学',
                user_role: '学生',
                lab_id: 1,
                lab_name: '计算机基础实验室',
                reservation_date: '2023-12-05',
                start_time: '09:00',
                end_time: '11:00',
                purpose: '数据结构课程实验',
                status: '已批准',
                created_at: '2023-12-01T08:30:00',
                approved_by: '李老师',
                approval_comment: '批准使用'
            },
            {
                id: 1002,
                reservation_id: 1002,
                user_id: 3,
                username: 'student1',
                user_name: '张同学',
                user_role: '学生',
                lab_id: 3,
                lab_name: '软件实验室',
                reservation_date: '2023-12-07',
                start_time: '14:00',
                end_time: '17:00',
                purpose: '软件开发课程项目讨论',
                status: '待审批',
                created_at: '2023-12-02T15:20:00'
            },
            {
                id: 1003,
                reservation_id: 1003,
                user_id: 3,
                username: 'student1',
                user_name: '张同学',
                user_role: '学生',
                lab_id: 2,
                lab_name: '网络实验室',
                reservation_date: '2023-12-01',
                start_time: '10:00',
                end_time: '12:00',
                purpose: '网络协议实验',
                status: '已完成',
                created_at: '2023-11-28T09:15:00',
                approved_by: '张老师',
                approval_comment: '批准使用',
                completed_at: '2023-12-01T12:05:00'
            },
            {
                id: 1004,
                reservation_id: 1004,
                user_id: 2,
                username: 'teacher1',
                user_name: '李老师',
                user_role: '教师',
                lab_id: 3,
                lab_name: '软件实验室',
                reservation_date: '2023-12-06',
                start_time: '08:30',
                end_time: '12:30',
                purpose: '软件工程课程教学',
                status: '已批准',
                created_at: '2023-11-30T10:00:00',
                approved_by: '系统管理员',
                approval_comment: '自动批准教师预约'
            },
            {
                id: 1005,
                reservation_id: 1005,
                user_id: 2,
                username: 'teacher1',
                user_name: '李老师',
                user_role: '教师',
                lab_id: 1,
                lab_name: '计算机基础实验室',
                reservation_date: '2023-12-10',
                start_time: '13:30',
                end_time: '16:30',
                purpose: '计算机组成原理实验教学',
                status: '已批准',
                created_at: '2023-12-01T14:30:00',
                approved_by: '系统管理员',
                approval_comment: '自动批准教师预约'
            },
            {
                id: 1007,
                reservation_id: 1007,
                user_id: 4,
                username: 'student2',
                user_name: '王同学',
                user_role: '学生',
                lab_id: 2,
                lab_name: '网络实验室',
                reservation_date: '2023-12-08',
                start_time: '10:00',
                end_time: '12:00',
                purpose: '网络编程实验',
                status: '待审批',
                created_at: '2023-12-03T09:30:00'
            },
            {
                id: 1008,
                reservation_id: 1008,
                user_id: 4,
                username: 'student2',
                user_name: '王同学',
                user_role: '学生',
                lab_id: 1,
                lab_name: '计算机基础实验室',
                reservation_date: '2023-12-04',
                start_time: '14:00',
                end_time: '16:00',
                purpose: '算法课程练习',
                status: '已拒绝',
                created_at: '2023-12-01T16:00:00',
                approved_by: '李老师',
                approval_comment: '该时间段已被课程占用'
            }
        ];
        
        // 从localStorage获取所有预约数据
        let localStorageReservations = [];
        try {
            localStorageReservations = JSON.parse(localStorage.getItem('userReservations')) || [];
            if (localStorageReservations.length > 0) {
                console.log('从localStorage加载了' + localStorageReservations.length + '条预约数据');
            }
        } catch (error) {
            console.error('从localStorage加载预约数据失败:', error);
        }
        
        // 始终合并模拟数据和localStorage中的数据
        const allReservations = [...mockReservations, ...localStorageReservations];
        
        return {
            success: true,
            data: allReservations
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi('/reservations');
        */
    },
    
    // 获取单个预约
    async getReservationById(id) {
        // 模拟单个预约数据
        console.log(`使用模拟数据返回预约ID: ${id}`);
        const mockReservations = {
            1001: {
                id: 1001,
                user_id: 3,
                username: 'student1',
                user_name: '张同学',
                user_role: '学生',
                department: '计算机系',
                email: 'student1@example.com',
                phone: '13700137000',
                lab_id: 1,
                lab_name: '计算机基础实验室',
                reservation_date: '2023-12-05',
                start_time: '09:00',
                end_time: '11:00',
                purpose: '数据结构课程实验',
                participants: '20人',
                status: '已批准',
                created_at: '2023-12-01T08:30:00',
                approved_by: '李老师',
                approval_comment: '批准使用',
                approval_at: '2023-12-01T10:15:00'
            }
        };
        
        // 首先从localStorage中查找预约
        let reservation = null;
        try {
            const localStorageReservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
            reservation = localStorageReservations.find(r => r.id == id);
            if (reservation) {
                console.log(`从localStorage中找到了预约ID: ${id}`);
                return {
                    success: true,
                    data: reservation
                };
            }
        } catch (error) {
            console.error('从localStorage查找预约时出错:', error);
        }
        
        // 如果localStorage中找不到，再检查模拟数据
        // 如果找不到特定ID的数据，返回第一个作为示例
        reservation = mockReservations[id] || mockReservations[1001];
        return {
            success: true,
            data: reservation
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi(`/reservations/${id}`);
        */
    },
    
    // 创建预约
    async createReservation(reservationData) {
        // 模拟创建预约
        console.log('使用模拟数据创建预约');
        
        // 获取当前用户信息
        const userResult = await authApi.getCurrentUser();
        const user = userResult.success ? userResult.data : null;
        const username = user ? user.username : 'unknown';
        const userRole = user ? user.role : '学生';
        
        // 创建预约对象
        const newReservation = {
            id: Date.now(),
            ...reservationData,
            status: '待审批',
            created_at: new Date().toISOString(),
            username: username,
            user_name: user ? user.name || username : username,
            user_role: userRole,
            // 添加缺失的字段以确保兼容性
            reservation_id: Date.now()
        };
        
        // 记录创建预约的详细信息用于调试
        console.log('创建预约时的用户信息:', user);
        console.log('创建的预约信息:', newReservation);
        
        // 保存到localStorage
        let reservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
        reservations.push(newReservation);
        localStorage.setItem('userReservations', JSON.stringify(reservations));
        
        return {
            success: true,
            message: '预约申请成功，请等待审批',
            data: newReservation
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi('/reservations', {
            method: 'POST',
            body: JSON.stringify(reservationData),
        });
        */
    },
    
    // 取消预约
    async cancelReservation(id) {
        // 模拟取消预约
        console.log(`使用模拟数据取消预约ID: ${id}`);
        
        // 尝试更新localStorage中的预约状态
        try {
            const localStorageReservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
            const updatedReservations = localStorageReservations.map(reservation => {
                if (reservation.id == id) {
                    return {
                        ...reservation,
                        status: '已取消'
                    };
                }
                return reservation;
            });
            
            // 检查是否有预约被更新
            const updatedReservation = updatedReservations.find(reservation => reservation.id == id && reservation.status === '已取消');
            if (updatedReservation) {
                // 保存更新后的预约列表
                localStorage.setItem('userReservations', JSON.stringify(updatedReservations));
                console.log(`已更新localStorage中预约ID ${id}的状态为已取消`);
                return {
                    success: true,
                    message: '预约已成功取消',
                    data: updatedReservation
                };
            }
        } catch (error) {
            console.error('更新localStorage中的预约状态时出错:', error);
        }
        
        // 如果localStorage中没有找到或更新失败，返回模拟数据
        return {
            success: true,
            message: '预约已成功取消',
            data: {
                id: id,
                status: '已取消'
            }
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi(`/reservations/${id}/cancel`, {
            method: 'PUT',
        });
        */
    },
    
    // 审批预约
    async approveReservation(id, status, comment) {
        // 模拟审批预约
        console.log(`使用模拟数据审批预约ID: ${id}, 状态: ${status}`);
        
        // 尝试更新localStorage中的预约状态
        try {
            const localStorageReservations = JSON.parse(localStorage.getItem('userReservations') || '[]');
            const updatedReservations = localStorageReservations.map(reservation => {
                if (reservation.id == id) {
                    return {
                        ...reservation,
                        status: status,
                        approval_comment: comment,
                        approved_by: '当前用户',
                        approval_at: new Date().toISOString()
                    };
                }
                return reservation;
            });
            
            // 检查是否有预约被更新
            const updatedReservation = updatedReservations.find(reservation => reservation.id == id && reservation.status === status);
            if (updatedReservation) {
                // 保存更新后的预约列表
                localStorage.setItem('userReservations', JSON.stringify(updatedReservations));
                console.log(`已更新localStorage中预约ID ${id}的状态为${status}`);
                return {
                    success: true,
                    message: status === '已批准' ? '预约已批准' : '预约已拒绝',
                    data: updatedReservation
                };
            }
        } catch (error) {
            console.error('更新localStorage中的预约状态时出错:', error);
        }
        
        // 如果localStorage中没有找到或更新失败，返回模拟数据
        return {
            success: true,
            message: status === '已批准' ? '预约已批准' : '预约已拒绝',
            data: {
                id: id,
                status: status,
                approval_comment: comment,
                approved_by: '当前用户',
                approval_at: new Date().toISOString()
            }
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi(`/reservations/${id}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ status, comment }),
        });
        */
    },
    
    // 检查时间冲突
    async checkConflict(reservationData) {
        // 模拟检查时间冲突
        console.log('使用模拟数据检查时间冲突');
        
        // 这里模拟一个逻辑：如果是周三的8:00-10:00，则认为有冲突
        const { reservation_date, start_time } = reservationData;
        const date = new Date(reservation_date);
        const isWednesday8to10 = date.getDay() === 3 && start_time >= '08:00' && start_time < '10:00';
        
        if (isWednesday8to10) {
            return {
                success: true,
                data: {
                    has_conflict: true,
                    message: '该时间段已被固定课程占用'
                }
            };
        }
        
        return {
            success: true,
            data: {
                has_conflict: false,
                message: '该时间段可用'
            }
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi('/reservations/check-conflict', {
            method: 'POST',
            body: JSON.stringify(reservationData),
        });
        */
    },
};

// 报表相关API
const reportApi = {
    // 获取实验室使用统计
    async getLabUsageStats(startDate, endDate) {
        // 模拟实验室使用统计数据
        console.log(`使用模拟数据返回实验室使用统计，日期范围: ${startDate} 至 ${endDate}`);
        const mockStats = [
            {
                lab_id: 1,
                lab_name: '计算机基础实验室',
                total_hours: 120,
                reservation_count: 35,
                usage_rate: 85.7,
                busiest_day: '周三',
                busiest_time: '10:00-12:00'
            },
            {
                lab_id: 2,
                lab_name: '网络实验室',
                total_hours: 85,
                reservation_count: 22,
                usage_rate: 68.0,
                busiest_day: '周四',
                busiest_time: '14:00-16:00'
            },
            {
                lab_id: 3,
                lab_name: '软件实验室',
                total_hours: 150,
                reservation_count: 42,
                usage_rate: 92.5,
                busiest_day: '周二',
                busiest_time: '13:00-17:00'
            },
            {
                lab_id: 4,
                lab_name: '嵌入式实验室',
                total_hours: 45,
                reservation_count: 15,
                usage_rate: 45.0,
                busiest_day: '周五',
                busiest_time: '09:00-11:00'
            }
        ];
        
        return {
            success: true,
            data: mockStats
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi(`/reports/lab-stats?start_date=${startDate}&end_date=${endDate}`);
        */
    },
    
    // 获取预约统计
    async getReservationStats(startDate, endDate) {
        // 模拟预约统计数据
        console.log(`使用模拟数据返回预约统计，日期范围: ${startDate} 至 ${endDate}`);
        const mockStats = {
            total_reservations: 114,
            approved_reservations: 95,
            rejected_reservations: 10,
            pending_reservations: 9,
            completed_reservations: 78,
            cancelled_reservations: 17,
            by_status: [
                { status: '已批准', count: 95, percentage: 83.3 },
                { status: '已拒绝', count: 10, percentage: 8.8 },
                { status: '待审批', count: 9, percentage: 7.9 }
            ],
            by_department: [
                { department: '计算机系', count: 68 },
                { department: '电子系', count: 24 },
                { department: '通信系', count: 15 },
                { department: '自动化系', count: 7 }
            ],
            monthly_trend: [
                { month: '1月', count: 8 },
                { month: '2月', count: 5 },
                { month: '3月', count: 12 },
                { month: '4月', count: 10 },
                { month: '5月', count: 15 },
                { month: '6月', count: 8 },
                { month: '7月', count: 3 },
                { month: '8月', count: 2 },
                { month: '9月', count: 14 },
                { month: '10月', count: 16 },
                { month: '11月', count: 10 },
                { month: '12月', count: 11 }
            ]
        };
        
        return {
            success: true,
            data: mockStats
        };
        
        // 原始API调用，已注释
        /*
        return await fetchApi(`/reports/reservation-stats?start_date=${startDate}&end_date=${endDate}`);
        */
    },
};

// 导出API对象
const api = {
    auth: authApi,
    lab: labApi,
    device: deviceApi,
    reservation: reservationApi,
    report: reportApi,
    // 导出通用函数供直接使用
    fetch: fetchApi,
    // 导出token管理函数
    getToken,
    saveToken,
    removeToken,
};

// 暴露到全局
window.api = api;