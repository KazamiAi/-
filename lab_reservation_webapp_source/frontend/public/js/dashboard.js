// 首页逻辑

// 初始化页面
async function initDashboard() {
    try {
        // 初始化认证（即使未认证也允许访问页面）
        await auth.initAuth();
        
        // 加载统计数据（添加错误处理）
        await loadDashboardStats().catch(err => {
            console.error('加载统计数据时出错，但页面继续加载:', err);
            // 设置默认值，避免页面空白
            if (document.getElementById('available-labs-count')) {
                document.getElementById('available-labs-count').textContent = '0';
            }
            if (document.getElementById('my-reservations-count')) {
                document.getElementById('my-reservations-count').textContent = '0';
            }
            if (document.getElementById('pending-reservations-count')) {
                document.getElementById('pending-reservations-count').textContent = 'N/A';
            }
        });
        
        // 加载最近预约（添加错误处理）
        await loadRecentReservations().catch(err => {
            console.error('加载最近预约时出错，但页面继续加载:', err);
            // 如果预约列表容器存在，显示提示信息
            const reservationsList = document.getElementById('reservations-list');
            if (reservationsList) {
                reservationsList.innerHTML = '<div class="alert alert-info">无法加载预约数据，API暂时不可用</div>';
            }
        });
    } catch (error) {
        console.error('页面初始化失败，但仍尝试显示基本内容:', error);
    }
    
    // 无论如何都显示页面标题和基本结构
    console.log('仪表盘页面已加载基本框架');
}

