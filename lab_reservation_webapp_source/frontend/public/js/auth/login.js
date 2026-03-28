// 登录页面逻辑
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');

// 登录表单提交处理
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 获取表单数据
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // 清除之前的错误信息
    errorMessage.textContent = '';
    
    console.log('登录表单提交，用户名:', username, '密码:', password);
    
    try {
        // 调用登录API
        const response = await api.auth.login(username, password);
        
        console.log('登录API响应:', response);
        
        if (response.success) {
            console.log('登录成功，检查令牌保存情况:', {
                authToken: localStorage.getItem('authToken'),
                userInfo: localStorage.getItem('userInfo'),
                lastActivity: localStorage.getItem('lastActivity')
            });
            console.log('登录成功，准备重定向到dashboard.html');
            // 登录成功后重定向到主页面
            window.location.href = 'dashboard.html';
        } else {
            console.log('登录失败，显示错误信息');
            // 显示错误信息
            errorMessage.textContent = response.message || '登录失败，请检查用户名和密码';
        }
    } catch (error) {
        console.error('登录过程发生异常:', error);
        // 处理网络错误或服务器错误
        errorMessage.textContent = error.message || '登录失败，请稍后重试';
    }
});

// 自动检查登录状态
async function checkLoginStatus() {
    try {
        // 尝试获取当前用户信息
        const response = await api.auth.getCurrentUser();
        
        if (response.success) {
            // 已登录则跳转到主页面
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        // 未登录，继续显示登录页面
        console.log('未登录状态');
    }
}

// 页面加载时检查登录状态
window.addEventListener('DOMContentLoaded', checkLoginStatus);