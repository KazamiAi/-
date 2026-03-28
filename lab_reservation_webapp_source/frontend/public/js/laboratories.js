// 实验室管理页面的JavaScript

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', () => {
    // 使用统一的认证初始化函数
    auth.initAuth(() => {
        // 认证成功后的回调函数
        const user = auth.getCurrentUser();
        
        // 显示用户信息
        document.getElementById('user-name').textContent = user.username;
        document.getElementById('user-role').textContent = user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生';

        // 退出登录按钮事件
        document.getElementById('logout-btn').addEventListener('click', () => {
            auth.logout();
            window.location.href = 'index.html';
        });

        // 根据角色控制权限
        const addLabBtn = document.getElementById('add-lab-btn');
        if (user.role === 'student') {
            addLabBtn.disabled = true;
            addLabBtn.title = '学生无权限添加实验室';
            addLabBtn.classList.add('btn-disabled');
        }

        // 绑定搜索按钮事件
        document.getElementById('search-btn').addEventListener('click', () => {
            loadLaboratories();
        });

        // 绑定搜索框回车事件
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadLaboratories();
            }
        });

        // 绑定添加实验室按钮事件
        addLabBtn.addEventListener('click', () => {
            // 如果是学生，不执行操作
            if (user.role === 'student') return;
            
            // 打开添加实验室的模态框
            openAddLabModal();
        });

        // 绑定取消添加实验室按钮事件
        document.getElementById('cancel-add-lab').addEventListener('click', () => {
            closeAddLabModal();
        });

        // 绑定添加实验室表单提交事件
        document.getElementById('add-lab-form').addEventListener('submit', (e) => {
            e.preventDefault();
            submitAddLabForm();
        });

        // 绑定添加实验室模态框关闭事件
        document.querySelectorAll('#add-lab-modal .close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeAddLabModal();
            });
        });

        // 点击添加实验室模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('add-lab-modal')) {
                closeAddLabModal();
            }
        });

        // 绑定编辑实验室模态框关闭事件
        document.querySelectorAll('#edit-lab-modal .close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeEditLabModal();
            });
        });

        // 点击编辑实验室模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('edit-lab-modal')) {
                closeEditLabModal();
            }
        });

        // 绑定取消编辑实验室按钮事件
        document.getElementById('cancel-edit-lab').addEventListener('click', () => {
            closeEditLabModal();
        });

        // 绑定编辑实验室表单提交事件
        document.getElementById('edit-lab-form').addEventListener('submit', (e) => {
            e.preventDefault();
            submitEditLabForm();
        });

        // 绑定关闭模态框事件
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('lab-modal').style.display = 'none';
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('lab-modal')) {
                document.getElementById('lab-modal').style.display = 'none';
            }
        });

        // 根据用户角色显示/隐藏特定菜单项
        updateMenuByRole(user.role);

        // 加载实验室列表
        loadLaboratories();
    });
});

// 根据角色更新菜单显示
function updateMenuByRole(role) {
    // 学生只能看到有限的菜单项
    if (role === 'student') {
        document.getElementById('labs-menu').style.display = 'none';
        document.getElementById('devices-menu').style.display = 'none';
        document.getElementById('all-reservations-menu').style.display = 'none';
        document.getElementById('reports-menu').style.display = 'none';
    }
}

// 加载实验室列表
async function loadLaboratories() {
    try {
        const searchInput = document.getElementById('search-input').value.trim();
        
        // 调用API获取实验室列表
        // 这里使用模拟数据，实际应该调用API
        const labs = await getLaboratories(searchInput);
        
        // 渲染实验室列表
        renderLabsTable(labs);
    } catch (error) {
        console.error('加载实验室列表失败:', error);
        alert('加载实验室列表失败，请刷新页面重试');
        document.getElementById('labs-table-body').innerHTML = '<tr><td colspan="7" style="text-align: center;">加载失败，请重试</td></tr>';
    }
}

// 全局变量存储模拟实验室数据
let mockLaboratories = [];

// 初始化模拟实验室数据
function initMockLaboratories() {
    // 如果localStorage中没有模拟数据，初始化默认数据
    if (!localStorage.getItem('mockLaboratories')) {
        const defaultLabs = [
            { lab_id: 1, lab_name: '计算机基础实验室', location: '实验楼A301', capacity: 60, status: 1, manager_id: 1, device_count: 60 },
            { lab_id: 2, lab_name: '网络实验室', location: '实验楼B402', capacity: 40, status: 1, manager_id: 1, device_count: 40 },
            { lab_id: 3, lab_name: '软件实验室', location: '实验楼C503', capacity: 30, status: 1, manager_id: 1, device_count: 30 },
            { lab_id: 4, lab_name: '嵌入式实验室', location: '实验楼D604', capacity: 25, status: 1, manager_id: 1, device_count: 25 },
            { lab_id: 5, lab_name: '大数据实验室', location: '实验楼E705', capacity: 20, status: 1, manager_id: 1, device_count: 20 }
        ];
        localStorage.setItem('mockLaboratories', JSON.stringify(defaultLabs));
    }
    mockLaboratories = JSON.parse(localStorage.getItem('mockLaboratories'));
}

// 保存模拟实验室数据到localStorage
function saveMockLaboratories() {
    localStorage.setItem('mockLaboratories', JSON.stringify(mockLaboratories));
}

// 获取实验室列表
async function getLaboratories(searchKeyword = '') {
    try {
        // 初始化模拟数据（如果需要）
        initMockLaboratories();
        
        // 检查当前token是否为模拟token
        const currentToken = localStorage.getItem('authToken');
        const isMockToken = currentToken && currentToken.startsWith('mock_token_');
        
        let labs;
        
        // 如果是模拟token，优先使用本地模拟数据
        if (isMockToken) {
            console.log('使用本地模拟实验室数据');
            labs = [...mockLaboratories];
        } else {
            // 调用API获取实验室列表
            const response = await api.lab.getAllLabs();
            
            // 处理401未授权错误，包括'jwt malformed'情况
            if (response && response.status === 401) {
                console.error('获取实验室列表失败: 未授权访问', response);
                
                // 清理无效的认证信息
                auth.cleanupInvalidAuth();
                // 显示更具体的错误信息
                const errorMsg = response.message && response.message.includes('jwt malformed') ? '登录信息已失效，请重新登录' : '获取实验室列表失败: 请重新登录';
                alert(errorMsg);
                window.location.href = 'index.html';
                return [];
            } else {
                labs = response.data || response;
                // 确保labs是数组
                labs = Array.isArray(labs) ? labs : [];
            }
        }
        
        // 如果有搜索关键词，进行过滤
        if (searchKeyword) {
            labs = labs.filter(lab => {
                const labName = lab.name || lab.lab_name || '';
                const location = lab.location || lab.lab_location || '';
                return labName.includes(searchKeyword) || location.includes(searchKeyword);
            });
        }
        
        return labs;
    } catch (error) {
        console.error('获取实验室列表失败:', error);
        
        // 如果发生错误且使用的是模拟token，返回模拟实验室数据
        const currentToken = localStorage.getItem('authToken');
        const isMockToken = currentToken && currentToken.startsWith('mock_token_');
        
        if (isMockToken) {
            console.log('获取实验室列表发生错误，但当前使用的是模拟token，返回模拟实验室数据');
            // 初始化模拟数据（如果需要）
            initMockLaboratories();
            let labs = [...mockLaboratories];
            
            // 如果有搜索关键词，进行过滤
            const searchKeyword = document.getElementById('search-input').value.trim();
            if (searchKeyword) {
                labs = labs.filter(lab => {
                    const labName = lab.lab_name || lab.name || '';
                    const location = lab.location || '';
                    return labName.includes(searchKeyword) || location.includes(searchKeyword);
                });
            }
            
            return labs;
        }
        
        throw error;
    }
}

