// 报表管理相关路由
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, isAdmin, teacherOrAdminMiddleware } = require('../middlewares/authMiddleware');

// 获取实验室使用统计报表
router.get('/lab-stats', authenticate, teacherOrAdminMiddleware, reportController.getLabUsageStats);

// 获取设备使用统计报表
router.get('/device-stats', authenticate, teacherOrAdminMiddleware, reportController.getDeviceUsageStats);

// 获取用户活动统计报表
router.get('/user-activity', authenticate, isAdmin, reportController.getUserActivityStats);

// 获取预约统计报表
router.get('/reservation-stats', authenticate, teacherOrAdminMiddleware, reportController.getReservationStats);

// 导出报表数据
router.get('/export/:type', authenticate, teacherOrAdminMiddleware, reportController.exportReport);

module.exports = router;