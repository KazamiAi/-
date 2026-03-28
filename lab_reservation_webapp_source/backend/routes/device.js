// 设备管理相关路由
const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticate, isAdmin, teacherOrAdminMiddleware } = require('../middlewares/authMiddleware');

// 获取所有设备
router.get('/', authenticate, deviceController.getAllDevices);

// 获取单个设备信息
router.get('/:id', authenticate, deviceController.getDeviceById);

// 创建设备（仅管理员）
router.post('/', authenticate, isAdmin, deviceController.createDevice);

// 更新设备信息（仅管理员或教师）
router.put('/:id', authenticate, teacherOrAdminMiddleware, deviceController.updateDevice);

// 删除设备（仅管理员）
router.delete('/:id', authenticate, isAdmin, deviceController.deleteDevice);

// 更新设备状态
router.put('/:id/status', authenticate, teacherOrAdminMiddleware, deviceController.updateDeviceStatus);

// 获取设备维护记录
router.get('/:id/maintenance', authenticate, deviceController.getDeviceMaintenance);

// 创建设备维护记录
router.post('/:id/maintenance', authenticate, teacherOrAdminMiddleware, deviceController.createMaintenance);

module.exports = router;