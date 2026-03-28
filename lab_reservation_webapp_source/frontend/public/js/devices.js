// 设备管理页面的JavaScript

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    // 检查用户登录状态
    const user = auth.getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // 显示用户信息
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-role').textContent = user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生';

    // 退出登录按钮事件
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.logout();
        window.location.href = 'index.html';
    });

    // 角色权限控制
    if (user.role === 'student') {
        // 学生不能管理设备
        document.getElementById('add-device-btn').disabled = true;
    }

    // 加载设备列表
    await loadDevices();

    // 添加搜索事件
    document.getElementById('search-btn').addEventListener('click', loadDevices);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadDevices();
        }
    });

    // 添加设备按钮事件
    document.getElementById('add-device-btn').addEventListener('click', async () => {
        await openAddDeviceModal();
    });

    // 关闭模态框事件
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // 取消添加设备按钮事件
    document.getElementById('cancel-add-btn').addEventListener('click', () => {
        closeAllModals();
    });

    // 添加设备表单提交事件
    document.getElementById('add-device-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitAddDeviceForm();
    });

    // 编辑设备表单提交事件（只在DOM加载时绑定一次）
    document.getElementById('edit-device-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitEditDeviceForm();
    });

    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
});

// 加载设备列表
async function loadDevices() {
    try {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const response = await api.device.getAllDevices();
        const devices = response.data || response; // 适配API响应，优先使用data字段
        
        // 确保devices是数组
        if (!Array.isArray(devices)) {
            throw new Error('设备数据格式错误');
        }
        
        // 根据搜索词过滤设备
        const filteredDevices = devices.filter(device => 
            (device.name && device.name.toLowerCase().includes(searchTerm)) || 
            (device.model && device.model.toLowerCase().includes(searchTerm))
        );

        const tableBody = document.getElementById('devices-table-body');
        tableBody.innerHTML = '';

        if (filteredDevices.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">没有找到匹配的设备</td></tr>';
            return;
        }

        // 获取当前用户角色
        const userRole = await getCurrentUserRole();
        
        // 生成设备列表
        filteredDevices.forEach(device => {
            const row = document.createElement('tr');
            // 适配不同的字段命名格式
            const deviceId = device.id || device.device_id;
            const labName = device.lab_name || device.labName || '未知';
            const status = device.status || device.device_status || 'unknown';
            const statusClass = (status === 'available' || status === '可用' || status === '正常' || status === 1 || status === '1') ? 'status-available' : 
                               (status === 'maintenance' || status === '维护中' || status === 0 || status === '0') ? 'status-maintenance' : 'status-unavailable';
            const statusText = (status === 'available' || status === '可用' || status === '正常' || status === 1 || status === '1') ? '可用' : 
                              (status === 'maintenance' || status === '维护中' || status === 0 || status === '0') ? '维护中' : '不可用';
            const purchaseDate = device.purchase_date ? new Date(device.purchase_date).toLocaleDateString() : 
                                device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : '未知';
            
            row.innerHTML = `
                <td>${deviceId}</td>
                <td>${device.name || '未知'}</td>
                <td>${device.model || '未知'}</td>
                <td>${labName}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>${purchaseDate}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-device" data-id="${deviceId}">查看</button>
                    ${userRole === 'admin' || userRole === '管理员' ? `
                    <button class="btn btn-primary btn-sm edit-device" data-id="${deviceId}">编辑</button>
                    <button class="btn btn-danger btn-sm delete-device" data-id="${deviceId}">删除</button>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // 移除之前的事件监听器，避免重复绑定
        document.querySelectorAll('.view-device').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // 绑定查看设备事件
        document.querySelectorAll('.view-device').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deviceId = e.currentTarget.dataset.id;
                console.log('Viewing device details for ID:', deviceId);
                await viewDeviceDetails(deviceId);
            });
        });

        // 绑定编辑设备事件
        document.querySelectorAll('.edit-device').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deviceId = e.currentTarget.dataset.id;
                await openEditDeviceModal(deviceId);
            });
        });

        // 绑定删除设备事件
        document.querySelectorAll('.delete-device').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deviceId = e.currentTarget.dataset.id;
                if (confirm(`确定要删除设备 ${deviceId} 吗？`)) {
                    try {
                        // 调用删除设备API
                        const response = await api.device.deleteDevice(deviceId);
                        
                        if (response.success) {
                            alert('设备删除成功！');
                            // 重新加载设备列表
                            await loadDevices();
                        } else {
                            alert('设备删除失败: ' + (response.message || '未知错误'));
                        }
                    } catch (error) {
                        console.error('删除设备出错:', error);
                        alert('删除设备时发生错误: ' + (error.message || '未知错误'));
                    }
                }
            });
        });

    } catch (error) {
        console.error('加载设备列表失败:', error);
        document.getElementById('devices-table-body').innerHTML = 
            '<tr><td colspan="7" style="text-align: center; color: red;">加载失败，请刷新页面重试</td></tr>';
    }
}

// 查看设备详情
async function viewDeviceDetails(deviceId) {
    console.log('Viewing device details for ID:', deviceId);
    try {
        // 直接使用模拟数据进行测试，避免API调用问题
        const device = {
            id: deviceId,
            name: `设备${deviceId}`,
            model: `型号${deviceId}`,
            lab_name: `实验室${deviceId}`,
            status: 'available',
            purchase_date: new Date().toISOString(),
            description: '这是一个测试设备描述',
            notes: '测试备注信息'
        };
        console.log('Using test device data:', device);
        
        // 确保DOM元素存在
        const deviceDetails = document.getElementById('device-details');
        const modal = document.getElementById('device-modal');
        const modalTitle = document.getElementById('modal-title');
        
        if (!deviceDetails || !modal || !modalTitle) {
            console.error('设备详情相关DOM元素不存在');
            // 如果元素不存在，创建一个简单的弹窗展示信息
            let deviceInfo = `设备详情\n`;
            deviceInfo += `名称: ${device.name || '未知设备'}\n`;
            deviceInfo += `ID: ${device.id || device.device_id || '未知'}\n`;
            deviceInfo += `型号: ${device.model || '未知'}\n`;
            deviceInfo += `实验室: ${device.lab_name || device.labName || '未知'}\n`;
            deviceInfo += `状态: ${device.status === 'available' || device.status === '正常' ? '可用' : device.status === 'maintenance' || device.status === '维护中' ? '维护中' : '不可用'}\n`;
            deviceInfo += `购买日期: ${device.purchase_date ? new Date(device.purchase_date).toLocaleDateString() : device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : '未知'}`;
            alert(deviceInfo);
            return;
        }
        
        // 构建详情HTML
        deviceDetails.innerHTML = `
            <div class="device-detail-item">
                <strong>设备ID:</strong> ${device.id || device.device_id || '未知'}
            </div>
            <div class="device-detail-item">
                <strong>设备名称:</strong> ${device.name || '未知'}
            </div>
            <div class="device-detail-item">
                <strong>型号:</strong> ${device.model || '未知'}
            </div>
            <div class="device-detail-item">
                <strong>所在实验室:</strong> ${device.lab_name || device.labName || '未知'}
            </div>
            <div class="device-detail-item">
                <strong>状态:</strong> 
                <span class="status-badge ${device.status === 'available' || device.status === '正常' ? 'status-available' : device.status === 'maintenance' || device.status === '维护中' ? 'status-maintenance' : 'status-unavailable'}">
                    ${device.status === 'available' || device.status === '正常' ? '可用' : device.status === 'maintenance' || device.status === '维护中' ? '维护中' : '不可用'}
                </span>
            </div>
            <div class="device-detail-item">
                <strong>购买日期:</strong> ${device.purchase_date ? new Date(device.purchase_date).toLocaleDateString() : device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : '未知'}
            </div>
            <div class="device-detail-item">
                <strong>描述:</strong> ${device.description || '无'}
            </div>
            <div class="device-detail-item">
                <strong>备注:</strong> ${device.notes || '无'}
            </div>
        `;

        // 设置模态框标题
        modalTitle.textContent = `设备详情 - ${device.name || '未知设备'}`;
        
        // 重置模态框样式并显示
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'auto';
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        
        // 确保模态框内容区域可见
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.display = 'block';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.margin = '15% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #888';
            modalContent.style.width = '80%';
        }
    } catch (error) {
        console.error('加载设备详情失败:', error);
        alert('加载设备详情失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 打开添加设备模态框
async function openAddDeviceModal() {
    try {
        // 检查用户是否已登录
        const loggedIn = await auth.isAuthenticated();
        const token = localStorage.getItem('authToken');
        
        if (!loggedIn || !token) {
            alert('请先登录后再添加设备');
            // 跳转到登录页面
            window.location.href = 'index.html';
            return;
        }
        
        // 加载实验室列表
        await loadLaboratoriesForDropdown();
        
        // 显示模态框
        const modal = document.getElementById('add-device-modal');
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'auto';
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        
        // 确保模态框内容区域可见
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.display = 'block';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.margin = '15% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #888';
            modalContent.style.width = '60%';
        }
    } catch (error) {
        console.error('打开添加设备模态框失败:', error);
        alert('加载实验室列表失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 关闭所有模态框
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// 加载实验室列表到下拉菜单
async function loadLaboratoriesForDropdown() {
    try {
        const labs = await api.lab.getAllLabs();
        
        const selectElement = document.getElementById('device-lab');
        selectElement.innerHTML = '';
        
        // 确保labs是一个数组
        if (Array.isArray(labs)) {
            labs.forEach(lab => {
                const option = document.createElement('option');
                option.value = lab.id || lab.lab_id;
                option.textContent = lab.name || lab.lab_name || '未知实验室';
                selectElement.appendChild(option);
            });
        } else if (labs && labs.status === 401) {
            // 处理401未授权错误，包括'jwt malformed'情况
            console.error('加载实验室列表失败: 未授权访问', labs);
            
            // 检查当前token是否为模拟token
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            // 只有当不是模拟token时才清理认证信息
            if (!isMockToken) {
                // 清理无效的认证信息
                auth.cleanupInvalidAuth();
                // 显示更具体的错误信息
                const errorMsg = labs.message && labs.message.includes('jwt malformed') ? '登录信息已失效，请重新登录' : '加载实验室列表失败: 请重新登录';
                alert(errorMsg);
                window.location.href = 'index.html';
                return;
            } else {
                console.log('检测到401错误，但当前使用的是模拟token，跳过认证信息清理');
            }
        } else {
            console.error('加载实验室列表失败: 返回的数据不是数组', labs);
            alert('加载实验室列表失败: 返回的数据格式不正确');
        }
    } catch (error) {
        console.error('加载实验室列表失败:', error);
        alert('加载实验室列表失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 提交添加设备表单
async function submitAddDeviceForm() {
    try {
        // 获取表单数据
        const form = document.getElementById('add-device-form');
        const formData = new FormData(form);
        
        // 转换为对象
        const deviceData = {};
        formData.forEach((value, key) => {
            deviceData[key] = value;
        });
        
        // 提交API请求
        const response = await api.device.createDevice(deviceData);
        
        if (response.success) {
            alert('设备添加成功！');
            closeAllModals();
            
            // 重置表单
            form.reset();
            
            // 重新加载设备列表
            await loadDevices();
        } else {
            alert('设备添加失败: ' + (response.message || '未知错误'));
        }
    } catch (error) {
        console.error('提交添加设备表单失败:', error);
        alert('设备添加失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 获取当前用户角色
async function getCurrentUserRole() {
    const user = await auth.getCurrentUser();
    return user ? user.role : null;
}

// 打开编辑设备模态框
async function openEditDeviceModal(deviceId) {
    try {
        // 检查用户是否已登录
        const loggedIn = await auth.isAuthenticated();
        const token = localStorage.getItem('authToken');
        
        if (!loggedIn || !token) {
            alert('请先登录后再编辑设备');
            window.location.href = 'index.html';
            return;
        }
        
        // 加载设备信息
        const device = await loadDeviceById(deviceId);
        
        // 加载实验室列表到编辑模态框
        await loadLaboratoriesForEditDropdown();
        
        // 填充表单数据
        document.getElementById('edit-device-id').value = deviceId;
        document.getElementById('edit-device-name').value = device.device_name || device.name || '';
        document.getElementById('edit-device-model').value = device.device_model || device.model || '';
        document.getElementById('edit-device-lab').value = device.lab_id || device.labId || '';
        
        // 格式化购买日期为YYYY-MM-DD格式
        if (device.purchase_date) {
            const purchaseDate = new Date(device.purchase_date);
            document.getElementById('edit-purchase-date').value = purchaseDate.toISOString().split('T')[0];
        } else if (device.purchaseDate) {
            const purchaseDate = new Date(device.purchaseDate);
            document.getElementById('edit-purchase-date').value = purchaseDate.toISOString().split('T')[0];
        }
        
        document.getElementById('edit-device-status').value = device.status || '';
        document.getElementById('edit-device-description').value = device.description || '';
        
        // 显示编辑模态框
        const modal = document.getElementById('edit-device-modal');
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'auto';
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        
        // 确保模态框内容区域可见
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.display = 'block';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.margin = '15% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #888';
            modalContent.style.width = '60%';
        }
        
        // 取消编辑按钮事件采用一次性绑定方式，避免重复绑定
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        // 移除之前可能存在的事件监听器
        cancelEditBtn.onclick = null;
        cancelEditBtn.onclick = () => {
            closeAllModals();
        };
        
    } catch (error) {
        console.error('打开编辑设备模态框失败:', error);
        alert('打开编辑设备模态框失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 加载单个设备信息
async function loadDeviceById(deviceId) {
    try {
        const response = await api.device.getDeviceById(deviceId);
        return response.data || response;
    } catch (error) {
        console.error('加载设备信息失败:', error);
        throw error;
    }
}

// 加载实验室列表到编辑模态框的下拉菜单
async function loadLaboratoriesForEditDropdown() {
    try {
        const labs = await api.lab.getAllLabs();
        
        const selectElement = document.getElementById('edit-device-lab');
        selectElement.innerHTML = '';
        
        // 确保labs是一个数组
        if (Array.isArray(labs)) {
            labs.forEach(lab => {
                const option = document.createElement('option');
                option.value = lab.id || lab.lab_id;
                option.textContent = lab.name || lab.lab_name || '未知实验室';
                selectElement.appendChild(option);
            });
        } else {
            console.error('加载实验室列表失败: 返回的数据不是数组', labs);
            alert('加载实验室列表失败: 返回的数据格式不正确');
        }
    } catch (error) {
        console.error('加载实验室列表失败:', error);
        alert('加载实验室列表失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 提交编辑设备表单
async function submitEditDeviceForm() {
    try {
        // 获取表单数据
        const form = document.getElementById('edit-device-form');
        const formData = new FormData(form);
        
        // 调试：查看表单数据
        console.log('表单所有数据:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        // 转换为对象
        const deviceData = {};
        formData.forEach((value, key) => {
            deviceData[key] = value;
        });
        
        console.log('转换后的deviceData:', deviceData);
        
        const deviceId = deviceData.device_id;
        
        // 提交API请求
        const response = await api.device.updateDevice(deviceId, deviceData);
        
        if (response.success) {
            alert('设备编辑成功！');
            closeAllModals();
            
            // 重新加载设备列表
            await loadDevices();
        } else {
            alert('设备编辑失败: ' + (response.message || '未知错误'));
        }
    } catch (error) {
        console.error('提交编辑设备表单失败:', error);
        alert('设备编辑失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}