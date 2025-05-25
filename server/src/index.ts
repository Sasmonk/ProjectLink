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
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();

// CORS Lockdown
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.CORS_ORIGIN || 'https://project-link-five.vercel.app',
      'https://project-link-five.vercel.app'
    ]
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      console.log('Request with no origin - allowing');
      return callback(null, true);
    }
    
    console.log('Checking origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    }
    
    console.log('Origin not allowed:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Add pre-flight OPTIONS handler
app.options('*', cors());

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
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cors: {
      allowedOrigins,
      requestOrigin: req.headers.origin,
      isAllowed: allowedOrigins.includes(req.headers.origin || '')
    },
    mongodb: {
      connected: mongoose.connection.readyState === 1
    }
  });
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

// Add more detailed error logging middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    headers: req.headers
  });
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      message: 'CORS error: Origin not allowed',
      allowedOrigins,
      requestOrigin: req.headers.origin
    });
  }
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
}); 