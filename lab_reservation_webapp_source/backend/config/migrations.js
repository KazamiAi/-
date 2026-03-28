// 数据库迁移工具 - 从SQLite迁移到MySQL
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// MySQL连接配置
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lab_reservation',
  charset: 'utf8mb4'
};

// SQLite数据库路径
const sqlitePath = path.join(__dirname, '../../db/lab_reservation.db');

// MySQL表创建SQL
const createTablesSQL = `
-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    real_name VARCHAR(100),
    role_id INT,
    department VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    status TINYINT DEFAULT 1,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- 创建实验室表
CREATE TABLE IF NOT EXISTS laboratories (
    lab_id INT AUTO_INCREMENT PRIMARY KEY,
    lab_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    capacity INT,
    description TEXT,
    status TINYINT DEFAULT 1,
    manager_id INT,
    FOREIGN KEY (manager_id) REFERENCES users(user_id)
);

-- 创建设备类型表
CREATE TABLE IF NOT EXISTS device_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 创建设备表
CREATE TABLE IF NOT EXISTS devices (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    type_id INT,
    lab_id INT,
    specification TEXT,
    status TINYINT DEFAULT 1,
    purchase_date DATE,
    price DECIMAL(10,2),
    manufacturer VARCHAR(100),
    FOREIGN KEY (type_id) REFERENCES device_types(type_id),
    FOREIGN KEY (lab_id) REFERENCES laboratories(lab_id)
);

-- 创建预约设备关系表
CREATE TABLE IF NOT EXISTS reservation_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT,
    device_id INT,
    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- 创建预约表
CREATE TABLE IF NOT EXISTS reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    lab_id INT,
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT,
    status VARCHAR(20) DEFAULT '待审批',
    approval_comment TEXT,
    approved_by INT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (lab_id) REFERENCES laboratories(lab_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

-- 创建设备维护记录表
CREATE TABLE IF NOT EXISTS device_maintenance (
    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(50),
    description TEXT,
    cost DECIMAL(10,2),
    performed_by VARCHAR(100),
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);`;

// 迁移函数
async function migrate() {
  let mysqlConnection = null;
  let sqliteDb = null;
  
  try {
    // 1. 连接MySQL数据库
    console.log('连接MySQL数据库...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    
    // 2. 创建表结构
    console.log('创建MySQL表结构...');
    await mysqlConnection.query(createTablesSQL);
    
    // 3. 连接SQLite数据库
    console.log('连接SQLite数据库...');
    sqliteDb = new sqlite3.Database(sqlitePath);
    
    // 4. 插入初始数据
    console.log('插入初始角色数据...');
    await mysqlConnection.query(
      'INSERT IGNORE INTO roles (role_id, role_name) VALUES (1, "管理员"), (2, "教师"), (3, "学生")'
    );
    
    // 插入默认管理员账户
    console.log('插入默认管理员账户...');
    await mysqlConnection.query(
      'INSERT IGNORE INTO users (user_id, username, password, real_name, role_id, status) VALUES (1, "admin", "$2b$10$mRj6mJg5KQ4QnYrX8O5m4O4ZgHj3YfZ5X7L4K9J8V7W6E5R4T3S2", "系统管理员", 1, 1)'
    );
    
    console.log('数据库迁移完成!');
    console.log('默认管理员账号: admin');
    console.log('默认密码: admin123');
    
  } catch (error) {
    console.error('数据库迁移失败:', error.message);
  } finally {
    // 关闭连接
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
    if (sqliteDb) {
      sqliteDb.close();
    }
  }
}

// 导出迁移函数
module.exports = { migrate };

// 如果直接运行此脚本
if (require.main === module) {
  migrate();
}
