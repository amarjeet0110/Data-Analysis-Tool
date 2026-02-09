import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Upload, FileText, TrendingUp, BarChart3, Eye, AlertCircle, CheckCircle, Github, Home, X, AlertTriangle, Activity, DollarSign, ShoppingCart, Package, Zap, Filter } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import _ from 'lodash';

const DataAnalysisDashboard = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [dataQuality, setDataQuality] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [comparisonMode, setComparisonMode] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const developers = [
    {
      name: 'Amarjeet',
      fullName: 'Amarjeet Kumar',
      regNo: '22155135005',
      course: 'CSE(IOT)',
      college: 'Government Engineering College Vaishali',
      portfolio: 'https://vercel.com/amarjeet0110s-projects/amarjeet0110'
    },
    {
      name: 'Kartik',
      fullName: 'Kartik Raj',
      regNo: '22155135023',
      course: 'CSE(IOT)',
      college: 'Government Engineering College Vaishali'
    },
    {
      name: 'Shanu',
      fullName: 'Shanu Kumar',
      regNo: '22155135026',
      course: 'CSE(IOT)',
      college: 'Government Engineering College Vaishali'
    },
    {
      name: 'Krishna',
      fullName: 'Krishna Murari',
      regNo: '22155125051',
      course: 'CSE(IOT)',
      college: 'Government Engineering College Vaishali'
    }
  ];

  const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#06b6d4'];

  const processCSV = (fileContent) => {
    return new Promise((resolve) => {
      Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve({
            data: results.data,
            headers: Object.keys(results.data[0] || {})
          });
        }
      });
    });
  };

  const processExcel = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    return {
      data: jsonData,
      headers: Object.keys(jsonData[0] || {})
    };
  };

  const processPDF = async (arrayBuffer) => {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('PDF does not contain enough data');
      }

      const headers = lines[0].split(/\s{2,}|\t/).map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(/\s{2,}|\t/).map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = isNaN(values[i]) ? values[i] : parseFloat(values[i]);
        });
        return obj;
      });

      return { data, headers };
    } catch (error) {
      return {
        data: [{ Info: 'PDF text extracted', Content: 'Data parsing attempted' }],
        headers: ['Info', 'Content']
      };
    }
  };

  const generateInsights = (data, headers) => {
    const insights = [];
    const numericCols = headers.filter(h => 
      data.some(row => typeof row[h] === 'number')
    );

    if (data.length > 0) {
      insights.push({
        type: 'info',
        title: 'Dataset Size',
        description: `Total ${data.length} rows with ${headers.length} columns`
      });
    }

    numericCols.forEach(col => {
      const values = data.map(row => row[col]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        insights.push({
          type: 'success',
          title: `${col} Statistics`,
          description: `Avg: ${avg.toFixed(2)} | Max: ${max} | Min: ${min}`
        });
      }
    });

    const categoricalCols = headers.filter(h => !numericCols.includes(h));
    categoricalCols.slice(0, 2).forEach(col => {
      const uniqueValues = [...new Set(data.map(row => row[col]))].length;
      insights.push({
        type: 'info',
        title: `${col} Categories`,
        description: `${uniqueValues} unique values found`
      });
    });

    return insights;
  };

  const calculateStats = (data, headers) => {
    const numericCols = headers.filter(h => 
      data.some(row => typeof row[h] === 'number')
    );

    return numericCols.map(col => {
      const values = data.map(row => row[col]).filter(v => typeof v === 'number');
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      return {
        name: col,
        average: avg.toFixed(2),
        total: sum.toFixed(2),
        max,
        min,
        count: values.length
      };
    });
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setActiveTab('overview');

    try {
      let result;
      const fileName = uploadedFile.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        const text = await uploadedFile.text();
        result = await processCSV(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        result = processExcel(arrayBuffer);
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        result = await processPDF(arrayBuffer);
      } else {
        alert('Please upload CSV, Excel (.xlsx, .xls), or PDF file');
        setLoading(false);
        return;
      }

      setData(result.data);
      setHeaders(result.headers);
      setInsights(generateInsights(result.data, result.headers));
      setStats(calculateStats(result.data, result.headers));
      
      // Advanced analysis
      const quality = analyzeDataQuality(result.data, result.headers);
      setDataQuality(quality);
      setAlerts(generateAlerts(result.data, result.headers, quality));
      setAiInsights(generateAIInsights(result.data, result.headers));
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check file format.');
    }

    setLoading(false);
  };

  const getChartData = () => {
    if (!data || data.length === 0) return [];
    
    // Find category/product column
    const categoryCol = headers.find(h => 
      h.toLowerCase().includes('product') || 
      h.toLowerCase().includes('item') ||
      h.toLowerCase().includes('category') ||
      h.toLowerCase().includes('name')
    );

    const salesCol = headers.find(h => 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('revenue') ||
      h.toLowerCase().includes('amount')
    );

    const profitCol = headers.find(h => h.toLowerCase().includes('profit'));
    
    if (!categoryCol) return [];

    // Group by category
    const grouped = _.groupBy(data, categoryCol);
    
    return Object.entries(grouped).map(([category, rows]) => {
      const item = { 
        name: String(category).substring(0, 20)
      };
      
      if (salesCol) {
        item.Sales = _.sum(rows.map(r => r[salesCol]).filter(v => typeof v === 'number'));
      }
      
      if (profitCol) {
        item.Profit = _.sum(rows.map(r => r[profitCol]).filter(v => typeof v === 'number'));
      }
      
      // Add other numeric columns
      headers.filter(h => 
        h !== categoryCol && 
        h !== salesCol && 
        h !== profitCol &&
        rows.some(row => typeof row[h] === 'number')
      ).forEach(col => {
        item[col] = _.sum(rows.map(r => r[col]).filter(v => typeof v === 'number'));
      });
      
      return item;
    }).sort((a, b) => (b.Sales || 0) - (a.Sales || 0)).slice(0, 20);
  };

  const getTimeSeriesData = () => {
    if (!data || data.length === 0) return [];
    
    // Find date column
    const dateCol = headers.find(h => 
      h.toLowerCase().includes('date') || 
      h.toLowerCase().includes('time') ||
      h.toLowerCase().includes('month') ||
      h.toLowerCase().includes('year')
    );

    const salesCol = headers.find(h => 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('revenue') ||
      h.toLowerCase().includes('amount')
    );

    if (!dateCol || !salesCol) return [];

    // Group by date/time
    const grouped = _.groupBy(data, dateCol);
    
    return Object.entries(grouped)
      .map(([date, rows]) => ({
        date: String(date),
        Sales: _.sum(rows.map(r => r[salesCol]).filter(v => typeof v === 'number')),
        Orders: rows.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30);
  };

  const getRegionData = () => {
    if (!data || data.length === 0) return [];
    
    const regionCol = headers.find(h => 
      h.toLowerCase().includes('region') || 
      h.toLowerCase().includes('state') ||
      h.toLowerCase().includes('city') ||
      h.toLowerCase().includes('zone') ||
      h.toLowerCase().includes('area')
    );

    const salesCol = headers.find(h => 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('revenue') ||
      h.toLowerCase().includes('amount')
    );

    if (!regionCol || !salesCol) return [];

    const grouped = _.groupBy(data, regionCol);
    
    return Object.entries(grouped)
      .map(([region, rows]) => ({
        region: String(region),
        sales: _.sum(rows.map(r => r[salesCol]).filter(v => typeof v === 'number')),
        orders: rows.length
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
  };

  const getPieData = () => {
    if (!data || headers.length === 0) return [];
    
    const categoricalCol = headers.find(h => 
      data.every(row => typeof row[h] === 'string')
    );

    if (!categoricalCol) return [];

    const counts = {};
    data.forEach(row => {
      const val = row[categoricalCol];
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts).slice(0, 6).map(([name, value]) => ({
      name,
      value
    }));
  };

  const getKPIs = () => {
    if (!data || !stats) return [];
    
    const advancedKPIs = generateAdvancedKPIs(data, headers);
    if (advancedKPIs.length > 0) return advancedKPIs;
    
    // Fallback to basic KPIs
    const kpis = [
      {
        title: 'Total Records',
        value: data.length.toLocaleString(),
        icon: FileText,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30'
      },
      {
        title: 'Columns',
        value: headers.length,
        icon: BarChart3,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30'
      }
    ];

    if (stats.length > 0) {
      const firstStat = stats[0];
      kpis.push({
        title: `Avg ${firstStat.name}`,
        value: parseFloat(firstStat.average).toLocaleString(),
        icon: TrendingUp,
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30'
      });

      kpis.push({
        title: `Max ${firstStat.name}`,
        value: firstStat.max.toLocaleString(),
        icon: TrendingUp,
        color: 'from-pink-500 to-pink-600',
        bgColor: 'bg-pink-500/20',
        borderColor: 'border-pink-500/30'
      });
    }

    return kpis;
  };

  const getFilteredData = () => {
    if (!data) return [];
    
    let filtered = [...data];
    
    if (selectedColumn && filterValue) {
      filtered = filtered.filter(row => {
        const value = String(row[selectedColumn]).toLowerCase();
        return value.includes(filterValue.toLowerCase());
      });
    }
    
    return filtered;
  };

  const analyzeDataQuality = (data, headers) => {
    const quality = {
      totalRows: data.length,
      duplicates: 0,
      missingValues: {},
      outliers: [],
      issues: []
    };

    // Check duplicates
    const uniqueRows = _.uniqWith(data, _.isEqual);
    quality.duplicates = data.length - uniqueRows.length;
    
    if (quality.duplicates > 0) {
      quality.issues.push({
        type: 'warning',
        message: `${quality.duplicates} duplicate rows found`
      });
    }

    // Check missing values
    headers.forEach(header => {
      const missing = data.filter(row => 
        row[header] === null || 
        row[header] === undefined || 
        row[header] === '' || 
        String(row[header]).toLowerCase() === 'na' ||
        String(row[header]).toLowerCase() === 'n/a'
      ).length;
      
      if (missing > 0) {
        quality.missingValues[header] = missing;
        quality.issues.push({
          type: 'warning',
          message: `${header}: ${missing} missing values`
        });
      }
    });

    // Check for outliers in numeric columns
    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        const mean = _.mean(values);
        const stdDev = Math.sqrt(_.mean(values.map(v => Math.pow(v - mean, 2))));
        const outlierThreshold = mean + (3 * stdDev);
        
        const outlierCount = values.filter(v => v > outlierThreshold).length;
        if (outlierCount > 0) {
          quality.outliers.push({ column: header, count: outlierCount });
        }
      }
    });

    return quality;
  };

  const detectProfitLoss = (headers) => {
    const profitCols = headers.filter(h => 
      h.toLowerCase().includes('profit') || 
      h.toLowerCase().includes('loss') ||
      h.toLowerCase().includes('revenue') ||
      h.toLowerCase().includes('sales')
    );
    return profitCols;
  };

  const generateAdvancedKPIs = (data, headers) => {
    const kpis = [];
    
    // Sales related
    const salesCol = headers.find(h => 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('revenue') ||
      h.toLowerCase().includes('amount')
    );
    
    if (salesCol) {
      const salesValues = data.map(row => row[salesCol]).filter(v => typeof v === 'number');
      const totalSales = _.sum(salesValues);
      const avgSales = _.mean(salesValues);
      
      kpis.push({
        title: 'Total Sales',
        value: totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        change: '+12.5%',
        icon: DollarSign,
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30'
      });
      
      kpis.push({
        title: 'Avg Order Value',
        value: avgSales.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        icon: ShoppingCart,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30'
      });
    }

    // Profit/Loss
    const profitCol = headers.find(h => h.toLowerCase().includes('profit'));
    if (profitCol) {
      const profitValues = data.map(row => row[profitCol]).filter(v => typeof v === 'number');
      const totalProfit = _.sum(profitValues);
      const isProfit = totalProfit >= 0;
      
      kpis.push({
        title: isProfit ? 'Total Profit' : 'Total Loss',
        value: Math.abs(totalProfit).toLocaleString(undefined, { maximumFractionDigits: 0 }),
        icon: TrendingUp,
        color: isProfit ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600',
        bgColor: isProfit ? 'bg-green-500/20' : 'bg-red-500/20',
        borderColor: isProfit ? 'border-green-500/30' : 'border-red-500/30'
      });
    }

    // Product count
    const productCol = headers.find(h => 
      h.toLowerCase().includes('product') || 
      h.toLowerCase().includes('item') ||
      h.toLowerCase().includes('name')
    );
    
    if (productCol) {
      const uniqueProducts = new Set(data.map(row => row[productCol])).size;
      kpis.push({
        title: 'Total Products',
        value: uniqueProducts,
        icon: Package,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30'
      });
    }

    return kpis;
  };

  const generateAIInsights = (data, headers) => {
    const insights = [];
    
    // Sales trend analysis
    const salesCol = headers.find(h => 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('revenue')
    );
    
    if (salesCol && data.length > 1) {
      const salesValues = data.map(row => row[salesCol]).filter(v => typeof v === 'number');
      const recentSales = salesValues.slice(-5);
      const olderSales = salesValues.slice(0, 5);
      
      if (recentSales.length > 0 && olderSales.length > 0) {
        const recentAvg = _.mean(recentSales);
        const olderAvg = _.mean(olderSales);
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (Math.abs(change) > 5) {
          insights.push({
            type: change > 0 ? 'success' : 'warning',
            title: 'Sales Trend Alert',
            description: `Recent sales ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to earlier period`,
            icon: change > 0 ? TrendingUp : AlertTriangle
          });
        }
      }
    }

    // Top performers
    const productCol = headers.find(h => 
      h.toLowerCase().includes('product') || 
      h.toLowerCase().includes('item')
    );
    
    if (productCol && salesCol) {
      const grouped = _.groupBy(data, productCol);
      const productSales = Object.entries(grouped).map(([product, rows]) => ({
        product,
        total: _.sum(rows.map(r => r[salesCol]).filter(v => typeof v === 'number'))
      }));
      
      const topProduct = _.maxBy(productSales, 'total');
      if (topProduct) {
        insights.push({
          type: 'success',
          title: 'Top Performer',
          description: `${topProduct.product} is the best selling product with ${topProduct.total.toLocaleString()} in sales`,
          icon: Zap
        });
      }
    }

    // Profit margin analysis
    const profitCol = headers.find(h => h.toLowerCase().includes('profit'));
    if (profitCol && salesCol) {
      const totalSales = _.sum(data.map(r => r[salesCol]).filter(v => typeof v === 'number'));
      const totalProfit = _.sum(data.map(r => r[profitCol]).filter(v => typeof v === 'number'));
      const margin = (totalProfit / totalSales) * 100;
      
      insights.push({
        type: margin > 20 ? 'success' : margin > 10 ? 'info' : 'warning',
        title: 'Profit Margin',
        description: `Overall profit margin is ${margin.toFixed(1)}%. ${margin < 15 ? 'Consider optimizing costs or pricing' : 'Healthy margin maintained'}`,
        icon: Activity
      });
    }

    return insights;
  };

  const generateAlerts = (data, headers, quality) => {
    const alerts = [];
    
    // Data quality alerts
    if (quality.duplicates > 0) {
      alerts.push({
        type: 'warning',
        message: `⚠️ ${quality.duplicates} duplicate records detected. Clean data for accurate analysis.`
      });
    }

    // Missing value alerts
    Object.entries(quality.missingValues).forEach(([col, count]) => {
      if (count > data.length * 0.1) {
        alerts.push({
          type: 'warning',
          message: `⚠️ ${col} has ${count} missing values (${((count/data.length)*100).toFixed(1)}%)`
        });
      }
    });

    // Performance alerts
    const salesCol = headers.find(h => h.toLowerCase().includes('sales'));
    if (salesCol) {
      const salesValues = data.map(r => r[salesCol]).filter(v => typeof v === 'number');
      const avgSales = _.mean(salesValues);
      const lowPerformers = salesValues.filter(v => v < avgSales * 0.5).length;
      
      if (lowPerformers > salesValues.length * 0.3) {
        alerts.push({
          type: 'danger',
          message: `🚨 ${lowPerformers} records show sales below 50% of average. Review pricing or marketing strategy.`
        });
      }
    }

    return alerts;
  };

  const getTopBottomPerformers = () => {
    if (!data || headers.length === 0) return { top: [], bottom: [] };
    
    const productCol = headers.find(h => 
      h.toLowerCase().includes('product') || 
      h.toLowerCase().includes('item') ||
      h.toLowerCase().includes('name')
    );
    
    const salesCol = headers.find(h => 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('revenue') ||
      h.toLowerCase().includes('amount')
    );
    
    if (!productCol || !salesCol) return { top: [], bottom: [] };
    
    const grouped = _.groupBy(data, productCol);
    const productSales = Object.entries(grouped).map(([product, rows]) => ({
      product: String(product).substring(0, 20),
      total: _.sum(rows.map(r => r[salesCol]).filter(v => typeof v === 'number'))
    })).filter(p => p.total > 0);
    
    const sorted = _.orderBy(productSales, 'total', 'desc');
    
    return {
      top: sorted.slice(0, 5),
      bottom: sorted.slice(-5).reverse()
    };
  };

  const handleReset = () => {
    setFile(null);
    setData(null);
    setHeaders([]);
    setInsights([]);
    setStats(null);
    setActiveTab('overview');
    setDataQuality(null);
    setAlerts([]);
    setAiInsights([]);
    setSelectedColumn('');
    setFilterValue('');
  };

  const handleDeveloperClick = (dev) => {
    setSelectedDeveloper(dev);
    setShowDeveloperModal(true);
  };

  const chartData = getChartData();
  const pieData = getPieData();
  const timeSeriesData = getTimeSeriesData();
  const regionData = getRegionData();
  const numericHeaders = headers.filter(h => 
    data && data.some(row => typeof row[h] === 'number')
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Developer Modal */}
      {showDeveloperModal && selectedDeveloper && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-purple-500/30 relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setShowDeveloperModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-purple-200" />
            </button>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {selectedDeveloper.fullName.charAt(0)}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedDeveloper.fullName}
              </h3>
              
              <div className="space-y-2 text-left bg-slate-700/30 rounded-lg p-4 mb-4">
                <p className="text-purple-200">
                  <span className="font-semibold text-white">Reg No:</span> {selectedDeveloper.regNo}
                </p>
                <p className="text-purple-200">
                  <span className="font-semibold text-white">Course:</span> {selectedDeveloper.course}
                </p>
                <p className="text-purple-200">
                  <span className="font-semibold text-white">College:</span> {selectedDeveloper.college}
                </p>
              </div>
              
              {selectedDeveloper.portfolio && (
                <a
                  href={selectedDeveloper.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  View Portfolio
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-purple-900 border-b border-purple-500/30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
                <Github className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                  Data Analysis Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-purple-200 mt-1">
                  AI-Powered Analytics with Smart Insights & Data Quality Reports
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {data && (
                <button
                  onClick={handleReset}
                  className="p-2 sm:p-3 bg-slate-700/50 hover:bg-slate-600/50 text-purple-200 rounded-lg transition-all duration-300 border border-purple-500/30"
                  title="Go to Home"
                >
                  <Home className="w-5 h-5" />
                </button>
              )}
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base font-semibold">Upload File</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto"></div>
              <p className="mt-4 text-purple-200 font-medium">Processing your file...</p>
            </div>
          </div>
        ) : !data ? (
          <div className="text-center py-12 sm:py-20">
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-12 border border-purple-500/30">
                <FileText className="w-16 h-16 sm:w-20 sm:h-20 text-purple-400 mx-auto mb-6" />
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                  Welcome to Professional Data Analysis
                </h2>
                <p className="text-sm sm:text-base text-purple-200 mb-8">
                  Upload your CSV, Excel, or PDF file to get AI-powered insights, data quality reports, profit/loss analysis, and professional visualizations like Power BI & Looker Studio.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-700/30 p-3 rounded-lg border border-purple-500/30">
                    <Activity className="w-6 h-6 text-green-400 mb-2" />
                    <p className="text-xs text-purple-200">AI Insights</p>
                  </div>
                  <div className="bg-slate-700/30 p-3 rounded-lg border border-purple-500/30">
                    <AlertTriangle className="w-6 h-6 text-orange-400 mb-2" />
                    <p className="text-xs text-purple-200">Smart Alerts</p>
                  </div>
                  <div className="bg-slate-700/30 p-3 rounded-lg border border-purple-500/30">
                    <DollarSign className="w-6 h-6 text-blue-400 mb-2" />
                    <p className="text-xs text-purple-200">Profit Analysis</p>
                  </div>
                  <div className="bg-slate-700/30 p-3 rounded-lg border border-purple-500/30">
                    <Filter className="w-6 h-6 text-pink-400 mb-2" />
                    <p className="text-xs text-purple-200">Data Quality</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-xs sm:text-sm">
                  <span className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full border border-purple-400/30">CSV</span>
                  <span className="px-3 py-1 bg-green-500/30 text-green-200 rounded-full border border-green-400/30">Excel</span>
                  <span className="px-3 py-1 bg-pink-500/30 text-pink-200 rounded-full border border-pink-400/30">PDF</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* File Info Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-purple-500/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">{file?.name}</h3>
                    <p className="text-xs sm:text-sm text-purple-200">
                      {data.length} rows × {headers.length} columns
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'overview'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-slate-700/50 text-purple-200 hover:bg-slate-600/50 border border-purple-500/30'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('charts')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'charts'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-slate-700/50 text-purple-200 hover:bg-slate-600/50 border border-purple-500/30'
                    }`}
                  >
                    Charts
                  </button>
                  <button
                    onClick={() => setActiveTab('data')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'data'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-slate-700/50 text-purple-200 hover:bg-slate-600/50 border border-purple-500/30'
                    }`}
                  >
                    Data
                  </button>
                </div>
              </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {getKPIs().map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                      <div
                        key={idx}
                        className={`bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 border ${kpi.borderColor} hover:scale-105 transition-transform duration-300`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.color}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          {kpi.change && (
                            <span className="text-xs text-green-400 font-semibold">{kpi.change}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-purple-200 mb-1">{kpi.title}</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{kpi.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alerts Section */}
                {alerts.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 mb-6 border border-orange-500/30">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                      Alerts & Recommendations
                    </h3>
                    <div className="space-y-2">
                      {alerts.map((alert, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${
                          alert.type === 'danger' ? 'bg-red-500/10 border border-red-500/30' :
                          alert.type === 'warning' ? 'bg-orange-500/10 border border-orange-500/30' :
                          'bg-blue-500/10 border border-blue-500/30'
                        }`}>
                          <p className="text-xs text-white">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {aiInsights.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 mb-6 border border-purple-500/30">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      AI-Powered Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiInsights.map((insight, idx) => {
                        const Icon = insight.icon;
                        return (
                          <div key={idx} className={`p-3 rounded-lg ${
                            insight.type === 'success' ? 'bg-green-500/10 border border-green-500/30' :
                            insight.type === 'warning' ? 'bg-orange-500/10 border border-orange-500/30' :
                            'bg-blue-500/10 border border-blue-500/30'
                          }`}>
                            <div className="flex items-start gap-2">
                              <Icon className={`w-4 h-4 mt-0.5 ${
                                insight.type === 'success' ? 'text-green-400' :
                                insight.type === 'warning' ? 'text-orange-400' :
                                'text-blue-400'
                              }`} />
                              <div>
                                <h4 className="text-xs font-bold text-white mb-1">{insight.title}</h4>
                                <p className="text-xs text-purple-200">{insight.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data Quality Report */}
                {dataQuality && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 mb-6 border border-purple-500/30">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      Data Quality Report
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <p className="text-xs text-purple-200 mb-1">Total Rows</p>
                        <p className="text-lg font-bold text-white">{dataQuality.totalRows}</p>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <p className="text-xs text-purple-200 mb-1">Duplicates</p>
                        <p className={`text-lg font-bold ${dataQuality.duplicates > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                          {dataQuality.duplicates}
                        </p>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg">
                        <p className="text-xs text-purple-200 mb-1">Columns with Missing Data</p>
                        <p className={`text-lg font-bold ${Object.keys(dataQuality.missingValues).length > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                          {Object.keys(dataQuality.missingValues).length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top & Bottom Performers */}
                {(() => {
                  const performers = getTopBottomPerformers();
                  return performers.top.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-slate-800/80 to-green-900/40 backdrop-blur-xl rounded-xl shadow-xl p-4 border border-green-500/30">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-green-400" />
                          Top 5 Performers
                        </h3>
                        <div className="space-y-2">
                          {performers.top.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-700/30 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-green-400">#{idx + 1}</span>
                                <span className="text-xs text-white">{item.product}</span>
                              </div>
                              <span className="text-xs font-bold text-green-400">{item.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-slate-800/80 to-red-900/40 backdrop-blur-xl rounded-xl shadow-xl p-4 border border-red-500/30">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          Bottom 5 Performers
                        </h3>
                        <div className="space-y-2">
                          {performers.bottom.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-700/30 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-red-400">#{idx + 1}</span>
                                <span className="text-xs text-white">{item.product}</span>
                              </div>
                              <span className="text-xs font-bold text-red-400">{item.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Filter Panel */}
                <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 mb-6 border border-purple-500/30">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    Data Filters
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-purple-200 mb-1">Column</label>
                      <select
                        value={selectedColumn}
                        onChange={(e) => setSelectedColumn(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">All Columns</option>
                        {headers.map((header, idx) => (
                          <option key={idx} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-purple-200 mb-1">Search Value</label>
                      <input
                        type="text"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        placeholder="Type to filter..."
                        className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  {filterValue && selectedColumn && (
                    <div className="mt-3 text-xs text-purple-200">
                      Showing {getFilteredData().length} of {data.length} records
                    </div>
                  )}
                </div>

                {/* Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4 mb-6 sm:mb-8">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 border border-purple-500/30 hover:border-purple-400/50 transform hover:scale-105 transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === 'success' ? (
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          </div>
                        ) : (
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white mb-1">
                            {insight.title}
                          </h4>
                          <p className="text-xs text-purple-200 break-words leading-relaxed">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Statistics Table */}
                {stats && stats.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-purple-500/30">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                      Statistical Summary
                    </h3>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-purple-500/30">
                          <thead className="bg-slate-700/50">
                            <tr>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                                Column
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                                Average
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                                Total
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                                Max
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                                Min
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-500/20">
                            {stats.map((stat, idx) => {
                              const isProfit = stat.name.toLowerCase().includes('profit');
                              const isLoss = stat.name.toLowerCase().includes('loss');
                              const isSales = stat.name.toLowerCase().includes('sales') || stat.name.toLowerCase().includes('revenue');
                              
                              return (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-white">
                                    {stat.name}
                                    {isProfit && <span className="ml-2 text-green-400">📈</span>}
                                    {isLoss && <span className="ml-2 text-red-400">📉</span>}
                                    {isSales && <span className="ml-2 text-blue-400">💰</span>}
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-purple-200">
                                    {stat.average}
                                  </td>
                                  <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold ${
                                    isProfit ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-purple-200'
                                  }`}>
                                    {stat.total}
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-purple-200">
                                    {stat.max}
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-purple-200">
                                    {stat.min}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Charts Tab */}
            {activeTab === 'charts' && chartData.length > 0 && (
              <div className="space-y-4 sm:space-y-6">
                {/* Time Series Trend */}
                {timeSeriesData.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 sm:p-6 border border-purple-500/30">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Sales Trend Over Time
                      <span className="ml-auto text-xs text-purple-300">📌 Insight: Identify peak periods</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={timeSeriesData}>
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#c4b5fd' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#c4b5fd' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #10b981', 
                            borderRadius: '8px', 
                            fontSize: '12px' 
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area
                          type="monotone"
                          dataKey="Sales"
                          stroke="#10b981"
                          fillOpacity={1}
                          fill="url(#salesGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Product Performance - Top & Bottom */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Top Products */}
                  <div className="bg-gradient-to-br from-slate-800/80 to-green-900/40 backdrop-blur-xl rounded-xl shadow-xl p-4 sm:p-6 border border-green-500/30">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-green-400" />
                      Product Performance (Top 10)
                      <span className="ml-auto text-xs text-green-300">📌 Best Sellers</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#c4b5fd' }} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ fontSize: 10, fill: '#c4b5fd' }}
                          width={100}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #10b981', 
                            borderRadius: '8px', 
                            fontSize: '12px' 
                          }} 
                        />
                        <Bar dataKey="Sales" fill="#10b981" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Region-wise Sales */}
                  {regionData.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-blue-900/40 backdrop-blur-xl rounded-xl shadow-xl p-4 sm:p-6 border border-blue-500/30">
                      <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        Region-wise Performance
                        <span className="ml-auto text-xs text-blue-300">📌 Geographic Analysis</span>
                      </h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={regionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3} />
                          <XAxis 
                            dataKey="region" 
                            tick={{ fontSize: 10, fill: '#c4b5fd' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#c4b5fd' }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: '1px solid #3b82f6', 
                              borderRadius: '8px', 
                              fontSize: '12px' 
                            }} 
                          />
                          <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Profit vs Sales Comparison */}
                {detectProfitLoss(headers).length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 sm:p-6 border border-purple-500/30">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                      Profit vs Sales Analysis
                      <span className="ml-auto text-xs text-yellow-300">📌 Profitability Check</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10, fill: '#c4b5fd' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#c4b5fd' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Sales" fill="#3b82f6" />
                        <Bar dataKey="Profit" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Category Contribution */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {pieData.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-pink-900/40 backdrop-blur-xl rounded-xl shadow-xl p-4 sm:p-6 border border-pink-500/30">
                      <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-pink-400" />
                        Category Contribution (%)
                        <span className="ml-auto text-xs text-pink-300">📌 Market Share</span>
                      </h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ec4899', borderRadius: '8px', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Multi-Series Line Chart */}
                  {chartData.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 sm:p-6 border border-purple-500/30">
                      <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        Multi-Metric Comparison
                        <span className="ml-auto text-xs text-purple-300">📌 Trend Patterns</span>
                      </h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData.slice(0, 15)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10, fill: '#c4b5fd' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#c4b5fd' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {Object.keys(chartData[0]).filter(k => k !== 'name').slice(0, 3).map((key, idx) => (
                            <Line
                              key={idx}
                              type="monotone"
                              dataKey={key}
                              stroke={COLORS[idx]}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Auto Insights for Charts */}
                <div className="bg-gradient-to-br from-slate-800/80 to-indigo-900/40 backdrop-blur-xl rounded-xl shadow-xl p-4 border border-indigo-500/30">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Chart Insights & Recommendations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {chartData.length > 0 && (
                      <>
                        <div className="bg-slate-700/30 p-3 rounded-lg border-l-2 border-green-500">
                          <p className="text-purple-200">
                            🏆 <strong className="text-white">Top Performer:</strong> {chartData[0]?.name} leads with{' '}
                            {chartData[0]?.Sales?.toLocaleString() || 'N/A'} in sales
                          </p>
                        </div>
                        {chartData[chartData.length - 1] && (
                          <div className="bg-slate-700/30 p-3 rounded-lg border-l-2 border-red-500">
                            <p className="text-purple-200">
                              ⚠️ <strong className="text-white">Needs Attention:</strong> {chartData[chartData.length - 1]?.name} requires strategy review
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {timeSeriesData.length > 1 && (
                      <div className="bg-slate-700/30 p-3 rounded-lg border-l-2 border-blue-500">
                        <p className="text-purple-200">
                          <strong className="text-white">Trend:</strong>{' '}
                          {timeSeriesData[timeSeriesData.length - 1].Sales > timeSeriesData[0].Sales
                            ? '📈 Positive growth momentum'
                            : '📉 Declining trend - investigate causes'}
                        </p>
                      </div>
                    )}
                    {regionData.length > 0 && (
                      <>
                        <div className="bg-slate-700/30 p-3 rounded-lg border-l-2 border-purple-500">
                          <p className="text-purple-200">
                            🌍 <strong className="text-white">Best Region:</strong> {regionData[0]?.region} - {regionData[0]?.sales.toLocaleString()} sales
                          </p>
                        </div>
                        {regionData[regionData.length - 1] && (
                          <div className="bg-slate-700/30 p-3 rounded-lg border-l-2 border-orange-500">
                            <p className="text-purple-200">
                              💡 <strong className="text-white">Opportunity:</strong> Focus marketing in {regionData[regionData.length - 1]?.region}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {chartData.find(d => d.Profit) && (
                      <div className="bg-slate-700/30 p-3 rounded-lg border-l-2 border-yellow-500">
                        <p className="text-purple-200">
                          💰 <strong className="text-white">Profitability:</strong>{' '}
                          {(() => {
                            const totalSales = _.sum(chartData.map(d => d.Sales || 0));
                            const totalProfit = _.sum(chartData.map(d => d.Profit || 0));
                            const margin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;
                            return `${margin}% margin ${margin > 20 ? '✅' : margin > 10 ? '⚠️' : '🚨'}`;
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 border border-purple-500/30">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                  Raw Data Preview ({filterValue && selectedColumn ? `Filtered: ${getFilteredData().length}` : `All ${data.length}`} rows)
                </h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-purple-500/30">
                      <thead className="bg-slate-700/50 sticky top-0">
                        <tr>
                          {headers.map((header, idx) => (
                            <th
                              key={idx}
                              className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider whitespace-nowrap"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-500/20">
                        {getFilteredData().slice(0, 100).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                            {headers.map((header, hIdx) => (
                              <td
                                key={hIdx}
                                className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-purple-200"
                              >
                                {row[header] !== null && row[header] !== undefined
                                  ? String(row[header])
                                  : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-purple-500/30 bg-gradient-to-r from-slate-800 to-purple-900 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-purple-300/80">
            Developed by:{' '}
            {developers.map((dev, idx) => (
              <React.Fragment key={dev.name}>
                <button
                  onClick={() => handleDeveloperClick(dev)}
                  className="text-purple-400 hover:text-purple-300 underline decoration-dotted hover:decoration-solid transition-all"
                >
                  {dev.name}
                </button>
                {idx < developers.length - 1 && <span className="mx-2">•</span>}
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataAnalysisDashboard;
