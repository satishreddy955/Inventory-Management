import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder is accessible publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount product routes under /api/products
app.use('/api/products', productsRouter);

// Simple server test route
app.get('/', (req, res) => {
  res.json({ message: "Backend running successfully" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
