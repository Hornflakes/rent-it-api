import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';

const isJsonParseError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'type' in err && (err as { type: unknown }).type === 'entity.parse.failed';

const errorHandler: ErrorRequestHandler = (err, request, response, next) => {
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return response.status(400).json({ message: err.message });
  }
  if (isJsonParseError(err)) {
    return response.status(400).json({ message: 'Malformed JSON body' });
  }

  console.error(err);
  return response.status(500).json({ message: 'Internal server error' });
};

export default errorHandler;
