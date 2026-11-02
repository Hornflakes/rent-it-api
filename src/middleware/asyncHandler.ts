import { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;

const asyncHandler =
  (handler: AsyncRequestHandler): RequestHandler =>
  (request, response, next) => {
    handler(request, response, next).catch(next);
  };

export default asyncHandler;
