// 统计报表页面的JavaScript

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

    // 初始化选项卡
    initTabs();

    // 加载统计数据
    await loadReportData();

    // 应用筛选按钮事件
    document.getElementById('apply-filter-btn').addEventListener('click', loadReportData);
});

// 初始化选项卡
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 设置当前活动状态
            button.classList.add('active');
            const tabId = button.dataset.tab;
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });
}

// 加载报表数据
async function loadReportData() {
    try {
        const timeRange = document.getElementById('time-range-filter').value;
        
        // 加载实验室使用统计
        const labUsageResponse = await reportApi.getLabUsageStats();
        // 加载预约统计
        const reservationResponse = await reportApi.getReservationStats();
        
        // 从响应中提取数据
        const labUsageStats = labUsageResponse.data || labUsageResponse;
        const reservationStats = reservationResponse.data || reservationResponse;

        // 更新统计卡片
        updateStatCards(reservationStats);

        // 更新实验室使用图表
        updateLabsUsageChart(labUsageStats);

        // 更新各选项卡数据
        updateStatusStats(reservationStats);
        updateDepartmentStats(reservationStats);
        updateTrendStats(reservationStats);

    } catch (error) {
        console.error('加载报表数据失败:', error);
        alert('加载报表数据失败，请刷新页面重试');
    }
}

// 更新统计卡片
function updateStatCards(stats) {
    // 适配模拟数据的字段名
    const totalReservations = stats.total_reservations || stats.totalReservations || 0;
    const approvedReservations = stats.approved_reservations || stats.approvedReservations || 0;
    const averageUsageRate = stats.averageUsageRate || 0; // 如果模拟数据中没有，使用0
    const busiestLab = stats.busiestLab || '--';
    
    document.getElementById('total-reservations').textContent = totalReservations;
    document.getElementById('approved-reservations').textContent = approvedReservations;
    document.getElementById('average-usage').textContent = `${averageUsageRate}%`;
    document.getElementById('busiest-lab').textContent = busiestLab;
}

// 更新实验室使用图表
function updateLabsUsageChart(labStats) {
    const chartContainer = document.getElementById('labs-usage-chart');
    
    // 简单的条形图实现
    let chartHTML = `
        <div class="bar-chart">
            <div class="chart-title">各实验室使用时长(小时)</div>
            <div class="chart-bars">
    `;

    labStats.forEach(lab => {
        // 适配模拟数据的字段名
        const labName = lab.lab_name || lab.labName || '未知实验室';
        const totalHours = lab.total_hours || lab.totalHours || 0;
        const reservationCount = lab.reservation_count || lab.reservationCount || 0;
        
        const percentage = Math.min(100, (totalHours / 100) * 100); // 假设最大值为100小时
        chartHTML += `
            <div class="bar-item">
                <div class="bar-label">${labName}</div>
                <div class="bar-container">
                    <div class="bar" style="width: ${percentage}%;" title="${totalHours}小时">
                        <span class="bar-value">${totalHours}</span>
                    </div>
                </div>
                <div class="bar-info">预约${reservationCount}次</div>
            </div>
        `;
    });

    chartHTML += `
            </div>
        </div>
    `;

    chartContainer.innerHTML = chartHTML;
}

// 更新状态统计
function updateStatusStats(stats) {
    const tbody = document.getElementById('status-stats-body');
    tbody.innerHTML = '';

    // 适配模拟数据的字段名
    const statusDistribution = stats.by_status || stats.statusDistribution || [];

    if (!statusDistribution || statusDistribution.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">暂无数据</td></tr>';
        return;
    }

    statusDistribution.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="status-badge ${getStatusClass(item.status)}">
                    ${getStatusText(item.status)}
                </span>
            </td>
            <td>${item.count}</td>
            <td>${item.percentage}%</td>
        `;
        tbody.appendChild(row);
    });
}

// 更新部门统计
function updateDepartmentStats(stats) {
    const tbody = document.getElementById('department-stats-body');
    tbody.innerHTML = '';

    // 适配模拟数据的字段名
    const departmentDistribution = stats.by_department || stats.departmentDistribution || [];

    if (!departmentDistribution || departmentDistribution.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">暂无数据</td></tr>';
        return;
    }

    // 计算每个部门的百分比
    const totalCount = departmentDistribution.reduce((sum, item) => sum + (item.count || 0), 0);
    
    departmentDistribution.forEach(item => {
        const row = document.createElement('tr');
        const percentage = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : '0.0';
        row.innerHTML = `
            <td>${item.department}</td>
            <td>${item.count}</td>
            <td>${percentage}%</td>
        `;
        tbody.appendChild(row);
    });
}

// 更新趋势统计
function updateTrendStats(stats) {
    const tbody = document.getElementById('trend-stats-body');
    tbody.innerHTML = '';

    // 适配模拟数据的字段名
    const monthlyTrend = stats.monthly_trend || stats.monthlyTrend || [];

    if (!monthlyTrend || monthlyTrend.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">暂无数据</td></tr>';
        return;
    }

    // 计算环比增长率
    monthlyTrend.forEach((item, index) => {
        const row = document.createElement('tr');
        let growthRate = 0;
        
        if (index > 0) {
            const prevCount = monthlyTrend[index - 1].count || 0;
            const currentCount = item.count || 0;
            growthRate = prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;
        }
        
        const growthClass = growthRate > 0 ? 'text-success' : growthRate < 0 ? 'text-danger' : '';
        const growthIcon = growthRate > 0 ? '↑' : growthRate < 0 ? '↓' : '→';
        
        row.innerHTML = `
            <td>${item.month}</td>
            <td>${item.count}</td>
            <td class="${growthClass}">${growthIcon} ${Math.abs(growthRate).toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

// 获取状态样式类
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'status-pending';
        case 'approved':
            return 'status-approved';
        case 'rejected':
            return 'status-rejected';
        case 'canceled':
            return 'status-canceled';
        default:
            return '';
    }
}

// 获取状态文本
function getStatusText(status) {
    switch (status) {
        case 'pending':
            return '待审批';
        case 'approved':
            return '已批准';
        case 'rejected':
            return '已拒绝';
        case 'canceled':
            return '已取消';
        default:
            return status;
    }
}