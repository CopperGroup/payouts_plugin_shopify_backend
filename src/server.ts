import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRoutes from './api';

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
// All your API logic will live under the /api path
app.use('/api', apiRoutes);

// --- Root Redirect Handler ---
// This is the new, smart root handler. It's the main entry point for your app.
app.get('/', (req: Request, res: Response) => {
  // When Shopify loads your app, it provides the shop and host as query parameters.
  const { shop, host } = req.query;

  if (shop && host) {
    // If the app is being loaded inside Shopify, redirect to your Vercel frontend.
    // We must forward all the query parameters for App Bridge to work correctly.
    const frontendUrl = new URL('https://shopify-tawny.vercel.app');
    frontendUrl.search = new URLSearchParams(req.query as Record<string, string>).toString();
    
    console.log(`Redirecting embedded app load to frontend: ${frontendUrl.toString()}`);
    res.redirect(frontendUrl.toString());
  } else {
    // If someone accesses your backend URL directly, show a simple message.
    res.status(200).send('Shopify Plugin Backend is running. Please open this app from your Shopify Admin.');
  }
});

// --- Start Server ---
app.listen(config.PORT, () => {
  console.log(`✅ Server is listening on http://localhost:${config.PORT}`);
  console.log(`🔧 Host configured for Shopify callbacks: ${config.HOST}`);
});