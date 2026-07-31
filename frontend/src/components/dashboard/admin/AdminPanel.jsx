import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  FaExclamationTriangle, FaUserTie, FaUniversity, FaFilter,
  FaBuilding, FaUserGraduate, FaHandshake,
  FaFileExcel, FaChartBar, FaChartLine, FaChartPie,
  FaSync, FaDownload, FaCog, FaSearch, FaUsers,
  FaIdCard, FaShare, FaCheckCircle, FaClock, FaEnvelope,
  FaChevronDown, FaTimes, FaBriefcase
} from 'react-icons/fa';
import { getAdminPanelData, exportReportCSV, downloadDataCSV, subscribeToAdminPanelData } from '../../../services/adminPanelService';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { Spinner } from '../../ui/loading';
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
          className={`w-full border rounded-md px-3 py-2 text-sm text-left flex items-center justify-between transition-colors ${selectedValues.length > 0
            ? 'bg-sky-50 border-sky-200 text-gray-900'
            : 'bg-white border-gray-200 text-gray-700'
            } hover:border-gray-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-200`}
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
          <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-md shadow-sm mt-1 max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-sky-50/60 cursor-pointer border-b border-gray-100 last:border-b-0 text-left transition-colors ${isSelected ? 'bg-sky-50 text-sky-700' : 'text-gray-700'
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
                className="inline-flex items-center gap-1 bg-sky-50 border border-sky-100 text-sky-800 px-2 py-0.5 rounded-md text-xs font-medium"
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
  const { user, role } = useAuth();
  const userRole = (role || user?.role || '').toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

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

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        const { fetchAcademicOptions, buildStandardFilterOptions } = await import(
          '../../../utils/academicOptions'
        );
        const raw = await fetchAcademicOptions();
        const academic = buildStandardFilterOptions(raw);
        setFilterOptions({
          campuses: academic.centers,
          schools: academic.schools,
          batches: academic.batches,
          admins: [{ id: 'all', name: 'All Admins' }],
        });
      } catch (error) {
        console.error('Error loading AdminPanel filter options:', error);
        setFilterOptions({ campuses: [], schools: [], batches: [], admins: [{ id: 'all', name: 'All Admins' }] });
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
  const barOptions = useMemo(() => ({
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
  }), []);

  const lineOptions = useMemo(() => ({
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
  }), []);

  return (
    <div className="space-y-3 overflow-x-hidden">
      <div className="w-full space-y-3">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FaChartBar className="text-sky-600 w-3.5 h-3.5" />
              System settings
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Filters, metrics, and charts</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
            <button
              onClick={handleExportReport}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <FaFileExcel className="w-3.5 h-3.5" />
              Export Report
            </button>

            <button
              onClick={handleDownloadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <FaDownload className="w-3.5 h-3.5" />
              Download Data
            </button>

            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-sm hover:bg-gray-50">
              <FaCog className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <FaExclamationTriangle className="w-4 h-4" />
              <span className="font-medium">Error loading data:</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Filters Section - Only visible to SuperAdmin */}
        {isSuperAdmin && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <FaFilter className="text-sky-600 w-3.5 h-3.5" />
              <h2 className="text-sm font-medium text-gray-900">Filters & Controls</h2>
              {loading && (
                <div className="flex items-center gap-1.5 text-sky-600">
                  <Spinner size="sm" />
                  <span className="text-xs">Loading...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-sm hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Info message for regular admins */}
        {!isSuperAdmin && (
          <div className="bg-sky-50 border border-sky-100 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <FaFilter className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <span className="font-medium">Viewing your data:</span> You are viewing data for your assigned center/school only.
              </p>
            </div>
          </div>
        )}

        {/* Statistics strips */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : (statsData.totalStudents || 0).toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-gray-500">Active Students</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : (statsData.activeStudents || 0).toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-emerald-700">Placed Students</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-emerald-700">
                  {loading ? '...' : (statsData.placedStudents || 0).toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-gray-500">Placement Rate</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : `${(statsData.placementRate || 0).toFixed(1)}%`}
                </p>
              </div>
              <div className="px-3 py-2 md:py-0 col-span-2 md:col-span-1">
                <p className="text-xs font-medium text-gray-500">Total Jobs</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : (statsData.totalJobs || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-gray-500">Active Recruiters</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : (statsData.activeRecruiters || 0).toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-gray-500">Pending Queries</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : (statsData.pendingQueries || 0).toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-gray-500">Total Applications</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : (statsData.totalApplications || 0).toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2 md:py-0">
                <p className="text-xs font-medium text-gray-500">Avg Applications</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5 text-gray-900">
                  {loading ? '...' : (statsData.averageApplications || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Admin Performance Chart */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
              <FaUsers className="text-sky-600 w-3.5 h-3.5" />
              <h3 className="text-sm font-medium text-gray-900">Admin Performance</h3>
            </div>
            <div className="p-4 h-80">
              {adminPerformanceData.data && adminPerformanceData.data.length > 0 ? (
                <AgCharts options={adminPerformanceData} />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  {loading ? 'Loading chart data...' : 'No data available'}
                </div>
              )}
            </div>
          </div>

          {/* Placement Status Chart */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
              <FaChartBar className="text-sky-600 w-3.5 h-3.5" />
              <h3 className="text-sm font-medium text-gray-900">Placement Status Distribution</h3>
            </div>
            <div className="p-4 h-80">
              {useMemo(() => (
                chartData.placementStatus ? (
                  <Bar data={chartData.placementStatus} options={barOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    {loading ? 'Loading chart data...' : 'No data available'}
                  </div>
                )
              ), [chartData.placementStatus, barOptions, loading])}
            </div>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <FaChartLine className="text-sky-600 w-3.5 h-3.5" />
            <h3 className="text-sm font-medium text-gray-900">Monthly Placement Trend</h3>
          </div>
          <div className="p-4 h-80">
            {useMemo(() => (
              chartData.monthlyTrend ? (
                <Line data={chartData.monthlyTrend} options={lineOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  {loading ? 'Loading chart data...' : 'No data available'}
                </div>
              )
            ), [chartData.monthlyTrend, lineOptions, loading])}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
