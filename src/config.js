const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  apiBaseUrl: isDevelopment 
    ? 'http://localhost:5000'
    : (process.env.REACT_APP_API_URL || 'https://server-chi-eosin.vercel.app')
};

console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', config.apiBaseUrl);

export default config;
