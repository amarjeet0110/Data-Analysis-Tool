import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { Upload, FileText, TrendingUp, BarChart3, Eye, AlertCircle, CheckCircle, Github, Home, X, AlertTriangle, Activity, DollarSign, ShoppingCart, Package, Zap, Filter, MessageCircle, Send, Download, Brain, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import _ from 'lodash';

const COLORS = ['#8b5cf6','#ec4899','#10b981','#3b82f6','#f59e0b','#06b6d4','#f97316','#a3e635'];

// ─── Linear Regression helper ───────────────────────────────────────────────
const linearRegression = (values) => {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: 0, predict: (x) => values[0] || 0 };
  const sumX = values.reduce((s, _, i) => s + i, 0);
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, predict: (x) => slope * x + intercept };
};

// ─── Correlation Matrix ──────────────────────────────────────────────────────
const pearsonCorr = (a, b) => {
  const n = a.length;
  const ma = _.mean(a), mb = _.mean(b);
  const num = _.sum(a.map((v, i) => (v - ma) * (b[i] - mb)));
  const den = Math.sqrt(_.sum(a.map(v => (v - ma) ** 2)) * _.sum(b.map(v => (v - mb) ** 2)));
  return den === 0 ? 0 : num / den;
};

// ─── Claude API call ─────────────────────────────────────────────────────────
const callClaude = async (messages, system = '') => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages
    })
  });
  const d = await res.json();
  return d.content?.map(c => c.text || '').join('') || '';
};

