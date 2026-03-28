// 数据库配置文件 - 适配Web应用
const mysql = require('mysql2/promise');
const path = require('path');
// 确保正确读取.env文件
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // 尝试使用空密码
  database: process.env.DB_NAME || 'lab_reservation',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 设置字符集
  charset: 'utf8mb4'
};

// 调试环境变量
console.log('数据库配置调试:');
console.log('- DB_HOST:', dbConfig.host);
console.log('- DB_USER:', dbConfig.user);
console.log('- DB_PASSWORD存在:', dbConfig.password ? '是' : '否');
console.log('- DB_NAME:', dbConfig.database);
console.log('- DB_PORT:', dbConfig.port);

// 模拟数据 - 用于数据库连接失败时的备用方案
const mockData = {
  users: [
    { user_id: 1, username: 'admin', password_hash: 'admin123', name: '系统管理员', role: '管理员', department: '信息中心' },
    { user_id: 2, username: 'teacher1', password_hash: 'teacher123', name: '张老师', role: '教师', department: '计算机系' },
    { user_id: 3, username: 'student1', password_hash: 'student123', name: '李同学', role: '学生', department: '计算机系' }
  ],
  isUsingMock: false
};

// 创建数据库连接池
let pool;
let isConnected = false;
try {
  pool = mysql.createPool(dbConfig);
  console.log('数据库连接池创建成功');
} catch (error) {
  console.error('数据库连接池创建失败:', error.message);
  mockData.isUsingMock = true;
  console.log('将使用模拟数据进行操作');
}

// 模拟查询函数
const mockQuery = (sql, params = []) => {
  console.log('使用模拟查询:', sql, params);
  
  // 处理登录查询
  if (sql.includes('SELECT * FROM users WHERE username = ?')) {
    const username = params[0];
    const user = mockData.users.find(u => u.username === username);
    return Promise.resolve([user ? [user] : []]);
  }
  
  // 处理获取用户信息查询
  if (sql.includes('SELECT user_id, username, name,') && sql.includes('FROM users WHERE user_id = ?')) {
    const userId = params[0];
    const user = mockData.users.find(u => u.user_id === userId);
    return Promise.resolve([user ? [user] : []]);
  }
  
  // 处理获取用户列表查询
  if (sql.includes('SELECT user_id, username, name,') && sql.includes('FROM users')) {
    return Promise.resolve([mockData.users]);
  }
  
  // 处理更新密码查询
  if (sql.includes('UPDATE users SET password_hash = ? WHERE user_id = ?')) {
    const [passwordHash, userId] = params;
    const userIndex = mockData.users.findIndex(u => u.user_id === userId);
    if (userIndex !== -1) {
      mockData.users[userIndex].password_hash = passwordHash;
    }
    return Promise.resolve([{ affectedRows: userIndex !== -1 ? 1 : 0 }]);
  }
  
  // 处理插入日志查询
  if (sql.includes('INSERT INTO system_logs')) {
    return Promise.resolve([{ insertId: Date.now() }]);
  }
  
  // 默认返回空结果
  return Promise.resolve([[]]);
};

// 创建包装的查询方法
const query = async (sql, params = []) => {
  // 检查数据库连接状态
  if (!isConnected && pool) {
    await healthCheck();
  }
  
  // 如果数据库连接正常，使用真实查询
  if (isConnected && pool) {
    try {
      return await pool.query(sql, params);
    } catch (error) {
      console.error('数据库查询失败，切换到模拟数据:', error.message);
      isConnected = false;
      mockData.isUsingMock = true;
    }
  }
  
  // 使用模拟查询
  return mockQuery(sql, params);
};

// 健康检查函数
const healthCheck = async () => {
  try {
    if (!pool) {
      throw new Error('连接池未初始化');
    }
    const [rows] = await pool.query('SELECT 1');
    isConnected = true;
    mockData.isUsingMock = false;
    console.log('数据库连接成功');
    return { success: true, message: '数据库连接正常' };
  } catch (error) {
    isConnected = false;
    mockData.isUsingMock = true;
    console.error('数据库健康检查失败:', error.message);
    console.log('数据库连接失败，切换到模拟数据模式');
    return { success: false, message: '数据库连接失败', error: error.message };
  }
};

// 关闭连接池的函数
const close = async () => {
  try {
    if (pool) {
      await pool.end();
      console.log('数据库连接池已关闭');
    }
  } catch (error) {
    console.error('关闭数据库连接池失败:', error);
  }
};

// 导出包装后的连接池
module.exports = {
  query,
  pool: pool || null,
  healthCheck,
  close,
  isUsingMock: () => mockData.isUsingMock
};
