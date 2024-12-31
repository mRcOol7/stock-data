import React, { useState, useEffect } from "react";
import axios from "axios";
import "./stocktable.css";

const API_BASE_URL = "https://server-chi-eosin.vercel.app";

const StockTable = () => {
  const [stocks, setStocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); 
  const [itemsPerPage] = useState(10); 
  const [loading, setLoading] = useState(true); 
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    priceRange: 'all',
    changeType: 'all',
    volumeRange: 'all',
    sortBy: 'symbol',
    sortOrder: 'asc'
  });
  const [marketStatus, setMarketStatus] = useState({
    status: null,
    topGainers: [],
    topLosers: [],
    totalVolume: 0,
    lastUpdated: null
  });
  const [niftyData, setNiftyData] = useState({
    index: 'NIFTY 50',
    last: 0,
    change: 0,
    percentChange: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    lastUpdated: null
  });

  const formatChange = (change) => {
    const formattedValue = Number(change).toFixed(2);
    const sign = formattedValue > 0 ? '+' : '';
    return `${sign}₹${formattedValue}`;
  };

  const formatPChange = (pChange) => {
    const formattedValue = Number(pChange).toFixed(2);
    const sign = formattedValue > 0 ? '+' : '';
    return `${sign}${formattedValue}%`;
  };

  const getValueClass = (value) => {
    if (value > 0) return 'positive-value';
    if (value < 0) return 'negative-value';
    return '';
  };

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPriceRange = true;
    if (filters.priceRange !== 'all') {
      const price = stock.lastPrice;
      switch (filters.priceRange) {
        case 'under100':
          matchesPriceRange = price < 100;
          break;
        case '100to500':
          matchesPriceRange = price >= 100 && price <= 500;
          break;
        case '500to1000':
          matchesPriceRange = price > 500 && price <= 1000;
          break;
        case 'above1000':
          matchesPriceRange = price > 1000;
          break;
        default:
          matchesPriceRange = true;
          break;
      }
    }

    // Change type filter
    let matchesChangeType = true;
    if (filters.changeType !== 'all') {
      switch (filters.changeType) {
        case 'gainers':
          matchesChangeType = stock.pChange > 0;
          break;
        case 'losers':
          matchesChangeType = stock.pChange < 0;
          break;
        default:
          matchesChangeType = true;
          break;
      }
    }

    // Volume range filter
    let matchesVolumeRange = true;
    if (filters.volumeRange !== 'all') {
      const volume = stock.volume || 0;
      switch (filters.volumeRange) {
        case 'low':
          matchesVolumeRange = volume < 100000;
          break;
        case 'medium':
          matchesVolumeRange = volume >= 100000 && volume <= 1000000;
          break;
        case 'high':
          matchesVolumeRange = volume > 1000000;
          break;
        default:
          matchesVolumeRange = true;
          break;
      }
    }

    return matchesSearch && matchesPriceRange && matchesChangeType && matchesVolumeRange;
  }).sort((a, b) => {
    // Sorting logic
    const sortField = filters.sortBy;
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    
    if (sortField === 'symbol') {
      return order * a.symbol.localeCompare(b.symbol);
    }
    return order * (a[sortField] - b[sortField]);
  });

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/nifty50`);
        console.log('API Response:', response.data);

        if (!response.data) {
          throw new Error('Invalid data format from API');
        }
        
        // Set Nifty 50 data
        setNiftyData({
          index: 'NIFTY 50',
          last: response.data.metadata?.last || 0,
          change: response.data.metadata?.change || 0,
          percentChange: response.data.metadata?.percChange || 0,
          open: response.data.metadata?.open || 0,
          high: response.data.metadata?.high || 0,
          low: response.data.metadata?.low || 0,
          previousClose: response.data.metadata?.previousClose || 0,
          lastUpdated: new Date().toLocaleTimeString()
        });

        const stockList = response.data.data;
        console.log('Stock list:', stockList); // Debug log

        // Fetch details for each stock
        const allStocks = await Promise.all(
          stockList.map(async (stock) => {
            // Check if stock has the required properties
            if (!stock || !stock.symbol) {
              console.error('Invalid stock data:', stock);
              return null;
            }

            try {
              const detailsResponse = await axios.get(
                `${API_BASE_URL}/api/stock/${encodeURIComponent(stock.symbol)}`
              );
              
              // Basic data if detailed fetch fails
              if (!detailsResponse.data || !detailsResponse.data.priceInfo) {
                return {
                  symbol: stock.symbol,
                  open: stock.open,
                  high: stock.dayHigh,
                  low: stock.dayLow,
                  preClose: stock.previousClose,
                  lastPrice: stock.lastPrice,
                  change: stock.change,
                  pChange: stock.pChange,
                  volume: stock.totalTradedVolume || 0,
                  weekHigh: stock.weekHigh,
                  weekLow: stock.weekLow
                };
              }

              // Detailed data
              return {
                symbol: stock.symbol,
                open: detailsResponse.data.priceInfo.open,
                high: detailsResponse.data.priceInfo.intraDayHighLow?.max || stock.dayHigh,
                low: detailsResponse.data.priceInfo.intraDayHighLow?.min || stock.dayLow,
                preClose: detailsResponse.data.priceInfo.previousClose,
                lastPrice: detailsResponse.data.priceInfo.lastPrice,
                change: detailsResponse.data.priceInfo.change,
                pChange: detailsResponse.data.priceInfo.pChange,
                volume: detailsResponse.data.tradeInfo?.totalTradedVolume || 
                       detailsResponse.data.priceInfo.totalTradedVolume || 
                       detailsResponse.data.securityWiseDP?.tradedVolume || 
                       stock.totalTradedVolume || 0,
                weekHigh: detailsResponse.data.priceInfo.weekHighLow?.max,
                weekLow: detailsResponse.data.priceInfo.weekHighLow?.min
              };
            } catch (error) {
              console.error(`Error fetching details for ${stock.symbol}:`, error);
              // Return basic data if detailed fetch fails
              return {
                symbol: stock.symbol,
                open: stock.open,
                high: stock.dayHigh,
                low: stock.dayLow,
                preClose: stock.previousClose,
                lastPrice: stock.lastPrice,
                change: stock.change,
                pChange: stock.pChange,
                volume: stock.totalTradedVolume || 0,
                weekHigh: stock.weekHigh,
                weekLow: stock.weekLow
              };
            }
          })
        );

        // Filter out any null values and set the stocks
        const validStocks = allStocks.filter(stock => stock !== null);
        setStocks(validStocks);

        // Calculate market status data
        const sortedByGain = [...validStocks].sort((a, b) => b.pChange - a.pChange);
        const sortedByLoss = [...validStocks].sort((a, b) => a.pChange - b.pChange);
        const totalVolume = validStocks.reduce((sum, stock) => sum + stock.volume, 0);

        setMarketStatus({
          status: "Open", // You can add logic to determine market status
          topGainers: sortedByGain.slice(0, 5),
          topLosers: sortedByLoss.slice(0, 5),
          totalVolume: totalVolume,
          lastUpdated: new Date().toLocaleTimeString()
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching stock data:', error);
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Pagination logic for filtered stocks
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Render loading state
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="stock-container">
      <div className="dashboard-header">
        <h1>Market Dashboard</h1>
        <div className="market-time">
          <span className="time-label">Market Time</span>
          <span className="time-value">{new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}</span>
        </div>
      </div>

      {/* Main Market Overview */}
      <div className="market-overview">
        {/* Nifty 50 Card */}
        <div className="nifty-container">
          <div className="nifty-main">
            <div className="nifty-header">
              <div className="index-title">
                <h2>{niftyData.index}</h2>
                <span className="market-status">
                  <span className="status-dot"></span>
                  Market {marketStatus.status}
                </span>
              </div>
              <div className="time-info">
                <span className="last-updated">Last Updated: {niftyData.lastUpdated}</span>
              </div>
            </div>
            
            <div className="nifty-content">
              <div className="price-section">
                <div className="current-price">
                  <span className="price-value">₹{niftyData.last.toLocaleString()}</span>
                  <div className={`price-change ${getValueClass(niftyData.change)}`}>
                    <span className="change-amount">{formatChange(niftyData.change)}</span>
                    <span className="change-percent">({formatPChange(niftyData.percentChange)})</span>
                  </div>
                </div>
                
                <div className="chart-placeholder">
                  {/* Add a small sparkline chart here if you have chart data */}
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric">
                    <span className="label">Open</span>
                    <span className="value">₹{niftyData.open.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Previous Close</span>
                    <span className="value">₹{niftyData.previousClose.toLocaleString()}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric">
                    <span className="label">Day High</span>
                    <span className="value">₹{niftyData.high.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Day Low</span>
                    <span className="value">₹{niftyData.low.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Market Stats Cards */}
        <div className="market-stats-container">
          <div className="stats-grid">
            <div className="stat-card gainers">
              <div className="card-header">
                <h3>Top Gainers</h3>
                <span className="card-icon">↑</span>
              </div>
              <div className="stat-list">
                {marketStatus?.topGainers.map((stock, index) => (
                  <div key={index} className="stat-item">
                    <div className="stock-info">
                      <span className="stock-symbol">{stock.symbol}</span>
                      <span className="stock-price">₹{stock.lastPrice.toLocaleString()}</span>
                    </div>
                    <div className="stock-change positive-value">
                      <span className="change-percent">{formatPChange(stock.pChange)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stat-card losers">
              <div className="card-header">
                <h3>Top Losers</h3>
                <span className="card-icon">↓</span>
              </div>
              <div className="stat-list">
                {marketStatus?.topLosers.map((stock, index) => (
                  <div key={index} className="stat-item">
                    <div className="stock-info">
                      <span className="stock-symbol">{stock.symbol}</span>
                      <span className="stock-price">₹{stock.lastPrice.toLocaleString()}</span>
                    </div>
                    <div className="stock-change negative-value">
                      <span className="change-percent">{formatPChange(stock.pChange)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stat-card volume">
              <div className="card-header">
                <h3>Market Volume</h3>
                <span className="card-icon">◷</span>
              </div>
              <div className="volume-content">
                <div className="volume-main">
                  <span className="volume-value">{(marketStatus?.totalVolume / 1000000).toFixed(2)}M</span>
                  <span className="volume-label">shares traded</span>
                </div>
                <div className="volume-chart">
                  {/* Add a small volume chart here if you have chart data */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search stocks by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          {/* Price Range Filter */}
          <select
            value={filters.priceRange}
            onChange={(e) => handleFilterChange('priceRange', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Prices</option>
            <option value="under100">Under ₹100</option>
            <option value="100to500">₹100 - ₹500</option>
            <option value="500to1000">₹500 - ₹1000</option>
            <option value="above1000">Above ₹1000</option>
          </select>

          {/* Change Type Filter */}
          <select
            value={filters.changeType}
            onChange={(e) => handleFilterChange('changeType', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stocks</option>
            <option value="gainers">Top Gainers</option>
            <option value="losers">Top Losers</option>
          </select>

          {/* Volume Range Filter */}
          <select
            value={filters.volumeRange}
            onChange={(e) => handleFilterChange('volumeRange', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Volumes</option>
            <option value="low">Low Volume (&lt;100K)</option>
            <option value="medium">Medium Volume (100K-1M)</option>
            <option value="high">High Volume (&gt;1M)</option>
          </select>

          {/* Sort By Filter */}
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="symbol">Symbol</option>
            <option value="lastPrice">Price</option>
            <option value="pChange">% Change</option>
            <option value="volume">Volume</option>
          </select>

          {/* Sort Order */}
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="filter-select"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      <table border="1" cellPadding="10" cellSpacing="0">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Open</th>
            <th>High</th>
            <th>Low</th>
            <th>Prev Close</th>
            <th>Last Price</th>
            <th>Change</th>
            <th>% Change</th>
            <th>Volume</th>
            <th>52W High</th>
            <th>52W Low</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((stock, index) => (
            <tr key={index}>
              <td>{stock.symbol}</td>
              <td>{stock.open}</td>
              <td>{stock.high}</td>
              <td>{stock.low}</td>
              <td>{stock.preClose}</td>
              <td>{stock.lastPrice}</td>
              <td className={getValueClass(stock.change)}>
                {formatChange(stock.change)}
              </td>
              <td className={getValueClass(stock.pChange)}>
                {formatPChange(stock.pChange)}
              </td>
              <td>{(stock.volume || 0).toLocaleString()}</td>
              <td>{stock.weekHigh}</td>
              <td>{stock.weekLow}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        {Array.from({ length: Math.ceil(filteredStocks.length / itemsPerPage) }, (_, i) => (
          <button key={i + 1} onClick={() => paginate(i + 1)}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StockTable;