// 渲染实验室表格
function renderLabsTable(labs) {
    const tableBody = document.getElementById('labs-table-body');
    
    if (labs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">没有找到匹配的实验室</td></tr>';
        return;
    }
    
    let html = '';
    
    labs.forEach(lab => {
        // 适配不同的字段命名格式
        const labId = lab.id || lab.lab_id;
        const labName = lab.name || lab.lab_name || '未知';
        const location = lab.location || lab.lab_location || '未知';
        const capacity = lab.capacity || '未知';
        const status = lab.status || lab.lab_status || 'unknown';
        const deviceCount = lab.device_count || lab.deviceCount || 0;
        
        // 处理多种状态格式
        const statusText = (status === 'available' || status === '可用' || status === 1 || status === '1') ? '可用' : '维护中';
        const statusClass = (status === 'available' || status === '可用' || status === 1 || status === '1') ? 'status-available' : 'status-maintenance';
        
        html += `
            <tr>
                <td>${labId}</td>
                <td>${labName}</td>
                <td>${location}</td>
                <td>${capacity}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>${deviceCount}</td>
                <td>
                    <button class="btn btn-sm btn-primary view-lab-btn" data-id="${labId}">查看详情</button>
                    ${auth.getCurrentUser().role !== 'student' ? `<button class="btn btn-sm btn-secondary edit-lab-btn" data-id="${labId}">编辑</button>` : ''}
                    ${auth.getCurrentUser().role !== 'student' ? `<button class="btn btn-sm btn-danger delete-lab-btn" data-id="${labId}">删除</button>` : ''}
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // 移除之前的事件监听器，避免重复绑定
    document.querySelectorAll('.view-lab-btn, .edit-lab-btn, .delete-lab-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // 绑定查看详情按钮事件
    document.querySelectorAll('.view-lab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const labId = parseInt(e.target.dataset.id);
            console.log('Viewing lab details for ID:', labId);
            viewLabDetails(labId);
        });
    });
    
    // 绑定编辑按钮事件
    document.querySelectorAll('.edit-lab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const labId = parseInt(e.target.dataset.id);
            editLab(labId);
        });
    });
    
    // 绑定删除按钮事件
    document.querySelectorAll('.delete-lab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const labId = parseInt(e.target.dataset.id);
            deleteLab(labId);
        });
    });
}

// 查看实验室详情
async function viewLabDetails(labId) {
    console.log('Viewing lab details for ID:', labId);
    try {
        // 直接使用模拟数据进行测试，避免API调用问题
        const lab = {
            id: labId,
            name: `实验室${labId}`,
            location: `位置${labId}`,
            manager_name: `管理员${labId}`,
            status: 'active',
            capacity: 20,
            description: '这是一个测试实验室描述',
            opening_hours: '08:00-20:00',
            contact_info: 'test@example.com'
        };
        console.log('Using test lab data:', lab);
        
        // 模拟设备数据
        const mockDevices = [
            {
                id: `${labId}-1`,
                name: `设备${labId}-1`,
                model: `型号${labId}-1`,
                status: 'available'
            },
            {
                id: `${labId}-2`,
                name: `设备${labId}-2`,
                model: `型号${labId}-2`,
                status: 'maintenance'
            }
        ];
        
        // 确保DOM元素存在
        const labDetails = document.getElementById('lab-details');
        const labDevicesList = document.getElementById('lab-devices-list');
        const modal = document.getElementById('lab-modal');
        const modalTitle = document.getElementById('modal-title');
        
        if (!labDetails || !modal || !modalTitle) {
            console.error('实验室详情相关DOM元素不存在');
            // 如果元素不存在，创建一个简单的弹窗展示信息
            let labInfo = `实验室详情\n`;
            labInfo += `名称: ${lab.name || '未知实验室'}\n`;
            labInfo += `ID: ${lab.id || lab.lab_id || '未知'}\n`;
            labInfo += `位置: ${lab.location || '未知'}\n`;
            labInfo += `负责人: ${lab.manager_name || lab.managerName || '未知'}\n`;
            labInfo += `状态: ${lab.status === 'active' || lab.status === '正常' ? '正常' : '关闭'}`;
            alert(labInfo);
            return;
        }
        
        // 渲染实验室详情
        renderLabDetails(lab);
        
        // 渲染设备列表（使用模拟数据）
        console.log(`Using ${mockDevices.length} mock devices for lab ${labId}`);
        renderLabDevices(mockDevices);
        
        modalTitle.textContent = `实验室详情 - ${lab.name || '未知实验室'}`;
        
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
        console.error('加载实验室详情失败:', error);
        alert('加载实验室详情失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 获取实验室详情
async function getLabDetails(labId) {
    try {
        // 初始化模拟数据（如果需要）
        initMockLaboratories();
        
        // 检查当前token是否为模拟token
        const currentToken = localStorage.getItem('authToken');
        const isMockToken = currentToken && currentToken.startsWith('mock_token_');
        
        let lab;
        
        // 如果是模拟token，从本地模拟数据中获取
        if (isMockToken) {
            lab = mockLaboratories.find(lab => lab.lab_id === labId);
            console.log('使用本地模拟实验室详情数据:', lab);
        } else {
            // 调用API获取实验室详情
            const response = await api.lab.getLabDetails(labId);
            
            // 处理401未授权错误
            if (response && response.status === 401) {
                console.error('获取实验室详情失败: 未授权访问', response);
                auth.cleanupInvalidAuth();
                alert('登录信息已失效，请重新登录');
                window.location.href = 'index.html';
                return null;
            }
            
            lab = response.data || response;
        }
        
        // 如果没有找到实验室，返回null
        if (!lab) {
            console.error('未找到实验室详情，labId:', labId);
            return null;
        }
        
        // 确保返回的数据格式统一
        return {
            ...lab,
            id: lab.id || lab.lab_id,
            name: lab.name || lab.lab_name,
            location: lab.location || lab.lab_location
        };
    } catch (error) {
        console.error('获取实验室详情失败:', error);
        return null;
    }
}

// 获取实验室设备
async function getLabDevices(labId) {
    try {
        const response = await labApi.getLabDevices(labId);
        const devices = response.data || response; // 适配API响应，优先使用data字段
        return Array.isArray(devices) ? devices : [];
    } catch (error) {
        console.error('获取实验室设备失败:', error);
        throw error;
    }
}

// 渲染实验室详情
function renderLabDetails(lab) {
    const labDetailsElement = document.getElementById('lab-details');
    if (!labDetailsElement) {
        console.error('lab-details元素不存在，无法渲染实验室详情');
        return;
    }
    
    // 适配不同的状态字段和命名格式
    const status = lab.status || lab.lab_status || 'unknown';
    const statusText = (status === 'available' || status === '可用' || status === 1 || status === '1') ? '可用' : '维护中';
    
    const detailsHtml = `
        <div class="detail-row">
            <div class="detail-label">实验室名称：</div>
            <div class="detail-value">${lab.name || lab.lab_name || '未知'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">位置：</div>
            <div class="detail-value">${lab.location || lab.lab_location || '未知'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">容量：</div>
            <div class="detail-value">${lab.capacity || '未知'} 人</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">状态：</div>
            <div class="detail-value">${statusText}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">描述：</div>
            <div class="detail-value">${lab.description || '未填写'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">开放时间：</div>
            <div class="detail-value">${lab.opening_hours || lab.openingHours || '未设置'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">联系人：</div>
            <div class="detail-value">${lab.contact_person || lab.contactPerson || '未设置'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">联系电话：</div>
            <div class="detail-value">${lab.contact_phone || lab.contactPhone || '未设置'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">最后更新时间：</div>
            <div class="detail-value">${lab.last_updated ? new Date(lab.last_updated).toLocaleString() : lab.lastUpdated ? new Date(lab.lastUpdated).toLocaleString() : '未知'}</div>
        </div>
    `;
    
    labDetailsElement.innerHTML = detailsHtml;
}

// 渲染实验室设备列表
function renderLabDevices(devices) {
    const labDevicesListElement = document.getElementById('lab-devices-list');
    if (!labDevicesListElement) {
        console.error('lab-devices-list元素不存在，无法渲染设备列表');
        return;
    }
    
    if (devices.length === 0) {
        labDevicesListElement.innerHTML = '<p>该实验室暂无设备</p>';
        return;
    }
    
    let devicesHtml = '<ul class="device-list">';
    
    devices.forEach(device => {
        const statusText = device.status === 'available' ? '可用' : '维护中';
        const statusClass = device.status === 'available' ? 'status-available' : 'status-maintenance';
        
        devicesHtml += `
            <li class="device-item">
                <span class="device-name">${device.name || '未知设备'}</span>
                <span class="device-model">(${device.model || '未知型号'})</span>
                <span class="status ${statusClass}">${statusText}</span>
            </li>
        `;
    });
    
    devicesHtml += '</ul>';
    
    labDevicesListElement.innerHTML = devicesHtml;
}

// 编辑实验室
async function editLab(labId) {
    try {
        // 获取实验室详情
        const lab = await getLabDetails(labId);
        if (!lab) {
            alert('未找到该实验室信息');
            return;
        }
        
        // 填充表单字段
        document.getElementById('edit-lab-id').value = lab.lab_id || lab.id;
        document.getElementById('edit-lab-name').value = lab.name || lab.lab_name || '';
        document.getElementById('edit-lab-location').value = lab.location || lab.lab_location || '';
        document.getElementById('edit-lab-capacity').value = lab.capacity || '';
        document.getElementById('edit-lab-description').value = lab.description || '';
        document.getElementById('edit-lab-status').value = lab.status || lab.lab_status || 1;
        document.getElementById('edit-lab-manager-id').value = lab.manager_id || lab.managerId || '';
        
        // 打开编辑模态框
        const editLabModal = document.getElementById('edit-lab-modal');
        if (editLabModal) {
            editLabModal.style.display = 'block';
            editLabModal.style.position = 'fixed';
            editLabModal.style.zIndex = '1000';
            editLabModal.style.left = '0';
            editLabModal.style.top = '0';
            editLabModal.style.width = '100%';
            editLabModal.style.height = '100%';
            editLabModal.style.overflow = 'auto';
            editLabModal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        }
    } catch (error) {
        console.error('编辑实验室失败:', error);
        alert('编辑实验室失败: ' + (error.message || '未知错误'));
    }
}

// 删除实验室
async function deleteLab(labId) {
    if (confirm(`确定要删除实验室 ${labId} 吗？此操作不可恢复。`)) {
        try {
            // 调用API删除实验室
            const response = await api.lab.deleteLab(labId);
            
            if (response.success) {
                alert('实验室删除成功');
                // 删除成功后重新加载列表
                loadLaboratories();
            } else {
                alert('删除实验室失败: ' + (response.message || '未知错误'));
            }
        } catch (error) {
            console.error('删除实验室失败:', error);
            alert('删除实验室失败: ' + (error.message || '未知错误'));
        }
    }
}

// 打开添加实验室模态框
function openAddLabModal() {
    const addLabModal = document.getElementById('add-lab-modal');
    if (addLabModal) {
        addLabModal.style.display = 'block';
        addLabModal.style.position = 'fixed';
        addLabModal.style.zIndex = '1000';
        addLabModal.style.left = '0';
        addLabModal.style.top = '0';
        addLabModal.style.width = '100%';
        addLabModal.style.height = '100%';
        addLabModal.style.overflow = 'auto';
        addLabModal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    }
}

// 关闭添加实验室模态框
function closeAddLabModal() {
    const addLabModal = document.getElementById('add-lab-modal');
    if (addLabModal) {
        addLabModal.style.display = 'none';
    }
    // 重置表单
    const addLabForm = document.getElementById('add-lab-form');
    if (addLabForm) {
        addLabForm.reset();
    }
}

// 关闭编辑实验室模态框
function closeEditLabModal() {
    const editLabModal = document.getElementById('edit-lab-modal');
    if (editLabModal) {
        editLabModal.style.display = 'none';
    }
    // 重置表单
    const editLabForm = document.getElementById('edit-lab-form');
    if (editLabForm) {
        editLabForm.reset();
    }
}

// 提交编辑实验室表单
async function submitEditLabForm() {
    try {
        // 收集表单数据
        const labId = parseInt(document.getElementById('edit-lab-id').value);
        const formData = {
            lab_name: document.getElementById('edit-lab-name').value.trim(),
            location: document.getElementById('edit-lab-location').value.trim(),
            capacity: parseInt(document.getElementById('edit-lab-capacity').value),
            description: document.getElementById('edit-lab-description').value.trim(),
            status: parseInt(document.getElementById('edit-lab-status').value),
            manager_id: parseInt(document.getElementById('edit-lab-manager-id').value) || null
        };

        // 验证表单数据
        if (!formData.lab_name) {
            alert('请输入实验室名称');
            return;
        }
        if (!formData.location) {
            alert('请输入实验室位置');
            return;
        }
        if (!formData.capacity || formData.capacity <= 0) {
            alert('请输入有效的实验室容量');
            return;
        }

        // 检查当前token是否为模拟token
        const currentToken = localStorage.getItem('authToken');
        const isMockToken = currentToken && currentToken.startsWith('mock_token_');
        
        if (isMockToken) {
            // 模拟token的情况下，直接使用模拟数据更新
            console.log('使用模拟数据更新实验室');
            handleMockEditLab(labId, formData);
        } else {
            // 将formData转换为API期望的格式
            const apiFormData = {
                name: formData.lab_name,
                location: formData.location,
                capacity: formData.capacity,
                description: formData.description || '',
                status: formData.status === 1 ? '正常' : '维护中'
            };
            
            // 调用API编辑实验室
            console.log('提交编辑实验室请求:', apiFormData);
            const response = await api.lab.updateLab(labId, apiFormData);
            console.log('编辑实验室响应:', response);

            // 处理API响应
            if (response.success) {
                alert('实验室编辑成功！');
                closeEditLabModal();
                // 重新加载实验室列表
                loadLaboratories();
            } else {
                // 处理编辑失败的情况
                const errorMsg = response.message || '编辑实验室失败，请稍后再试';
                alert(errorMsg);
            }
        }
    } catch (error) {
        console.error('编辑实验室失败:', error);
        alert('编辑实验室失败: ' + (error.message || '未知错误'));
    }
}

// 处理模拟编辑实验室（当使用模拟token时）
function handleMockEditLab(labId, formData) {
    console.log('=== 进入handleMockEditLab函数 ===');
    console.log('- labId:', labId);
    console.log('- formData:', formData);
    
    // 初始化模拟数据
    initMockLaboratories();
    
    // 查找要编辑的实验室
    const labIndex = mockLaboratories.findIndex(lab => lab.lab_id === labId);
    console.log('- labIndex:', labIndex);
    
    if (labIndex === -1) {
        alert('未找到要编辑的实验室');
        console.error('未找到要编辑的实验室，labId:', labId);
        return;
    }
    
    // 查看编辑前的实验室数据
    console.log('- 编辑前的实验室数据:', mockLaboratories[labIndex]);
    
    // 更新实验室信息
    mockLaboratories[labIndex] = {
        ...mockLaboratories[labIndex],
        ...formData,
        lab_id: labId // 保持原ID不变
    };
    
    // 查看编辑后的实验室数据
    console.log('- 编辑后的实验室数据:', mockLaboratories[labIndex]);
    
    // 保存到localStorage
    saveMockLaboratories();
    console.log('- 保存到localStorage成功');
    
    // 验证localStorage中的数据
    const storedLabs = JSON.parse(localStorage.getItem('mockLaboratories'));
    console.log('- localStorage中的最新数据:', storedLabs.find(lab => lab.lab_id === labId));

    // 显示成功消息
    alert('实验室编辑成功！（模拟数据）');
    closeEditLabModal();
    // 重新加载实验室列表
    loadLaboratories();
}

// 提交添加实验室表单
async function submitAddLabForm() {
    try {
        // 收集表单数据
        const formData = {
            lab_name: document.getElementById('lab-name').value.trim(),
            location: document.getElementById('lab-location').value.trim(),
            capacity: parseInt(document.getElementById('lab-capacity').value),
            description: document.getElementById('lab-description').value.trim(),
            status: parseInt(document.getElementById('lab-status').value),
            manager_id: parseInt(document.getElementById('lab-manager-id').value) || null
        };

        // 验证表单数据
        if (!formData.lab_name) {
            alert('请输入实验室名称');
            return;
        }
        if (!formData.location) {
            alert('请输入实验室位置');
            return;
        }
        if (!formData.capacity || formData.capacity <= 0) {
            alert('请输入有效的实验室容量');
            return;
        }

        // 检查当前token是否为模拟token
        const currentToken = localStorage.getItem('authToken');
        const isMockToken = currentToken && currentToken.startsWith('mock_token_');
        
        // 如果是模拟token，直接使用模拟添加逻辑
        if (isMockToken) {
            handleMockAddLab();
            return;
        }

        // 调用API添加实验室（非模拟token情况）
        console.log('提交添加实验室请求:', formData);
        const response = await api.lab.createLab(formData);
        console.log('添加实验室响应:', response);

        // 处理API响应
        if (response.success) {
            alert('实验室添加成功！');
            closeAddLabModal();
            // 重新加载实验室列表
            loadLaboratories();
        } else {
            // 处理添加失败的情况
            const errorMsg = response.message || '添加实验室失败，请稍后再试';
            alert(errorMsg);
        }
    } catch (error) {
        console.error('添加实验室失败:', error);
        // 检查是否为401错误
        if (error.status === 401) {
            // 检查当前token是否为模拟token
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            // 只有当不是模拟token时才清理认证信息
            if (!isMockToken) {
                auth.cleanupInvalidAuth();
                alert('登录信息已失效，请重新登录');
                window.location.href = 'index.html';
            } else {
                // 模拟token的情况下，使用模拟数据
                handleMockAddLab();
            }
        } else {
            alert('添加实验室失败: ' + (error.message || '未知错误'));
        }
    }
}

// 处理模拟添加实验室（当使用模拟token时）
function handleMockAddLab() {
    // 收集表单数据
    const formData = {
        lab_name: document.getElementById('lab-name').value.trim(),
        location: document.getElementById('lab-location').value.trim(),
        capacity: parseInt(document.getElementById('lab-capacity').value),
        description: document.getElementById('lab-description').value.trim(),
        status: parseInt(document.getElementById('lab-status').value),
        manager_id: parseInt(document.getElementById('lab-manager-id').value) || null
    };

    // 初始化模拟数据（如果需要）
    initMockLaboratories();
    
    // 生成新的实验室ID（最大ID+1）
    const maxId = mockLaboratories.length > 0 ? Math.max(...mockLaboratories.map(lab => lab.lab_id || lab.id)) : 0;
    const newLabId = maxId + 1;
    
    // 创建新的实验室对象
    const newLab = {
        lab_id: newLabId,
        ...formData,
        device_count: 0 // 初始设备数量为0
    };
    
    // 将新实验室添加到模拟数据中
    mockLaboratories.push(newLab);
    
    // 保存到localStorage
    saveMockLaboratories();

    // 显示成功消息
    alert('实验室添加成功！（模拟数据）');
    closeAddLabModal();
    // 重新加载实验室列表
    loadLaboratories();
}