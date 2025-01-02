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
const PORT = process.env.PORT || 5000;

// Configure CORS with environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'https://stock-data-eight.vercel.app'];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// NSE API endpoints
const NSE_BASE_URL = 'https://www.nseindia.com/api';

// Headers and cookies management
let HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br'
};

// Cookie management with retry mechanism
const getCookies = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log('Fetching new cookies...');
            const response = await axios.get('https://www.nseindia.com/', {
                headers: HEADERS
            });
            
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                const cookieString = cookies.join('; ');
                HEADERS.Cookie = cookieString;
                console.log('Cookies updated successfully');
                return true;
            }
        } catch (error) {
            console.error(`Cookie fetch attempt ${i + 1} failed:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
    }
    return false;
};

// Utility function to make NSE requests with retries
const makeNSERequest = async (url, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            // Get fresh cookies before each attempt
            await getCookies();
            
            // Add a small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = await axios.get(url, {
                headers: HEADERS,
                withCredentials: true
            });
            
            if (response.data) {
                return response.data;
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
            }
        }
    }
    console.error(`All attempts failed for ${url}`);
    return null;
};

// Process stock data
const processStockData = (data) => {
    if (!data || !data.data || !Array.isArray(data.data)) {
        return [];
    }

    return data.data.map(stock => ({
        symbol: stock.symbol || '',
        identifier: stock.identifier || '',
        lastPrice: stock.lastPrice || 0,
        change: stock.change || 0,
        pChange: stock.pChange || 0,
        open: stock.open || 0,
        dayHigh: stock.dayHigh || 0,
        dayLow: stock.dayLow || 0,
        previousClose: stock.previousClose || 0,
        totalTradedVolume: stock.totalTradedVolume || 0,
        totalTradedValue: stock.totalTradedValue || 0,
        yearHigh: stock.yearHigh || 0,
        yearLow: stock.yearLow || 0,
        perChange365d: stock.perChange365d || 0,
        perChange30d: stock.perChange30d || 0,
        lastUpdateTime: stock.lastUpdateTime || new Date().toLocaleString()
    }));
};

// Function to check market status
const getMarketStatus = () => {
    const now = new Date();
    const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = indiaTime.getDay();
    const hours = indiaTime.getHours();
    const minutes = indiaTime.getMinutes();
    const currentTime = hours * 100 + minutes;

    // Check if it's a weekday (Monday-Friday)
    if (day >= 1 && day <= 5) {
        // Pre-market: 9:00 AM - 9:15 AM
        if (currentTime >= 900 && currentTime < 915) {
            return { status: 'pre-market', message: 'Pre-market Session' };
        }
        // Regular market hours: 9:15 AM - 3:30 PM
        else if (currentTime >= 915 && currentTime < 1530) {
            return { status: 'open', message: 'Market Open' };
        }
        // Post-market: 3:30 PM - 4:00 PM
        else if (currentTime >= 1530 && currentTime < 1600) {
            return { status: 'post-market', message: 'Post-market Session' };
        }
    }
    
    // Market is closed
    if (day === 0 || day === 6) {
        return { status: 'closed', message: 'Weekend - Market Closed' };
    }
    return { status: 'closed', message: 'Market Closed' };
};

// Proxy endpoint for NIFTY 50 data
app.get('/api/nifty50', async (req, res) => {
    try {
        const data = await makeNSERequest('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050');
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ error: 'Failed to fetch data from NSE' });
    }
});

// API endpoints
app.get('/api/nifty', async (req, res) => {
    try {
        const data = await makeNSERequest('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500');
        const processedData = data ? processStockData(data) : [];
        console.log(`Successfully fetched ${processedData.length} NIFTY stocks`);
        res.json(processedData);
    } catch (error) {
        console.error('Error fetching NIFTY data:', error.message);
        res.json([]);
    }
});

app.get('/api/banknifty', async (req, res) => {
    try {
        // Get fresh cookies before fetching BANK NIFTY data
        await getCookies();
        
        const data = await makeNSERequest('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20BANK');
        const processedData = data ? processStockData(data) : [];
        console.log(`Successfully fetched ${processedData.length} BANKNIFTY stocks`);
        res.json(processedData);
    } catch (error) {
        console.error('Error fetching BANKNIFTY data:', error.message);
        res.json([]);
    }
});

// Proxy endpoint for Bank Nifty stocks
app.get('/api/banknifty-stocks', async (req, res) => {
    try {
        // Fetch Bank Nifty constituent stocks
        const bankNiftyResponse = await makeNSERequest('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20BANK');
        
        const bankNiftyStocks = bankNiftyResponse.data.map(stock => ({
            symbol: stock.symbol,
            open: stock.open,
            high: stock.dayHigh,
            low: stock.dayLow,
            preClose: stock.previousClose,
            lastPrice: stock.lastPrice,
            change: stock.change,
            pChange: stock.pChange,
            volume: stock.totalTradedVolume,
            indices: ['NIFTY BANK']
        }));

        res.json(bankNiftyStocks);
    } catch (error) {
        console.error('Error fetching Bank Nifty stocks:', error.message);
        res.status(500).json({ error: 'Failed to fetch Bank Nifty stocks' });
    }
});

// Proxy endpoint for stock details
app.get('/api/stock/:symbol', async (req, res) => {
    try {
        // First get the quote data
        const quoteResponse = await makeNSERequest(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(req.params.symbol)}`);
        
        // Then get the trade info data which has more detailed volume information
        const tradeInfoResponse = await makeNSERequest(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(req.params.symbol)}&section=trade_info`);
        
        // Combine the data
        const combinedData = {
            ...quoteResponse,
            tradeInfo: tradeInfoResponse
        };

        res.json(combinedData);
    } catch (error) {
        console.error('Error fetching stock details:', error.message);
        res.status(500).json({ error: 'Failed to fetch stock details' });
    }
});

// Proxy endpoint for historical data
app.get('/api/historical/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const response = await makeNSERequest(`https://www.nseindia.com/api/historical/cm/equity?symbol=${encodeURIComponent(symbol)}`);
        
        // Transform the data for candlestick chart
        const historicalData = response.data.map(item => ({
            date: item.CH_TIMESTAMP,
            open: parseFloat(item.CH_OPENING_PRICE),
            high: parseFloat(item.CH_TRADE_HIGH_PRICE),
            low: parseFloat(item.CH_TRADE_LOW_PRICE),
            close: parseFloat(item.CH_CLOSING_PRICE)
        }));
        
        res.json(historicalData);
    } catch (error) {
        console.error('Error fetching historical data:', error.message);
        res.status(500).json({ error: 'Failed to fetch historical data from NSE' });
    }
});

