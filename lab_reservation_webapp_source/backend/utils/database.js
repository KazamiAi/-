// 数据库连接工具
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../../db/lab_reservation.db');
        this.db = null;
    }

    // 初始化数据库连接
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('无法连接到数据库:', err.message);
                    reject(err);
                } else {
                    console.log('成功连接到SQLite数据库');
                    // 初始化数据库表
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // 创建数据库表
    async createTables() {
        return new Promise((resolve, reject) => {
            const createTablesSQL = `
                -- 创建角色表
                CREATE TABLE IF NOT EXISTS roles (
                    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role_name VARCHAR(50) NOT NULL UNIQUE
                );

                -- 创建用户表
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    real_name VARCHAR(100),
                    role_id INTEGER,
                    department VARCHAR(100),
                    phone VARCHAR(20),
                    email VARCHAR(100),
                    status TINYINT DEFAULT 1,
                    FOREIGN KEY (role_id) REFERENCES roles(role_id)
                );

                -- 创建实验室表
                CREATE TABLE IF NOT EXISTS laboratories (
                    lab_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lab_name VARCHAR(100) NOT NULL,
                    location VARCHAR(100),
                    capacity INTEGER,
                    description TEXT,
                    status TINYINT DEFAULT 1,
                    manager_id INTEGER,
                    FOREIGN KEY (manager_id) REFERENCES users(user_id)
                );

                -- 创建设备类型表
                CREATE TABLE IF NOT EXISTS device_types (
                    type_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type_name VARCHAR(50) NOT NULL UNIQUE,
                    description TEXT
                );

                -- 创建设备表
                CREATE TABLE IF NOT EXISTS devices (
                    device_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_name VARCHAR(100) NOT NULL,
                    type_id INTEGER,
                    lab_id INTEGER,
                    specification TEXT,
                    status TINYINT DEFAULT 1,
                    purchase_date DATE,
                    price DECIMAL(10,2),
                    manufacturer VARCHAR(100),
                    FOREIGN KEY (type_id) REFERENCES device_types(type_id),
                    FOREIGN KEY (lab_id) REFERENCES laboratories(lab_id)
                );

                -- 创建预约表
                CREATE TABLE IF NOT EXISTS reservations (
                    reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    lab_id INTEGER,
                    device_id INTEGER,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME NOT NULL,
                    purpose TEXT,
                    status TINYINT DEFAULT 0,
                    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id),
                    FOREIGN KEY (lab_id) REFERENCES laboratories(lab_id),
                    FOREIGN KEY (device_id) REFERENCES devices(device_id)
                );

                -- 创建审批记录表
                CREATE TABLE IF NOT EXISTS approval_records (
                    approval_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reservation_id INTEGER,
                    approver_id INTEGER,
                    approve_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TINYINT,
                    comment TEXT,
                    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
                    FOREIGN KEY (approver_id) REFERENCES users(user_id)
                );

                -- 创建设备维护表
                CREATE TABLE IF NOT EXISTS device_maintenance (
                    maintenance_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id INTEGER,
                    maintenance_type VARCHAR(50),
                    maintenance_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    description TEXT,
                    cost DECIMAL(10,2),
                    status TINYINT DEFAULT 0,
                    FOREIGN KEY (device_id) REFERENCES devices(device_id)
                );

                -- 创建系统日志表
                CREATE TABLE IF NOT EXISTS system_logs (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action VARCHAR(100),
                    object_type VARCHAR(50),
                    object_id INTEGER,
                    action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ip_address VARCHAR(50),
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                );
            `;

            this.db.exec(createTablesSQL, (err) => {
                if (err) {
                    console.error('创建表失败:', err.message);
                    reject(err);
                } else {
                    console.log('数据库表创建成功');
                    // 插入初始数据
                    this.insertInitialData().then(resolve).catch(reject);
                }
            });
        });
    }

    // 插入初始数据
    async insertInitialData() {
        return new Promise((resolve, reject) => {
            // 插入角色数据
            this.db.run(`INSERT OR IGNORE INTO roles (role_name) VALUES ('管理员'), ('教师'), ('学生')`, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 插入测试用户数据 (密码为明文，实际应用中应使用bcrypt加密)
                this.db.run(`
                    INSERT OR IGNORE INTO users (username, password, real_name, role_id, department) 
                    VALUES 
                    ('admin', 'admin', '管理员', 1, '信息中心'),
                    ('teacher', 'teacher', '教师', 2, '计算机系'),
                    ('student', 'student', '学生', 3, '计算机系')
                `, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('初始数据插入成功');
                        resolve();
                    }
                });
            });
        });
    }

    // 执行查询
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 执行单个查询
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 执行插入、更新、删除操作
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // 关闭数据库连接
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// 导出单例实例
module.exports = new Database();