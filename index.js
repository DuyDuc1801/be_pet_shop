const express = require('express');
const cors = require('cors');
const database = require("./configs/database");
const Product = require("./models/product.model");
require('dotenv').config();
const rootRoutes = require('./routers/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

database.connect();
app.use('/api', rootRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});