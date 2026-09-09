require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// Allow requests from frontend running on localhost during development
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Common frontend dev ports
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);

// Error handling middleware (basic)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
