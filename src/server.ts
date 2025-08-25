import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
// The import for connectRedis is no longer needed
// import { connectRedis } from './config/redis'; 
import apiRoutes from './api';
import session from 'express-session';


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

app.use(
  session({
    secret: 'some-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,       // must be true for HTTPS
      sameSite: 'none',   // required for cross-site cookies in Shopify embedded apps
      httpOnly: true,
    },
  })
);
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