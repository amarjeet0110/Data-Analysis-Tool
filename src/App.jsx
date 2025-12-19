import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Upload, FileText, TrendingUp, BarChart3, Eye, AlertCircle, CheckCircle, Github, Home, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

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

  const developers = [
    {
      name: 'Amarjeet',
      fullName: 'Amarjeet Kumar',
      regNo: '22155135005',
      course: 'CSE(IOT)',
      college: 'Government Engineering College Vaishali',
      portfolio: 'https://amarjeet-portfolio-mu.vercel.app/'
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
      regNo: '22155135054',
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
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check file format.');
    }

    setLoading(false);
  };

  const handleReset = () => {
    setFile(null);
    setData(null);
    setHeaders([]);
    setInsights([]);
    setStats(null);
    setActiveTab('overview');
  };

  const handleDeveloperClick = (dev) => {
    setSelectedDeveloper(dev);
    setShowDeveloperModal(true);
  };

  const getChartData = () => {
    if (!data || data.length === 0) return [];
    
    const numericCols = headers.filter(h => 
      data.some(row => typeof row[h] === 'number')
    );

    if (numericCols.length === 0) return [];

    return data.slice(0, 20).map((row, idx) => {
      const item = { name: `Row ${idx + 1}` };
      numericCols.forEach(col => {
        item[col] = row[col];
      });
      return item;
    });
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

  const chartData = getChartData();
  const pieData = getPieData();
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
                  Upload CSV, Excel, or PDF files for instant analysis
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
                  Welcome to Data Analysis
                </h2>
                <p className="text-sm sm:text-base text-purple-200 mb-8">
                  Upload your CSV, Excel, or PDF file to get started with professional data analysis, interactive charts, and actionable insights.
                </p>
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
                {/* Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-transform duration-300"
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === 'success' ? (
                          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-1" />
                        ) : (
                          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white mb-2">
                            {insight.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-purple-200 break-words">
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
                                Max
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                                Min
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-500/20">
                            {stats.map((stat, idx) => (
                              <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-white">
                                  {stat.name}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-purple-200">
                                  {stat.average}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-purple-200">
                                  {stat.max}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-purple-200">
                                  {stat.min}
                                </td>
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

            {/* Charts Tab */}
            {activeTab === 'charts' && chartData.length > 0 && (
              <div className="space-y-6 sm:space-y-8">
                {/* Line Chart */}
                <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 border border-purple-500/30">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                    Trend Analysis
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3} />
<XAxis dataKey="name" tick={{ fontSize: 12, fill: '#c4b5fd' }} />
<YAxis tick={{ fontSize: 12, fill: '#c4b5fd' }} />
<Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px' }} />
<Legend wrapperStyle={{ fontSize: 12 }} />
{numericHeaders.slice(0, 1).map((header, idx) => (
<Area
                       key={idx}
                       type="monotone"
                       dataKey={header}
                       stroke="#a855f7"
                       fillOpacity={1}
                       fill="url(#colorGradient)"
                     />
))}
</AreaChart>
</ResponsiveContainer>
</div>
                {/* Bar Chart */}
            <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 border border-purple-500/30">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                Comparison Chart
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#c4b5fd' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#c4b5fd' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {numericHeaders.slice(0, 3).map((header, idx) => (
                    <Bar key={idx} dataKey={header} fill={COLORS[idx]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            {pieData.length > 0 && (
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 border border-purple-500/30">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                  Distribution Analysis
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 sm:p-6 border border-purple-500/30">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              Raw Data Preview (First 50 rows)
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-purple-500/30">
                  <thead className="bg-slate-700/50">
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
                    {data.slice(0, 50).map((row, idx) => (
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
