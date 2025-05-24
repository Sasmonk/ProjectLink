import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { user: { id: string } };
    
    // Fetch the user from the database to get the latest info, including isAdmin
    const user = await User.findById(decoded.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.userId = decoded.user.id; // Keep userId for backward compatibility if needed
    req.user = user; // Attach the full user object to the request

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}; 