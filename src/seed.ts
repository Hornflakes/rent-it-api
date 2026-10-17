import mongoose from 'mongoose';
import Car, { ICar } from './models/car';

require('dotenv').config();

// names must match carImage() in rent-it-ui, otherwise the car has no picture
const cars: ICar[] = [
  { name: 'Volkswagen Polo', seats: 5, engine: 'Benzina', transmission: 'Manual', rate: 50 },
  { name: 'Skoda Octavia', seats: 5, engine: 'Diesel', transmission: 'Manual', rate: 100 },
  { name: 'Mercedes GLE', seats: 5, engine: 'Diesel', transmission: 'Automatic', rate: 250 },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI!);

  for (const car of cars) {
    await Car.updateOne({ name: car.name }, car, { upsert: true });
  }

  console.log(`Seeded cars`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Could not seed: ', err.message);
  process.exit(1);
});
