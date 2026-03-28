const jwt = require('jsonwebtoken');
const db = require('../config/db');

// JWT密钥配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = '24h';

// 生成JWT令牌
function generateToken(user) {
    return jwt.sign(
        {
            user_id: user.user_id,
            username: user.username,
            role: user.role,
            department: user.department
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// 验证JWT令牌
async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 检查用户是否仍然存在
        const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [decoded.user_id]);
        if (users.length === 0) {
            // 如果模拟数据模式，允许使用token中的信息
            if (db.isUsingMock() && decoded.user_id) {
                console.log('在模拟数据模式下，允许使用令牌中的用户信息');
                return decoded;
            }
            throw new Error('用户不存在');
        }
        
        return decoded;
    } catch (error) {
        // 如果是无效令牌错误，尝试在模拟模式下直接返回解码信息
        if (error.name === 'JsonWebTokenError' && db.isUsingMock()) {
            console.log('在模拟数据模式下，跳过严格的令牌验证');
            try {
                // 不验证签名，直接解码获取信息
                const decoded = jwt.decode(token);
                if (decoded) {
                    return decoded;
                }
            } catch (decodeError) {
                // 解码失败则仍然抛出错误
            }
        }
        throw new Error(error.message || '无效的令牌');
    }
}

// 认证中间件
async function authMiddleware(req, res, next) {
    try {
        // 从请求头获取Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }
        
        // 提取令牌
        const token = authHeader.split(' ')[1];
        
        // 检测是否为模拟token
        let decoded = null;
        if (token && (token.startsWith('mock_token_') || /^mock_token_/.test(token))) {
            // 处理模拟token
            console.log('检测到模拟token，使用模拟用户信息');
            
            // 从token中解析用户角色信息
            const tokenParts = token.split('_');
            if (tokenParts.length >= 3) {
                const role = tokenParts[2];
                decoded = {
                    user_id: parseInt(tokenParts[3] || '1'),
                    username: role === 'admin' ? 'admin' : 'user',
                    role: role === 'admin' ? '管理员' : '教师',
                    department: '测试部门'
                };
            }
        } else {
            // 验证真实JWT令牌
            decoded = await verifyToken(token);
        }
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: '无效的令牌'
            });
        }
        
        // 将用户信息添加到请求对象
        req.user = decoded;
        
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message || '认证失败'
        });
    }
}

// 权限中间件 - 管理员
function adminMiddleware(req, res, next) {
    if (req.user && req.user.role === '管理员') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: '权限不足，需要管理员权限'
        });
    }
}

// 权限中间件 - 教师或管理员
function teacherOrAdminMiddleware(req, res, next) {
    if (req.user && (req.user.role === '教师' || req.user.role === '管理员')) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: '权限不足，需要教师或管理员权限'
        });
    }
}

// 权限中间件 - 学生
function studentMiddleware(req, res, next) {
    if (req.user && req.user.role === '学生') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: '权限不足，需要学生权限'
        });
    }
}

// 权限中间件 - 检查用户是否为资源所有者或管理员
async function resourceOwnerOrAdminMiddleware(req, res, next) {
    try {
        const resourceId = req.params.id;
        const resourceType = req.originalUrl.includes('reservation') ? 'reservation' : 'user';
        
        let query, params;
        
        if (resourceType === 'reservation') {
            query = 'SELECT user_id FROM reservations WHERE reservation_id = ?';
            params = [resourceId];
        } else {
            query = 'SELECT user_id FROM users WHERE user_id = ?';
            params = [resourceId];
        }
        
        const [result] = await db.query(query, params);
        
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: '资源不存在'
            });
        }
        
        const resourceOwnerId = result[0].user_id;
        
        // 如果是管理员或资源所有者，则允许访问
        if (req.user.role === '管理员' || req.user.user_id === resourceOwnerId) {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: '权限不足，只能访问自己的资源'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '验证资源所有权失败'
        });
    }
}

module.exports = {
    generateToken,
    verifyToken,
    authMiddleware,
    authenticate: authMiddleware, // 添加别名authenticate
    adminMiddleware,
    isAdmin: adminMiddleware, // 添加别名isAdmin
    teacherOrAdminMiddleware,
    studentMiddleware,
    resourceOwnerOrAdminMiddleware
};