// 实验室管理控制器
const db = require('../config/db');

async function getAllLabs(req, res) {
    try {
        const [rows] = await db.query('SELECT * FROM laboratories');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取实验室列表失败', error: error.message });
    }
}

async function getLabById(req, res) {
    try {
        const [rows] = await db.query('SELECT * FROM laboratories WHERE lab_id = ?', [req.params.id]);
        const lab = rows[0];
        if (lab) {
            res.json({ success: true, data: lab });
        } else {
            res.status(404).json({ success: false, message: '实验室不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '获取实验室信息失败', error: error.message });
    }
}

async function createLab(req, res) {
    try {
        const { lab_name, location, capacity, description, manager_id } = req.body;
        const [result] = await db.query(
            'INSERT INTO laboratories (lab_name, location, capacity, description, manager_id) VALUES (?, ?, ?, ?, ?)',
            [lab_name, location, capacity, description, manager_id]
        );
        res.json({ success: true, message: '实验室创建成功', lab_id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: '创建实验室失败', error: error.message });
    }
}

async function updateLab(req, res) {
    try {
        const { lab_name, location, capacity, description, status, manager_id } = req.body;
        const [result] = await db.query(
            'UPDATE laboratories SET lab_name = ?, location = ?, capacity = ?, description = ?, status = ?, manager_id = ? WHERE lab_id = ?',
            [lab_name, location, capacity, description, status, manager_id, req.params.id]
        );
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '实验室信息更新成功' });
        } else {
            res.status(404).json({ success: false, message: '实验室不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '更新实验室信息失败', error: error.message });
    }
}

async function deleteLab(req, res) {
    try {
        const [result] = await db.query('DELETE FROM laboratories WHERE lab_id = ?', [req.params.id]);
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '实验室删除成功' });
        } else {
            res.status(404).json({ success: false, message: '实验室不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '删除实验室失败', error: error.message });
    }
}

async function getLabDevices(req, res) {
    try {
        const [rows] = await db.query('SELECT * FROM devices WHERE lab_id = ?', [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取实验室设备失败', error: error.message });
    }
}

async function getLabStats(req, res) {
    try {
        // 获取设备数量
        const [devices] = await db.query('SELECT COUNT(*) as total_devices FROM devices WHERE lab_id = ?', [req.params.id]);
        
        // 获取使用统计（最近一个月）
        const [reservations] = await db.query(
            'SELECT COUNT(*) as total_reservations FROM reservations WHERE lab_id = ? AND start_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)',
            [req.params.id]
        );
        
        res.json({
            success: true, 
            data: {
                total_devices: devices[0].total_devices,
                total_reservations: reservations[0].total_reservations,
                usage_rate: reservations[0].total_reservations / 30 // 简单计算日均使用率
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
    }
}

module.exports = {
    getAllLabs,
    getLabById,
    createLab,
    updateLab,
    deleteLab,
    getLabDevices,
    getLabStats
};