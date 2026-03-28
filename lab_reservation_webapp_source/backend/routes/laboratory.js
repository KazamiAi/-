// 实验室管理相关路由
const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

// 获取所有实验室
router.get('/', authenticate, labController.getAllLabs);

// 获取单个实验室信息
router.get('/:id', authenticate, labController.getLabById);

// 创建实验室（仅管理员）
router.post('/', authenticate, isAdmin, labController.createLab);

// 更新实验室信息（仅管理员）
router.put('/:id', authenticate, isAdmin, labController.updateLab);

// 删除实验室（仅管理员）
router.delete('/:id', authenticate, isAdmin, labController.deleteLab);

// 获取实验室设备列表
router.get('/:id/devices', authenticate, labController.getLabDevices);

// 获取实验室预约统计
router.get('/:id/stats', authenticate, labController.getLabStats);

module.exports = router;