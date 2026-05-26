import mongoose from 'mongoose';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).reduce((acc, item) => {
      acc[item.path] = item.message;
      return acc;
    }, {});
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Invalid ticket id' });
  }

  const status = err.statusCode || 500;
  const payload = {
    message: status === 500 ? 'Internal server error' : err.message
  };

  if (err.errors) {
    payload.errors = err.errors;
  }

  return res.status(status).json(payload);
}
