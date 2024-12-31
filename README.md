# Trading Dashboard

A modern React-based trading dashboard application that provides real-time stock market data visualization and analysis tools.

## Features

- Real-time stock market data visualization
- Interactive stock table with sorting and filtering
- PDF export functionality for reports
- Server-side proxy for secure API interactions
- Responsive design for desktop and mobile devices

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd trading
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install server dependencies:
```bash
cd server
npm install
```

## Configuration

1. Frontend configuration is managed through environment variables
2. Server configuration can be modified in `server/server.js`

## Running the Application

1. Start the backend server:
```bash
cd server
npm start
```

2. In a new terminal, start the frontend:
```bash
cd ..
npm start
```

The application will be available at `http://localhost:3000`

## Built With

### Frontend
- React.js - v19.0.0
- Axios - For API requests
- styled-components - For component styling
- PDF libraries (jspdf, pdfmake) - For report generation

### Backend
- Express.js - Backend framework
- Axios - For proxying API requests
- CORS - For handling cross-origin requests

## Project Structure

```
trading/
├── src/                    # Frontend source files
│   ├── components/         # React components
│   ├── App.js             # Main App component
│   └── ...
├── server/                 # Backend server
│   ├── server.js          # Express server setup
│   └── package.json       # Server dependencies
├── public/                 # Static files
└── package.json           # Frontend dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Authors

- Your Name - Initial work

## Acknowledgments

- NSE for providing market data
- React community for excellent tools and libraries
