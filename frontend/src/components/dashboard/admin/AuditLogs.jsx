import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Download,
    Info,
    RefreshCw,
    X
} from 'lucide-react';
import { getAuditLogs } from '../../../services/auditLogs';
import { useAuth } from '../../../hooks/useAuth';

const ROLE_COLORS = {
    'STUDENT': 'bg-blue-100 text-blue-700 border-blue-200',
    'ADMIN': 'bg-sky-100 text-sky-700 border-sky-200',
    'RECRUITER': 'bg-orange-100 text-orange-700 border-orange-200',
    'SUPER_ADMIN': 'bg-red-100 text-red-700 border-red-200'
};

export default function AuditLogs() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    const [filters, setFilters] = useState({
        role: '',
        actionType: '',
        search: '',
        startDate: '',
        endDate: ''
    });

    const [availableActionTypes, setAvailableActionTypes] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAuditLogs({
                ...filters,
                page,
                limit: pagination.limit
            });
            if (data.success) {
                setLogs(data.logs);
                setPagination(data.pagination);
                if (data.filters?.actionTypes) {
                    setAvailableActionTypes(data.filters.actionTypes);
                }
            }
        } catch (err) {
            setError('Failed to fetch audit logs. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.limit]);

    useEffect(() => {
        fetchLogs(1);
    }, [filters, fetchLogs]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            role: '',
            actionType: '',
            search: '',
            startDate: '',
            endDate: ''
        });
    };

    const exportToCSV = () => {
        if (logs.length === 0) return;

        const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Target', 'Target ID', 'Details'];
        const csvData = logs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.actorName,
            log.actorRole,
            log.actionType,
            log.targetType,
            log.targetId,
            log.details || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                    Track and monitor portal activity
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => fetchLogs(pagination.page)}
                        className="p-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
                        title="Refresh"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Search and filters */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            name="search"
                            placeholder="Search by actor name, details, or target ID..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border shrink-0 ${showFilters
                                ? 'bg-sky-100 text-sky-700 border-sky-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Advanced filters
                        {(filters.role || filters.actionType || filters.startDate || filters.endDate) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Actor role</label>
                            <select
                                name="role"
                                value={filters.role}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                            >
                                <option value="">All Roles</option>
                                <option value="STUDENT">Student</option>
                                <option value="ADMIN">Admin</option>
                                <option value="RECRUITER">Recruiter</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Action type</label>
                            <select
                                name="actionType"
                                value={filters.actionType}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                            >
                                <option value="">All Actions</option>
                                {availableActionTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">End date</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    name="endDate"
                                    value={filters.endDate}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                                />
                                <button
                                    onClick={clearFilters}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Clear Filters"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Timestamp</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Actor</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Action</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Target</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-4 py-2.5">
                                            <div className="h-4 bg-gray-100 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-sky-50/40 transition-colors">
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">{log.actorName}</span>
                                                <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-medium border mt-1 ${ROLE_COLORS[log.actorRole] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    {log.actorRole}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-sm text-gray-900">{log.actionType}</span>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="text-sm text-gray-700">{log.targetType}</div>
                                            <div className="text-xs text-gray-400 font-mono">{log.targetId}</div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <p className="text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                                                {log.details || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Info className="h-8 w-8 text-gray-200" />
                                            <p className="text-sm">No audit logs found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-gray-500">
                            Showing <span className="font-medium text-gray-700">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                            <span className="font-medium text-gray-700">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span> of{' '}
                            <span className="font-medium text-gray-700">{pagination.total}</span> logs
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1 || loading}
                                className="p-1.5 border border-gray-200 rounded-md hover:bg-white disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) pageNum = i + 1;
                                    else if (pagination.page <= 3) pageNum = i + 1;
                                    else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                    else pageNum = pagination.page - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${pagination.page === pageNum
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages || loading}
                                className="p-1.5 border border-gray-200 rounded-md hover:bg-white disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
