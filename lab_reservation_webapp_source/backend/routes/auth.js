// 认证相关路由
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware, teacherOrAdminMiddleware } = require('../middlewares/authMiddleware');

// 登录路由
router.post('/login', authController.login);

// 登出路由
router.post('/logout', authMiddleware, authController.logout);

// 获取当前用户信息
router.get('/me', authMiddleware, authController.getCurrentUser);

// 修改密码
router.put('/change-password', authMiddleware, authController.changePassword);

// 用户相关路由（需要认证）
// 注册用户（仅管理员）
router.post('/register', authMiddleware, adminMiddleware, authController.register);

// 更新用户信息
router.put('/users/:id', authMiddleware, authController.updateUser);

// 获取用户列表（仅管理员或教师）
router.get('/users', authMiddleware, teacherOrAdminMiddleware, async (req, res) => {
    try {
        const db = require('../config/db');
        const [users] = await db.query(
            'SELECT user_id, username, name, real_name, role, role_name, department, email, phone FROM users'
        );
        
        // 格式化用户数据
        const formattedUsers = users.map(user => ({
            user_id: user.user_id,
            username: user.username,
            name: user.name || user.real_name,
            role: user.role || user.role_name,
            department: user.department,
            email: user.email,
            phone: user.phone
        }));
        
        res.json({
            success: true,
            data: formattedUsers
        });
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户列表失败，请稍后重试'
        });
    }
});

// 删除用户（仅管理员）
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const db = require('../config/db');
        
        // 不允许删除自己
        if (userId === req.user.user_id.toString()) {
            return res.status(400).json({
                success: false,
                message: '不能删除自己的账号'
            });
        }
        
        const [result] = await db.query('DELETE FROM users WHERE user_id = ?', [userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 记录操作日志
        await db.query(
            'INSERT INTO system_logs (user_id, action, object_type, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.user_id, '删除用户', '用户', req.ip]
        );
        
        res.json({
            success: true,
            message: '用户删除成功'
        });
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({
            success: false,
            message: '删除用户失败，请稍后重试'
        });
    }
});

module.exports = router;