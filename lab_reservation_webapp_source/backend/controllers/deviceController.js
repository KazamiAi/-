// 设备管理控制器
const db = require('../config/db');

async function getAllDevices(req, res) {
    try {
        const [rows] = await db.query('SELECT * FROM devices');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取设备列表失败', error: error.message });
    }
}

async function getDeviceById(req, res) {
    try {
        const [rows] = await db.query('SELECT * FROM devices WHERE device_id = ?', [req.params.id]);
        const device = rows[0];
        if (device) {
            res.json({ success: true, data: device });
        } else {
            res.status(404).json({ success: false, message: '设备不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '获取设备信息失败', error: error.message });
    }
}

async function createDevice(req, res) {
    try {
        const { device_name, device_model, lab_id, purchase_date, status, description } = req.body;
        const [result] = await db.query(
            'INSERT INTO devices (device_name, device_model, lab_id, purchase_date, status, description) VALUES (?, ?, ?, ?, ?, ?)',
            [device_name, device_model, lab_id, purchase_date, status || '正常', description]
        );
        res.json({ success: true, message: '设备创建成功', device_id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: '创建设备失败', error: error.message });
    }
}

async function updateDevice(req, res) {
    try {
        const { device_name, device_model, lab_id, purchase_date, status, description } = req.body;
        const [result] = await db.query(
            'UPDATE devices SET device_name = ?, device_model = ?, lab_id = ?, purchase_date = ?, status = ?, description = ? WHERE device_id = ?',
            [device_name, device_model, lab_id, purchase_date, status, description, req.params.id]
        );
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '设备信息更新成功' });
        } else {
            res.status(404).json({ success: false, message: '设备不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '更新设备信息失败', error: error.message });
    }
}

async function updateDeviceStatus(req, res) {
    try {
        const { status } = req.body;
        const [result] = await db.query('UPDATE devices SET status = ? WHERE device_id = ?', [status, req.params.id]);
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '设备状态更新成功' });
        } else {
            res.status(404).json({ success: false, message: '设备不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '更新设备状态失败', error: error.message });
    }
}

async function deleteDevice(req, res) {
    try {
        const [result] = await db.query('DELETE FROM devices WHERE device_id = ?', [req.params.id]);
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '设备删除成功' });
        } else {
            res.status(404).json({ success: false, message: '设备不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '删除设备失败', error: error.message });
    }
}

async function getDeviceMaintenance(req, res) {
    try {
        const [rows] = await db.query('SELECT * FROM maintenance_records WHERE device_id = ? ORDER BY maintenance_date DESC', [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取维护记录失败', error: error.message });
    }
}

async function createMaintenance(req, res) {
    try {
        const { maintenance_date, maintainer_id, maintenance_type, description, cost } = req.body;
        const [result] = await db.query(
            'INSERT INTO maintenance_records (device_id, maintenance_date, maintainer_id, maintenance_type, description, cost) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.id, maintenance_date || new Date().toISOString().split('T')[0], maintainer_id, maintenance_type, description, cost]
        );
        res.json({ success: true, message: '维护记录创建成功', record_id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: '创建维护记录失败', error: error.message });
    }
}

module.exports = {
    getAllDevices,
    getDeviceById,
    createDevice,
    updateDevice,
    updateDeviceStatus,
    deleteDevice,
    getDeviceMaintenance,
    createMaintenance
};