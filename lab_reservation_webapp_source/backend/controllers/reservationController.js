// 预约管理控制器
const db = require('../config/db');

async function getUserReservations(req, res) {
    try {
        const userId = req.user.user_id;
        const [rows] = await db.query(
            `SELECT r.*, l.lab_name, u.username 
             FROM reservations r 
             JOIN laboratories l ON r.lab_id = l.lab_id
             JOIN users u ON r.user_id = u.user_id
             WHERE r.user_id = ? 
             ORDER BY r.reservation_date DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取预约列表失败', error: error.message });
    }
}

async function getAllReservations(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT r.*, l.lab_name, u.username 
             FROM reservations r 
             JOIN laboratories l ON r.lab_id = l.lab_id
             JOIN users u ON r.user_id = u.user_id
             ORDER BY r.reservation_date DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取所有预约失败', error: error.message });
    }
}

async function getReservationById(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT r.*, l.lab_name, u.username 
             FROM reservations r 
             JOIN laboratories l ON r.lab_id = l.lab_id
             JOIN users u ON r.user_id = u.user_id
             WHERE r.reservation_id = ?`, 
            [req.params.id]
        );
        const reservation = rows[0];
        
        if (reservation) {
            // 获取预约的设备信息
            const [devices] = await db.query(
                `SELECT d.device_id, d.device_name, d.device_model 
                 FROM reservation_devices rd 
                 JOIN devices d ON rd.device_id = d.device_id 
                 WHERE rd.reservation_id = ?`,
                [req.params.id]
            );
            reservation.devices = devices;
            
            res.json({ success: true, data: reservation });
        } else {
            res.status(404).json({ success: false, message: '预约不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '获取预约信息失败', error: error.message });
    }
}

async function createReservation(req, res) {
    try {
        const { lab_id, reservation_date, start_time, end_time, purpose, device_ids } = req.body;
        const userId = req.user.user_id;
        
        // 先检查时间冲突
        const conflict = await checkConflictInternal(lab_id, reservation_date, start_time, end_time);
        if (conflict) {
            return res.status(400).json({ success: false, message: '该时间段已被预约' });
        }
        
        // 开始事务
        await db.query('START TRANSACTION');
        
        try {
            // 创建预约记录
            const [result] = await db.query(
                'INSERT INTO reservations (user_id, lab_id, reservation_date, start_time, end_time, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, lab_id, reservation_date, start_time, end_time, purpose, '待审批']
            );
            
            const reservationId = result.insertId;
            
            // 如果有设备预约，记录到预约设备表
            if (device_ids && device_ids.length > 0) {
                for (const deviceId of device_ids) {
                    await db.query(
                        'INSERT INTO reservation_devices (reservation_id, device_id) VALUES (?, ?)',
                        [reservationId, deviceId]
                    );
                }
            }
            
            // 提交事务
            await db.query('COMMIT');
            res.json({ success: true, message: '预约创建成功', reservation_id: reservationId });
        } catch (error) {
            // 回滚事务
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '创建预约失败', error: error.message });
    }
}

async function updateReservation(req, res) {
    try {
        const { reservation_date, start_time, end_time, purpose } = req.body;
        const [rows] = await db.query('SELECT * FROM reservations WHERE reservation_id = ?', [req.params.id]);
        const reservation = rows[0];
        
        if (!reservation) {
            return res.status(404).json({ success: false, message: '预约不存在' });
        }
        
        // 权限检查已经由中间件处理，这里只需要检查状态
        if (reservation.status !== '待审批') {
            return res.status(400).json({ success: false, message: '已审批的预约无法修改' });
        }
        
        // 检查时间冲突（排除当前预约）
        const conflict = await checkConflictInternal(
            reservation.lab_id, 
            reservation_date, 
            start_time, 
            end_time, 
            req.params.id
        );
        if (conflict) {
            return res.status(400).json({ success: false, message: '该时间段已被预约' });
        }
        
        const [result] = await db.query(
            'UPDATE reservations SET reservation_date = ?, start_time = ?, end_time = ?, purpose = ? WHERE reservation_id = ?',
            [reservation_date, start_time, end_time, purpose, req.params.id]
        );
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '预约更新成功' });
        } else {
            res.status(404).json({ success: false, message: '预约不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '更新预约失败', error: error.message });
    }
}

async function cancelReservation(req, res) {
    try {
        const [result] = await db.query(
            'UPDATE reservations SET status = ? WHERE reservation_id = ?',
            ['已取消', req.params.id]
        );
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '预约已取消' });
        } else {
            res.status(404).json({ success: false, message: '预约不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '取消预约失败', error: error.message });
    }
}

async function approveReservation(req, res) {
    try {
        const { status, comment } = req.body;
        const [result] = await db.query(
            'UPDATE reservations SET status = ?, approval_comment = ?, approved_by = ? WHERE reservation_id = ?',
            [status, comment, req.user.user_id, req.params.id]
        );
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: '预约审批完成' });
        } else {
            res.status(404).json({ success: false, message: '预约不存在' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '审批预约失败', error: error.message });
    }
}

async function checkConflict(req, res) {
    try {
        const { lab_id, reservation_date, start_time, end_time, exclude_id } = req.body;
        const hasConflict = await checkConflictInternal(lab_id, reservation_date, start_time, end_time, exclude_id);
        res.json({ success: true, hasConflict });
    } catch (error) {
        res.status(500).json({ success: false, message: '检查冲突失败', error: error.message });
    }
}

// 内部方法：检查时间冲突
async function checkConflictInternal(labId, date, startTime, endTime, excludeId = null) {
    const params = [labId, date];
    let query = 'SELECT * FROM reservations WHERE lab_id = ? AND reservation_date = ? AND status IN ("已审批", "进行中")';
    
    if (excludeId) {
        query += ' AND reservation_id != ?';
        params.push(excludeId);
    }
    
    query += ' AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))';
    params.push(endTime, startTime, endTime, startTime, startTime, endTime);
    
    const [rows] = await db.query(query, params);
    return rows.length > 0;
}

module.exports = {
    getUserReservations,
    getAllReservations,
    getReservationById,
    createReservation,
    updateReservation,
    cancelReservation,
    approveReservation,
    checkConflict
};