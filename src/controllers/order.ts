import { Request, Response } from 'express';
import { getUser } from '../middleware/verifyAccessToken';
import Order from '../models/order';

const getOrders = async (request: Request, response: Response) => {
  const orders = await Order.find({ userId: getUser(request).id });
  return response.status(200).json(orders);
};

const addOrder = async (request: Request, response: Response) => {
  const order = await Order.create({ ...request.body, userId: getUser(request).id });
  return response.status(201).json(order);
};

const updateOrder = async (request: Request, response: Response) => {
  const userId = getUser(request).id;
  const { _id, ...changes } = request.body;

  const order = await Order.findOneAndUpdate(
    { _id, userId },
    { ...changes, userId },
    { new: true, runValidators: true }
  );
  if (!order) {
    return response.status(404).json({ message: 'Order not found' });
  }
  return response.status(200).json(order);
};

const deleteOrder = async (request: Request, response: Response) => {
  const { deletedCount } = await Order.deleteOne({ _id: request.body._id, userId: getUser(request).id });
  if (!deletedCount) {
    return response.status(404).json({ message: 'Order not found' });
  }
  return response.status(204).end();
};

export default { getOrders, addOrder, updateOrder, deleteOrder };
