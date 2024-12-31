// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (error) {
    console.log('No .env file found, using environment variables from the system');
}

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

// Handle favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// Basic health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Configure axios defaults
const axiosInstance = axios.create({
    timeout: 15000, // 15 seconds timeout
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.nseindia.com'
    }
});

// Get NIFTY 50 data
app.get('/api/nifty50', async (req, res) => {
    try {
        const response = await axiosInstance.get('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching NIFTY 50 data:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch NIFTY 50 data',
            message: error.message 
        });
    }
});

// Get individual stock data
app.get('/api/stock/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const response = await axiosInstance.get(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`);
        res.json(response.data);
    } catch (error) {
        console.error(`Error fetching data for ${req.params.symbol}:`, error.message);
        res.status(500).json({ 
            error: `Failed to fetch data for ${req.params.symbol}`,
            message: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message 
    });
});

// Start server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;