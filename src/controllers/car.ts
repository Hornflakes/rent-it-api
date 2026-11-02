import { Request, Response } from 'express';
import Car from '../models/car';

const getCars = async (request: Request, response: Response) => {
  const cars = await Car.find();
  return response.status(200).json(cars);
};

const updateCar = async (request: Request, response: Response) => {
  const { _id, ...changes } = request.body;

  const car = await Car.findByIdAndUpdate(_id, changes, { new: true, runValidators: true });
  if (!car) {
    return response.status(404).json({ message: 'Car not found' });
  }
  return response.status(200).json(car);
};

export default { getCars, updateCar };