export default function Dashboard() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [report, setReport] = useState('');
  const [showDev, setShowDev] = useState(false);
  const [selDev, setSelDev] = useState(null);

  // AI Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const geminiKey = 'AIzaSyCHKOr0DD82BeTASlWJPCx47EW0fEpCnII';
  const chatEndRef = useRef(null);

  const chatSuggestions = [
    ['Which product has the highest sales?','What is the total profit?','Which region performs best?','What is the average order value?'],
    ['Show me the top 3 products by revenue.','Which category has the lowest sales?','What is the profit margin overall?','Are there any negative profit items?'],
    ['What trends do you see in the data?','Which month had the highest sales?','Compare sales vs profit across products.','What recommendations do you have?'],
  ];
  const [suggIdx, setSuggIdx] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);

  const fileInputRef = useRef(null);

  const developers = [
    { name: 'Amarjeet', fullName: 'Amarjeet Kumar', regNo: '22155135005', course: 'CSE(IOT)', college: 'Government Engineering College Vaishali', portfolio: 'https://vercel.com/amarjeet0110s-projects/amarjeet0110' },
    { name: 'Kartik',   fullName: 'Kartik Raj',     regNo: '22155135023', course: 'CSE(IOT)', college: 'Government Engineering College Vaishali' },
    { name: 'Shanu',    fullName: 'Shanu Kumar',    regNo: '22155135026', course: 'CSE(IOT)', college: 'Government Engineering College Vaishali' },
    { name: 'Krishna',  fullName: 'Krishna Murari', regNo: '22155125051', course: 'CSE(IOT)', college: 'Government Engineering College Vaishali' },
  ];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ── File Processing ────────────────────────────────────────────────────────
  const processFile = async (uploadedFile) => {
    setFile(uploadedFile);
    setLoading(true);
    setActiveTab('overview');
    setReport('');
    setChatMessages([]);
    try {
      let result;
      const n = uploadedFile.name.toLowerCase();
      if (n.endsWith('.csv')) {
        const text = await uploadedFile.text();
        result = await new Promise(res => Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true, complete: r => res({ data: r.data, headers: Object.keys(r.data[0] || {}) }) }));
      } else if (n.endsWith('.xlsx') || n.endsWith('.xls')) {
        const buf = await uploadedFile.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        result = { data: json, headers: Object.keys(json[0] || {}) };
      } else { alert('CSV ya Excel file upload karein'); setLoading(false); return; }

      setData(result.data); setHeaders(result.headers);
      setInsights(genInsights(result.data, result.headers));
      setStats(calcStats(result.data, result.headers));
      setDataQuality(analyzeQuality(result.data, result.headers));
      setAlerts(genAlerts(result.data, result.headers));
      setAiInsights(genAIInsights(result.data, result.headers));
    } catch (e) { console.error(e); alert('File process karne mein error aaya.'); }
    setLoading(false);
  };

  const handleFileInput = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };

  // Drag & Drop
  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, []);

  // ── Analytics Helpers ──────────────────────────────────────────────────────
  const numCols = (h, d) => h.filter(c => d.some(r => typeof r[c] === 'number'));

  const genInsights = (d, h) => {
    const nc = numCols(h, d);
    const ins = [{ type: 'info', title: 'Dataset Size', description: `${d.length} rows, ${h.length} columns` }];
    nc.forEach(c => {
      const vals = d.map(r => r[c]).filter(v => typeof v === 'number');
      if (!vals.length) return;
      ins.push({ type: 'success', title: `${c} Stats`, description: `Avg: ${_.mean(vals).toFixed(2)} | Max: ${Math.max(...vals)} | Min: ${Math.min(...vals)}` });
    });
    h.filter(c => !nc.includes(c)).slice(0, 2).forEach(c => {
      ins.push({ type: 'info', title: `${c} Categories`, description: `${new Set(d.map(r => r[c])).size} unique values` });
    });
    return ins;
  };

  const calcStats = (d, h) => numCols(h, d).map(c => {
    const vals = d.map(r => r[c]).filter(v => typeof v === 'number');
    return { name: c, average: _.mean(vals).toFixed(2), total: _.sum(vals).toFixed(2), max: Math.max(...vals), min: Math.min(...vals), count: vals.length };
  });

  const analyzeQuality = (d, h) => {
    const dups = d.length - _.uniqWith(d, _.isEqual).length;
    const missing = {};
    h.forEach(c => { const m = d.filter(r => r[c] == null || r[c] === '').length; if (m) missing[c] = m; });
    return { totalRows: d.length, duplicates: dups, missingValues: missing };
  };

  const genAlerts = (d, h) => {
    const al = [];
    const q = analyzeQuality(d, h);
    if (q.duplicates > 0) al.push({ type: 'warning', message: `⚠️ ${q.duplicates} duplicate records milein` });
    const sc = h.find(c => c.toLowerCase().includes('sales') || c.toLowerCase().includes('revenue'));
    if (sc) {
      const vals = d.map(r => r[sc]).filter(v => typeof v === 'number');
      const avg = _.mean(vals);
      const low = vals.filter(v => v < avg * 0.5).length;
      if (low > vals.length * 0.3) al.push({ type: 'danger', message: `🚨 ${low} records mein sales average se 50% kum hai` });
    }
    return al;
  };

  const genAIInsights = (d, h) => {
    const ins = [];
    const sc = h.find(c => c.toLowerCase().includes('sales') || c.toLowerCase().includes('revenue'));
    const pc = h.find(c => c.toLowerCase().includes('profit'));
    const namec = h.find(c => c.toLowerCase().includes('product') || c.toLowerCase().includes('item') || c.toLowerCase().includes('name'));
    if (sc && namec) {
      const grouped = _.groupBy(d, namec);
      const top = _.maxBy(Object.entries(grouped).map(([k, v]) => ({ k, s: _.sum(v.map(r => r[sc]).filter(n => typeof n === 'number')) })), 's');
      if (top) ins.push({ type: 'success', title: 'Top Performer', description: `${top.k} is the best seller — ${top.s.toLocaleString()} in sales`, icon: Zap });
    }
    if (sc && pc) {
      const ts = _.sum(d.map(r => r[sc]).filter(n => typeof n === 'number'));
      const tp = _.sum(d.map(r => r[pc]).filter(n => typeof n === 'number'));
      const m = ts > 0 ? ((tp / ts) * 100).toFixed(1) : 0;
      ins.push({ type: m > 15 ? 'success' : 'warning', title: 'Profit Margin', description: `Overall margin: ${m}% — ${m < 15 ? 'Consider optimizing costs' : 'Healthy margin!'}`, icon: Activity });
    }
    return ins;
  };

  // ── Chart Data ─────────────────────────────────────────────────────────────
  const getChartData = () => {
    if (!data) return [];
    const catCol = headers.find(c => ['product','item','category','name'].some(k => c.toLowerCase().includes(k)));
    const salCol = headers.find(c => ['sales','revenue','amount'].some(k => c.toLowerCase().includes(k)));
    const proCol = headers.find(c => c.toLowerCase().includes('profit'));
    if (!catCol) return [];
    return Object.entries(_.groupBy(data, catCol)).map(([name, rows]) => {
      const obj = { name: String(name).slice(0, 18) };
      if (salCol) obj.Sales = _.sum(rows.map(r => r[salCol]).filter(n => typeof n === 'number'));
      if (proCol) obj.Profit = _.sum(rows.map(r => r[proCol]).filter(n => typeof n === 'number'));
      return obj;
    }).sort((a, b) => (b.Sales || 0) - (a.Sales || 0)).slice(0, 15);
  };

  const getTimeSeriesData = () => {
    if (!data) return [];
    const dc = headers.find(c => ['date','month','year','time'].some(k => c.toLowerCase().includes(k)));
    const sc = headers.find(c => ['sales','revenue','amount'].some(k => c.toLowerCase().includes(k)));
    if (!dc || !sc) return [];
    return Object.entries(_.groupBy(data, dc)).map(([date, rows]) => ({
      date: String(date),
      Sales: _.sum(rows.map(r => r[sc]).filter(n => typeof n === 'number'))
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 30);
  };

  const getPieData = () => {
    if (!data) return [];
    const cc = headers.find(c => data.every(r => typeof r[c] === 'string'));
    if (!cc) return [];
    const counts = {};
    data.forEach(r => { counts[r[cc]] = (counts[r[cc]] || 0) + 1; });
    return Object.entries(counts).slice(0, 6).map(([name, value]) => ({ name, value }));
  };

  // ── Correlation Matrix ─────────────────────────────────────────────────────
  const getCorrMatrix = () => {
    if (!data) return { cols: [], matrix: [] };
    const nc = headers.filter(c => data.some(r => typeof r[c] === 'number')).slice(0, 6);
    const matrix = nc.map(a => nc.map(b => {
      const va = data.map(r => r[a]).filter(v => typeof v === 'number');
      const vb = data.map(r => r[b]).filter(v => typeof v === 'number');
      const n = Math.min(va.length, vb.length);
      return parseFloat(pearsonCorr(va.slice(0, n), vb.slice(0, n)).toFixed(2));
    }));
    return { cols: nc, matrix };
  };

  // ── Forecast Data ──────────────────────────────────────────────────────────
  const getForecastData = () => {
    const ts = getTimeSeriesData();
    if (ts.length < 3) return { chartData: [], slope: 0 };
    const vals = ts.map(d => d.Sales);
    const reg = linearRegression(vals);
    const chartData = ts.map((d, i) => ({ ...d, Forecast: null, Trend: parseFloat(reg.predict(i).toFixed(2)) }));
    // Future 5 periods
    for (let i = 1; i <= 5; i++) {
      chartData.push({ date: `F+${i}`, Sales: null, Forecast: parseFloat(reg.predict(ts.length - 1 + i).toFixed(2)), Trend: null });
    }
    return { chartData, slope: reg.slope };
  };

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const getKPIs = () => {
    if (!data || !stats) return [];
    const kpis = [{ title: 'Total Records', value: data.length.toLocaleString(), icon: FileText, color: 'from-blue-500 to-blue-600', borderColor: 'border-blue-500/30' }];
    const sc = headers.find(c => ['sales','revenue','amount'].some(k => c.toLowerCase().includes(k)));
    if (sc) {
      const v = data.map(r => r[sc]).filter(n => typeof n === 'number');
      kpis.push({ title: 'Total Sales', value: '₹' + _.sum(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }), icon: DollarSign, color: 'from-green-500 to-green-600', borderColor: 'border-green-500/30' });
      kpis.push({ title: 'Avg Order', value: '₹' + _.mean(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }), icon: ShoppingCart, color: 'from-sky-500 to-sky-600', borderColor: 'border-sky-500/30' });
    }
    const pc = headers.find(c => c.toLowerCase().includes('profit'));
    if (pc) {
      const v = data.map(r => r[pc]).filter(n => typeof n === 'number');
      const tot = _.sum(v);
      kpis.push({ title: tot >= 0 ? 'Total Profit' : 'Total Loss', value: '₹' + Math.abs(tot).toLocaleString('en-IN', { maximumFractionDigits: 0 }), icon: TrendingUp, color: tot >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600', borderColor: tot >= 0 ? 'border-emerald-500/30' : 'border-red-500/30' });
    }
    const namc = headers.find(c => ['product','item','name'].some(k => c.toLowerCase().includes(k)));
    if (namc) kpis.push({ title: 'Total Products', value: new Set(data.map(r => r[namc])).size, icon: Package, color: 'from-purple-500 to-purple-600', borderColor: 'border-purple-500/30' });
    return kpis;
  };

  const getTopBottom = () => {
    if (!data) return { top: [], bottom: [] };
    const namec = headers.find(c => ['product','item','name'].some(k => c.toLowerCase().includes(k)));
    const sc = headers.find(c => ['sales','revenue','amount'].some(k => c.toLowerCase().includes(k)));
    if (!namec || !sc) return { top: [], bottom: [] };
    const arr = Object.entries(_.groupBy(data, namec)).map(([k, v]) => ({ product: k.slice(0, 20), total: _.sum(v.map(r => r[sc]).filter(n => typeof n === 'number')) })).filter(p => p.total > 0);
    const sorted = _.orderBy(arr, 'total', 'desc');
    return { top: sorted.slice(0, 5), bottom: sorted.slice(-5).reverse() };
  };

  const getFiltered = () => {
    if (!data) return [];
    if (!selectedColumn || !filterValue) return data;
    return data.filter(r => String(r[selectedColumn]).toLowerCase().includes(filterValue.toLowerCase()));
  };

  // ── AI Chat ────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || !data) return;

    const userMsg = { role: 'user', content: chatInput };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput('');
    setChatLoading(true);
    try {
      const summary = JSON.stringify(data.slice(0, 50));
      const systemContext = `You are an expert data analyst. The user has uploaded this dataset:\nHeaders: ${headers.join(', ')}\nData sample (first 50 rows): ${summary}\nTotal rows: ${data.length}\nAnswer the user's questions clearly and precisely with numbers and insights. Always respond in English.`;

      // Build Gemini contents array (no system role — prepend as first user turn)
      const contents = [
        { role: 'user', parts: [{ text: systemContext + '\n\nUser question: ' + newMsgs[0].content }] },
        ...newMsgs.slice(1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      ];

      const dataSummary = JSON.stringify(data.slice(0, 50));
      const systemPrompt = `You are an expert data analyst. The user has uploaded this dataset:\nHeaders: ${headers.join(', ')}\nData sample (first 50 rows): ${dataSummary}\nTotal rows: ${data.length}\nAnswer clearly and precisely with numbers and insights. Always respond in English.`;

      // Build Gemini contents — system prompt as first user turn
      const geminiContents = [
        { role: 'user', parts: [{ text: `System Instructions: ${systemPrompt}\n\nUser: ${newMsgs[0].content}` }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow these instructions and answer based on the dataset.' }] },
        ...newMsgs.slice(1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiContents, generationConfig: { maxOutputTokens: 1000, temperature: 0.7 } })
        }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || res.statusText); }
      const d = await res.json();
      const reply = d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setSuggIdx(i => (i + 1) % chatSuggestions.length);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${e.message}` }]);
    }
    setChatLoading(false);
  };

  // ── AI Report ──────────────────────────────────────────────────────────────
  const generateReport = async () => {
    if (!data) return;
    setReportLoading(true); setReport('');
    try {
      const s = calcStats(data, headers);
      const dataSample = JSON.stringify(data.slice(0, 80));
      const sys = `You are a senior business analyst. Write a complete professional business analysis report strictly based on the data provided. Always respond in English.`;
      const prompt = `Based on the dataset below, write a complete professional business analysis report:\n\nDataset Info:\n- Total rows: ${data.length}\n- Columns: ${headers.join(', ')}\n- Statistics: ${JSON.stringify(s)}\n- Data sample (first 80 rows): ${dataSample}\n\nReport format:\n## 📊 Executive Summary\n## 🔍 Key Findings\n## 📈 Trend Analysis\n## ⚠️ Areas of Concern\n## 💡 Recommendations\n## ✅ Conclusion\n\nInclude specific numbers from the data in each section. Keep it professional, accurate, and concise.`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: sys, messages: [{ role: 'user', content: prompt }] })
      });
      const d = await res.json();
      const rep = d.content?.map(c => c.text || '').join('') || 'No report generated.';
      setReport(rep);
    } catch (e) { setReport('❌ Error generating report. Please try again.'); }
    setReportLoading(false);
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'analysis_report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const chartData = getChartData();
  const timeData = getTimeSeriesData();
  const pieData = getPieData();
  const { chartData: forecastData, slope } = getForecastData();
  const { cols: corrCols, matrix: corrMatrix } = getCorrMatrix();
  const { top, bottom } = getTopBottom();

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'charts', label: 'Charts' },
    { id: 'forecast', label: '📈 Forecast' },
    { id: 'correlation', label: '🔥 Heatmap' },
    { id: 'chat', label: '🤖 AI Chat' },
    { id: 'report', label: '📄 Report' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-900/80 backdrop-blur-sm border-4 border-dashed border-purple-400 pointer-events-none">
          <div className="text-center">
            <Upload className="w-20 h-20 text-purple-300 mx-auto mb-4 animate-bounce" />
            <p className="text-3xl font-bold text-white">File Yahan Drop Karein!</p>
            <p className="text-purple-300 mt-2">CSV ya Excel file</p>
          </div>
        </div>
      )}

      {/* Dev Modal */}
      {showDev && selDev && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-purple-500/30 relative">
            <button onClick={() => setShowDev(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-700/50 rounded-lg"><X className="w-5 h-5 text-purple-200" /></button>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{selDev.fullName.charAt(0)}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{selDev.fullName}</h3>
              <div className="text-left bg-slate-700/30 rounded-lg p-4 space-y-2 mb-4">
                <p className="text-purple-200"><span className="font-semibold text-white">Reg No:</span> {selDev.regNo}</p>
                <p className="text-purple-200"><span className="font-semibold text-white">Course:</span> {selDev.course}</p>
                <p className="text-purple-200"><span className="font-semibold text-white">College:</span> {selDev.college}</p>
              </div>
              {selDev.portfolio && (
                <a href={selDev.portfolio} target="_blank" rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform shadow-lg">
                  View Portfolio
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-purple-900 border-b border-purple-500/30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Data Analysis Dashboard</h1>
              <p className="text-xs text-purple-300">Data Analysis Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && <button onClick={() => { setFile(null); setData(null); setHeaders([]); setReport(''); setChatMessages([]); setActiveTab('overview'); }} className="p-3 bg-slate-700/50 hover:bg-slate-600/50 text-purple-200 rounded-lg border border-purple-500/30 transition-all"><Home className="w-5 h-5" /></button>}
            <label className="cursor-pointer">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileInput} className="hidden" />
              <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg shadow-lg transition-all transform hover:scale-105 font-semibold">
                <Upload className="w-5 h-5" /><span>Upload File</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center w-full max-w-md px-4">
              <style>{`
                @keyframes barPulse { 0%,100%{transform:scaleY(0.2);opacity:0.3} 50%{transform:scaleY(1);opacity:1} }
                @keyframes lineDraw { 0%{stroke-dashoffset:400} 100%{stroke-dashoffset:0} }
                @keyframes pieSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                @keyframes dotBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
                @keyframes fadeInOut { 0%,100%{opacity:0.3} 50%{opacity:1} }
                @keyframes scaleIn { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
              `}</style>

              {/* Bar Chart Animation */}
              <div className="bg-slate-800/60 rounded-2xl p-5 mb-3 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-3 uppercase tracking-widest">Loading Bar Chart</p>
                <div className="flex items-end justify-center gap-1.5" style={{height:60}}>
                  {[45,70,30,85,55,75,40,90,60,50,80,35].map((h,i)=>(
                    <div key={i} className="rounded-t" style={{width:14,height:h,background:'linear-gradient(to top,#7c3aed,#ec4899)',animation:`barPulse 1.2s ease-in-out ${i*0.1}s infinite`,transformOrigin:'bottom'}}/>
                  ))}
                </div>
              </div>

              {/* Line Graph Animation */}
              <div className="bg-slate-800/60 rounded-2xl p-5 mb-3 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-3 uppercase tracking-widest">Loading Line Chart</p>
                <svg viewBox="0 0 300 80" className="w-full" style={{height:70}}>
                  <defs>
                    <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,60 L25,45 L50,55 L75,30 L100,40 L125,20 L150,35 L175,15 L200,25 L225,10 L250,20 L275,8 L300,15" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="400" style={{animation:'lineDraw 2s ease-in-out infinite alternate'}}/>
                  <path d="M0,60 L25,50 L50,65 L75,45 L100,55 L125,35 L150,50 L175,30 L200,42 L225,25 L250,38 L275,20 L300,30" fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="400" style={{animation:'lineDraw 2s ease-in-out 0.4s infinite alternate'}}/>
                  {[{x:75,y:30},{x:125,y:20},{x:175,y:15},{x:225,y:10},{x:275,y:8}].map((p,i)=>(
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="#8b5cf6" style={{animation:`dotBounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>
                  ))}
                </svg>
              </div>

              {/* Pie + Dots row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800/60 rounded-2xl p-4 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-2 uppercase tracking-widest">Pie Chart</p>
                  <div className="flex justify-center">
                    <svg viewBox="0 0 60 60" style={{width:60,height:60,animation:'pieSpin 3s linear infinite'}}>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="#7c3aed" strokeWidth="10" strokeDasharray="70 69"/>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="#ec4899" strokeWidth="10" strokeDasharray="40 99" strokeDashoffset="-70"/>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="28 111" strokeDashoffset="-110"/>
                    </svg>
                  </div>
                </div>
                <div className="bg-slate-800/60 rounded-2xl p-4 border border-purple-500/20 flex flex-col items-center justify-center">
                  <p className="text-xs text-purple-400 mb-3 uppercase tracking-widest">Processing</p>
                  <div className="flex gap-2">
                    {[0,1,2,3].map(i=>(
                      <div key={i} style={{width:10,height:10,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#ec4899)',animation:`dotBounce 0.8s ease-in-out ${i*0.15}s infinite`}}/>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-purple-200 font-semibold text-lg tracking-wide" style={{animation:'fadeInOut 2s ease-in-out infinite'}}>Analyzing your data...</p>
              <p className="text-purple-400 text-xs mt-1">Building charts, insights & statistics</p>
            </div>
          </div>
        )}

        {/* Upload Screen */}
        {!loading && !data && (
          <div className="text-center py-12">
            <div className="max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-10 border-2 border-dashed border-purple-500/50 hover:border-purple-400 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-20 h-20 text-purple-400 mx-auto mb-6 animate-bounce" />
                <h2 className="text-2xl font-bold text-white mb-2">Drop Your File Here</h2>
                <p className="text-purple-300 mb-6">or click to browse files</p>
                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  {[['🤖','AI Chat — Ask questions about your data'],['📄','Auto Report — One click analysis'],['📈','Trend Forecast — Future predictions'],['🔥','Correlation Heatmap — Column relationships']].map(([icon, txt]) => (
                    <div key={txt} className="bg-slate-700/30 p-3 rounded-lg border border-purple-500/20">
                      <span className="text-lg">{icon}</span>
                      <p className="text-xs text-purple-200 mt-1">{txt}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-center">
                  <span className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-sm border border-purple-400/30">CSV</span>
                  <span className="px-3 py-1 bg-green-500/30 text-green-200 rounded-full text-sm border border-green-400/30">Excel (.xlsx)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {!loading && data && (
          <>
            {/* File Bar + Tabs */}
            <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-4 mb-6 border border-purple-500/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-purple-400" />
                  <div>
                    <h3 className="font-bold text-white">{file?.name}</h3>
                    <p className="text-xs text-purple-300">{data.length} rows × {headers.length} columns</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === t.id ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-slate-700/50 text-purple-200 hover:bg-slate-600/50 border border-purple-500/30'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  {getKPIs().map((k, i) => {
                    const Icon = k.icon;
                    return (
                      <div key={i} className={`bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-xl rounded-xl shadow-xl p-4 border ${k.borderColor} hover:scale-105 transition-transform`}>
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${k.color} w-fit mb-2`}><Icon className="w-5 h-5 text-white" /></div>
                        <p className="text-xs text-purple-300">{k.title}</p>
                        <p className="text-xl font-bold text-white">{k.value}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-orange-900/20 rounded-xl p-4 mb-4 border border-orange-500/30">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" />Alerts</h3>
                    {alerts.map((a, i) => <p key={i} className={`text-xs p-2 rounded mb-1 ${a.type === 'danger' ? 'bg-red-500/10 text-red-200' : 'bg-orange-500/10 text-orange-200'}`}>{a.message}</p>)}
                  </div>
                )}

                {/* AI Insights */}
                {aiInsights.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl p-4 mb-4 border border-purple-500/30">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />AI Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiInsights.map((ins, i) => {
                        const Icon = ins.icon;
                        return (
                          <div key={i} className={`p-3 rounded-lg flex gap-2 ${ins.type === 'success' ? 'bg-green-500/10 border border-green-500/30' : 'bg-orange-500/10 border border-orange-500/30'}`}>
                            <Icon className={`w-4 h-4 mt-0.5 ${ins.type === 'success' ? 'text-green-400' : 'text-orange-400'}`} />
                            <div><p className="text-xs font-bold text-white">{ins.title}</p><p className="text-xs text-purple-200">{ins.description}</p></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data Quality */}
                {dataQuality && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl p-4 mb-4 border border-purple-500/30">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400" />Data Quality Report</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-700/30 p-3 rounded-lg"><p className="text-xs text-purple-300">Total Rows</p><p className="text-lg font-bold text-white">{dataQuality.totalRows}</p></div>
                      <div className="bg-slate-700/30 p-3 rounded-lg"><p className="text-xs text-purple-300">Duplicates</p><p className={`text-lg font-bold ${dataQuality.duplicates > 0 ? 'text-orange-400' : 'text-green-400'}`}>{dataQuality.duplicates}</p></div>
                      <div className="bg-slate-700/30 p-3 rounded-lg"><p className="text-xs text-purple-300">Missing Cols</p><p className={`text-lg font-bold ${Object.keys(dataQuality.missingValues).length > 0 ? 'text-orange-400' : 'text-green-400'}`}>{Object.keys(dataQuality.missingValues).length}</p></div>
                    </div>
                  </div>
                )}

                {/* Top / Bottom */}
                {top.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-slate-800/80 to-green-900/30 rounded-xl p-4 border border-green-500/30">
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" />Top 5 Performers</h3>
                      {top.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-700/30 p-2 rounded mb-1">
                          <div className="flex gap-2 items-center"><span className="text-xs font-bold text-green-400">#{i+1}</span><span className="text-xs text-white">{p.product}</span></div>
                          <span className="text-xs font-bold text-green-400">{p.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gradient-to-br from-slate-800/80 to-red-900/30 rounded-xl p-4 border border-red-500/30">
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" />Bottom 5 Performers</h3>
                      {bottom.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-700/30 p-2 rounded mb-1">
                          <div className="flex gap-2 items-center"><span className="text-xs font-bold text-red-400">#{i+1}</span><span className="text-xs text-white">{p.product}</span></div>
                          <span className="text-xs font-bold text-red-400">{p.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Table */}
                {stats && stats.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl shadow-2xl p-4 border border-purple-500/30">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-400" />Statistical Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-purple-500/30">
                        <thead className="bg-slate-700/50">
                          <tr>{['Column','Average','Total','Max','Min'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/20">
                          {stats.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-700/30">
                              <td className="px-4 py-3 text-sm font-medium text-white">{s.name}</td>
                              <td className="px-4 py-3 text-sm text-purple-200">{s.average}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-purple-200">{s.total}</td>
                              <td className="px-4 py-3 text-sm text-purple-200">{s.max}</td>
                              <td className="px-4 py-3 text-sm text-purple-200">{s.min}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── CHARTS ────────────────────────────────────────────────────── */}
            {activeTab === 'charts' && (
              <div className="space-y-4">
                {timeData.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl p-4 border border-purple-500/30">
                    <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" />Sales Trend Over Time</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={timeData}>
                        <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3}/>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#c4b5fd' }} angle={-45} textAnchor="end" height={70}/>
                        <YAxis tick={{ fontSize: 10, fill: '#c4b5fd' }}/>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px', fontSize: '12px' }}/>
                        <Area type="monotone" dataKey="Sales" stroke="#10b981" fillOpacity={1} fill="url(#sg)"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {chartData.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-green-900/20 rounded-xl p-4 border border-green-500/30">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-green-400" />Product Performance</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3}/>
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#c4b5fd' }}/>
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#c4b5fd' }} width={95}/>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px', fontSize: '12px' }}/>
                          <Bar dataKey="Sales" fill="#10b981" radius={[0,8,8,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {pieData.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-pink-900/20 rounded-xl p-4 border border-pink-500/30">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-pink-400" />Category Distribution</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`} outerRadius={90} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ec4899', borderRadius: '8px', fontSize: '12px' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {chartData.some(d => d.Profit !== undefined) && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl p-4 border border-purple-500/30">
                    <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-yellow-400" />Profit vs Sales</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData.slice(0, 12)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3}/>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#c4b5fd' }} angle={-45} textAnchor="end" height={70}/>
                        <YAxis tick={{ fontSize: 10, fill: '#c4b5fd' }}/>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #a855f7', borderRadius: '8px', fontSize: '12px' }}/>
                        <Legend wrapperStyle={{ fontSize: 11 }}/>
                        <Bar dataKey="Sales" fill="#3b82f6"/>
                        <Bar dataKey="Profit" fill="#10b981"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ── FORECAST ──────────────────────────────────────────────────── */}
            {activeTab === 'forecast' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-slate-800/80 to-indigo-900/40 rounded-xl p-4 border border-indigo-500/30">
                  <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-400" />Trend Forecasting (Linear Regression)</h3>
                  <p className="text-xs text-purple-300 mb-4">
                    Slope: <span className={`font-bold ${slope >= 0 ? 'text-green-400' : 'text-red-400'}`}>{slope.toFixed(2)}</span>
                    {' '}—                   Trend {slope >= 0 ? '📈 Going Up (Positive)' : '📉 Going Down (Negative)'}
                  </p>
                  {forecastData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" opacity={0.3}/>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#c4b5fd' }} angle={-45} textAnchor="end" height={70}/>
                        <YAxis tick={{ fontSize: 10, fill: '#c4b5fd' }}/>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #818cf8', borderRadius: '8px', fontSize: '12px' }}/>
                        <Legend wrapperStyle={{ fontSize: 11 }}/>
                        <Line type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}/>
                        <Line type="monotone" dataKey="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4 }} connectNulls={false}/>
                        <Line type="monotone" dataKey="Trend" stroke="#818cf8" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls/>
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-10 text-purple-300">
                      <p>📅 Date/Month column aur Sales column chahiye forecast ke liye.</p>
                      <p className="text-xs mt-2">Column names mein 'date', 'month', 'sales', 'revenue' hona chahiye.</p>
                    </div>
                  )}
                </div>
                {forecastData.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl p-4 border border-purple-500/30">
                    <h3 className="text-sm font-bold text-white mb-3">📊 Forecast Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {forecastData.filter(d => d.Forecast !== null).map((d, i) => (
                        <div key={i} className="bg-slate-700/30 p-3 rounded-lg border border-yellow-500/20">
                          <p className="text-xs text-purple-300">{d.date}</p>
                          <p className="text-base font-bold text-yellow-400">{d.Forecast?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CORRELATION HEATMAP ───────────────────────────────────────── */}
            {activeTab === 'correlation' && (
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl p-4 border border-purple-500/30">
                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">🔥 Correlation Heatmap</h3>
                <p className="text-xs text-purple-300 mb-4">Green = Strong Positive Relation | Red = Negative Relation | Closer to ±1 = Stronger</p>
                {corrCols.length >= 2 ? (
                  <div className="overflow-x-auto">
                    <table className="mx-auto">
                      <thead>
                        <tr>
                          <th className="w-28 p-2"></th>
                          {corrCols.map(c => <th key={c} className="p-2 text-xs text-purple-300 font-medium w-20 text-center" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 80 }}>{c.slice(0,14)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {corrMatrix.map((row, i) => (
                          <tr key={i}>
                            <td className="p-2 text-xs text-purple-300 font-medium text-right pr-3 whitespace-nowrap">{corrCols[i].slice(0,14)}</td>
                            {row.map((val, j) => {
                              const abs = Math.abs(val);
                              let bg = 'bg-slate-700/50';
                              if (i === j) bg = 'bg-purple-500/60';
                              else if (val > 0.7) bg = 'bg-green-500/80';
                              else if (val > 0.4) bg = 'bg-green-500/40';
                              else if (val > 0.1) bg = 'bg-green-500/20';
                              else if (val < -0.7) bg = 'bg-red-500/80';
                              else if (val < -0.4) bg = 'bg-red-500/40';
                              else if (val < -0.1) bg = 'bg-red-500/20';
                              return (
                                <td key={j} className={`w-20 h-14 text-center text-xs font-bold rounded m-0.5 ${bg} ${abs > 0.5 ? 'text-white' : 'text-purple-200'}`} title={`${corrCols[i]} vs ${corrCols[j]}: ${val}`}>{val.toFixed(2)}</td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-purple-300">
                    <p>Heatmap ke liye kam se kam 2 numeric columns chahiye.</p>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-purple-300 justify-center">
                  <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-500/80 inline-block"></span> Strong Positive (&gt;0.7)</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-500/30 inline-block"></span> Moderate Positive</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-500/80 inline-block"></span> Strong Negative (&lt;-0.7)</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-purple-500/60 inline-block"></span> Self (1.0)</span>
                </div>
              </div>
            )}

            {/* ── AI CHAT ───────────────────────────────────────────────────── */}
            {activeTab === 'chat' && (
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl border border-purple-500/30 flex flex-col" style={{ height: 560 }}>
                <div className="p-4 border-b border-purple-500/20 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"><MessageCircle className="w-5 h-5 text-white"/></div>
                  <div>
                    <h3 className="text-base font-bold text-white">AI Data Chat (Gemini)</h3>
                    <p className="text-xs text-purple-300">Ask questions — Gemini will answer in real-time</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-6">
                      <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3"/>
                      <p className="text-purple-200 font-medium">Ask anything about your data!</p>
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs sm:max-w-md px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm' : 'bg-slate-700/70 text-purple-100 rounded-bl-sm border border-purple-500/20'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-700/70 rounded-2xl rounded-bl-sm px-4 py-3 border border-purple-500/20">
                        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }}></span>)}</div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div className="px-4 pt-2 pb-1 border-t border-purple-500/10">
                  <p className="text-xs text-purple-400 mb-1.5">Suggestions:</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {chatSuggestions[suggIdx].map(q => (
                      <button key={q} onClick={() => setChatInput(q)}
                        className="px-2.5 py-1.5 bg-slate-700/50 hover:bg-purple-600/30 text-purple-200 rounded-lg text-xs border border-purple-500/30 transition-all text-left">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t border-purple-500/20">
                  <div className="flex gap-2">
                    <input
                      value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                      placeholder="Ask your question here..."
                      className="flex-1 px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white text-sm placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                      className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-xl transition-all">
                      <Send className="w-5 h-5"/>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── AI REPORT ─────────────────────────────────────────────────── */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-purple-400"/>AI Report Generator</h3>
                      <p className="text-xs text-purple-300">Claude will write an Executive Summary, Key Findings & Recommendations automatically</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={generateReport} disabled={reportLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all">
                        {reportLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                        {reportLoading ? 'Generating...' : 'Generate Report'}
                      </button>
                      {report && (
                        <button onClick={downloadReport}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all">
                          <Download className="w-4 h-4"/>Download
                        </button>
                      )}
                    </div>
                  </div>
                  {!report && !reportLoading && (
                    <div className="text-center py-10 text-purple-300">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-purple-400"/>
                      <p>"Generate Report" button click karein</p>
                      <p className="text-xs text-purple-300">AI Chat — Ask questions about your data</p>
                    <p className="text-xs text-purple-300 mt-1">Click "Generate Report" to get started</p>
                    <p className="text-xs text-purple-300 mt-1">Claude will write an Executive Summary, Key Findings & Recommendations automatically</p>
                    </div>
                  )}
                  {reportLoading && (
                    <div className="text-center py-10">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-purple-500 mx-auto mb-4"></div>
                      <p className="text-purple-200">Claude report likh raha hai...</p>
                    </div>
                  )}
                  {report && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/20 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-purple-100 whitespace-pre-wrap font-sans leading-relaxed">{report}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── DATA TABLE ────────────────────────────────────────────────── */}
            {activeTab === 'data' && (
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 rounded-xl shadow-2xl p-4 border border-purple-500/30">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-green-400"/>Data Preview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-purple-300 mb-1">Column Filter</label>
                    <select value={selectedColumn} onChange={e => setSelectedColumn(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="">All Columns</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-purple-300 mb-1">Search</label>
                    <input value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder="Type to filter..."
                      className="w-full px-3 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                  </div>
                </div>
                {filterValue && <p className="text-xs text-purple-300 mb-3">Showing {getFiltered().length} of {data.length} records</p>}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-purple-500/30">
                    <thead className="bg-slate-700/50">
                      <tr>{headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/20">
                      {getFiltered().slice(0, 100).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-700/30">
                          {headers.map(h => <td key={h} className="px-4 py-3 text-xs text-purple-200 whitespace-nowrap">{row[h] ?? '-'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-purple-500/30 bg-gradient-to-r from-slate-800 to-purple-900 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-purple-300/80">
          Developed by:{' '}
          {developers.map((d, i) => (
            <React.Fragment key={d.name}>
              <button onClick={() => { setSelDev(d); setShowDev(true); }} className="text-purple-400 hover:text-purple-300 underline decoration-dotted">{d.name}</button>
              {i < developers.length - 1 && <span className="mx-2">•</span>}
            </React.Fragment>
          ))}
          {' '} | GEC Vaishali, CSE(IOT)
        </div>
      </div>
    </div>
  );
}
