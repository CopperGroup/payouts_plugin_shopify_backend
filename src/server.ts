import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRoutes from './api';
// We no longer need to import connectRedis or initializeShopify

// --- Server Initialization ---
const app = express();

// --- Middleware Setup ---
app.use(cors());
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});
app.set("trust proxy", 1);

// --- API Routes ---
app.use('/api', apiRoutes);

// --- Root Endpoint ---
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Shopify Plugin Backend is running! 🚀');
});

// --- Start Server ---
app.listen(config.PORT, () => {
  console.log(`✅ Server is listening on http://localhost:${config.PORT}`);
  console.log(`🔧 Host configured for Shopify callbacks: ${config.HOST}`);
});