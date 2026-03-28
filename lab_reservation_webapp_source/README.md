# 实验室预约管理系统 Web应用

## 项目概述
本项目是一个实验室预约管理系统的Web应用版本，提供用户认证、实验室管理、设备管理、预约管理等功能。

## 技术栈

### 前端
- React.js
- Axios
- React Router
- Ant Design

### 后端
- Node.js
- Express
- MySQL
- JWT 认证
- bcrypt 密码加密

## 环境要求
- Node.js 14.x 或更高版本
- MySQL 5.7 或更高版本
- npm 或 yarn 包管理器

## 安装步骤

### 1. 克隆项目
```bash
git clone <项目仓库地址>
cd lab_reservation_webapp
```

### 2. 配置环境变量

#### 后端环境变量
在 `backend/.env` 文件中配置以下变量：
```
# 数据库连接信息
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lab_reservation
DB_PORT=3306

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3001
```

### 3. 安装依赖

#### 后端依赖
```bash
cd backend
npm install
```

#### 前端依赖
```bash
cd ../frontend
npm install
```

### 4. 数据库初始化
1. 确保MySQL服务正在运行
2. 创建数据库
```sql
CREATE DATABASE lab_reservation DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
3. 运行数据库迁移脚本
```bash
cd backend
node config/migrations.js
```

## 运行方式

### 运行后端服务
```bash
cd backend
npm start
# 或使用 nodemon 进行开发
npm run dev
```
后端服务将在 http://localhost:3001 上运行。

### 运行前端服务
```bash
cd frontend
npm start
```
前端服务将在 http://localhost:3000 上运行。

## API 接口文档

### 认证相关
- POST /api/auth/login - 用户登录
- POST /api/auth/logout - 用户登出
- GET /api/auth/me - 获取当前用户信息
- POST /api/auth/change-password - 修改密码
- POST /api/auth/register - 注册新用户（需要管理员权限）

### 实验室管理
- GET /api/laboratories - 获取实验室列表
- GET /api/laboratories/:id - 获取实验室详情
- POST /api/laboratories - 创建新实验室（需要管理员权限）
- PUT /api/laboratories/:id - 更新实验室信息（需要管理员权限）
- DELETE /api/laboratories/:id - 删除实验室（需要管理员权限）

### 设备管理
- GET /api/devices - 获取设备列表
- GET /api/devices/:id - 获取设备详情
- POST /api/devices - 创建新设备（需要管理员权限）
- PUT /api/devices/:id - 更新设备信息（需要管理员权限）
- PUT /api/devices/:id/status - 更新设备状态
- DELETE /api/devices/:id - 删除设备（需要管理员权限）

### 预约管理
- GET /api/reservations - 获取预约列表
- GET /api/reservations/:id - 获取预约详情
- POST /api/reservations - 创建新预约
- PUT /api/reservations/:id - 更新预约信息
- DELETE /api/reservations/:id - 取消预约
- PUT /api/reservations/:id/approve - 审批预约（需要教师或管理员权限）

## 注意事项
1. 首次使用时，请确保先运行数据库迁移脚本创建必要的表结构
2. 默认管理员账号：admin/admin123（请首次登录后修改密码）
3. 生产环境中，请务必修改默认的JWT密钥和数据库密码
4. 确保前端配置的API地址与后端服务地址一致

## 开发指南
- 遵循RESTful API设计规范
- 使用JWT进行身份验证
- 密码存储使用bcrypt加密
- 所有API返回统一的JSON格式
- 错误处理使用try-catch机制

## License
MIT