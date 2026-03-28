// 认证控制器
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middlewares/authMiddleware');

// 用户登录
async function login(req, res) {
    try {
        const { username, password } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户名和密码'
            });
        }
        
        // 查询用户
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        
        const user = users[0];
        
        // 验证密码
        // 如果密码是明文的，先转为bcrypt加密
        const isPasswordValid = user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') 
            ? await bcrypt.compare(password, user.password_hash)
            : password === user.password_hash;
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        
        // 如果是明文密码，更新为bcrypt加密
        if (!user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newPasswordHash, user.user_id]);
        }
        
        // 生成JWT令牌
        const token = generateToken(user);
        
        // 记录登录日志
        await db.query(
            'INSERT INTO system_logs (user_id, action, object_type, ip_address) VALUES (?, ?, ?, ?)',
            [user.user_id, '登录系统', '用户', req.ip]
        );
        
        // 返回用户信息和令牌
        res.json({
            success: true,
            message: '登录成功',
            data: {
                token,
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    name: user.name || user.real_name,
                    role: user.role || user.role_name,
                    department: user.department,
                    email: user.email,
                    phone: user.phone
                }
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试'
        });
    }
}

// 用户注册（通常由管理员操作）
async function register(req, res) {
    try {
        const { username, password, name, role, department, email, phone } = req.body;
        
        // 验证必要字段
        if (!username || !password || !name || !role || !department) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的注册信息'
            });
        }
        
        // 检查用户名是否已存在
        const [existingUsers] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }
        
        // 验证角色
        const validRoles = ['学生', '教师', '管理员'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: '无效的角色类型'
            });
        }
        
        // 加密密码
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // 创建用户
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, name, role, department, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, passwordHash, name, role, department, email || null, phone || null]
        );
        
        // 记录操作日志
        await db.query(
            'INSERT INTO system_logs (user_id, action, object_type, ip_address) VALUES (?, ?, ?, ?)',
            [req.user?.user_id || null, '注册用户', '用户', req.ip]
        );
        
        res.json({
            success: true,
            message: '用户注册成功',
            data: {
                user_id: result.insertId,
                username,
                name,
                role,
                department,
                email,
                phone
            }
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            success: false,
            message: '注册失败，请稍后重试'
        });
    }
}

// 获取当前用户信息
async function getCurrentUser(req, res) {
    try {
        const userId = req.user.user_id;
        
        // 查询用户信息
        const [users] = await db.query(
            'SELECT user_id, username, name, real_name, role, role_name, department, email, phone FROM users WHERE user_id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        const user = users[0];
        res.json({
            success: true,
            data: {
                user_id: user.user_id,
                username: user.username,
                name: user.name || user.real_name,
                role: user.role || user.role_name,
                department: user.department,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败，请稍后重试'
        });
    }
}

// 更新用户信息
async function updateUser(req, res) {
    try {
        const userId = req.params.id;
        const { name, department, email, phone } = req.body;
        
        // 检查是否有权限更新
        if (req.user.role !== '管理员' && req.user.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '权限不足'
            });
        }
        
        // 更新用户信息
        const [result] = await db.query(
            'UPDATE users SET name = ?, department = ?, email = ?, phone = ? WHERE user_id = ?',
            [name, department, email || null, phone || null, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 获取更新后的用户信息
        const [updatedUsers] = await db.query(
            'SELECT user_id, username, name, real_name, role, role_name, department, email, phone FROM users WHERE user_id = ?',
            [userId]
        );
        
        // 记录操作日志
        await db.query(
            'INSERT INTO system_logs (user_id, action, object_type, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.user_id, '更新用户信息', '用户', req.ip]
        );
        
        const user = updatedUsers[0];
        res.json({
            success: true,
            message: '用户信息更新成功',
            data: {
                user_id: user.user_id,
                username: user.username,
                name: user.name || user.real_name,
                role: user.role || user.role_name,
                department: user.department,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('更新用户信息失败:', error);
        res.status(500).json({
            success: false,
            message: '更新用户信息失败，请稍后重试'
        });
    }
}

// 更改密码
async function changePassword(req, res) {
    try {
        const userId = req.user.user_id;
        const { currentPassword, newPassword } = req.body;
        
        // 验证输入
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '请输入当前密码和新密码'
            });
        }
        
        // 获取用户当前密码
        const [users] = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 验证当前密码
        const user = users[0];
        const isPasswordValid = user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') 
            ? await bcrypt.compare(currentPassword, user.password_hash)
            : currentPassword === user.password_hash;
        
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '当前密码错误'
            });
        }
        
        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        
        // 更新密码
        await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newPasswordHash, userId]);
        
        // 记录操作日志
        await db.query(
            'INSERT INTO system_logs (user_id, action, object_type, ip_address) VALUES (?, ?, ?, ?)',
            [userId, '修改密码', '用户', req.ip]
        );
        
        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('更改密码失败:', error);
        res.status(500).json({
            success: false,
            message: '更改密码失败，请稍后重试'
        });
    }
}

// 注销用户
async function logout(req, res) {
    try {
        // 记录登出日志
        if (req.user?.user_id) {
            await db.query(
                'INSERT INTO system_logs (user_id, action, object_type, ip_address) VALUES (?, ?, ?, ?)',
                [req.user.user_id, '退出系统', '用户', req.ip]
            );
        }
        
        res.json({
            success: true,
            message: '注销成功'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '注销失败，请稍后重试'
        });
    }
}

module.exports = {
    login,
    register,
    getCurrentUser,
    updateUser,
    changePassword,
    logout
};