import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToMongoDB } from './config/database';
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';
import usersRoutes from './routes/users';
import adminRoutes from './routes/admin';
import rateLimit from 'express-rate-limit';
import { auth } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();

// CORS Lockdown
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN || 'https://your-frontend-domain.com']
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB
connectToMongoDB().catch(error => {
  console.error('Fatal MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
// Apply auth middleware to admin routes before the admin router
app.use('/api/admin', auth, adminRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/users', usersRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
}); 