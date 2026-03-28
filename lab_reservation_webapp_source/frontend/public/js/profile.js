// 个人信息页面的JavaScript

// 强制根据角色隐藏或显示菜单
function forceUpdateMenuByRole(role) {
    console.log('forceUpdateMenuByRole called with role:', role);
    
    // 定义需要根据角色控制的菜单
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
    
    console.log('Normalized role:', normalizedRole);
    
    // 先隐藏所有受限制的菜单
    const allRestrictedMenus = [...adminOnlyMenus, ...adminTeacherMenus];
    allRestrictedMenus.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log('Hiding menu:', id);
            element.style.display = 'none';
        } else {
            console.log('Menu element not found:', id);
        }
    });
    
    // 然后根据角色显示相应的菜单
    if (normalizedRole === '管理员') {
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
        console.log('User is teacher, showing teacher menus');
        adminTeacherMenus.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log('Showing teacher menu:', id);
                element.style.display = 'block';
            }
        });
    } else {
        console.log('User is student, hiding all restricted menus');
    }
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired for profile page');
    
    // 初始化认证和菜单
    auth.initAuth(async (user) => {
        console.log('initAuth callback received user:', user);
        
        // 强制更新菜单
        forceUpdateMenuByRole(user.role);
        
        // 确保退出登录按钮正确工作
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            console.log('Binding logout event directly to logout-btn');
            // 移除所有可能的事件监听器
            logoutBtn.onclick = null;
            // 直接绑定退出登录函数
            logoutBtn.onclick = async () => {
                console.log('Logout button clicked directly');
                await auth.logout();
            };
        }
        // 加载用户个人信息
        await loadUserProfile();
        
        // 绑定编辑按钮事件
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', openEditProfileModal);
        }
        
        // 绑定表单提交事件
        const editForm = document.getElementById('edit-profile-form');
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleSaveProfile();
            });
        }
        
        const passwordForm = document.getElementById('change-password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleChangePassword();
            });
        }
        
        // 绑定模态框关闭事件
        document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
            btn.addEventListener('click', closeEditProfileModal);
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('edit-profile-modal');
            if (e && e.target === modal) {
                closeEditProfileModal();
            }
        });
    });
});

// 使用auth.js中声明的全局currentUser变量

// 加载用户个人信息
async function loadUserProfile() {
    try {
        // 获取当前用户信息
        currentUser = await auth.getCurrentUser();
        
        // 显示用户详细信息
        document.getElementById('profile-username').textContent = currentUser.username;
        document.getElementById('profile-role').textContent = getRoleText(currentUser.role);
        document.getElementById('profile-name').textContent = currentUser.name || '未设置';
        document.getElementById('profile-email').textContent = currentUser.email || '未设置';
        document.getElementById('profile-phone').textContent = currentUser.phone || '未设置';
        document.getElementById('profile-department').textContent = currentUser.department || '未设置';
        document.getElementById('profile-created-at').textContent = currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString() : '--';

    } catch (error) {
        console.error('加载个人信息失败:', error);
        alert('加载个人信息失败，请刷新页面重试');
    }
}

// 打开编辑个人信息模态框
function openEditProfileModal() {
    if (currentUser) {
        // 填充表单
        document.getElementById('edit-name').value = currentUser.name || '';
        document.getElementById('edit-email').value = currentUser.email || '';
        document.getElementById('edit-phone').value = currentUser.phone || '';
        document.getElementById('edit-department').value = currentUser.department || '';
        
        // 清空错误信息
        document.getElementById('profile-edit-error').textContent = '';
        
        // 显示模态框
        document.getElementById('edit-profile-modal').style.display = 'block';
    }
}

// 关闭编辑个人信息模态框
function closeEditProfileModal() {
    // 隐藏模态框
    document.getElementById('edit-profile-modal').style.display = 'none';
}

// 保存个人信息
async function handleSaveProfile() {
    try {
        // 验证表单
        const name = document.getElementById('edit-name').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const phone = document.getElementById('edit-phone').value.trim();
        const department = document.getElementById('edit-department').value.trim();

        if (!name) {
            document.getElementById('profile-edit-error').textContent = '请输入姓名';
            return;
        }

        if (!email) {
            document.getElementById('profile-edit-error').textContent = '请输入邮箱';
            return;
        }

        // 更新用户信息 - 暂时使用模拟实现
        console.log('更新个人信息:', {
            name,
            email,
            phone,
            department
        });
        
        // 更新当前用户信息
        currentUser.name = name;
        currentUser.email = email;
        currentUser.phone = phone;
        currentUser.department = department;
        
        // 刷新显示
        await loadUserProfile();
        
        // 关闭模态框
        document.getElementById('edit-profile-modal').style.display = 'none';
        
        alert('个人信息已更新');

    } catch (error) {
        console.error('更新个人信息失败:', error);
        document.getElementById('profile-edit-error').textContent = '更新失败，请重试';
    }
}

// 修改密码
async function handleChangePassword() {
    try {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // 清空错误信息
        document.getElementById('password-error').textContent = '';

        // 验证密码
        if (!currentPassword || !newPassword || !confirmPassword) {
            document.getElementById('password-error').textContent = '请填写所有密码字段';
            return;
        }

        if (newPassword !== confirmPassword) {
            document.getElementById('password-error').textContent = '两次输入的新密码不一致';
            return;
        }

        if (newPassword.length < 6) {
            document.getElementById('password-error').textContent = '新密码长度至少为6位';
            return;
        }

        // 调用API修改密码 - 暂时使用模拟实现
        console.log('修改密码:', currentPassword, newPassword);
        
        // 清空表单
        document.getElementById('change-password-form').reset();
        
        alert('密码修改成功，请重新登录');
        
        // 退出登录并跳转到登录页
        auth.logout();

    } catch (error) {
        console.error('修改密码失败:', error);
        
        // 检查错误类型
        if (error.message && error.message.includes('密码错误')) {
            document.getElementById('password-error').textContent = '当前密码错误';
        } else {
            document.getElementById('password-error').textContent = '修改密码失败，请重试';
        }
    }
}

// 获取角色文本
function getRoleText(role) {
    switch (role) {
        case 'admin':
            return '管理员';
        case 'teacher':
            return '教师';
        case 'student':
            return '学生';
        default:
            return role;
    }
}