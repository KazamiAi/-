// 预约管理相关路由
const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authMiddleware, teacherOrAdminMiddleware, resourceOwnerOrAdminMiddleware } = require('../middlewares/authMiddleware');

// 获取当前用户的预约列表
router.get('/my', authMiddleware, reservationController.getUserReservations);

// 获取所有预约（管理员或教师）
router.get('/', teacherOrAdminMiddleware, reservationController.getAllReservations);

// 获取单个预约详情 - 使用资源所有者或管理员权限
router.get('/:id', resourceOwnerOrAdminMiddleware, reservationController.getReservationById);

// 创建预约
router.post('/', authMiddleware, reservationController.createReservation);

// 更新预约 - 使用资源所有者权限
router.put('/:id', resourceOwnerOrAdminMiddleware, reservationController.updateReservation);

// 取消预约 - 使用资源所有者权限
router.put('/:id/cancel', resourceOwnerOrAdminMiddleware, reservationController.cancelReservation);

// 审批预约（教师或管理员）
router.put('/:id/approve', teacherOrAdminMiddleware, reservationController.approveReservation);

// 检查时间冲突
router.post('/check-conflict', authMiddleware, reservationController.checkConflict);

module.exports = router;