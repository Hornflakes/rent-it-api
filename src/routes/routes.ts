import express from 'express';
import CarController from '../controllers/car';
import OrderController from '../controllers/order';
import UserController from '../controllers/user';
import asyncHandler from '../middleware/asyncHandler';
import requireRole from '../middleware/requireRole';
import verifyAccessToken from '../middleware/verifyAccessToken';

const router = express.Router();

router.post('/users/register', asyncHandler(UserController.addUser));
router.post('/users/login', asyncHandler(UserController.login));
router.post('/users/logout', asyncHandler(UserController.logout));
router.post('/users/refresh-token', asyncHandler(UserController.handleRefreshToken));

router.get('/orders', verifyAccessToken, asyncHandler(OrderController.getOrders));
router.post('/orders', verifyAccessToken, asyncHandler(OrderController.addOrder));
router.patch('/orders', verifyAccessToken, asyncHandler(OrderController.updateOrder));
router.delete('/orders', verifyAccessToken, asyncHandler(OrderController.deleteOrder));

router.get('/cars', verifyAccessToken, asyncHandler(CarController.getCars));
router.put('/cars', verifyAccessToken, requireRole('admin'), asyncHandler(CarController.updateCar));

export = router;