// 加载仪表板统计数据
async function loadDashboardStats() {
    try {
        // 获取可用实验室数量
        const labs = await api.lab.getAllLabs();
        console.log('DEBUG: loadDashboardStats - labs:', labs);
        
        if (Array.isArray(labs)) {
            // 正常情况，labs是实验室数组
            const availableLabsCount = labs.filter(lab => lab.status === '正常').length;
            document.getElementById('available-labs-count').textContent = availableLabsCount;
        } else if (labs && !Array.isArray(labs)) {
            console.log('DEBUG: loadDashboardStats - labs is not an array');
            
            // 检查是否是401错误（支持多种格式）
            const is401Error = 
                (labs.status && (labs.status === 401 || labs.status === '401')) ||
                (labs.code && (labs.code === 401 || labs.code === '401')) ||
                (!labs.success && labs.message && (labs.message.includes('401') || labs.message.includes('未授权')));
            
            if (is401Error) {
                console.log('检测到401错误，开始处理...');
                
                // 检查是否包含'jwt malformed'错误信息（支持多种格式）
                const hasMalformedJwt = 
                    (labs.message && labs.message.includes('jwt malformed')) ||
                    (labs.error && labs.error.includes('jwt malformed'));
                
                // 检查当前token是否为模拟token
                const currentToken = localStorage.getItem('authToken');
                console.log('dashboard.js - 当前token:', currentToken);
                
                // 使用多种方法检测模拟token，增加可靠性
                let isMockToken = false;
                if (currentToken) {
                    try {
                        // 主要检测方法：正则表达式
                        const mockTokenRegex = /^mock_token_/;
                        isMockToken = mockTokenRegex.test(currentToken);
                        console.log('dashboard.js - 正则表达式检测:', isMockToken);
                        
                        // 辅助检测方法：字符串indexOf
                        if (!isMockToken) {
                            isMockToken = currentToken.indexOf('mock_token_') === 0;
                            console.log('dashboard.js - indexOf辅助检测:', isMockToken);
                        }
                        
                        // 辅助检测方法：startsWith
                        if (!isMockToken) {
                            isMockToken = currentToken.startsWith('mock_token_');
                            console.log('dashboard.js - startsWith辅助检测:', isMockToken);
                        }
                        
                    } catch (error) {
                        console.error('dashboard.js - 模拟token检测错误:', error);
                        isMockToken = false;
                    }
                }
                
                console.log('dashboard.js - 最终模拟token检测结果:', isMockToken);
                
                // 只有当不是模拟token时才清理认证信息和显示错误
                if (!isMockToken) {
                    console.log('清理无效的认证信息...');
                    // 无论auth模块是否可用，都直接清理认证信息
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userInfo');
                    localStorage.removeItem('authLastActivity'); // 使用正确的键名
                    sessionStorage.removeItem('authToken');
                    sessionStorage.removeItem('userInfo');
                    sessionStorage.removeItem('authLastActivity'); // 使用正确的键名
                    
                    // 如果auth模块可用，也调用它的清理函数以确保一致性
                    if (auth && auth.cleanupInvalidAuth) {
                        console.log('同时调用auth.cleanupInvalidAuth()确保一致性');
                        auth.cleanupInvalidAuth();
                    }
                    
                    // 显示更具体的错误信息
                    let errorMsg = '加载实验室列表失败: 请重新登录';
                    if (hasMalformedJwt) {
                        errorMsg = '检测到无效的登录令牌(jwt malformed)，请重新登录';
                    } else if (labs.message) {
                        console.log('DEBUG: loadDashboardStats - labs.message:', labs.message);
                        if (labs.message.includes('token invalid') || labs.message.includes('token expired')) {
                            errorMsg = '登录信息已失效，请重新登录';
                        } else if (labs.message.includes('未授权')) {
                            errorMsg = '未授权访问，请重新登录';
                        }
                    }
                    
                    console.error(errorMsg, labs);
                    
                    // 显示错误信息给用户
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'alert alert-danger mt-3';
                    errorDiv.textContent = errorMsg;
                    
                    // 确保dashboard-stats元素存在再添加
                    const dashboardStats = document.getElementById('dashboard-stats');
                    if (dashboardStats) {
                        dashboardStats.appendChild(errorDiv);
                    }
                    
                    // 在检测到jwt malformed错误时，将用户重定向到登录页面
                    console.log('DEBUG: loadDashboardStats - showing alert:', errorMsg);
                    alert(errorMsg);
                    
                    console.log('DEBUG: loadDashboardStats - redirecting to index.html');
                    window.location.href = 'index.html';
                    return;
                } else {
                    console.log('检测到jwt malformed错误，但当前使用的是模拟token，跳过认证信息清理和错误处理');
                    // 对于模拟token，我们可以选择显示一个友好的提示或者直接忽略这个错误
                    // 在这里我们只记录日志，不影响用户体验
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'alert alert-info mt-3';
                    infoDiv.textContent = '当前使用模拟登录模式，API可能返回错误，但不影响功能使用。';
                    
                    const dashboardStats = document.getElementById('dashboard-stats');
                    if (dashboardStats) {
                        dashboardStats.appendChild(infoDiv);
                    }
                    return;
                }
            } else {
                // 其他错误情况
                console.error('获取实验室列表失败，但不是401错误:', labs);
                document.getElementById('available-labs-count').textContent = '0';
            }
        } else {
            // labs是null或undefined的情况
            console.log('DEBUG: loadDashboardStats - labs is null or undefined');
            document.getElementById('available-labs-count').textContent = '0';
        }
        
        // 获取我的预约数量
        const myReservationsResponse = await api.reservation.getUserReservations();
        if (myReservationsResponse.success) {
            document.getElementById('my-reservations-count').textContent = myReservationsResponse.data.length;
        }
        
        // 检查是否是管理员或教师，获取待处理预约数量
        const isManager = await auth.isAdminOrTeacher();
        if (isManager) {
            const allReservationsResponse = await api.reservation.getAllReservations();
            if (allReservationsResponse.success) {
                const pendingCount = allReservationsResponse.data.filter(r => r.status === '待审批').length;
                document.getElementById('pending-reservations-count').textContent = pendingCount;
            }
        } else {
            // 学生不显示待处理预约计数
            document.getElementById('pending-reservations-count').textContent = 'N/A';
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 加载最近预约
async function loadRecentReservations() {
    try {
        let reservations = [];
        const isManager = await auth.isAdminOrTeacher();
        
        if (isManager) {
            // 管理员和教师查看所有预约
            const response = await api.reservation.getAllReservations();
            if (response && response.success) {
                reservations = response.data;
            } else if (response && !response.success) {
                console.error('获取所有预约失败:', response);
                // 检查是否是401错误
                const is401Error = 
                    (response.status && (response.status === 401 || response.status === '401')) ||
                    (response.code && (response.code === 401 || response.code === '401')) ||
                    (response.message && (response.message.includes('401') || response.message.includes('未授权')));
                
                if (is401Error) {
                    // 清理认证信息并重定向
                    console.error('获取所有预约失败: 未授权访问', response);
                    auth.cleanupInvalidAuth();
                    window.location.href = 'index.html';
                    return;
                }
            }
        } else {
            // 学生查看自己的预约
            const response = await api.reservation.getUserReservations();
            if (response && response.success) {
                reservations = response.data;
            } else if (response && !response.success) {
                console.error('获取个人预约失败:', response);
                // 检查是否是401错误
                const is401Error = 
                    (response.status && (response.status === 401 || response.status === '401')) ||
                    (response.code && (response.code === 401 || response.code === '401')) ||
                    (response.message && (response.message.includes('401') || response.message.includes('未授权')));
                
                if (is401Error) {
                    // 清理认证信息并重定向
                    console.error('获取个人预约失败: 未授权访问', response);
                    auth.cleanupInvalidAuth();
                    window.location.href = 'index.html';
                    return;
                }
            }
        }
        
        // 按日期排序，取最近的5条
        reservations.sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date));
        const recentReservations = reservations.slice(0, 5);
        
        // 渲染预约列表
        renderReservationsList(recentReservations);
    } catch (error) {
        console.error('加载最近预约失败:', error);
        const tbody = document.getElementById('recent-reservations-body');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #e74c3c;">加载失败</td></tr>';
    }
}

// 渲染预约列表
function renderReservationsList(reservations) {
    const tbody = document.getElementById('recent-reservations-body');
    
    if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">暂无预约记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    reservations.forEach(reservation => {
        const row = document.createElement('tr');
        
        // 格式化时间段
        const timeRange = `${reservation.start_time} - ${reservation.end_time}`;
        
        // 状态标签
        const statusBadge = getStatusBadge(reservation.status);
        
        // 操作按钮 - 修改为使用模态框查看
        const actions = `<button onclick="viewDashboardReservationDetails('${reservation.reservation_id || reservation.id}')" class="btn btn-primary">查看</button>`;
        
        row.innerHTML = `
            <td>${reservation.lab_name || '实验室'}</td>
            <td>${reservation.reservation_date || reservation.date}</td>
            <td>${timeRange}</td>
            <td>${statusBadge}</td>
            <td>${actions}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 首页预约详情查看函数
async function viewDashboardReservationDetails(reservationId) {
    console.log('Viewing reservation details from dashboard for ID:', reservationId);
    try {
        // 使用模拟数据进行测试
        const reservation = {
            id: reservationId,
            user_name: `测试用户${reservationId}`,
            user_role: 'student',
            lab_name: `实验室${reservationId}`,
            date: new Date().toLocaleDateString(),
            reservation_date: new Date().toLocaleDateString(),
            start_time: '09:00',
            end_time: '11:00',
            purpose: '测试预约用途',
            status: 'pending',
            created_at: new Date().toLocaleString(),
            note: '测试备注信息',
            comment: ''
        };
        console.log('Using test reservation data:', reservation);
        
        // 创建或获取模态框
        let reservationModal = document.getElementById('dashboard-reservation-modal');
        let modalContent;
        
        if (!reservationModal) {
            // 创建模态框
            reservationModal = document.createElement('div');
            reservationModal.id = 'dashboard-reservation-modal';
            reservationModal.className = 'modal';
            
            modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h3 id="dashboard-modal-title">预约详情</h3>
                    <span class="close-button" onclick="closeDashboardReservationModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="dashboard-reservation-details"></div>
                </div>
            `;
            
            reservationModal.appendChild(modalContent);
            document.body.appendChild(reservationModal);
        } else {
            modalContent = reservationModal.querySelector('.modal-content');
        }
        
        // 更新模态框内容
        const reservationDetails = document.getElementById('dashboard-reservation-details');
        const modalTitle = document.getElementById('dashboard-modal-title');
        
        if (reservationDetails) {
            reservationDetails.innerHTML = `
                <div class="reservation-detail-item">
                    <strong>预约ID:</strong> ${reservation.id || reservation.reservation_id || '未知'}
                </div>
                <div class="reservation-detail-item">
                    <strong>用户姓名:</strong> ${reservation.user_name || reservation.userName || '未知'}
                </div>
                <div class="reservation-detail-item">
                    <strong>实验室:</strong> ${reservation.lab_name || reservation.labName || '未知'}
                </div>
                <div class="reservation-detail-item">
                    <strong>预约日期:</strong> ${reservation.reservation_date || reservation.date || '未知'}
                </div>
                <div class="reservation-detail-item">
                    <strong>时间段:</strong> ${reservation.start_time} - ${reservation.end_time}
                </div>
                <div class="reservation-detail-item">
                    <strong>预约用途:</strong> ${reservation.purpose || '无'}
                </div>
                <div class="reservation-detail-item">
                    <strong>状态:</strong> 
                    <span class="status-badge ${reservation.status === 'pending' || reservation.status === '待审批' ? 'status-pending' : reservation.status === 'approved' || reservation.status === '已批准' ? 'status-approved' : reservation.status === 'rejected' || reservation.status === '已拒绝' ? 'status-rejected' : 'status-completed'}">
                        ${reservation.status || '未知'}
                    </span>
                </div>
                <div class="reservation-detail-item">
                    <strong>创建时间:</strong> ${reservation.created_at || new Date().toLocaleString()}
                </div>
                <div class="reservation-detail-item">
                    <strong>备注:</strong> ${reservation.note || reservation.notes || '无'}
                </div>
                ${reservation.comment ? `<div class="reservation-detail-item"><strong>审批意见:</strong> ${reservation.comment}</div>` : ''}
            `;
        }
        
        if (modalTitle) {
            modalTitle.textContent = `预约详情 - ID: ${reservation.id || reservation.reservation_id || '未知'}`;
        }
        
        // 设置模态框样式并显示
        reservationModal.style.display = 'block';
        reservationModal.style.position = 'fixed';
        reservationModal.style.zIndex = '1000';
        reservationModal.style.left = '0';
        reservationModal.style.top = '0';
        reservationModal.style.width = '100%';
        reservationModal.style.height = '100%';
        reservationModal.style.overflow = 'auto';
        reservationModal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        
        // 设置模态框内容样式
        if (modalContent) {
            modalContent.style.display = 'block';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.margin = '15% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #888';
            modalContent.style.width = '80%';
        }
    } catch (error) {
        console.error('显示预约详情失败:', error);
        alert('显示预约详情失败，请稍后再试。错误信息: ' + (error.message || '未知错误'));
    }
}

// 关闭模态框函数
function closeDashboardReservationModal() {
    const modal = document.getElementById('dashboard-reservation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 获取状态标签HTML
function getStatusBadge(status) {
    const statusMap = {
        '待审批': 'pending',
        '已审批': 'approved',
        '已拒绝': 'rejected',
        '已取消': 'cancelled',
        '进行中': 'ongoing',
        '已完成': 'completed'
    };
    
    const className = statusMap[status] || 'pending';
    return `<span class="status-badge status-${className}">${status}</span>`;
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', initDashboard);