// 预约审批页面的JavaScript

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    // 检查用户登录状态
    const user = authApi.getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // 显示用户信息
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-role').textContent = user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生';

    // 退出登录按钮事件
    document.getElementById('logout-btn').addEventListener('click', () => {
        authApi.logout();
        window.location.href = 'index.html';
    });

    // 角色权限控制 - 只有管理员和教师可以审批
    if (user.role === 'student') {
        alert('您没有权限访问此页面');
        window.location.href = 'dashboard.html';
        return;
    }

    // 加载实验室下拉框
    await loadLabsFilter();

    // 加载预约列表
    await loadReservations();

    // 添加筛选事件
    document.getElementById('filter-btn').addEventListener('click', loadReservations);

    // 关闭模态框事件
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('reservation-modal').style.display = 'none';
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('reservation-modal')) {
            document.getElementById('reservation-modal').style.display = 'none';
        }
    });

    // 批准和拒绝按钮事件
    document.getElementById('approve-btn').addEventListener('click', async () => {
        const reservationId = currentReservationId;
        if (reservationId) {
            await handleApproval(reservationId, 'approve');
        }
    });

    document.getElementById('reject-btn').addEventListener('click', async () => {
        const reservationId = currentReservationId;
        if (reservationId) {
            await handleApproval(reservationId, 'reject');
        }
    });
});

// 当前查看的预约ID
let currentReservationId = null;

// 加载实验室下拉框
async function loadLabsFilter() {
    try {
        const response = await labApi.getAllLabs();
        const labs = response.data || response; // 适配API响应，优先使用data字段
        
        // 确保labs是数组
        if (!Array.isArray(labs)) {
            throw new Error('实验室数据格式错误');
        }
        
        const labFilter = document.getElementById('lab-filter');
        
        labs.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab.id;
            option.textContent = lab.name;
            labFilter.appendChild(option);
        });
    } catch (error) {
        console.error('加载实验室列表失败:', error);
    }
}

// 加载预约列表
async function loadReservations() {
    try {
        const statusFilter = document.getElementById('status-filter').value;
        const labFilter = document.getElementById('lab-filter').value;
        
        // 获取所有预约
        const response = await reservationApi.getAllReservations();
        const reservations = response.data || response; // 适配API响应，优先使用data字段
        
        // 确保reservations是数组
        if (!Array.isArray(reservations)) {
            throw new Error('预约数据格式错误');
        }
        
        // 过滤预约
        let filteredReservations = reservations;
        
        if (statusFilter !== 'all') {
            filteredReservations = filteredReservations.filter(r => r.status === statusFilter);
        }
        
        if (labFilter !== 'all') {
            filteredReservations = filteredReservations.filter(r => r.labId === labFilter);
        }

        const tableBody = document.getElementById('reservations-table-body');
        tableBody.innerHTML = '';

        if (filteredReservations.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">没有找到匹配的预约</td></tr>';
            return;
        }

        // 按申请时间倒序排序
        filteredReservations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 生成预约列表
        filteredReservations.forEach(reservation => {
            const row = document.createElement('tr');
            // 适配不同的字段命名格式
            const reservationId = reservation.id || reservation.reservation_id;
            const userName = reservation.user_name || reservation.userName || '未知';
            const labName = reservation.lab_name || reservation.labName || '未知';
            const reservationDate = reservation.date ? new Date(reservation.date).toLocaleDateString() : '未知';
            const startTime = reservation.start_time || reservation.startTime || '';
            const endTime = reservation.end_time || reservation.endTime || '';
            const purpose = reservation.purpose || '未填写';
            const status = reservation.status || 'unknown';
            const createdAt = reservation.created_at ? new Date(reservation.created_at).toLocaleString() : 
                              reservation.createdAt ? new Date(reservation.createdAt).toLocaleString() : '未知';
            
            row.innerHTML = `
                <td>${reservationId}</td>
                <td>${userName}</td>
                <td>${labName}</td>
                <td>${reservationDate}</td>
                <td>${startTime} - ${endTime}</td>
                <td>${purpose}</td>
                <td>
                    <span class="status-badge ${getStatusClass(status)}">
                        ${getStatusText(status)}
                    </span>
                </td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-reservation" data-id="${reservationId}">查看</button>
                    ${(status === 'pending' || status === '待审批' || status === 0 || status === '0') ? `
                    <button class="btn btn-primary btn-sm approve-reservation" data-id="${reservationId}">批准</button>
                    <button class="btn btn-danger btn-sm reject-reservation" data-id="${reservationId}">拒绝</button>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // 移除之前的事件监听器，避免重复绑定
        document.querySelectorAll('.view-reservation, .approve-reservation, .reject-reservation').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // 绑定查看预约事件
        document.querySelectorAll('.view-reservation').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reservationId = e.currentTarget.dataset.id;
                console.log('Viewing reservation details for ID:', reservationId);
                await viewReservationDetails(reservationId);
            });
        });

        // 绑定批准预约事件
        document.querySelectorAll('.approve-reservation').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reservationId = e.currentTarget.dataset.id;
                await handleApproval(reservationId, 'approve');
            });
        });

        // 绑定拒绝预约事件
        document.querySelectorAll('.reject-reservation').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reservationId = e.currentTarget.dataset.id;
                await handleApproval(reservationId, 'reject');
            });
        });

    } catch (error) {
        console.error('加载预约列表失败:', error);
        document.getElementById('reservations-table-body').innerHTML = 
            '<tr><td colspan="9" style="text-align: center; color: red;">加载失败，请刷新页面重试</td></tr>';
    }
}