// Get index data
app.get('/api/indices', async (req, res) => {
    try {
        console.log('Fetching indices data...');
        
        // Get market status
        const marketStatus = getMarketStatus();
        
        // Get fresh cookies
        await getCookies();
        
        // Fetch NIFTY 50 data
        const nifty50Data = await makeNSERequest('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050');
        console.log('NIFTY 50 data fetched');

        // Get fresh cookies again before BANK NIFTY request
        await getCookies();
        
        // Add delay before BANK NIFTY request
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fetch BANK NIFTY data
        const bankNiftyData = await makeNSERequest('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20BANK');
        console.log('BANK NIFTY data fetched');

        const indices = {
            marketStatus,
            nifty50: nifty50Data?.data?.[0] || {
                symbol: 'NIFTY 50',
                lastPrice: 0,
                change: 0,
                pChange: 0,
                open: 0,
                dayHigh: 0,
                dayLow: 0,
                previousClose: 0,
                yearHigh: 0,
                yearLow: 0,
                totalTradedVolume: 0,
                totalTradedValue: 0,
                lastUpdateTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
            },
            bankNifty: bankNiftyData?.data?.[0] || {
                symbol: 'NIFTY BANK',
                lastPrice: 0,
                change: 0,
                pChange: 0,
                open: 0,
                dayHigh: 0,
                dayLow: 0,
                previousClose: 0,
                yearHigh: 0,
                yearLow: 0,
                totalTradedVolume: 0,
                totalTradedValue: 0,
                lastUpdateTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
            }
        };

        console.log('Indices data processed:', {
            marketStatus,
            nifty50: {
                lastPrice: indices.nifty50.lastPrice,
                change: indices.nifty50.change,
                pChange: indices.nifty50.pChange
            },
            bankNifty: {
                lastPrice: indices.bankNifty.lastPrice,
                change: indices.bankNifty.change,
                pChange: indices.bankNifty.pChange
            }
        });

        res.json(indices);
    } catch (error) {
        console.error('Error in /api/indices:', error.message);
        res.json({
            marketStatus: getMarketStatus(),
            nifty50: {
                symbol: 'NIFTY 50',
                lastPrice: 0,
                change: 0,
                pChange: 0,
                open: 0,
                dayHigh: 0,
                dayLow: 0,
                previousClose: 0,
                yearHigh: 0,
                yearLow: 0,
                totalTradedVolume: 0,
                totalTradedValue: 0,
                lastUpdateTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
            },
            bankNifty: {
                symbol: 'NIFTY BANK',
                lastPrice: 0,
                change: 0,
                pChange: 0,
                open: 0,
                dayHigh: 0,
                dayLow: 0,
                previousClose: 0,
                yearHigh: 0,
                yearLow: 0,
                totalTradedVolume: 0,
                totalTradedValue: 0,
                lastUpdateTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
            }
        });
    }
});

//hello 
// Test endpoint for Vercel deployment
app.get('/', (req, res) => {
    res.json({ message: 'Hello from Vercel Server!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});