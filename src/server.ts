import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRoutes from './api';

// --- Server Initialization ---
const app = express();

// --- Middleware Setup ---
app.use(cors());
// This middleware is for webhooks and needs to be before express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

// This header helps with local development using ngrok
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

// The express-session middleware has been removed as it's not needed
// and may conflict with the Shopify library's cookie handling.
// The @shopify/shopify-api library manages its own session storage.

// This setting is important for apps behind a proxy like ngrok or Railway
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