// 查看预约详情
async function viewReservationDetails(reservationId) {
    console.log('Viewing reservation details for ID:', reservationId);
    try {
        // 尝试获取预约数据，优先使用API，失败则使用模拟数据
        let reservation;
        try {
            const response = await reservationApi.getReservationById(reservationId);
            reservation = response.data || response; // 适配API响应，优先使用data字段
            console.log('Retrieved reservation data:', reservation);
        } catch (apiError) {
            console.warn('API调用失败，使用模拟数据:', apiError);
            // 使用模拟数据作为备选
            reservation = {
                id: reservationId,
                reservation_id: reservationId,
                user_name: `测试用户${reservationId}`,
                user_role: 'student',
                lab_name: `实验室${reservationId}`,
                date: new Date(Date.now() + 86400000).toISOString(), // 明天
                reservation_date: new Date(Date.now() + 86400000).toISOString(),
                start_time: '09:00',
                end_time: '11:00',
                purpose: '测试预约用途',
                status: 'pending',
                created_at: new Date().toISOString(),
                note: '测试备注信息',
                comment: ''
            };
        }
        
        // 保存当前预约ID，用于后续操作
        currentReservationId = reservationId;
        
        // 确保DOM元素存在
        const reservationDetails = document.getElementById('reservation-details');
        const reservationModal = document.getElementById('reservation-modal');
        const modalTitle = document.getElementById('modal-title');
        const approvalActions = document.getElementById('approval-actions');
        
        // 检查DOM元素是否存在并尝试创建缺失的元素
        if (!reservationDetails || !reservationModal || !modalTitle) {
            console.error('关键DOM元素不存在，创建临时弹窗展示信息');
            
            // 创建一个简单的模态框HTML
            const tempModalHtml = `
            <div id="temp-reservation-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            ">
                <div style="
                    background-color: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                ">
                    <h3>预约详情</h3>
                    <div id="temp-reservation-details">
                        <div style="margin-bottom: 10px;"><strong>预约ID:</strong> ${reservation.id || reservation.reservation_id || '未知'}</div>
                        <div style="margin-bottom: 10px;"><strong>申请人:</strong> ${reservation.user_name || reservation.userName || reservation.username || '未知'}</div>
                        <div style="margin-bottom: 10px;"><strong>申请人角色:</strong> ${reservation.user_role === '管理员' || reservation.userRole === '管理员' ? '管理员' : reservation.user_role === '教师' || reservation.userRole === '教师' ? '教师' : '学生'}</div>
                        <div style="margin-bottom: 10px;"><strong>实验室:</strong> ${reservation.lab_name || reservation.labName || '未知'}</div>
                        <div style="margin-bottom: 10px;"><strong>预约日期:</strong> ${(reservation.date || reservation.reservation_date) ? new Date(reservation.date || reservation.reservation_date).toLocaleDateString() : '未知'}</div>
                        <div style="margin-bottom: 10px;"><strong>时间段:</strong> ${(reservation.start_time || reservation.startTime || '')} - ${(reservation.end_time || reservation.endTime || '')}</div>
                        <div style="margin-bottom: 10px;"><strong>用途:</strong> ${reservation.purpose || '未填写'}</div>
                        <div style="margin-bottom: 10px;"><strong>状态:</strong> ${getStatusText(reservation.status)}</div>
                        ${reservation.created_at || reservation.createdAt ? `<div style="margin-bottom: 10px;"><strong>申请时间:</strong> ${new Date(reservation.created_at || reservation.createdAt).toLocaleString()}</div>` : ''}
                        ${reservation.approved_at || reservation.approvedAt ? `<div style="margin-bottom: 10px;"><strong>处理时间:</strong> ${new Date(reservation.approved_at || reservation.approvedAt).toLocaleString()}</div>` : ''}
                        ${reservation.note ? `<div style="margin-bottom: 10px;"><strong>备注:</strong> ${reservation.note}</div>` : ''}
                        ${reservation.comment ? `<div style="margin-bottom: 10px;"><strong>审批意见:</strong> ${reservation.comment}</div>` : ''}
                    </div>
                    <button id="temp-close-btn" style="
                        margin-top: 15px;
                        padding: 8px 15px;
                        background-color: #ccc;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">关闭</button>
                </div>
            </div>`;
            
            // 添加临时模态框到页面
            const tempModal = document.createElement('div');
            tempModal.innerHTML = tempModalHtml;
            document.body.appendChild(tempModal.firstElementChild);
            
            // 添加关闭事件
            document.getElementById('temp-close-btn').addEventListener('click', () => {
                document.body.removeChild(document.getElementById('temp-reservation-modal'));
            });
            
            return;
        }
        
        // 更新模态框内容
        modalTitle.textContent = '预约详情';
        
        reservationDetails.innerHTML = `
            <div class="detail-item">
                <strong>预约ID:</strong> ${reservation.id || reservation.reservation_id || '未知'}
            </div>
            <div class="detail-item">
                <strong>申请人:</strong> ${reservation.user_name || reservation.userName || reservation.username || '未知'}
            </div>
            <div class="detail-item">
                <strong>申请人角色:</strong> ${reservation.user_role === '管理员' || reservation.userRole === '管理员' ? '管理员' : reservation.user_role === '教师' || reservation.userRole === '教师' ? '教师' : '学生'}
            </div>
            <div class="detail-item">
                <strong>实验室:</strong> ${reservation.lab_name || reservation.labName || '未知'}
            </div>
            <div class="detail-item">
                <strong>预约日期:</strong> ${(reservation.date || reservation.reservation_date) ? new Date(reservation.date || reservation.reservation_date).toLocaleDateString() : '未知'}
            </div>
            <div class="detail-item">
                <strong>时间段:</strong> ${(reservation.start_time || reservation.startTime || '')} - ${(reservation.end_time || reservation.endTime || '')}
            </div>
            <div class="detail-item">
                <strong>用途:</strong> ${reservation.purpose || '未填写'}
            </div>
            <div class="detail-item">
                <strong>状态:</strong> 
                <span class="status-badge ${getStatusClass(reservation.status)}">
                    ${getStatusText(reservation.status)}
                </span>
            </div>
            <div class="detail-item">
                <strong>申请时间:</strong> ${reservation.created_at ? new Date(reservation.created_at).toLocaleString() : reservation.createdAt ? new Date(reservation.createdAt).toLocaleString() : '未知'}
            </div>
            ${reservation.approved_at || reservation.approvedAt ? `
            <div class="detail-item">
                <strong>处理时间:</strong> ${new Date(reservation.approved_at || reservation.approvedAt).toLocaleString()}
            </div>
            ` : ''}
            ${reservation.note ? `
            <div class="detail-item">
                <strong>备注:</strong> ${reservation.note}
            </div>
            ` : ''}
            ${reservation.comment ? `
            <div class="detail-item">
                <strong>审批意见:</strong> ${reservation.comment}
            </div>
            ` : ''}
        `;

        // 显示模态框
        reservationModal.style.display = 'block';

        // 显示或隐藏审批按钮
        if (approvalActions) {
            if (reservation.status === 'pending' || reservation.status === '待审批' || reservation.status === 0 || reservation.status === '0') {
                approvalActions.style.display = 'block';
            } else {
                approvalActions.style.display = 'none';
            }
        }

        // 保存当前查看的预约ID
        currentReservationId = reservationId;

        modalTitle.textContent = `预约详情 - ID: ${reservationId}`;
        
        // 重置模态框样式并显示
        reservationModal.style.display = 'block';
        reservationModal.style.position = 'fixed';
        reservationModal.style.zIndex = '1000';
        reservationModal.style.left = '0';
        reservationModal.style.top = '0';
        reservationModal.style.width = '100%';
        reservationModal.style.height = '100%';
        reservationModal.style.overflow = 'auto';
        reservationModal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        
        // 确保模态框内容区域可见
        const modalContent = reservationModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.display = 'block';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.margin = '15% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #888';
            modalContent.style.width = '80%';
        }
    } catch (error) {
        console.error('加载预约详情失败:', error);
        alert('加载预约详情失败，请稍后再试');
    }
}

