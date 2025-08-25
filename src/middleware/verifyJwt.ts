import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Extend the Express Request type to include our custom 'merchant' property
export interface AuthenticatedRequest extends Request {
  merchant?: any; // You can create a more specific type for your decoded merchant payload
}

/**
 * Verifies a JWT provided in the Authorization header. (No changes here)
 */
export const verifyJwt = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.merchant = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
  }
};

/**
 * Decodes a JWT from a query parameter ('token') if it exists.
 * This middleware does NOT reject the request if the token is missing or invalid.
 * It's used to identify a logged-in merchant at the start of the OAuth flow.
 */
export const decodeJwtFromQuery = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.query.token as string;

    if (token) {
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.merchant = decoded;
        } catch (error) {
            // Log the error but don't block the request.
            // The merchant will be treated as logged-out.
            console.warn('Could not decode JWT from query:', error);
        }
    }
    next();
};