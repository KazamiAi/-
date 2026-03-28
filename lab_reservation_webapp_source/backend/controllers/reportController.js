// 报表管理控制器（基本框架）
const db = require('../config/db');

async function getLabUsageStats(req, res) {
    try {
        const { start_date, end_date } = req.query;
        const query = `
            SELECT l.lab_name, 
                   COUNT(r.reservation_id) as total_reservations,
                   COUNT(CASE WHEN r.status = '已审批' THEN 1 END) as approved_reservations,
                   COUNT(CASE WHEN r.status = '已取消' THEN 1 END) as cancelled_reservations
            FROM laboratories l
            LEFT JOIN reservations r ON l.lab_id = r.lab_id
            WHERE r.reservation_date >= ? AND r.reservation_date <= ?
            GROUP BY l.lab_id
        `;
        const [stats] = await db.query(query, [start_date, end_date]);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取实验室使用统计失败', error: error.message });
    }
}

async function getDeviceUsageStats(req, res) {
    try {
        const { start_date, end_date } = req.query;
        const query = `
            SELECT d.device_name, d.device_model, 
                   COUNT(rd.reservation_id) as total_usage_times
            FROM devices d
            LEFT JOIN reservation_devices rd ON d.device_id = rd.device_id
            LEFT JOIN reservations r ON rd.reservation_id = r.reservation_id
            WHERE r.reservation_date >= ? AND r.reservation_date <= ?
            GROUP BY d.device_id
        `;
        const [stats] = await db.query(query, [start_date, end_date]);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取设备使用统计失败', error: error.message });
    }
}

async function getUserActivityStats(req, res) {
    try {
        const { start_date, end_date } = req.query;
        const query = `
            SELECT u.username, u.role,
                   COUNT(r.reservation_id) as reservation_count
            FROM users u
            LEFT JOIN reservations r ON u.user_id = r.user_id
            WHERE r.reservation_date >= ? AND r.reservation_date <= ?
            GROUP BY u.user_id
        `;
        const [stats] = await db.query(query, [start_date, end_date]);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取用户活动统计失败', error: error.message });
    }
}

async function getReservationStats(req, res) {
    try {
        const { start_date, end_date } = req.query;
        const query = `
            SELECT 
                COUNT(*) as total_reservations,
                COUNT(CASE WHEN status = '待审批' THEN 1 END) as pending,
                COUNT(CASE WHEN status = '已审批' THEN 1 END) as approved,
                COUNT(CASE WHEN status = '已拒绝' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled,
                COUNT(CASE WHEN status = '进行中' THEN 1 END) as ongoing,
                COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed
            FROM reservations
            WHERE reservation_date >= ? AND reservation_date <= ?
        `;
        const [rows] = await db.query(query, [start_date, end_date]);
        const stats = rows[0];
        res.json({ success: true, data: stats || { total_reservations: 0 } });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取预约统计失败', error: error.message });
    }
}

async function exportReport(req, res) {
    try {
        const { type } = req.params;
        // 简单实现，返回JSON格式数据
        res.json({ success: true, message: '导出功能开发中' });
    } catch (error) {
        res.status(500).json({ success: false, message: '导出报表失败', error: error.message });
    }
}

module.exports = {
    getLabUsageStats,
    getDeviceUsageStats,
    getUserActivityStats,
    getReservationStats,
    exportReport
};