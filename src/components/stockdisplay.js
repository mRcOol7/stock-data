import React, { useState, useEffect } from "react";
import axios from "axios";
import config from '../config';
import "./stocktable.css";
import ReactApexChart from "react-apexcharts";

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
    indexFilter: 'all',
    sortBy: 'symbol',
    sortOrder: 'asc',
    sortColumn: 'symbol',
    sortDirection: 'asc'
  });
  const [marketStatus, setMarketStatus] = useState({
    status: 'Open',
    message: "Market is Open",
    topGainers: [],
    topLosers: [],
    totalVolume: 0,
    lastUpdated: new Date().toLocaleString(),
    topVolume: [],
    avgPrice: 0,
    totalStocks: 0
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
    lastUpdated: new Date().toLocaleString()
  });
  const [bankNiftyData, setBankNiftyData] = useState({
    index: 'NIFTY BANK',
    last: 0,
    change: 0,
    percentChange: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    lastUpdated: new Date().toLocaleString()
  });
  const [niftyStocks, setNiftyStocks] = useState([]);
  const [bankNiftyStocks, setBankNiftyStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedStockDetails, setSelectedStockDetails] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [candleData, setCandleData] = useState([]);
  const [chartOptions, setChartOptions] = useState({
    chart: {
      type: 'candlestick',
      height: 500,
      background: '#1a1a1a',
      foreColor: '#999',
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#26a69a',
          downward: '#ef5350'
        },
        wick: {
          useFillColor: true,
        }
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#999'
        }
      },
      axisBorder: {
        show: true,
        color: '#333'
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        style: {
          colors: '#999'
        },
        formatter: function (value) {
          return '₹' + value.toFixed(2);
        }
      },
      axisBorder: {
        show: true,
        color: '#333'
      }
    },
    grid: {
      show: true,
      borderColor: '#1f1f1f',
      strokeDashArray: 0,
      position: 'back',
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '12px',
        fontFamily: 'system-ui'
      },
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: function(value) {
          return '₹' + value.toFixed(2);
        }
      }
    },
    annotations: {
      yaxis: [{
        y: selectedStockDetails?.dayHigh,
        borderColor: '#26a69a',
        label: {
          text: 'Day High',
          style: {
            color: '#fff',
            background: '#26a69a'
          }
        }
      }, {
        y: selectedStockDetails?.dayLow,
        borderColor: '#ef5350',
        label: {
          text: 'Day Low',
          style: {
            color: '#fff',
            background: '#ef5350'
          }
        }
      }]
    }
  });

  // Format functions with null checks
  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    return value.toLocaleString();
  };

  const formatChange = (value) => {
    if (value === null || value === undefined) return '0';
    return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
  };

  const formatPChange = (value) => {
    if (value === null || value === undefined) return '0%';
    return value > 0 ? `+${value.toLocaleString()}%` : `${value.toLocaleString()}%`;
  };

  const formatVolume = (value) => {
    if (value === null || value === undefined) return '0';
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
    return value.toLocaleString();
  };

  const getValueClass = (value) => {
    if (!value) return '';
    return value > 0 ? 'positive' : value < 0 ? 'negative' : '';
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
      }
    }

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
      }
    }

    let matchesVolumeRange = true;
    if (filters.volumeRange !== 'all') {
      const volume = stock.totalTradedVolume;
      switch (filters.volumeRange) {
        case 'high':
          matchesVolumeRange = volume > 1000000;
          break;
        case 'low':
          matchesVolumeRange = volume <= 1000000;
          break;
        default:
          matchesVolumeRange = true;
      }
    }

    let matchesIndex = true;
    if (filters.indexFilter !== 'all') {
      matchesIndex = stock.indices.includes(filters.indexFilter);
    }

    return matchesSearch && matchesPriceRange && matchesChangeType && matchesVolumeRange && matchesIndex;
  }).sort((a, b) => {
    const { sortColumn, sortDirection } = filters;
    let aValue = a[sortColumn];
    let bValue = b[sortColumn];
    
    // Handle numeric values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle string values
    aValue = String(aValue).toLowerCase();
    bValue = String(bValue).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  // Process stock data to include indices information
  const processStockData = (niftyStocks, bankNiftyStocks) => {
    const stockMap = new Map();

    // Process NIFTY stocks
    niftyStocks.forEach(stock => {
      stockMap.set(stock.symbol, {
        ...stock,
        indices: ['NIFTY']
      });
    });

    // Process BANKNIFTY stocks
    bankNiftyStocks.forEach(stock => {
      if (stockMap.has(stock.symbol)) {
        const existingStock = stockMap.get(stock.symbol);
        existingStock.indices.push('BANKNIFTY');
      } else {
        stockMap.set(stock.symbol, {
          ...stock,
          indices: ['BANKNIFTY']
        });
      }
    });

    return Array.from(stockMap.values());
  };

  // Calculate market statistics
  const calculateMarketStats = (stocks) => {
    if (!stocks || stocks.length === 0) return null;

    // Sort stocks by percentage change for gainers and losers
    const sortedByChange = [...stocks].sort((a, b) => b.pChange - a.pChange);
    const topGainers = sortedByChange.slice(0, 5).filter(stock => stock.pChange > 0);
    const topLosers = sortedByChange.reverse().slice(0, 5).filter(stock => stock.pChange < 0);

    // Sort by volume for top volume
    const topVolume = [...stocks].sort((a, b) => b.totalTradedVolume - a.totalTradedVolume).slice(0, 5);

    // Calculate total market stats
    const totalVolume = stocks.reduce((sum, stock) => sum + stock.totalTradedVolume, 0);
    const avgPrice = stocks.reduce((sum, stock) => sum + stock.lastPrice, 0) / stocks.length;

    return {
      topGainers,
      topLosers,
      topVolume,
      totalVolume,
      avgPrice: avgPrice.toFixed(2),
      totalStocks: stocks.length
    };
  };

  // Update market stats when stocks change
  useEffect(() => {
    const allStocks = [...niftyStocks, ...bankNiftyStocks];
    const stats = calculateMarketStats(allStocks);
    if (stats) {
      setMarketStatus(prevStatus => ({
        ...prevStatus,
        ...stats
      }));
    }
  }, [niftyStocks, bankNiftyStocks]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSort = (column) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      sortColumn: column,
      sortDirection: prevFilters.sortColumn === column && prevFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (column) => {
    if (filters.sortColumn !== column) return '↕️';
    return filters.sortDirection === 'asc' ? '↑' : '↓';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const startTime = performance.now();

      // Fetch NIFTY data
      const niftyResponse = await axios.get(`${config.apiBaseUrl}/api/nifty`);
      const niftyData = await niftyResponse.data;
      console.log('NIFTY API Response:', {
        timestamp: new Date().toLocaleTimeString(),
        totalStocks: niftyData.length,
        data: niftyData
      });
      setNiftyData(niftyData);

      // Fetch BANKNIFTY data
      const bankNiftyResponse = await axios.get(`${config.apiBaseUrl}/api/banknifty`);
      const bankNiftyData = await bankNiftyResponse.data;
      console.log('BANKNIFTY API Response:', {
        timestamp: new Date().toLocaleTimeString(),
        totalStocks: bankNiftyData.length,
        data: bankNiftyData
      });
      setBankNiftyData(bankNiftyData);

      // Process and combine the data
      const processedStocks = processStockData(niftyData, bankNiftyData);

      // Update states
      setStocks(processedStocks);
      setNiftyStocks(niftyData);
      setBankNiftyStocks(bankNiftyData);

      // Log performance metrics
      console.log('API Performance:', {
        timestamp: new Date().toLocaleTimeString(),
        totalFetchTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        totalStocksFetched: processedStocks.length,
        niftyStocks: niftyData.length,
        bankNiftyStocks: bankNiftyData.length
      });

      setLoading(false);
    } catch (error) {
      console.error('API Error:', {
        timestamp: new Date().toLocaleTimeString(),
        error: error.message,
        stack: error.stack,
        endpoint: error.config?.url || 'Unknown endpoint'
      });
      setLoading(false);
    }
  };

  const [indices, setIndices] = useState({
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
      lastUpdateTime: ''
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
      lastUpdateTime: ''
    },
    marketStatus: {
      status: 'Open',
      message: "Market is Open"
    }
  });

  const fetchIndices = async () => {
    try {
      console.log('Fetching indices data...');
      const response = await axios.get(`${config.apiBaseUrl}/api/indices`);
      console.log('Indices data received:', response.data);
      setIndices(response.data);
    } catch (error) {
      console.error('Error fetching indices:', error);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([fetchData(), fetchIndices()]);
    };

    fetchAllData();
    const dataInterval = setInterval(fetchAllData, 60000);
  
    return () => clearInterval(dataInterval);
  }, []);

  const handleRowClick = async (stock) => {
    setSelectedStock(stock.symbol);
    setChartLoading(true);
    setSelectedStockDetails(stock);
    
    try {
      const response = await axios.get(`${config.apiBaseUrl}/api/historical/${stock.symbol}`);
      const historicalData = response.data
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(item => ({
          x: new Date(item.date).getTime(),
          y: [
            parseFloat(item.open),
            parseFloat(item.high),
            parseFloat(item.low),
            parseFloat(item.close)
          ]
        }));
      
      setCandleData([{
        data: historicalData
      }]);

      setChartOptions({
        chart: {
          type: 'candlestick',
          height: 500,
          background: '#1a1a1a',
          foreColor: '#999',
          zoom: {
            enabled: true,
            type: 'x',
            autoScaleYaxis: true
          },
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true
            }
          }
        },
        title: {
          text: `${stock.symbol} Price History`,
          align: 'left'
        },
        xaxis: {
          type: 'datetime',
          labels: {
            datetimeFormatter: {
              year: 'yyyy',
              month: 'MMM \'yy',
              day: 'dd MMM'
            }
          }
        },
        yaxis: {
          tooltip: {
            enabled: true
          },
          labels: {
            formatter: (value) => `₹${value.toFixed(2)}`
          }
        },
        plotOptions: {
          candlestick: {
            colors: {
              upward: '#26A69A',
              downward: '#EF5350'
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching historical data:', error);
      setCandleData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const updatePriceIndicators = (stockDetails) => {
    if (stockDetails) {
      setChartOptions(prevOptions => ({
        ...prevOptions,
        annotations: {
          yaxis: [{
            y: stockDetails.dayHigh,
            borderColor: '#26a69a',
            label: {
              text: 'Day High',
              style: {
                color: '#fff',
                background: '#26a69a'
              }
            }
          }, {
            y: stockDetails.dayLow,
            borderColor: '#ef5350',
            label: {
              text: 'Day Low',
              style: {
                color: '#fff',
                background: '#ef5350'
              }
            }
          }]
        }
      }));
    }
  };

  useEffect(() => {
    if (selectedStockDetails) {
      updatePriceIndicators(selectedStockDetails);
    }
  }, [selectedStockDetails]);

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

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const [showJumpInput, setShowJumpInput] = useState(false);
    const [jumpPage, setJumpPage] = useState('');
    const jumpInputRef = React.useRef(null);

    const handleJumpInputChange = (e) => {
      const value = e.target.value;
      if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0 && parseInt(value) <= totalPages)) {
        setJumpPage(value);
      }
    };

    const handleJumpSubmit = (e) => {
      e.preventDefault();
      if (jumpPage) {
        const page = parseInt(jumpPage);
        if (page >= 1 && page <= totalPages) {
          onPageChange(page);
          setShowJumpInput(false);
          setJumpPage('');
        }
      }
    };

    const handleDotsClick = () => {
      setShowJumpInput(true);
      setTimeout(() => {
        jumpInputRef.current?.focus();
      }, 100);
    };

    const handleClickOutside = (e) => {
      if (jumpInputRef.current && !jumpInputRef.current.contains(e.target)) {
        setShowJumpInput(false);
        setJumpPage('');
      }
    };

    React.useEffect(() => {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const renderPaginationButtons = () => {
      const buttons = [];
      
      // Always show first page
      buttons.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className={`pagination-button ${currentPage === 1 ? 'active' : ''}`}
          title="Go to first page"
        >
          1
        </button>
      );

      // If total pages is 7 or less, show all pages
      if (totalPages <= 7) {
        for (let i = 2; i <= totalPages; i++) {
          buttons.push(
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`pagination-button ${currentPage === i ? 'active' : ''}`}
              title={`Go to page ${i}`}
            >
              {i}
            </button>
          );
        }
        return buttons;
      }

      // Show dots after page 3 if current page is in first 4 pages
      if (currentPage <= 4) {
        buttons.push(
          <button 
            key={2} 
            onClick={() => onPageChange(2)} 
            className={`pagination-button ${currentPage === 2 ? 'active' : ''}`}
            title="Go to page 2"
          >
            2
          </button>,
          <button 
            key={3} 
            onClick={() => onPageChange(3)} 
            className={`pagination-button ${currentPage === 3 ? 'active' : ''}`}
            title="Go to page 3"
          >
            3
          </button>,
          <button 
            key={4} 
            onClick={() => onPageChange(4)} 
            className={`pagination-button ${currentPage === 4 ? 'active' : ''}`}
            title="Go to page 4"
          >
            4
          </button>,
          showJumpInput ? (
            <form key="jump1" onSubmit={handleJumpSubmit} className="jump-form">
              <input
                ref={jumpInputRef}
                type="text"
                value={jumpPage}
                onChange={handleJumpInputChange}
                className="jump-input"
                placeholder={`5-${totalPages - 1}`}
                aria-label="Jump to page"
              />
            </form>
          ) : (
            <button key="dots1" onClick={handleDotsClick} className="pagination-dots" title="Click to jump to page">
              •••
            </button>
          )
        );
      }
      // Show dots before and after current page if current page is in middle
      else if (currentPage > 4 && currentPage < totalPages - 3) {
        buttons.push(
          showJumpInput ? (
            <form key="jump1" onSubmit={handleJumpSubmit} className="jump-form">
              <input
                ref={jumpInputRef}
                type="text"
                value={jumpPage}
                onChange={handleJumpInputChange}
                className="jump-input"
                placeholder={`2-${currentPage - 2}`}
                aria-label="Jump to page"
              />
            </form>
          ) : (
            <button key="dots1" onClick={handleDotsClick} className="pagination-dots" title="Click to jump to page">
              •••
            </button>
          ),
          <button 
            key={currentPage - 1} 
            onClick={() => onPageChange(currentPage - 1)} 
            className="pagination-button"
            title={`Go to page ${currentPage - 1}`}
          >
            {currentPage - 1}
          </button>,
          <button 
            key={currentPage} 
            onClick={() => onPageChange(currentPage)} 
            className="pagination-button active"
            title={`Current page ${currentPage}`}
          >
            {currentPage}
          </button>,
          <button 
            key={currentPage + 1} 
            onClick={() => onPageChange(currentPage + 1)} 
            className="pagination-button"
            title={`Go to page ${currentPage + 1}`}
          >
            {currentPage + 1}
          </button>,
          showJumpInput ? (
            <form key="jump2" onSubmit={handleJumpSubmit} className="jump-form">
              <input
                ref={jumpInputRef}
                type="text"
                value={jumpPage}
                onChange={handleJumpInputChange}
                className="jump-input"
                placeholder={`${currentPage + 2}-${totalPages - 1}`}
                aria-label="Jump to page"
              />
            </form>
          ) : (
            <button key="dots2" onClick={handleDotsClick} className="pagination-dots" title="Click to jump to page">
              •••
            </button>
          )
        );
      }
      // Show dots before last 3 pages if current page is in last 4 pages
      else {
        buttons.push(
          showJumpInput ? (
            <form key="jump1" onSubmit={handleJumpSubmit} className="jump-form">
              <input
                ref={jumpInputRef}
                type="text"
                value={jumpPage}
                onChange={handleJumpInputChange}
                className="jump-input"
                placeholder={`2-${totalPages - 4}`}
                aria-label="Jump to page"
              />
            </form>
          ) : (
            <button key="dots1" onClick={handleDotsClick} className="pagination-dots" title="Click to jump to page">
              •••
            </button>
          ),
          <button 
            key={totalPages - 3} 
            onClick={() => onPageChange(totalPages - 3)} 
            className={`pagination-button ${currentPage === totalPages - 3 ? 'active' : ''}`}
            title={`Go to page ${totalPages - 3}`}
          >
            {totalPages - 3}
          </button>,
          <button 
            key={totalPages - 2} 
            onClick={() => onPageChange(totalPages - 2)} 
            className={`pagination-button ${currentPage === totalPages - 2 ? 'active' : ''}`}
            title={`Go to page ${totalPages - 2}`}
          >
            {totalPages - 2}
          </button>,
          <button 
            key={totalPages - 1} 
            onClick={() => onPageChange(totalPages - 1)} 
            className={`pagination-button ${currentPage === totalPages - 1 ? 'active' : ''}`}
            title={`Go to page ${totalPages - 1}`}
          >
            {totalPages - 1}
          </button>
        );
      }

      // Always show last page
      buttons.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`pagination-button ${currentPage === totalPages ? 'active' : ''}`}
          title="Go to last page"
        >
          {totalPages}
        </button>
      );

      return buttons;
    };

    return (
      <div className="pagination">
        <button
          className="pagination-button nav-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          <span className="nav-icon">←</span>
        </button>
        
        {renderPaginationButtons()}
        
        <button
          className="pagination-button nav-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          <span className="nav-icon">→</span>
        </button>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!stocks || stocks.length === 0) {
    return <div>No stocks data available</div>;
  }

  const formatLargeNumber = (number) => {
    if (!number) return '0';
    
    // Convert to absolute number for calculation
    const absNum = Math.abs(number);
    
    // Trillions
    if (absNum >= 1e12) {
      return `${(number / 1e12).toFixed(2)}T`;
    }
    // Billions
    if (absNum >= 1e9) {
      return `${(number / 1e9).toFixed(2)}B`;
    }
    // Millions
    if (absNum >= 1e6) {
      return `${(number / 1e6).toFixed(2)}M`;
    }
    // Thousands
    if (absNum >= 1e3) {
      return `${(number / 1e3).toFixed(2)}K`;
    }
    
    return number.toFixed(2);
  };

  const VolumeCard = ({ indices }) => {
    // Check if we have valid data
    const hasValidData = indices && 
      indices.nifty50 && 
      indices.bankNifty && 
      (indices.nifty50.totalTradedVolume || indices.bankNifty.totalTradedVolume);

    const totalVolume = hasValidData ? 
      (indices.nifty50.totalTradedVolume || 0) + (indices.bankNifty.totalTradedVolume || 0) : 0;
    const totalValue = hasValidData ? 
      (indices.nifty50.totalTradedValue || 0) + (indices.bankNifty.totalTradedValue || 0) : 0;
    
    const getVolumeChangeClass = () => {
      if (!hasValidData) return '';
      const prevDayVolume = (indices.nifty50.previousDayVolume || 0) + (indices.bankNifty.previousDayVolume || 0);
      return totalVolume > prevDayVolume ? 'positive' : 'negative';
    };

    const calculateVolumeChange = () => {
      if (!hasValidData) return 0;
      const prevDayVolume = (indices.nifty50.previousDayVolume || 0) + (indices.bankNifty.previousDayVolume || 0);
      if (!prevDayVolume) return 0;
      return ((totalVolume - prevDayVolume) / prevDayVolume) * 100;
    };

    const volumeChange = calculateVolumeChange();
    const niftyVolumePercent = hasValidData && totalVolume ? 
      ((indices.nifty50.totalTradedVolume || 0) / totalVolume * 100) : 0;
    const bankNiftyVolumePercent = hasValidData && totalVolume ? 
      ((indices.bankNifty.totalTradedVolume || 0) / totalVolume * 100) : 0;

    if (!indices) {
      return (
        <div className="volume-card loading">
          <div className="volume-header">
            <h3>Market Volume</h3>
            <div className="loading-indicator">Loading...</div>
          </div>
        </div>
      );
    }

    return (
      <div className={`volume-card ${!hasValidData ? 'error' : ''}`}>
        <div className="volume-header">
          <div className="header-left">
            <h3>Market Volume</h3>
            <div className="volume-timestamp">
              {hasValidData ? (
                <>
                  <span className="dot"></span>
                  Live Update
                </>
              ) : (
                <span className="error-text">Data Unavailable</span>
              )}
            </div>
          </div>
          {hasValidData && (
            <div className="header-right">
              <div className={`volume-change ${getVolumeChangeClass()}`}>
                <span className="change-icon">{volumeChange >= 0 ? '↑' : '↓'}</span>
                {Math.abs(volumeChange).toFixed(2)}%
              </div>
            </div>
          )}
        </div>
        
        <div className="volume-grid">
          <div className="volume-stats">
            <div className="stat-item">
              <div className="stat-value">
                {formatLargeNumber(totalVolume)}
                <span className="stat-unit">shares</span>
              </div>
              <div className="stat-label">Total Volume</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">
                ₹{formatLargeNumber(totalValue)}
                <span className="stat-unit">turnover</span>
              </div>
              <div className="stat-label">Total Value</div>
            </div>
          </div>
          
          <div className="volume-details">
            <div className={`index-volume ${!indices.nifty50.totalTradedVolume ? 'error' : ''}`}>
              <div className="index-header">
                <span className="index-name">NIFTY 50</span>
                {indices.nifty50.totalTradedVolume && (
                  <span className="index-percent">
                    {niftyVolumePercent.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="index-stats">
                <div className="stat">
                  <span>{formatLargeNumber(indices.nifty50.totalTradedVolume || 0)}</span>
                  <small>Vol</small>
                </div>
                <div className="stat">
                  <span>₹{formatLargeNumber(indices.nifty50.totalTradedValue || 0)}</span>
                  <small>Val</small>
                </div>
              </div>
            </div>
            
            <div className={`index-volume ${!indices.bankNifty.totalTradedVolume ? 'error' : ''}`}>
              <div className="index-header">
                <span className="index-name">BANK NIFTY</span>
                {indices.bankNifty.totalTradedVolume && (
                  <span className="index-percent">
                    {bankNiftyVolumePercent.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="index-stats">
                <div className="stat">
                  <span>{formatLargeNumber(indices.bankNifty.totalTradedVolume || 0)}</span>
                  <small>Vol</small>
                </div>
                <div className="stat">
                  <span>₹{formatLargeNumber(indices.bankNifty.totalTradedValue || 0)}</span>
                  <small>Val</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Stock details component with exact API format
  const StockDetails = ({ stock }) => {
    if (!stock) return null;

    return (
      <div className="stock-details">
        <div className="stock-header">
          <h2>{stock.symbol}</h2>
          <div className="company-info">
            <span className="identifier">{stock.identifier || 'N/A'}</span>
          </div>
        </div>

        <div className="price-section">
          <div className="current-price">
            <span className="price">₹{formatNumber(stock.lastPrice)}</span>
            <span className={`change ${getValueClass(stock.change)}`}>
              {formatChange(stock.change)} ({formatPChange(stock.pChange)})
            </span>
          </div>
          <div className="last-update">
            Last Updated: {stock.lastUpdateTime || 'N/A'}
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-section">
            <h3>Today's Trading</h3>
            <div className="metric-row">
              <div className="metric">
                <span className="label">Open</span>
                <span className="value">₹{formatNumber(stock.open)}</span>
              </div>
              <div className="metric">
                <span className="label">High</span>
                <span className="value">₹{formatNumber(stock.dayHigh)}</span>
              </div>
              <div className="metric">
                <span className="label">Low</span>
                <span className="value">₹{formatNumber(stock.dayLow)}</span>
              </div>
              <div className="metric">
                <span className="label">Prev Close</span>
                <span className="value">₹{formatNumber(stock.previousClose)}</span>
              </div>
            </div>
          </div>

          <div className="metric-section">
            <h3>52 Week Range</h3>
            <div className="metric-row">
              <div className="metric">
                <span className="label">52W High</span>
                <span className="value">₹{formatNumber(stock.yearHigh)}</span>
              </div>
              <div className="metric">
                <span className="label">52W Low</span>
                <span className="value">₹{formatNumber(stock.yearLow)}</span>
              </div>
              <div className="metric">
                <span className="label">Near 52W High</span>
                <span className="value">{formatPChange(stock.nearWKH)}%</span>
              </div>
              <div className="metric">
                <span className="label">Near 52W Low</span>
                <span className="value">{formatPChange(stock.nearWKL)}%</span>
              </div>
            </div>
          </div>

          <div className="metric-section">
            <h3>Trading Information</h3>
            <div className="metric-row">
              <div className="metric">
                <span className="label">Volume</span>
                <span className="value">{formatVolume(stock.totalTradedVolume)}</span>
              </div>
              <div className="metric">
                <span className="label">Value</span>
                <span className="value">₹{formatCrValue(stock.totalTradedValue)}</span>
              </div>
              <div className="metric">
                <span className="label">30D Change</span>
                <span className={`value ${getValueClass(stock.perChange30d)}`}>
                  {formatPChange(stock.perChange30d)}%
                </span>
              </div>
              <div className="metric">
                <span className="label">1Y Change</span>
                <span className={`value ${getValueClass(stock.perChange365d)}`}>
                  {formatPChange(stock.perChange365d)}%
                </span>
              </div>
            </div>
          </div>

          <div className="metric-section">
            <h3>Historical Dates</h3>
            <div className="metric-row">
              <div className="metric">
                <span className="label">30D Ago Date</span>
                <span className="value">{stock.date30dAgo}</span>
              </div>
              <div className="metric">
                <span className="label">365D Ago Date</span>
                <span className="value">{stock.date365dAgo}</span>
              </div>
              <div className="metric">
                <span className="label">Market Cap</span>
                <span className="value">₹{formatCrValue(stock.ffmc)}</span>
              </div>
              <div className="metric">
                <span className="label">Priority</span>
                <span className="value">{stock.priority}</span>
              </div>
            </div>
          </div>
        </div>

        {stock.chartTodayPath && (
          <div className="charts-section">
            <h3>Price Charts</h3>
            <div className="chart-links">
              <a href={stock.chartTodayPath} target="_blank" rel="noopener noreferrer">Intraday Chart</a>
              <a href={stock.chart30dPath} target="_blank" rel="noopener noreferrer">30 Days Chart</a>
              <a href={stock.chart365dPath} target="_blank" rel="noopener noreferrer">1 Year Chart</a>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Additional formatting functions
  const formatCrValue = (value) => {
    if (!value) return '0';
    const crValue = value / 10000000;
    return `${crValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} Cr`;
  };

  const IndexCard = ({ index, title, marketStatus }) => {
    const getValueClass = (value) => value >= 0 ? 'positive' : 'negative';

    return (
      <div className={`index-card ${getValueClass(index.change)}`}>
        <div className="index-header">
          <div className="header-left">
            <h3>{title}</h3>
            <div className={`market-status ${marketStatus.status.toLowerCase()}`}>
              <span className="status-dot"></span>
              <span className="status-text">{marketStatus.message}</span>
            </div>
          </div>
          <span className="last-update">Last Updated: {index.lastUpdateTime}</span>
        </div>
        <div className="index-price">
          <span className="current">₹{formatNumber(index.lastPrice)}</span>
          <div className="change-container">
            <span className="change">{formatChange(index.change)}</span>
            <span className="percent">({formatPChange(index.pChange)}%)</span>
          </div>
        </div>
        <div className="index-details">
          <div className="detail-row">
            <div className="detail-item">
              <span className="label">Open</span>
              <span className="value">₹{formatNumber(index.open)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Prev Close</span>
              <span className="value">₹{formatNumber(index.previousClose)}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-item">
              <span className="label">Day High</span>
              <span className="value">₹{formatNumber(index.dayHigh)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Day Low</span>
              <span className="value">₹{formatNumber(index.dayLow)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="stock-container">
      <div className="dashboard-header">
        <h1>Market Dashboard</h1>
        <div className="market-time">
          <span className="time-label">Market Time</span>
          <span className="time-value">{new Date().toLocaleTimeString('en-US', { 
            hour12: true,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
          })}</span>
        </div>
      </div>

      <div className="indices-container">
        <IndexCard 
          index={indices.nifty50} 
          title="NIFTY 50" 
          marketStatus={indices.marketStatus} 
        />
        <IndexCard 
          index={indices.bankNifty} 
          title="BANK NIFTY" 
          marketStatus={indices.marketStatus} 
        />
        <VolumeCard indices={indices} />
      </div>

      <div className="dashboard-controls">
        <div className="market-overview">
          {/* Market Stats Section */}
          <div className="market-stats-section">
            <div className="stats-grid">
              <div className="stats-card">
                <h3>Top Gainers</h3>
                <div className="stats-list">
                  {marketStatus.topGainers?.map((stock, index) => (
                    <div key={index} className="stats-item">
                      <div className="stock-info">
                        <span className="stock-symbol">{stock.symbol}</span>
                        <span className="stock-price">₹{formatNumber(stock.lastPrice)}</span>
                      </div>
                      <div className="stock-change positive">
                        <span>+{formatPChange(stock.pChange)}</span>
                        <span className="change-value">{formatChange(stock.change)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stats-card">
                <h3>Top Losers</h3>
                <div className="stats-list">
                  {marketStatus.topLosers?.map((stock, index) => (
                    <div key={index} className="stats-item">
                      <div className="stock-info">
                        <span className="stock-symbol">{stock.symbol}</span>
                        <span className="stock-price">₹{formatNumber(stock.lastPrice)}</span>
                      </div>
                      <div className="stock-change negative">
                        <span>{formatPChange(stock.pChange)}</span>
                        <span className="change-value">{formatChange(stock.change)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stock Table Section */}
          <div className="stock-table-section">
            <div className="table-controls">
              <div className="table-filters">
                <select
                  value={filters.indexFilter}
                  onChange={(e) => setFilters({ ...filters, indexFilter: e.target.value })}
                  className="filter-select"
                >
                  <option value="all">All Indices</option>
                  <option value="NIFTY 50">Nifty 50</option>
                  <option value="NIFTY BANK">Bank Nifty</option>
                </select>

                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  className="filter-select"
                >
                  <option value="all">All Prices</option>
                  <option value="under100">Under ₹100</option>
                  <option value="100to500">₹100 - ₹500</option>
                  <option value="500to1000">₹500 - ₹1000</option>
                  <option value="above1000">Above ₹1000</option>
                </select>

                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="stock-table">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('symbol')}>Symbol</th>
                    <th onClick={() => handleSort('lastPrice')}>Price</th>
                    <th onClick={() => handleSort('change')}>Change</th>
                    <th onClick={() => handleSort('pChange')}>% Change</th>
                    <th onClick={() => handleSort('totalTradedVolume')}>Volume</th>
                    <th onClick={() => handleSort('open')}>Open</th>
                    <th onClick={() => handleSort('dayHigh')}>High</th>
                    <th onClick={() => handleSort('dayLow')}>Low</th>
                    <th onClick={() => handleSort('previousClose')}>Prev Close</th>
                    <th onClick={() => handleSort('yearHigh')}>52W High</th>
                    <th onClick={() => handleSort('yearLow')}>52W Low</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((stock, index) => (
                    <tr 
                      key={index}
                      className={getValueClass(stock.change)}
                      onClick={() => handleRowClick(stock)}
                    >
                      <td>{stock.symbol}</td>
                      <td>₹{formatNumber(stock.lastPrice)}</td>
                      <td className={getValueClass(stock.change)}>
                        {formatChange(stock.change)}
                      </td>
                      <td className={getValueClass(stock.pChange)}>
                        {formatPChange(stock.pChange)}%
                      </td>
                      <td>{formatVolume(stock.totalTradedVolume)}</td>
                      <td>₹{formatNumber(stock.open)}</td>
                      <td>₹{formatNumber(stock.dayHigh)}</td>
                      <td>₹{formatNumber(stock.dayLow)}</td>
                      <td>₹{formatNumber(stock.previousClose)}</td>
                      <td>₹{formatNumber(stock.yearHigh)}</td>
                      <td>₹{formatNumber(stock.yearLow)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <Pagination 
          currentPage={currentPage} 
          totalPages={Math.ceil(filteredStocks.length / itemsPerPage)} 
          onPageChange={paginate} 
        />

        {/* Chart Section at Bottom */}
        <div className="chart-section">
          {!selectedStock ? (
            <div className="chart-guide">
              <i className="fas fa-chart-line"></i>
              <p>Click on any stock row above to view detailed price history chart</p>
            </div>
          ) : (
            <div className="selected-stock-info">
              <div className="stock-header">
                <div className="stock-title">
                  <h2>{selectedStock}</h2>
                  {selectedStockDetails && (
                    <div className="stock-price-info">
                      <span className="current-price">₹{formatNumber(selectedStockDetails.lastPrice)}</span>
                      <span className={`price-change ${getValueClass(selectedStockDetails.pChange)}`}>
                        {formatChange(selectedStockDetails.change)} ({formatPChange(selectedStockDetails.pChange)})
                      </span>
                    </div>
                  )}
                </div>
                <div className="chart-stats">
                  {selectedStockDetails && (
                    <>
                      <div className="stat-item">
                        <span className="stat-label">Open</span>
                        <span className="stat-value">₹{formatNumber(selectedStockDetails.open)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">High</span>
                        <span className="stat-value">₹{formatNumber(selectedStockDetails.high)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Low</span>
                        <span className="stat-value">₹{formatNumber(selectedStockDetails.low)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Prev Close</span>
                        <span className="stat-value">₹{formatNumber(selectedStockDetails.preClose)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Volume</span>
                        <span className="stat-value">{formatVolume(selectedStockDetails.volume)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="chart-container">
                {chartLoading ? (
                  <div className="chart-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading chart data...</p>
                  </div>
                ) : candleData.length > 0 && candleData[0].data && candleData[0].data.length > 0 ? (
                  <ReactApexChart
                    options={chartOptions}
                    series={candleData}
                    type="candlestick"
                    height={500}
                  />
                ) : (
                  <div className="no-data-message">
                    <p>No historical data available for this stock</p>
                  </div>
                )}
              </div>
              {selectedStockDetails && (
                <StockDetails stock={selectedStockDetails} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockTable;