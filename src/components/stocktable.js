import React, { useState, useEffect } from "react";
import axios from "axios";
import "./stocktable.css";

const StockTable = () => {
  const [stocks, setStocks] = useState([]); // Store all stock data
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [itemsPerPage] = useState(10); // Number of items per page
  const [loading, setLoading] = useState(true); // Loading state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    priceRange: 'all',
    changeType: 'all',
    volumeRange: 'all',
    sortBy: 'symbol',
    sortOrder: 'asc'
  });

  // Format change value with proper decimals and ₹ symbol
  const formatChange = (change) => {
    const formattedValue = Number(change).toFixed(2);
    const sign = formattedValue > 0 ? '+' : '';
    return `${sign}₹${formattedValue}`;
  };

  // Format percentage change with proper decimals and % symbol
  const formatPChange = (pChange) => {
    const formattedValue = Number(pChange).toFixed(2);
    const sign = formattedValue > 0 ? '+' : '';
    return `${sign}${formattedValue}%`;
  };

  // Get CSS class based on value (positive/negative)
  const getValueClass = (value) => {
    if (value > 0) return 'positive-value';
    if (value < 0) return 'negative-value';
    return '';
  };

  // Filter stocks based on all criteria
  const filteredStocks = stocks.filter(stock => {
    // Search filter
    const matchesSearch = stock.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Price range filter
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

  // Fetch all Indian stocks from NSE API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nifty50');
        if (!response.data || !response.data.data) {
          throw new Error('Invalid data format from API');
        }
        
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
                `http://localhost:5000/api/stock/${encodeURIComponent(stock.symbol)}`
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
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
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
      <h1>Indian Stock Market Data</h1>
      
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