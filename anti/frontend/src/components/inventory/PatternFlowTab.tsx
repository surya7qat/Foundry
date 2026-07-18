import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import { Search, ChevronLeft, ChevronRight, Image as ImageIcon, History, Edit2, Upload } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import '../master/MasterStyles.css';

interface Pattern {
    id: number;
    customer: number;
    customer_name?: string;
    customer_code?: string;
    pattern_id: string;
    pattern_type: string;
    photos: string[];
    description: string;
    is_active: boolean;
    current_status: 'IN_PRODUCTION' | 'IN_STOCK';
    last_entry_type: 'INWARD' | 'OUTWARD' | null;
    last_inception_date: string | null;
    core_boxes_count: number;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}

interface PatternLog {
    id: number;
    pattern: number;
    pattern_code: string;
    customer_name: string;
    date: string;
    type_of_entry: 'INWARD' | 'OUTWARD' | 'INCEPTION' | 'OUT_FOR_PRODUCTION' | 'RETURN_FROM_PRODUCTION';
    description: string;
    photos: string[];
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}

const PatternFlowTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('pattern_flow_search_query') || '';
    });
    const [loading, setLoading] = useState(false);
    
    // Modals
    const [selectedPatternForPhoto, setSelectedPatternForPhoto] = useState<Pattern | null>(null);
    const [selectedPatternForEntry, setSelectedPatternForEntry] = useState<Pattern | null>(null);
    const [selectedLogForAudit, setSelectedLogForAudit] = useState<PatternLog | null>(null);
    const [selectedPatternAudit, setSelectedPatternAudit] = useState<Pattern | null>(null);
    const [expandedPatternId, setExpandedPatternId] = useState<number | null>(null);
    
    // Entry Form state
    const [entryType, setEntryType] = useState<'INCEPTION' | 'INWARD' | 'OUTWARD'>('INCEPTION');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryPhoto, setEntryPhoto] = useState<string>('');
    const [entryLoading, setEntryLoading] = useState(false);

    // Log History Modal state
    const [logsPattern, setLogsPattern] = useState<Pattern | null>(null);
    const [patternLogs, setPatternLogs] = useState<PatternLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedLogPhoto, setSelectedLogPhoto] = useState<string | null>(null);
    
    // Inline Edit state for Log History
    const [editingLogId, setEditingLogId] = useState<number | null>(null);
    const [editLogDate, setEditLogDate] = useState('');
    const [editLogDescription, setEditLogDescription] = useState('');
    const [editLogLoading, setEditLogLoading] = useState(false);

    const isSuperuser = sessionStorage.getItem('is_superuser') === 'true';

    useEffect(() => {
        fetchPatterns(page);
    }, [page]);

    const fetchPatterns = async (pageNum = 1, searchVal = searchQuery) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/inventory/patterns/`, {
                params: {
                    page: pageNum,
                    search: searchVal
                }
            });
            setPatterns(res.data.results || []);
            setTotalPages(Math.ceil((res.data.count || 0) / 10));
        } catch (err: any) {
            console.error(err);
            showToast('Failed to fetch pattern list.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        sessionStorage.setItem('pattern_flow_search_query', searchQuery);
        fetchPatterns(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setPage(1);
        sessionStorage.removeItem('pattern_flow_search_query');
        fetchPatterns(1, '');
    };

    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    const formatDateTime = (dtStr: string | null) => {
        if (!dtStr) return '-';
        try {
            const date = new Date(dtStr);
            return date.toLocaleString();
        } catch {
            return dtStr;
        }
    };

    const handleOutForProduction = async (pat: Pattern) => {
        try {
            await api.post(`/api/inventory/patterns/${pat.id}/out_for_production/`, {
                description: 'Out for Production'
            });
            showToast(`Pattern ${pat.pattern_id} sent out for production successfully`, 'success');
            fetchPatterns(page);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors || err.response?.data?.[0] || 'Validation failed';
            showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        }
    };

    const handleReturnFromProduction = async (pat: Pattern) => {
        try {
            await api.post(`/api/inventory/patterns/${pat.id}/return_from_production/`, {
                description: 'Return from Production'
            });
            showToast(`Pattern ${pat.pattern_id} returned from production successfully`, 'success');
            fetchPatterns(page);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors || err.response?.data?.[0] || 'Validation failed';
            showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setEntryPhoto(reader.result as string);
            };
            reader.onerror = (err) => {
                console.error(err);
                showToast('Failed to load photo', 'error');
            };
        }
    };

    const handleEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatternForEntry) return;

        if (!entryPhoto) {
            showToast('Photo upload is required.', 'error');
            return;
        }

        if (!entryDescription.trim()) {
            showToast('Description is required.', 'error');
            return;
        }

        setEntryLoading(true);
        try {
            await api.post(`/api/inventory/patterns/${selectedPatternForEntry.id}/create_entry/`, {
                type_of_entry: entryType,
                description: entryDescription,
                photo: entryPhoto
            });
            showToast('Log entry created successfully', 'success');
            setSelectedPatternForEntry(null);
            setEntryDescription('');
            setEntryPhoto('');
            setEntryType('INCEPTION');
            fetchPatterns(page);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors || err.response?.data?.[0] || 'Validation failed';
            showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        } finally {
            setEntryLoading(false);
        }
    };

    const fetchLogsForPattern = async (pat: Pattern) => {
        setLogsLoading(true);
        setLogsPattern(pat);
        try {
            const res = await api.get(`/api/inventory/patterns/${pat.id}/logs/`);
            setPatternLogs(res.data.results || res.data || []);
        } catch (err) {
            console.error(err);
            showToast('Failed to fetch pattern logs', 'error');
        } finally {
            setLogsLoading(false);
        }
    };

    const startEditingLog = (log: PatternLog) => {
        setEditingLogId(log.id);
        
        try {
            const d = new Date(log.date);
            const pad = (n: number) => (n < 10 ? '0' + n : n);
            const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setEditLogDate(dateStr);
        } catch {
            setEditLogDate('');
        }
        setEditLogDescription(log.description);
    };

    const cancelEditingLog = () => {
        setEditingLogId(null);
        setEditLogDate('');
        setEditLogDescription('');
    };

    const saveEditedLog = async (log: PatternLog) => {
        if (!editLogDescription.trim()) {
            showToast('Description is required', 'error');
            return;
        }

        setEditLogLoading(true);
        try {
            await api.put(`/api/inventory/pattern-logs/${log.id}/`, {
                date: editLogDate ? new Date(editLogDate).toISOString() : log.date,
                description: editLogDescription
            });
            showToast('Log entry updated successfully', 'success');
            setEditingLogId(null);
            if (logsPattern) {
                fetchLogsForPattern(logsPattern);
                fetchPatterns(page);
            }
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors || 'Failed to update log entry';
            showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        } finally {
            setEditLogLoading(false);
        }
    };

    const formatEntryTypeLabel = (type: string) => {
        switch(type) {
            case 'INWARD': return 'Inward';
            case 'OUTWARD': return 'Outward';
            case 'INCEPTION': return 'Inception';
            case 'OUT_FOR_PRODUCTION': return 'Out for Production';
            case 'RETURN_FROM_PRODUCTION': return 'Return from Production';
            default: return type;
        }
    };

    const getEntryTypeColor = (type: string) => {
        switch(type) {
            case 'INWARD': return '#22c55e'; // Green
            case 'OUTWARD': return '#ef4444'; // Red
            case 'INCEPTION': return '#3b82f6'; // Blue
            case 'OUT_FOR_PRODUCTION': return '#eab308'; // Yellow
            case 'RETURN_FROM_PRODUCTION': return '#a855f7'; // Purple
            default: return 'white';
        }
    };

    return (
        <div className="tab-container" style={{ position: 'relative' }}>
            <div className="tab-header">
                <h2>Pattern Flow & Tracking</h2>
            </div>

            {/* Search Bar */}
            <div className="search-bar-container" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="search-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input 
                        type="text" 
                        placeholder="Search by Pattern ID, Customer Name..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="glass-input"
                        style={{ paddingLeft: '40px', width: '100%', height: '42px', margin: 0 }}
                    />
                </div>
                <button type="button" onClick={handleSearch} className="btn-primary" style={{ margin: 0, padding: '0 1.5rem', width: 'auto', minHeight: 'auto', height: '42px' }}>
                    Search
                </button>
                {searchQuery && (
                    <button type="button" onClick={handleClearSearch} className="btn-secondary" style={{ margin: 0, padding: '0 1rem', width: 'auto', minHeight: 'auto', height: '42px' }}>
                        Clear
                    </button>
                )}
            </div>

            {/* Desktop View */}
            <div className="data-table-wrapper desktop-only-view" style={{ position: 'relative' }}>
                <button 
                    type="button" 
                    onClick={() => scrollTable('left')} 
                    style={{ 
                        position: 'absolute', left: '-26px', top: '12px', zIndex: 100, 
                        background: 'linear-gradient(135deg, #ff6b35, #ff9f43)', border: 'none', color: '#fff', 
                        width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4)', transition: 'all 0.2s ease', outline: 'none' 
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.6)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.4)';
                    }}
                    title="Scroll Left"
                >
                    <ChevronLeft size={20} style={{ strokeWidth: 3 }} />
                </button>
                
                <button 
                    type="button" 
                    onClick={() => scrollTable('right')} 
                    style={{ 
                        position: 'absolute', right: '-26px', top: '12px', zIndex: 100, 
                        background: 'linear-gradient(135deg, #ff6b35, #ff9f43)', border: 'none', color: '#fff', 
                        width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4)', transition: 'all 0.2s ease', outline: 'none' 
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.6)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.4)';
                    }}
                    title="Scroll Right"
                >
                    <ChevronRight size={20} style={{ strokeWidth: 3 }} />
                </button>

                <div className="data-table-container" ref={tableContainerRef} style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="glass-table" style={{ minWidth: '1140px', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '280px' }}>Customer Name/Code</th>
                                <th style={{ width: '120px' }}>Pattern ID</th>
                                <th style={{ width: '150px' }}>Pattern Type</th>
                                <th style={{ width: '150px', textAlign: 'center' }}>No. of Core Boxes</th>
                                <th style={{ width: '180px' }}>Last Inception Date</th>
                                <th style={{ width: '120px' }}>Pattern Photo</th>
                                <th style={{ width: '140px' }}>Current Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading patterns...</td>
                                </tr>
                            ) : patterns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No patterns found.</td>
                                </tr>
                            ) : (
                                patterns.map(pat => (
                                    <React.Fragment key={pat.id}>
                                        <tr 
                                            onClick={() => setExpandedPatternId(expandedPatternId === pat.id ? null : pat.id)}
                                            style={{ cursor: 'pointer', background: expandedPatternId === pat.id ? 'rgba(255, 107, 53, 0.08)' : 'transparent' }}
                                        >
                                            <td style={{ fontWeight: 500 }}>
                                                {pat.customer_name === '***' ? '***' : `${pat.customer_code || ''} - ${pat.customer_name || ''}`}
                                            </td>
                                            <td style={{ color: 'var(--color-molten-yellow)', fontWeight: 'bold' }}>
                                                {pat.pattern_id}
                                            </td>
                                            <td>
                                                {pat.pattern_type === 'CO2' ? 'Co2' : pat.pattern_type === 'BLACK_SAND' ? 'Black Sand' : 'Same as Core'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {pat.core_boxes_count}
                                            </td>
                                            <td>
                                                {formatDateTime(pat.last_inception_date)}
                                            </td>
                                            <td>
                                                {pat.photos && pat.photos.length > 0 ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedPatternForPhoto(pat); }} 
                                                        className="action-icon-btn edit-btn" 
                                                        style={{ padding: '4px 10px', height: '28px', fontSize: '0.8rem', width: 'auto', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0 }}
                                                    >
                                                        <ImageIcon size={14} /> View
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#666', fontSize: '0.85rem' }}>No Photo</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ 
                                                        display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                                                        background: pat.current_status === 'IN_PRODUCTION' ? '#eab308' : '#22c55e',
                                                        boxShadow: pat.current_status === 'IN_PRODUCTION' ? '0 0 6px #eab308' : '0 0 6px #22c55e'
                                                    }}></span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: pat.current_status === 'IN_PRODUCTION' ? '#eab308' : '#22c55e' }}>
                                                        {pat.current_status === 'IN_PRODUCTION' ? 'In Production' : 'In Stock'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedPatternId === pat.id && (
                                            <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                                <td colSpan={7} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 107, 53, 0.15)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                                            Actions for Pattern <strong style={{ color: 'var(--color-molten-yellow)' }}>{pat.pattern_id}</strong>:
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleOutForProduction(pat)} 
                                                                disabled={pat.current_status === 'IN_PRODUCTION' || !pat.last_inception_date}
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #ff6b35, #ff9f43)',
                                                                    border: 'none',
                                                                    color: '#ffffff',
                                                                    padding: '0 12px',
                                                                    height: '28px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 600,
                                                                    borderRadius: '4px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                    flexShrink: 0,
                                                                    margin: 0,
                                                                    cursor: (pat.current_status === 'IN_PRODUCTION' || !pat.last_inception_date) ? 'not-allowed' : 'pointer',
                                                                    opacity: (pat.current_status === 'IN_PRODUCTION' || !pat.last_inception_date) ? 0.4 : 1,
                                                                    boxShadow: (pat.current_status === 'IN_PRODUCTION' || !pat.last_inception_date) ? 'none' : '0 2px 8px rgba(255, 107, 53, 0.3)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Out Production
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleReturnFromProduction(pat)} 
                                                                disabled={pat.current_status === 'IN_STOCK'}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    color: '#ef4444',
                                                                    padding: '0 12px',
                                                                    height: '28px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 600,
                                                                    borderRadius: '4px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                    flexShrink: 0,
                                                                    margin: 0,
                                                                    cursor: pat.current_status === 'IN_STOCK' ? 'not-allowed' : 'pointer',
                                                                    opacity: pat.current_status === 'IN_STOCK' ? 0.4 : 1,
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Return Stock
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setSelectedPatternForEntry(pat)} 
                                                                disabled={pat.current_status === 'IN_PRODUCTION'}
                                                                style={{
                                                                    background: 'rgba(76, 201, 240, 0.15)',
                                                                    border: '1px solid rgba(76, 201, 240, 0.3)',
                                                                    color: '#4cc9f0',
                                                                    padding: '0 12px',
                                                                    height: '28px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 600,
                                                                    borderRadius: '4px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                    flexShrink: 0,
                                                                    margin: 0,
                                                                    cursor: pat.current_status === 'IN_PRODUCTION' ? 'not-allowed' : 'pointer',
                                                                    opacity: pat.current_status === 'IN_PRODUCTION' ? 0.4 : 1,
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Entry
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => fetchLogsForPattern(pat)} 
                                                                style={{
                                                                    background: 'rgba(168, 85, 247, 0.15)',
                                                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                                                    color: '#a855f7',
                                                                    padding: '0 12px',
                                                                    height: '28px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 600,
                                                                    borderRadius: '4px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                    flexShrink: 0,
                                                                    margin: 0,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Log
                                                            </button>
                                                            {isSuperuser && (
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setSelectedPatternAudit(pat)} 
                                                                    style={{
                                                                        background: 'rgba(59, 130, 246, 0.15)',
                                                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                                                        color: '#3b82f6',
                                                                        padding: '0 8px',
                                                                        height: '28px',
                                                                        width: '28px',
                                                                        borderRadius: '4px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        whiteSpace: 'nowrap',
                                                                        flexShrink: 0,
                                                                        margin: 0,
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    title="Audit Log"
                                                                >
                                                                    <History size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View */}
            <div className="mobile-only-view mobile-card-list">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading patterns...</div>
                ) : patterns.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>No patterns found.</div>
                ) : (
                    patterns.map(pat => (
                        <div key={pat.id} className="mobile-card glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                        display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                                        background: pat.current_status === 'IN_PRODUCTION' ? '#eab308' : '#22c55e',
                                        boxShadow: pat.current_status === 'IN_PRODUCTION' ? '0 0 6px #eab308' : '0 0 6px #22c55e'
                                    }}></span>
                                    <h4 style={{ margin: 0, color: 'var(--color-molten-yellow)', fontSize: '1.05rem' }}>{pat.pattern_id}</h4>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                    {pat.pattern_type === 'CO2' ? 'Co2' : pat.pattern_type === 'BLACK_SAND' ? 'Black Sand' : 'Same as Core'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                                <div>
                                    <span style={{ color: '#aaa' }}>Customer: </span>
                                    <span style={{ fontWeight: 500, color: '#fff' }}>
                                        {pat.customer_name === '***' ? '***' : `${pat.customer_code || ''} - ${pat.customer_name || ''}`}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#aaa' }}>No. of Core Boxes: </span>
                                    <span style={{ fontWeight: 500, color: '#fff' }}>{pat.core_boxes_count}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#aaa' }}>Last Inception: </span>
                                    <span style={{ fontWeight: 500, color: '#fff' }}>{formatDateTime(pat.last_inception_date)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
                                {pat.photos && pat.photos.length > 0 ? (
                                    <button type="button" onClick={() => setSelectedPatternForPhoto(pat)} className="action-icon-btn edit-btn" style={{ padding: '4px 10px', height: '28px', fontSize: '0.8rem', width: 'auto', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                                        <ImageIcon size={14} /> Pattern Photos
                                    </button>
                                ) : (
                                    <span style={{ color: '#666', fontSize: '0.8rem' }}>No master photos</span>
                                )}
                            </div>

                            {/* Mobile Footer Actions */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <button 
                                    type="button" 
                                    onClick={() => handleOutForProduction(pat)} 
                                    disabled={pat.current_status === 'IN_PRODUCTION' || !pat.last_inception_date}
                                    style={{
                                        background: 'linear-gradient(135deg, #ff6b35, #ff9f43)',
                                        border: 'none',
                                        color: '#ffffff',
                                        padding: '0 8px',
                                        height: '30px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        margin: 0,
                                        cursor: (pat.current_status === 'IN_PRODUCTION' || !pat.last_inception_date) ? 'not-allowed' : 'pointer',
                                        opacity: (pat.current_status === 'IN_PRODUCTION' || !pat.last_inception_date) ? 0.4 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Out Prod
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => handleReturnFromProduction(pat)} 
                                    disabled={pat.current_status === 'IN_STOCK'}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        padding: '0 8px',
                                        height: '30px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        margin: 0,
                                        cursor: pat.current_status === 'IN_STOCK' ? 'not-allowed' : 'pointer',
                                        opacity: pat.current_status === 'IN_STOCK' ? 0.4 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Return
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedPatternForEntry(pat)} 
                                    disabled={pat.current_status === 'IN_PRODUCTION'}
                                    style={{
                                        background: 'rgba(76, 201, 240, 0.15)',
                                        border: '1px solid rgba(76, 201, 240, 0.3)',
                                        color: '#4cc9f0',
                                        padding: '4px 10px',
                                        height: '30px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        margin: 0,
                                        cursor: pat.current_status === 'IN_PRODUCTION' ? 'not-allowed' : 'pointer',
                                        opacity: pat.current_status === 'IN_PRODUCTION' ? 0.4 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Entry
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => fetchLogsForPattern(pat)} 
                                    style={{
                                        background: 'rgba(168, 85, 247, 0.15)',
                                        border: '1px solid rgba(168, 85, 247, 0.3)',
                                        color: '#a855f7',
                                        padding: '4px 10px',
                                        height: '30px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        margin: 0,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Log
                                </button>
                                {isSuperuser && (
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedPatternAudit(pat)} 
                                        style={{
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            color: '#3b82f6',
                                            padding: '4px 10px',
                                            height: '30px',
                                            width: '38px',
                                            borderRadius: '4px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            whiteSpace: 'nowrap',
                                            margin: 0,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Audit Log"
                                    >
                                        <History size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '1.5rem' }}>
                    <button 
                        type="button" 
                        disabled={page === 1} 
                        onClick={() => setPage(page - 1)} 
                        className="btn-secondary" 
                        style={{ padding: '4px 10px', height: '32px', minHeight: 'auto', width: 'auto', margin: 0 }}
                    >
                        Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', color: '#ccc' }}>Page {page} of {totalPages}</span>
                    <button 
                        type="button" 
                        disabled={page === totalPages} 
                        onClick={() => setPage(page + 1)} 
                        className="btn-secondary" 
                        style={{ padding: '4px 10px', height: '32px', minHeight: 'auto', width: 'auto', margin: 0 }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Modal: View Pattern Master Photos */}
            {selectedPatternForPhoto && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '1.5rem', border: '1px solid rgba(255,107,53,0.3)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-molten-yellow)' }}>Pattern Photos ({selectedPatternForPhoto.pattern_id})</h3>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0', justifyContent: 'center' }}>
                            {selectedPatternForPhoto.photos.map((ph, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <img src={ph} alt={`Pattern ${idx + 1}`} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <a href={ph} download={`pattern_${selectedPatternForPhoto.pattern_id}_${idx + 1}.jpg`} className="action-icon-btn edit-btn" style={{ fontSize: '0.75rem', padding: '2px 8px', height: '24px', minHeight: 'auto', width: 'auto', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                        Download
                                    </a>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setSelectedPatternForPhoto(null)} className="btn-secondary" style={{ width: '100%', marginTop: '1rem', height: '36px', minHeight: 'auto', margin: '1rem 0 0 0' }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Modal: Entry Form */}
            {selectedPatternForEntry && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '1.5rem', border: '1px solid rgba(255,107,53,0.3)' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--color-molten-yellow)' }}>Add Entry ({selectedPatternForEntry.pattern_id})</h3>
                        
                        <form onSubmit={handleEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Entry Type Radio Buttons */}
                            <div className="input-group">
                                <label style={{ color: '#ccc', fontWeight: 600, fontSize: '0.85rem' }}>Entry Type <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px' }}>
                                    {[
                                        { value: 'INCEPTION', label: 'Inception' },
                                        { value: 'INWARD', label: 'Inward' },
                                        { value: 'OUTWARD', label: 'Outward' }
                                    ].map(item => (
                                        <label key={item.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, color: 'white', fontSize: '0.9rem' }}>
                                            <input 
                                                type="radio" 
                                                name="entry_type" 
                                                value={item.value} 
                                                checked={entryType === item.value} 
                                                onChange={() => setEntryType(item.value as any)} 
                                                style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                                            />
                                            {item.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Photo Upload */}
                            <div className="input-group">
                                <label style={{ color: '#ccc', fontWeight: 600, fontSize: '0.85rem' }}>Upload Photo <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                                    <input 
                                        type="file" 
                                        accept="image/jpeg,image/jpg" 
                                        id="entry-photo-upload" 
                                        onChange={handlePhotoUpload} 
                                        style={{ display: 'none' }} 
                                        required
                                    />
                                    <label htmlFor="entry-photo-upload" style={{ 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', 
                                        background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', 
                                        borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', margin: 0, color: '#fff', fontSize: '0.85rem', flex: 1
                                    }}>
                                        <Upload size={14} /> Choose JPG Photo
                                    </label>
                                    
                                    {entryPhoto && (
                                        <button type="button" onClick={() => setEntryPhoto('')} className="btn-secondary" style={{ margin: 0, padding: '0 8px', minHeight: 'auto', height: '36px', fontSize: '0.8rem' }}>
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {entryPhoto && (
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <img src={entryPhoto} alt="Upload Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <span style={{ fontSize: '0.8rem', color: '#22c55e' }}>Photo selected</span>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="input-group">
                                <label style={{ color: '#ccc', fontWeight: 600, fontSize: '0.85rem' }}>Description <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                                <textarea 
                                    className="glass-input" 
                                    maxLength={250} 
                                    required
                                    style={{ minHeight: '60px', padding: '8px', fontSize: '0.9rem' }} 
                                    placeholder="Enter details for this entry..." 
                                    value={entryDescription} 
                                    onChange={e => setEntryDescription(e.target.value)} 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                <button type="submit" disabled={entryLoading} className="btn-primary" style={{ margin: 0, flex: 1, height: '38px', minHeight: 'auto' }}>
                                    {entryLoading ? 'Submitting...' : 'Submit Entry'}
                                </button>
                                <button type="button" onClick={() => { setSelectedPatternForEntry(null); setEntryPhoto(''); setEntryDescription(''); }} className="btn-secondary" style={{ margin: 0, flex: 1, height: '38px', minHeight: 'auto' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Pattern Logs history */}
            {logsPattern && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '95%', maxWidth: '750px', maxHeight: '85vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid rgba(255,107,53,0.3)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-molten-yellow)' }}>History Log ({logsPattern.pattern_id})</h3>
                            <button type="button" onClick={() => setLogsPattern(null)} className="btn-secondary" style={{ margin: 0, padding: '4px 10px', height: '28px', minHeight: 'auto', width: 'auto' }}>
                                Close
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                            {logsLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading log history...</div>
                            ) : patternLogs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>No logs registered for this pattern.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {patternLogs.map(log => (
                                        <div key={log.id} style={{ 
                                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                                            borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' 
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '5px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ 
                                                        fontSize: '0.85rem', fontWeight: 'bold', color: getEntryTypeColor(log.type_of_entry),
                                                        background: `rgba(${log.type_of_entry === 'INWARD' ? '34,197,94' : log.type_of_entry === 'OUTWARD' ? '239,68,68' : '59,130,246'}, 0.1)`,
                                                        padding: '2px 6px', borderRadius: '4px'
                                                    }}>
                                                        {formatEntryTypeLabel(log.type_of_entry)}
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                                        {formatDateTime(log.date)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {isSuperuser && editingLogId !== log.id && (
                                                        <>
                                                            <button type="button" onClick={() => startEditingLog(log)} className="action-icon-btn edit-btn" style={{ padding: '2px 6px', height: '24px', minHeight: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', margin: 0 }}>
                                                                <Edit2 size={12} /> Edit
                                                            </button>
                                                            <button type="button" onClick={() => setSelectedLogForAudit(log)} className="action-icon-btn delete-btn" style={{ padding: '2px 6px', height: '24px', minHeight: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', margin: 0 }}>
                                                                <History size={12} /> Audit
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {editingLogId === log.id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '4px' }}>
                                                    <div className="input-group">
                                                        <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Log Date/Time</label>
                                                        <input 
                                                            type="datetime-local" 
                                                            className="glass-input" 
                                                            value={editLogDate} 
                                                            onChange={e => setEditLogDate(e.target.value)} 
                                                            style={{ margin: 0, height: '32px', fontSize: '0.85rem' }}
                                                        />
                                                    </div>
                                                    <div className="input-group">
                                                        <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Description</label>
                                                        <textarea 
                                                            className="glass-input" 
                                                            value={editLogDescription} 
                                                            onChange={e => setEditLogDescription(e.target.value)} 
                                                            style={{ minHeight: '50px', padding: '6px', fontSize: '0.85rem', margin: 0 }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                        <button type="button" onClick={() => saveEditedLog(log)} disabled={editLogLoading} className="btn-primary" style={{ padding: '4px 10px', height: '26px', fontSize: '0.75rem', minHeight: 'auto', width: 'auto', margin: 0 }}>
                                                            {editLogLoading ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button type="button" onClick={cancelEditingLog} className="btn-secondary" style={{ padding: '4px 10px', height: '26px', fontSize: '0.75rem', minHeight: 'auto', width: 'auto', margin: 0 }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.9rem', color: '#eee', whiteSpace: 'pre-wrap' }}>
                                                    {log.description}
                                                </div>
                                            )}

                                            {log.photos && log.photos.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Log Photo:</span>
                                                    <button type="button" onClick={() => setSelectedLogPhoto(log.photos[0])} className="action-icon-btn edit-btn" style={{ padding: '2px 8px', height: '22px', minHeight: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', margin: 0 }}>
                                                        <ImageIcon size={12} /> View Upload
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: View Log photo specific */}
            {selectedLogPhoto && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '450px', padding: '1.5rem', border: '1px solid rgba(255,107,53,0.3)', textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-molten-yellow)' }}>Log Attachment</h3>
                        <img src={selectedLogPhoto} alt="Log Attachment" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <a href={selectedLogPhoto} download="log_photo.jpg" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '36px', minHeight: 'auto', margin: 0 }}>
                                Download Photo
                            </a>
                            <button type="button" onClick={() => setSelectedLogPhoto(null)} className="btn-secondary" style={{ flex: 1, height: '36px', minHeight: 'auto', margin: 0 }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Pattern Record Audit Log */}
            {selectedPatternAudit && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '1.5rem', position: 'relative', border: '1px solid rgba(255,107,53,0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--color-molten-yellow)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', fontSize: '1.1rem' }}>
                            Pattern Master Audit
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: '#fff' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Created By</div>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedPatternAudit.created_by || 'System'}</div>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{selectedPatternAudit.created_at ? new Date(selectedPatternAudit.created_at).toLocaleString() : '-'}</div>
                            </div>
                            
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Last Edited By</div>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedPatternAudit.updated_by || 'System'}</div>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{selectedPatternAudit.updated_at ? new Date(selectedPatternAudit.updated_at).toLocaleString() : '-'}</div>
                            </div>
                        </div>

                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={() => setSelectedPatternAudit(null)}
                            style={{ marginTop: '1.5rem', width: '100%', height: '38px', minHeight: 'auto', margin: '1.5rem 0 0 0' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Modal: Log Record Audit Log */}
            {selectedLogForAudit && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '1.5rem', position: 'relative', border: '1px solid rgba(255,107,53,0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--color-molten-yellow)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', fontSize: '1.1rem' }}>
                            Log Entry Audit
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: '#fff' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Created By</div>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedLogForAudit.created_by || 'System'}</div>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{selectedLogForAudit.created_at ? new Date(selectedLogForAudit.created_at).toLocaleString() : '-'}</div>
                            </div>
                            
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Last Edited By</div>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedLogForAudit.updated_by || 'System'}</div>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{selectedLogForAudit.updated_at ? new Date(selectedLogForAudit.updated_at).toLocaleString() : '-'}</div>
                            </div>
                        </div>

                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={() => setSelectedLogForAudit(null)}
                            style={{ marginTop: '1.5rem', width: '100%', height: '38px', minHeight: 'auto', margin: '1.5rem 0 0 0' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatternFlowTab;
