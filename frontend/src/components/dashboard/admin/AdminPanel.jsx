import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Colors,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { AgCharts } from 'ag-charts-react';
import { 
  FaBell, FaUserTie, FaUniversity, FaFilter, 
  FaBuilding, FaUserGraduate, FaHandshake, 
  FaFileExcel, FaChartBar, FaChartLine, FaChartPie,
  FaSync, FaDownload, FaCog, FaSearch, FaUsers,
  FaIdCard, FaShare, FaCheckCircle, FaClock, FaEnvelope,
  FaChevronDown, FaTimes, FaBriefcase
} from 'react-icons/fa';
import { getAdminPanelData, exportReportCSV, downloadDataCSV, subscribeToAdminPanelData } from '../../../services/adminPanelService';
import api from '../../../services/api';
// TODO: Replace Firebase operations with API calls

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Colors,
  Filler
);

const CustomDropdown = ({ 
  label, 
  options, 
  selectedValues, 
  onSelectionChange, 
  multiple = false,
  placeholder = "Select options"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (option) => {
    if (multiple) {
      const newSelected = selectedValues.includes(option.id)
        ? selectedValues.filter(id => id !== option.id)
        : [...selectedValues, option.id];
      onSelectionChange(newSelected);
    } else {
      onSelectionChange([option.id]);
      setIsOpen(false);
    }
  };

  const removeOption = (optionId, e) => {
    e.stopPropagation();
    const newSelected = selectedValues.filter(id => id !== optionId);
    onSelectionChange(newSelected);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (!multiple) {
      const selected = options.find(opt => opt.id === selectedValues[0]);
      return selected ? selected.name : placeholder;
    }
    if (selectedValues.length === 1) {
      const selected = options.find(opt => opt.id === selectedValues[0]);
      return selected ? selected.name : placeholder;
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-black font-medium">{label}:</label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between transition-all duration-200 ${
            selectedValues.length > 0 
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300' 
              : 'bg-gray-50 border-slate-300'
          } hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span className="truncate flex-1">
            {getDisplayText()}
          </span>
          <div className="flex items-center gap-1">
            {multiple && selectedValues.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {selectedValues.length}
              </span>
            )}
            <FaChevronDown className={`w-3 h-3 text-slate-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {isOpen && (
          <div className="absolute z-20 w-full bg-white border-2 border-slate-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 text-left transition-colors duration-150 ${
                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                  onClick={() => handleOptionClick(option)}
                >
                  <span>{option.name}</span>
                  {isSelected && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {multiple && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedValues.map(value => {
            const option = options.find(opt => opt.id === value);
            return option ? (
              <span 
                key={value}
                className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
              >
                {option.name}
                <button
                  type="button"
                  onClick={(e) => removeOption(value, e)}
                  className="hover:text-blue-900 focus:outline-none"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

const AdminPanel = () => {
  const [filters, setFilters] = useState({
    campus: [],
    school: [],
    batch: [],
    admin: []
  });
  const [chartData, setChartData] = useState({});
  const [statsData, setStatsData] = useState({});
  const [adminPerformanceData, setAdminPerformanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    campuses: [],
    schools: [],
    batches: [],
    admins: []
  });
  const [loadingFilters, setLoadingFilters] = useState(true);
  
  // Debounce timer for filter changes
  const debounceTimer = useRef(null);

  // Load predefined filter options (no database fetching to avoid duplicates)
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        
        // TODO: Replace with API call: admin API to get admin users
        // For now, use placeholder
        const admins = [];
        // Placeholder - will be replaced with actual API call
        // const admins = await api.getAdmins();
        
        // Use only predefined options for schools, batches, centers
        setFilterOptions({
          campuses: [
            { id: 'BANGALORE', name: 'Bangalore' },
            { id: 'NOIDA', name: 'Noida' },
            { id: 'LUCKNOW', name: 'Lucknow' },
            { id: 'PUNE', name: 'Pune' },
            { id: 'PATNA', name: 'Patna' },
            { id: 'INDORE', name: 'Indore' }
          ],
          schools: [
            { id: 'SOT', name: 'School of Technology' },
            { id: 'SOM', name: 'School of Management' },
            { id: 'SOH', name: 'School of Healthcare' }
          ],
          batches: [
            { id: '23-27', name: '2023-2027' },
            { id: '24-28', name: '2024-2028' },
            { id: '25-29', name: '2025-2029' },
            { id: '26-30', name: '2026-2030' }
          ],
          admins: [
            { id: 'all', name: 'All Admins' },
            ...admins
          ]
        });
        
        console.log('✅ AdminPanel filter options loaded (predefined only)');
      } catch (error) {
        console.error('❌ Error loading AdminPanel filter options:', error);
        
        // Fallback to hardcoded options
        setFilterOptions({
          campuses: [
            { id: 'BANGALORE', name: 'Bangalore' },
            { id: 'NOIDA', name: 'Noida' },
            { id: 'LUCKNOW', name: 'Lucknow' },
            { id: 'PUNE', name: 'Pune' },
            { id: 'PATNA', name: 'Patna' },
            { id: 'INDORE', name: 'Indore' }
          ],
          schools: [
            { id: 'SOT', name: 'School of Technology' },
            { id: 'SOM', name: 'School of Management' },
            { id: 'SOH', name: 'School of Healthcare' }
          ],
          batches: [
            { id: '23-27', name: '2023-2027' },
            { id: '24-28', name: '2024-2028' },
            { id: '25-29', name: '2025-2029' },
            { id: '26-30', name: '2026-2030' }
          ],
          admins: [
            { id: 'all', name: 'All Admins' }
          ]
        });
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  const applyPanelData = useCallback((data) => {
    if (!data) return;
    
    const placementStatus = data.chartData?.placementStatus || null;
    const monthlyTrend = data.chartData?.monthlyTrend || null;
    const adminPerformance = data.chartData?.adminPerformance || [];
    
    setStatsData(data.statsData || {});
    setChartData({
      placementStatus,
      monthlyTrend
    });
    
    const agChartData = adminPerformance.length ? {
      title: { text: "Admin Performance Metrics" },
      subtitle: { text: "Jobs Posted by Admin (Last 90 Days)" },
      data: adminPerformance.map(item => ({
        admin: item.admin,
        jobsPosted: item.jobsPosted,
        applications: item.applications || 0,
        placements: item.placements || 0,
        successRate: item.successRate || 0
      })),
      series: [{
        type: "bar",
        direction: "horizontal",
        xKey: "admin",
        yKey: "jobsPosted",
        yName: "Jobs Posted"
      }]
    } : { data: [] };
    
    setAdminPerformanceData(agChartData);
    setLoading(false);
    setError(null);
  }, []);

  const loadAdminPanelData = useCallback(async (currentFilters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminPanelData(currentFilters, 90);
      applyPanelData(data);
    } catch (err) {
      console.error('❌ Failed to load AdminPanel data:', err);
      setError(err.message || 'Failed to load admin analytics');
      setLoading(false);
    }
  }, [applyPanelData]);

  // Set up real-time data subscription
  useEffect(() => {
    console.log('🔄 Setting up real-time AdminPanel data subscription with filters:', filters);
    
    setLoading(true);
    setError(null);
    
    const unsubscribe = subscribeToAdminPanelData(
      (data) => {
        console.log('📊 Real-time AdminPanel data received:', data);
        applyPanelData(data);
      },
      filters,
      90
    );
    
    // Cleanup subscription on unmount or filter change
    return () => {
      console.log('🧹 Cleaning up AdminPanel subscription');
      unsubscribe();
    };
  }, [filters, applyPanelData]);

  // Handle filter changes
  const handleFilterChange = (filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };

  // Export handlers
  const handleExportReport = async () => {
    try {
      await exportReportCSV(filters, 90);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  };

  const handleDownloadData = async () => {
    try {
      await downloadDataCSV(filters, 'applications', 90);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + error.message);
    }
  };

  const resetFilters = () => {
    setFilters({
      campus: [],
      school: [],
      batch: [],
      admin: []
    });
  };

  // Debounced effect for filter changes
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer
    debounceTimer.current = setTimeout(() => {
      loadAdminPanelData(filters);
    }, 300);
    
    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filters, loadAdminPanelData]);

  

  // Chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    },
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FaChartBar className="text-blue-600" />
              Admin Analytics Dashboard
            </h1>
            <p className="text-slate-600 mt-1">Real-time placement analytics and performance metrics</p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={handleExportReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <FaFileExcel className="w-4 h-4" />
              Export Report
            </button>
            
            <button
              onClick={handleDownloadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <FaDownload className="w-4 h-4" />
              Download Data
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-md hover:shadow-lg">
              <FaCog className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <FaBell className="w-4 h-4" />
              <span className="font-medium">Error loading data:</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FaFilter className="text-blue-600 text-xl" />
            <h2 className="text-xl font-semibold text-slate-800">Filters & Controls</h2>
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <FaSync className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CustomDropdown
              label="Campus"
              options={filterOptions.campuses}
              selectedValues={filters.campus}
              onSelectionChange={(values) => handleFilterChange('campus', values)}
              multiple={true}
              placeholder="Select Center"
            />
            
            <CustomDropdown
              label="School"
              options={filterOptions.schools}
              selectedValues={filters.school}
              onSelectionChange={(values) => handleFilterChange('school', values)}
              multiple={true}
              placeholder="Select schools"
            />
            
            <CustomDropdown
              label="Batch"
              options={filterOptions.batches}
              selectedValues={filters.batch}
              onSelectionChange={(values) => handleFilterChange('batch', values)}
              multiple={true}
              placeholder="Select batches"
            />
            
            <CustomDropdown
              label="Admin"
              options={filterOptions.admins}
              selectedValues={filters.admin}
              onSelectionChange={(values) => handleFilterChange('admin', values)}
              multiple={true}
              placeholder="Select admins"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors duration-200"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.totalStudents || 0).toLocaleString()}</p>
              </div>
              <FaUserGraduate className="text-4xl text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Placed Students</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.placedStudents || 0).toLocaleString()}</p>
              </div>
              <FaCheckCircle className="text-4xl text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Placement Rate</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.placementRate || 0).toFixed(1)}%</p>
              </div>
              <FaChartLine className="text-4xl text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Total Jobs</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.totalJobs || 0).toLocaleString()}</p>
              </div>
              <FaBriefcase className="text-4xl text-orange-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">Active Recruiters</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.activeRecruiters || 0).toLocaleString()}</p>
              </div>
              <FaUserTie className="text-4xl text-teal-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Pending Queries</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.pendingQueries || 0).toLocaleString()}</p>
              </div>
              <FaBell className="text-4xl text-red-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Total Applications</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.totalApplications || 0).toLocaleString()}</p>
              </div>
              <FaHandshake className="text-4xl text-indigo-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium">Avg Applications</p>
                <p className="text-3xl font-bold">{loading ? '...' : (statsData.averageApplications || 0).toFixed(1)}</p>
              </div>
              <FaChartPie className="text-4xl text-pink-200" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Admin Performance Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaUsers className="text-blue-600 text-xl" />
              <h3 className="text-xl font-semibold text-slate-800">Admin Performance</h3>
            </div>
            <div className="h-80">
              {adminPerformanceData.data && adminPerformanceData.data.length > 0 ? (
                <AgCharts options={adminPerformanceData} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  {loading ? 'Loading chart data...' : 'No data available'}
                </div>
              )}
            </div>
          </div>

          {/* Placement Status Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaChartBar className="text-green-600 text-xl" />
              <h3 className="text-xl font-semibold text-slate-800">Placement Status Distribution</h3>
            </div>
            <div className="h-80">
              {chartData.placementStatus ? (
                <Bar data={chartData.placementStatus} options={barOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  {loading ? 'Loading chart data...' : 'No data available'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FaChartLine className="text-purple-600 text-xl" />
            <h3 className="text-xl font-semibold text-slate-800">Monthly Placement Trend</h3>
          </div>
          <div className="h-80">
            {chartData.monthlyTrend ? (
              <Line data={chartData.monthlyTrend} options={lineOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                {loading ? 'Loading chart data...' : 'No data available'}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
