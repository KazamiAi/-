// 后端服务器入口文件
console.log('开始初始化服务器...');

// 详细的错误捕获和日志
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  console.error('堆栈:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
});

// 简单直接的服务器实现，确保稳定运行
try {
  console.log('正在加载依赖...');
  // 加载环境变量
  require('dotenv').config();
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  console.log('依赖加载成功');
  
  const app = express();

// 设置端口
const PORT = process.env.PORT || 3000;

// 基本中间件配置
app.use(cors({
    origin: '*', // 允许所有来源，简化配置
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 重要：设置静态文件目录
app.use(express.static(path.join(__dirname, '../frontend/public')));

// 测试路由
app.get('/test', (req, res) => {
  res.json({ message: '服务器运行正常', timestamp: new Date().toISOString() });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API路由挂载
console.log('正在挂载API路由...');
try {
  const authRoutes = require('./routes/auth');
  const deviceRoutes = require('./routes/device');
  const labRoutes = require('./routes/laboratory');
  const reservationRoutes = require('./routes/reservation');
  const reportRoutes = require('./routes/report');

  // 挂载各个API路由
  app.use('/api/auth', authRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/laboratories', labRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/reports', reportRoutes);
  
  console.log('API路由挂载成功');
} catch (error) {
  console.error('API路由挂载失败:', error);
}

// 前端路由处理 - 支持SPA路由
app.get('*', (req, res) => {
  // 检查是否是API请求
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API端点不存在' });
  }
  // 对于非API请求，返回index.html用于SPA路由
  const indexPath = path.join(__dirname, '../frontend/public/index.html');
  console.log(`提供SPA入口文件: ${indexPath}`);
  res.sendFile(indexPath);
});

// 简单的错误处理中间件
app.use((err, req, res, next) => {
  console.error('请求错误:', err.message);
  res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: err.message
  });
});

// 启动服务器
console.log(`启动服务器在端口 ${PORT}...`);
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 服务器成功启动！`);
    console.log(`- 监听地址: 0.0.0.0:${PORT}`);
    console.log(`- 访问地址: http://localhost:${PORT}`);
    console.log(`- 测试端点: http://localhost:${PORT}/test`);
    console.log(`- 健康检查: http://localhost:${PORT}/health`);
  });

// 详细的错误处理
server.on('error', (error) => {
  console.error('❌ 服务器启动错误:');
  console.error('错误代码:', error.code);
  console.error('错误信息:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️  端口 ${PORT} 已被占用，请检查是否有其他进程在使用该端口`);
  } else if (error.code === 'EACCES') {
    console.error(`⚠️  没有权限使用端口 ${PORT}，可能需要管理员权限`);
  }
  process.exit(1);
});
} catch (error) {
  console.error('❌ 服务器启动失败:', error);
  console.error('堆栈:', error.stack);
  process.exit(1);
}

// 确保进程不会退出
process.on('SIGINT', () => {
  console.log('接收到终止信号，正在优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 心跳机制
setInterval(() => {
  console.log(`服务器心跳 - 正常运行中 (${new Date().toLocaleTimeString()})`);
}, 30000); // 每30秒心跳

// 已在顶部添加更详细的错误处理
} catch (error) {
  console.error('❌ 服务器初始化失败:', error);
  console.error('堆栈:', error.stack);
  process.exit(1);
}