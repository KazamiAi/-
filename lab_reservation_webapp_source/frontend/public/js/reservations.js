// 我的预约页面逻辑

// 初始化页面
async function initReservations() {
    // 初始化认证
    await auth.initAuth();
    
    // 加载预约列表
    await loadReservations();
    
    // 绑定筛选按钮事件
    document.getElementById('filter-btn').addEventListener('click', loadReservations);
    
    // 绑定状态筛选改变事件
    document.getElementById('status-filter').addEventListener('change', loadReservations);
}

// 加载预约列表
async function loadReservations() {
    try {
        // 获取筛选条件
        const statusFilter = document.getElementById('status-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        
        // 获取我的预约
        const response = await api.reservation.getUserReservations();
        
        if (response.success) {
            let reservations = response.data;
            
            // 应用筛选
            if (statusFilter) {
                reservations = reservations.filter(r => r.status === statusFilter);
            }
            
            if (dateFilter) {
                reservations = reservations.filter(r => r.reservation_date === dateFilter);
            }
            
            // 按日期排序（最新的在前）
            reservations.sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date));
            
            // 渲染预约列表
            renderReservationsList(reservations);
        }
    } catch (error) {
        console.error('加载预约列表失败:', error);
        const tbody = document.getElementById('reservations-table-body');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c;">加载失败</td></tr>';
    }
}

// 渲染预约列表
function renderReservationsList(reservations) {
    const tbody = document.getElementById('reservations-table-body');
    
    if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">暂无预约记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    reservations.forEach(reservation => {
        const row = document.createElement('tr');
        
        // 格式化时间段
        const timeRange = `${reservation.start_time} - ${reservation.end_time}`;
        
        // 状态标签
        const statusBadge = getStatusBadge(reservation.status);
        
        // 操作按钮
        let actions = `<a href="view-reservation.html?id=${reservation.reservation_id}" class="btn btn-primary">查看</a>`;
        
        // 根据状态显示不同的操作按钮
        if (reservation.status === '待审批') {
            actions += ` <button class="btn btn-danger" onclick="cancelReservation(${reservation.reservation_id})">取消</button>`;
        }
        
        row.innerHTML = `
            <td>${reservation.lab_name || '实验室'}</td>
            <td>${reservation.reservation_date}</td>
            <td>${timeRange}</td>
            <td>${reservation.purpose || '-'}</td>
            <td>${statusBadge}</td>
            <td>${actions}</td>
        `;
        
        tbody.appendChild(row);
    });
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

// 取消预约
async function cancelReservation(reservationId) {
    if (!confirm('确定要取消这个预约吗？')) {
        return;
    }
    
    try {
        const response = await api.reservation.cancelReservation(reservationId);
        
        if (response.success) {
            alert('预约已成功取消');
            loadReservations();
        } else {
            alert('取消失败: ' + (response.message || '未知错误'));
        }
    } catch (error) {
        console.error('取消预约失败:', error);
        alert('取消失败，请稍后重试');
    }
}

// 暴露取消预约函数到全局
window.cancelReservation = cancelReservation;

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', initReservations);