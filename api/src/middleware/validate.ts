import { NextFunction, Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: formatZodError(result.error),
      });
    }

    req.body = result.data;
    next();
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid route params',
        details: formatZodError(result.error),
      });
    }

    req.params = result.data as Request['params'];
    next();
  };
}
