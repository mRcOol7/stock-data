# Trading Application

A full-stack web application for tracking and analyzing stock market data. Built with React.js frontend and Node.js backend.

## Features

- Real-time stock data display
- Interactive stock charts and tables
- Server-side data processing
- Responsive design for all devices

## Tech Stack

- **Frontend**: React.js, CSS
- **Backend**: Node.js, Express.js
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
```bash
git clone https://github.com/mRcOol7/stock-data
cd trading
```

2. Install dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### Running the Application

1. Start the backend server
```bash
cd server
npm start
```

2. Start the frontend application (in a new terminal)
```bash
# From the root directory
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
trading/
├── src/               # Frontend source files
│   ├── components/    # React components
│   └── ...
├── server/            # Backend server files
│   ├── server.js      # Express server setup
│   └── ...
└── package.json       # Project dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
