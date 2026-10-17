import http from 'http';
import express, { Express } from 'express';
import morgan from 'morgan';
import routes from './routes/routes';
import mongoose from 'mongoose';

const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app: Express = express();
mongoose.connect(
  process.env.MONGO_URI!,
  {
    autoIndex: true,
  },
  (err) => {
    if (err) {
      console.error('Could not connect to MongoDB:\n', err);
      return;
    }
    console.log('Connected to MongoDB');
  }
);

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:4200', 'http://localhost:4201'],
    credentials: true,
    methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'PATCH', 'DELETE'],
    optionsSuccessStatus: 204,
  })
);

app.use('/', routes);
app.use((req, res, next) => {
  const error = new Error('not found');
  return res.status(404).json({
    message: error.message,
  });
});

const httpServer = http.createServer(app);
const PORT: any = process.env.PORT ?? 6060;
httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
