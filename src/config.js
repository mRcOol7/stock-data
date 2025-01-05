const config = {
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://stock-backend-8nn9.onrender.com'
    : 'http://localhost:5000'
};

console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', config.apiBaseUrl);

export default config;
