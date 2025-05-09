import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';
import usersRoutes from './routes/users';
import adminRoutes from './routes/admin';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();

// CORS Lockdown
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-frontend-domain.com'] // <-- Replace with your deployed frontend URL
  : ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate Limiting for Auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(express.json());

// Connect to MongoDB
const connectToMongoDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/projectlink')
      console.log('Connected to MongoDB')
      return
    } catch (error) {
      console.error(`MongoDB connection attempt ${i + 1} failed:`, error)
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw new Error('Failed to connect to MongoDB after multiple attempts')
}

connectToMongoDB().catch(error => {
  console.error('Fatal MongoDB connection error:', error)
  process.exit(1)
})

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 