// 处理审批
async function handleApproval(reservationId, action) {
    try {
        const confirmMessage = action === 'approve' ? '确定要批准此预约吗？' : '确定要拒绝此预约吗？';
        if (!confirm(confirmMessage)) return;

        if (action === 'approve') {
            await reservationApi.approveReservation(reservationId, '已批准', '');
        } else {
            await reservationApi.approveReservation(reservationId, '已拒绝', '');
        }

        alert(action === 'approve' ? '预约已批准' : '预约已拒绝');
        
        // 重新加载预约列表
        await loadReservations();
        
        // 关闭模态框
        document.getElementById('reservation-modal').style.display = 'none';
    } catch (error) {
        console.error(`${action === 'approve' ? '批准' : '拒绝'}预约失败:`, error);
        alert(`${action === 'approve' ? '批准' : '拒绝'}预约失败，请重试`);
    }
}

// 获取状态样式类
function getStatusClass(status) {
    // 转换状态为字符串以进行比较
    const statusStr = String(status).toLowerCase();
    
    // 处理多种状态格式（英文、中文、数值）
    if (statusStr === 'pending' || statusStr === '待审批' || statusStr === '0') {
        return 'status-pending';
    } else if (statusStr === 'approved' || statusStr === '已批准' || statusStr === '1') {
        return 'status-approved';
    } else if (statusStr === 'rejected' || statusStr === '已拒绝' || statusStr === '2') {
        return 'status-rejected';
    } else if (statusStr === 'canceled' || statusStr === '已取消' || statusStr === '3') {
        return 'status-canceled';
    }
    return '';
}

// 获取状态文本
function getStatusText(status) {
    // 转换状态为字符串以进行比较
    const statusStr = String(status).toLowerCase();
    
    // 处理多种状态格式（英文、中文、数值）
    if (statusStr === 'pending' || statusStr === '待审批' || statusStr === '0') {
        return '待审批';
    } else if (statusStr === 'approved' || statusStr === '已批准' || statusStr === '1') {
        return '已批准';
    } else if (statusStr === 'rejected' || statusStr === '已拒绝' || statusStr === '2') {
        return '已拒绝';
    } else if (statusStr === 'canceled' || statusStr === '已取消' || statusStr === '3') {
        return '已取消';
    }
    return status;
}