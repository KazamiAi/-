// 创建预约页面逻辑

// 初始化页面
async function initCreateReservation() {
    // 初始化认证
    await auth.initAuth();
    
    // 初始化表单
    await initForm();
    
    // 绑定表单提交事件
    document.getElementById('createReservationForm').addEventListener('submit', handleFormSubmit);
    
    // 绑定实验室选择变化事件
    document.getElementById('lab-select').addEventListener('change', loadLabDevices);
    
    // 绑定时间选择变化事件，检查冲突
    document.getElementById('start-time').addEventListener('change', checkTimeConflict);
    document.getElementById('end-time').addEventListener('change', checkTimeConflict);
    document.getElementById('reservation-date').addEventListener('change', checkTimeConflict);
}

// 初始化表单
async function initForm() {
    // 设置最小日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reservation-date').min = today;
    document.getElementById('reservation-date').value = today;
    
    // 加载实验室列表
    await loadLaboratories();
    
    // 加载时间段选项
    loadTimeOptions();
}

// 加载实验室列表
async function loadLaboratories() {
    try {
        const response = await api.lab.getAllLabs();
        const labSelect = document.getElementById('lab-select');
        labSelect.innerHTML = '<option value="">请选择实验室</option>';
        
        let labs;
        
        // 处理401未授权错误，包括'jwt malformed'情况
        if (response && response.status === 401) {
            console.error('加载实验室列表失败: 未授权访问', response);
            
            // 检查当前token是否为模拟token
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            // 只有当不是模拟token时才清理认证信息
            if (!isMockToken) {
                // 清理无效的认证信息
                auth.cleanupInvalidAuth();
                // 显示更具体的错误信息
                const errorMsg = response.message && response.message.includes('jwt malformed') ? '登录信息已失效，请重新登录' : '加载实验室列表失败: 请重新登录';
                alert(errorMsg);
                window.location.href = 'index.html';
                return;
            } else {
                console.log('检测到401错误，但当前使用的是模拟token，加载模拟实验室数据');
                // 使用模拟实验室数据
                labs = getMockLaboratories();
            }
        } else {
            labs = response.data || response;
            // 确保labs是数组
            labs = Array.isArray(labs) ? labs : [];
            
            // 如果API返回空数组且使用的是模拟token，使用模拟数据
            const currentToken = localStorage.getItem('authToken');
            const isMockToken = currentToken && currentToken.startsWith('mock_token_');
            
            if (isMockToken && labs.length === 0) {
                console.log('API返回空结果，但当前使用的是模拟token，加载模拟实验室数据');
                labs = getMockLaboratories();
            }
        }
        
        // 添加实验室到下拉列表
        labs.forEach(lab => {
            if (lab.status === '正常' || lab.status === 1) { // 兼容数字和字符串状态
                const option = document.createElement('option');
                option.value = lab.lab_id || lab.id;
                option.textContent = `${lab.lab_name || lab.name} (${lab.location})`;
                labSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('加载实验室列表失败:', error);
        
        // 发生错误时，如果使用的是模拟token，尝试加载模拟数据
        const currentToken = localStorage.getItem('authToken');
        const isMockToken = currentToken && currentToken.startsWith('mock_token_');
        
        if (isMockToken) {
            console.log('发生错误，使用模拟实验室数据');
            const labs = getMockLaboratories();
            const labSelect = document.getElementById('lab-select');
            labSelect.innerHTML = '<option value="">请选择实验室</option>';
            
            labs.forEach(lab => {
                if (lab.status === '正常' || lab.status === 1) {
                    const option = document.createElement('option');
                    option.value = lab.lab_id || lab.id;
                    option.textContent = `${lab.lab_name || lab.name} (${lab.location})`;
                    labSelect.appendChild(option);
                }
            });
        }
    }
}

// 获取模拟实验室数据
function getMockLaboratories() {
    // 从localStorage获取模拟数据，如果没有则返回默认数据
    const savedMockLabs = localStorage.getItem('mockLaboratories');
    if (savedMockLabs) {
        return JSON.parse(savedMockLabs);
    }
    
    // 默认模拟实验室数据
    return [
        { lab_id: 1, lab_name: '计算机基础实验室', location: '实验楼A301', capacity: 60, status: 1, manager_id: 1, device_count: 60 },
        { lab_id: 2, lab_name: '网络实验室', location: '实验楼B402', capacity: 40, status: 1, manager_id: 1, device_count: 40 },
        { lab_id: 3, lab_name: '软件实验室', location: '实验楼C503', capacity: 30, status: 1, manager_id: 1, device_count: 30 },
        { lab_id: 4, lab_name: '嵌入式实验室', location: '实验楼D604', capacity: 25, status: 1, manager_id: 1, device_count: 25 },
        { lab_id: 5, lab_name: '大数据实验室', location: '实验楼E705', capacity: 20, status: 1, manager_id: 1, device_count: 20 }
    ];
}

// 加载实验室设备
async function loadLabDevices() {
    const labId = document.getElementById('lab-select').value;
    const devicesSelect = document.getElementById('devices-select');
    
    if (!labId) {
        devicesSelect.innerHTML = '<option value="">请先选择实验室</option>';
        return;
    }
    
    try {
        // 检查当前token是否为模拟token
        const currentToken = localStorage.getItem('authToken');
        const isMockToken = currentToken && currentToken.startsWith('mock_token_');
        
        if (isMockToken) {
            console.log('检测到模拟token，使用模拟设备数据');
            // 使用模拟设备数据
            const mockDevices = getMockDevicesByLabId(labId);
            renderDevicesToSelect(mockDevices, devicesSelect);
            return;
        }
        
        // 非模拟token情况，使用API调用
        const response = await api.lab.getLabDevices(labId);
        
        if (response && response.status === 401) {
            // API返回401错误，可能是token过期或无效
            console.error('API返回401错误，使用模拟设备数据');
            const mockDevices = getMockDevicesByLabId(labId);
            renderDevicesToSelect(mockDevices, devicesSelect);
        } else if (response.success) {
            // API调用成功
            const devices = response.data || [];
            renderDevicesToSelect(devices, devicesSelect);
        } else {
            // API调用失败，但不是401错误
            console.error('API调用失败，使用模拟设备数据');
            const mockDevices = getMockDevicesByLabId(labId);
            renderDevicesToSelect(mockDevices, devicesSelect);
        }
    } catch (error) {
        console.error('加载设备列表失败:', error);
        // 发生错误时，使用模拟设备数据
        const mockDevices = getMockDevicesByLabId(labId);
        renderDevicesToSelect(mockDevices, devicesSelect);
    }
}

// 根据实验室ID获取模拟设备数据
function getMockDevicesByLabId(labId) {
    // 从localStorage获取模拟设备数据，如果没有则使用默认数据
    const savedMockDevices = localStorage.getItem('mockDevices');
    if (savedMockDevices) {
        const allMockDevices = JSON.parse(savedMockDevices);
        return allMockDevices.filter(device => device.lab_id == labId && (device.status === '正常' || device.status === 'available' || device.status === 1));
    }
    
    // 默认模拟设备数据
    const defaultMockDevices = [
        { device_id: 101, device_name: '台式计算机', device_model: '联想ThinkStation', status: '正常', lab_id: 1 },
        { device_id: 102, device_name: '台式计算机', device_model: '联想ThinkStation', status: '正常', lab_id: 1 },
        { device_id: 103, device_name: '投影仪', device_model: '爱普生CB-X05', status: '正常', lab_id: 1 },
        { device_id: 201, device_name: '路由器', device_model: '思科Cisco 2960', status: '正常', lab_id: 2 },
        { device_id: 202, device_name: '交换机', device_model: '华为S5700', status: '正常', lab_id: 2 },
        { device_id: 301, device_name: '开发服务器', device_model: 'Dell PowerEdge', status: '正常', lab_id: 3 },
        { device_id: 302, device_name: '台式计算机', device_model: '戴尔OptiPlex', status: '正常', lab_id: 3 },
        { device_id: 401, device_name: '嵌入式开发板', device_model: '树莓派4B', status: '正常', lab_id: 4 },
        { device_id: 501, device_name: '大数据服务器', device_model: '浪潮NF5280M5', status: '正常', lab_id: 5 }
    ];
    
    // 过滤出指定实验室的可用设备
    return defaultMockDevices.filter(device => device.lab_id == labId && device.status === '正常');
}

// 将设备数据渲染到选择框
function renderDevicesToSelect(devices, selectElement) {
    selectElement.innerHTML = '';
    
    // 确保devices是数组
    const devicesArray = Array.isArray(devices) ? devices : [];
    
    devicesArray.forEach(device => {
        // 兼容不同的设备数据格式
        const deviceId = device.device_id || device.id;
        const deviceName = device.device_name || device.name;
        const deviceModel = device.device_model || device.model;
        const status = device.status || '正常';
        
        // 只显示正常/可用状态的设备
        if (status === '正常' || status === 'available' || status === 1) {
            const option = document.createElement('option');
            option.value = deviceId;
            option.textContent = `${deviceName} (${deviceModel})`;
            selectElement.appendChild(option);
        }
    });
    
    if (selectElement.options.length === 0) {
        selectElement.innerHTML = '<option value="">该实验室暂无可用设备</option>';
    }
}

// 加载时间段选项
function loadTimeOptions() {
    const startTimeSelect = document.getElementById('start-time');
    const endTimeSelect = document.getElementById('end-time');
    
    // 清除现有选项
    startTimeSelect.innerHTML = '<option value="">请选择开始时间</option>';
    endTimeSelect.innerHTML = '<option value="">请选择结束时间</option>';
    
    // 生成时间段选项（8:00 - 22:00，每小时）
    for (let hour = 8; hour <= 21; hour++) {
        const time = hour.toString().padStart(2, '0') + ':00';
        
        const startOption = document.createElement('option');
        startOption.value = time;
        startOption.textContent = time;
        startTimeSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = time;
        endOption.textContent = time;
        endTimeSelect.appendChild(endOption);
    }
    
    // 添加22:00作为结束时间选项
    const endOption = document.createElement('option');
    endOption.value = '22:00';
    endOption.textContent = '22:00';
    endTimeSelect.appendChild(endOption);
}

// 检查时间冲突
async function checkTimeConflict() {
    const labId = document.getElementById('lab-select').value;
    const date = document.getElementById('reservation-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    
    // 只有当所有必要字段都填写时才检查冲突
    if (!labId || !date || !startTime || !endTime) {
        clearConflictMessage();
        return;
    }
    
    try {
        const response = await api.reservation.checkConflict({
            lab_id: labId,
            reservation_date: date,
            start_time: startTime,
            end_time: endTime
        });
        
        if (response.success) {
            if (response.hasConflict) {
                showConflictMessage('该时间段已被预约，请选择其他时间段');
            } else {
                clearConflictMessage();
            }
        }
    } catch (error) {
        console.error('检查时间冲突失败:', error);
    }
}

// 显示冲突消息
function showConflictMessage(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.color = '#e74c3c';
}

// 清除冲突消息
function clearConflictMessage() {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // 清除消息
    document.getElementById('error-message').textContent = '';
    document.getElementById('success-message').textContent = '';
    
    try {
        // 获取表单数据
        const labId = document.getElementById('lab-select').value;
        const date = document.getElementById('reservation-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const purpose = document.getElementById('purpose').value;
        
        // 验证时间
        if (startTime >= endTime) {
            throw new Error('结束时间必须晚于开始时间');
        }
        
        // 获取选中的设备
        const devicesSelect = document.getElementById('devices-select');
        const selectedDevices = Array.from(devicesSelect.selectedOptions).map(option => option.value);
        
        // 创建预约数据
        const reservationData = {
            lab_id: labId,
            reservation_date: date,
            start_time: startTime,
            end_time: endTime,
            purpose: purpose,
            device_ids: selectedDevices
        };
        
        // 提交预约
        const response = await api.reservation.createReservation(reservationData);
        
        if (response.success) {
            // 显示成功消息
            const successMessage = document.getElementById('success-message');
            successMessage.textContent = '预约创建成功！';
            successMessage.style.color = '#27ae60';
            
            // 重置表单
            document.getElementById('createReservationForm').reset();
            
            // 延迟后跳转到我的预约页面
            setTimeout(() => {
                window.location.href = 'reservations.html';
            }, 2000);
        } else {
            throw new Error(response.message || '创建预约失败');
        }
    } catch (error) {
        // 显示错误消息
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = error.message || '创建预约失败，请稍后重试';
    }
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', initCreateReservation);