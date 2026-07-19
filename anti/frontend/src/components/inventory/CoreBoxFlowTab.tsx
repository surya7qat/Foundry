import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import { Search, ChevronLeft, ChevronRight, Image as ImageIcon, History, Edit2, Upload, Download } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import '../master/MasterStyles.css';

interface CoreBox {
    id: number;
    customer: number;
    customer_name?: string;
    customer_code?: string;
    core_box_id: string;
    name: string;
    core_box_type: string;
    pattern_id: string | null;
    photos: string[];
    description: string;
    is_active: boolean;
    current_status: 'IN_PRODUCTION' | 'IN_STOCK';
    last_entry_type: 'INWARD' | 'OUTWARD' | null;
    last_inspection_date: string | null;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}

interface CoreBoxLog {
    id: number;
    core_box: number;
    core_box_code: string;
    customer_name: string;
    date: string;
    type_of_entry: 'INWARD' | 'OUTWARD' | 'INSPECTION' | 'OUT_FOR_PRODUCTION' | 'RETURN_FROM_PRODUCTION';
    description: string;
    photos: string[];
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}

const CoreBoxFlowTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [coreBoxes, setCoreBoxes] = useState<CoreBox[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('core_box_flow_search_query') || '';
    });
    const [loading, setLoading] = useState(false);
    
    // Modals
    const [selectedCoreBoxForPhoto, setSelectedCoreBoxForPhoto] = useState<CoreBox | null>(null);
    const [selectedCoreBoxForEntry, setSelectedCoreBoxForEntry] = useState<CoreBox | null>(null);
    const [selectedCoreBoxAudit, setSelectedCoreBoxAudit] = useState<CoreBox | null>(null);
    const [expandedCoreBoxId, setExpandedCoreBoxId] = useState<number | null>(null);
    
    // Entry Form state
    const [entryType, setEntryType] = useState<'INSPECTION' | 'INWARD' | 'OUTWARD'>('INSPECTION');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
    const [entryLoading, setEntryLoading] = useState(false);

    // Log History Modal state
    const [logsCoreBox, setLogsCoreBox] = useState<CoreBox | null>(null);
    const [coreBoxLogs, setCoreBoxLogs] = useState<CoreBoxLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedLogPhoto, setSelectedLogPhoto] = useState<string | null>(null);
    const [selectedLogForAudit, setSelectedLogForAudit] = useState<CoreBoxLog | null>(null);
    
    // Inline Edit state for Log History
    const [editingLogId, setEditingLogId] = useState<number | null>(null);
    const [editLogDate, setEditLogDate] = useState('');
    const [editLogDescription, setEditLogDescription] = useState('');
    const [editLogLoading, setEditLogLoading] = useState(false);

    const isSuperuser = sessionStorage.getItem('is_superuser') === 'true';

    useEffect(() => {
        fetchCoreBoxes(page);
    }, [page]);

    const fetchCoreBoxes = async (pageNum = 1, searchVal = searchQuery) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/inventory/core-boxes/`, {
                params: {
                    page: pageNum,
                    search: searchVal
                }
            });
            setCoreBoxes(res.data.results || []);
            setTotalPages(Math.ceil((res.data.count || 0) / 10));
        } catch (err: any) {
            console.error(err);
            showToast('Failed to fetch core box list.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        sessionStorage.setItem('core_box_flow_search_query', searchQuery);
        fetchCoreBoxes(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setPage(1);
        sessionStorage.removeItem('core_box_flow_search_query');
        fetchCoreBoxes(1, '');
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

    const handleOutForProduction = async (cb: CoreBox) => {
        try {
            await api.post(`/api/inventory/core-boxes/${cb.id}/out_for_production/`, {
                description: 'Out for Production'
            });
            showToast(`Core box ${cb.core_box_id} sent out for production successfully`, 'success');
            fetchCoreBoxes(page);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors || err.response?.data?.[0] || 'Validation failed';
            showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        }
    };

    const handleReturnFromProduction = async (cb: CoreBox) => {
        try {
            await api.post(`/api/inventory/core-boxes/${cb.id}/return_from_production/`, {
                description: 'Return from Production'
            });
            showToast(`Core box ${cb.core_box_id} returned from production successfully`, 'success');
            fetchCoreBoxes(page);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors || err.response?.data?.[0] || 'Validation failed';
            showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        }
    };

    const fetchLogsForCoreBox = async (cb: CoreBox) => {
        setLogsLoading(true);
        try {
            const res = await api.get(`/api/inventory/core-boxes/${cb.id}/logs/`);
            setCoreBoxLogs(res.data.results || res.data || []);
            setLogsCoreBox(cb);
        } catch (err: any) {
            showToast('Failed to fetch logs', 'error');
        } finally {
            setLogsLoading(false);
        }
    };

    const handlePhotoUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        try {
            const base64Promises = files.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
            });
            const base64Images = await Promise.all(base64Promises);
            setEntryPhotos(prev => [...prev, ...base64Images]);
        } catch (err) {
            showToast('Failed to process image uploads', 'error');
        }
    };

    const handleRemoveEntryPhoto = (indexToRemove: number) => {
        setEntryPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCoreBoxForEntry) return;
        if (!entryDescription) {
            showToast('Description is required', 'error');
            return;
        }

        setEntryLoading(true);
        try {
            await api.post(`/api/inventory/core-boxes/${selectedCoreBoxForEntry.id}/create_entry/`, {
                type_of_entry: entryType,
                description: entryDescription,
                photos: entryPhotos
            });
            showToast('Log entry created successfully', 'success');
            setSelectedCoreBoxForEntry(null);
            setEntryDescription('');
            setEntryPhotos([]);
            setEntryType('INSPECTION');
            fetchCoreBoxes(page);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors || err.response?.data?.[0] || 'Validation failed';
            showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        } finally {
            setEntryLoading(false);
        }
    };

    const startEditingLog = (log: CoreBoxLog) => {
        setEditingLogId(log.id);
        setEditLogDate(log.date ? log.date.substring(0, 16) : '');
        setEditLogDescription(log.description || '');
    };

    const handleEditLogSubmit = async (e: React.FormEvent, logId: number) => {
        e.preventDefault();
        if (!editLogDescription) {
            showToast('Description is required', 'error');
            return;
        }
        setEditLogLoading(true);
        try {
            await api.patch(`/api/inventory/core-box-logs/${logId}/`, {
                date: editLogDate ? new Date(editLogDate).toISOString() : undefined,
                description: editLogDescription
            });
            showToast('Log entry updated successfully', 'success');
            setEditingLogId(null);
            if (logsCoreBox) {
                fetchLogsForCoreBox(logsCoreBox);
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
            case 'INSPECTION': return 'Inspection';
            case 'OUT_FOR_PRODUCTION': return 'Out for Production';
            case 'RETURN_FROM_PRODUCTION': return 'Return from Production';
            default: return type;
        }
    };

    const getEntryTypeColor = (type: string) => {
        switch(type) {
            case 'INWARD': return '#22c55e'; // Green
            case 'OUTWARD': return '#ef4444'; // Red
            case 'INSPECTION': return '#3b82f6'; // Blue
            case 'OUT_FOR_PRODUCTION': return '#eab308'; // Yellow
            case 'RETURN_FROM_PRODUCTION': return '#a855f7'; // Purple
            default: return 'white';
        }
    };

    return (
        <div className="tab-container" style={{ position: 'relative' }}>
            <div className="tab-header">
                <h2>Core Box Flow & Tracking</h2>
            </div>

            {/* Search Bar Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                <div className="search-bar" style={{ width: '100%', maxWidth: '400px', display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                        <input 
                            type="text" 
                            placeholder="Search by ID, Name, Customer..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.9rem' }}
                        />
                    </div>
                    <button type="button" onClick={handleSearch} className="btn-primary" style={{ padding: '0 16px', display: 'inline-flex', alignItems: 'center', height: '40px', justifyContent: 'center' }}>Search</button>
                    <button type="button" onClick={handleClearSearch} className="btn-secondary" style={{ padding: '0 16px', display: 'inline-flex', alignItems: 'center', height: '40px', justifyContent: 'center' }}>Clear</button>
                </div>
            </div>

            {/* WEB TABLE VIEW */}
            <div className="desktop-only-view">
                <div className="data-table-wrapper" style={{ position: 'relative' }}>
                    
                    {/* Scroll Chevrons */}
                    <button 
                        type="button" 
                        onClick={() => scrollTable('left')}
                        style={{
                            position: 'absolute', left: '-26px', top: '12px', zIndex: 10,
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ff6b35, #ff9f43)',
                            border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4)', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        className="scroll-chevron-btn"
                    >
                        <ChevronLeft size={20} strokeWidth={3} />
                    </button>

                    <button 
                        type="button" 
                        onClick={() => scrollTable('right')}
                        style={{
                            position: 'absolute', right: '-26px', top: '12px', zIndex: 10,
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ff6b35, #ff9f43)',
                            border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4)', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        className="scroll-chevron-btn"
                    >
                        <ChevronRight size={20} strokeWidth={3} />
                    </button>

                    <div className="data-table-container" ref={tableContainerRef} style={{ overflowX: 'auto' }}>
                        <table className="glass-table" style={{ width: '100%', minWidth: '1140px', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '260px' }}>Customer Name/Code</th>
                                    <th style={{ width: '120px' }}>Core Box ID</th>
                                    <th style={{ width: '180px' }}>Core Box Name</th>
                                    <th style={{ width: '110px' }}>Type</th>
                                    <th style={{ width: '130px' }}>Pattern Code</th>
                                    <th style={{ width: '180px' }}>Last Inspection Date</th>
                                    <th style={{ width: '120px' }}>Photo</th>
                                    <th style={{ width: '140px' }}>Current Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading core boxes...</td>
                                    </tr>
                                ) : coreBoxes.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No core boxes found.</td>
                                    </tr>
                                ) : (
                                    coreBoxes.map(cb => (
                                        <React.Fragment key={cb.id}>
                                            <tr 
                                                onClick={() => setExpandedCoreBoxId(expandedCoreBoxId === cb.id ? null : cb.id)}
                                                style={{ cursor: 'pointer', background: expandedCoreBoxId === cb.id ? 'rgba(255, 107, 53, 0.08)' : 'transparent' }}
                                            >
                                                <td style={{ fontWeight: 500 }} className="wrap-text">
                                                    {`${cb.customer_code || ''} - ${cb.customer_name || ''}`}
                                                </td>
                                                <td style={{ color: 'var(--color-molten-yellow)', fontWeight: 'bold' }} className="wrap-text">
                                                    {cb.core_box_id}
                                                </td>
                                                <td className="wrap-text">
                                                    {cb.name}
                                                </td>
                                                <td>
                                                    {cb.core_box_type}
                                                </td>
                                                <td style={{ color: '#aaa', fontWeight: 500 }} className="wrap-text">
                                                    {cb.pattern_id || '-'}
                                                </td>
                                                <td>
                                                    {formatDateTime(cb.last_inspection_date)}
                                                </td>
                                                <td>
                                                    {cb.photos && cb.photos.length > 0 ? (
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedCoreBoxForPhoto(cb); }} 
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
                                                            background: cb.current_status === 'IN_PRODUCTION' ? '#eab308' : '#22c55e',
                                                            boxShadow: cb.current_status === 'IN_PRODUCTION' ? '0 0 6px #eab308' : '0 0 6px #22c55e'
                                                        }}></span>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: cb.current_status === 'IN_PRODUCTION' ? '#eab308' : '#22c55e' }}>
                                                            {cb.current_status === 'IN_PRODUCTION' ? 'In Production' : 'In Stock'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedCoreBoxId === cb.id && (
                                                <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                                    <td colSpan={8} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 107, 53, 0.15)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                                                Actions for Core Box <strong style={{ color: 'var(--color-molten-yellow)' }}>{cb.core_box_id}</strong>:
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleOutForProduction(cb)} 
                                                                    disabled={cb.current_status === 'IN_PRODUCTION' || !cb.last_inspection_date}
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
                                                                        cursor: (cb.current_status === 'IN_PRODUCTION' || !cb.last_inspection_date) ? 'not-allowed' : 'pointer',
                                                                        opacity: (cb.current_status === 'IN_PRODUCTION' || !cb.last_inspection_date) ? 0.4 : 1,
                                                                        boxShadow: (cb.current_status === 'IN_PRODUCTION' || !cb.last_inspection_date) ? 'none' : '0 2px 8px rgba(255, 107, 53, 0.3)',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Out Production
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleReturnFromProduction(cb)} 
                                                                    disabled={cb.current_status === 'IN_STOCK'}
                                                                    className="btn-secondary"
                                                                    style={{
                                                                        border: '1px solid #ef4444',
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
                                                                        background: 'transparent',
                                                                        flexShrink: 0,
                                                                        margin: 0,
                                                                        cursor: cb.current_status === 'IN_STOCK' ? 'not-allowed' : 'pointer',
                                                                        opacity: cb.current_status === 'IN_STOCK' ? 0.4 : 1,
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Return Stock
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setSelectedCoreBoxForEntry(cb)} 
                                                                    disabled={cb.current_status === 'IN_PRODUCTION'}
                                                                    className="btn-secondary"
                                                                    style={{
                                                                        border: '1px solid #22d3ee',
                                                                        color: '#22d3ee',
                                                                        padding: '0 12px',
                                                                        height: '28px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 600,
                                                                        borderRadius: '4px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        whiteSpace: 'nowrap',
                                                                        background: 'transparent',
                                                                        flexShrink: 0,
                                                                        margin: 0,
                                                                        cursor: cb.current_status === 'IN_PRODUCTION' ? 'not-allowed' : 'pointer',
                                                                        opacity: cb.current_status === 'IN_PRODUCTION' ? 0.4 : 1,
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Entry
                                                                </button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => fetchLogsForCoreBox(cb)} 
                                                                    className="btn-secondary"
                                                                    style={{
                                                                        border: '1px solid #a855f7',
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
                                                                        background: 'transparent',
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
                                                                        onClick={() => setSelectedCoreBoxAudit(cb)} 
                                                                        className="btn-secondary"
                                                                        style={{
                                                                            border: '1px solid #3b82f6',
                                                                            color: '#3b82f6',
                                                                            padding: '0 12px',
                                                                            height: '28px',
                                                                            fontSize: '0.8rem',
                                                                            fontWeight: 600,
                                                                            borderRadius: '4px',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            whiteSpace: 'nowrap',
                                                                            background: 'transparent',
                                                                            flexShrink: 0,
                                                                            margin: 0,
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                    >
                                                                        <History size={14} style={{ marginRight: '4px' }} /> Audit Log
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
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="mobile-only-view mobile-card-list">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>Loading core boxes...</div>
                ) : coreBoxes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>No core boxes found.</div>
                ) : (
                    coreBoxes.map(cb => (
                        <div key={cb.id} className="mobile-card" style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--color-molten-yellow)', wordBreak: 'break-all' }}>{cb.core_box_id}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ 
                                        display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                                        background: cb.current_status === 'IN_PRODUCTION' ? '#eab308' : '#22c55e',
                                        boxShadow: cb.current_status === 'IN_PRODUCTION' ? '0 0 6px #eab308' : '0 0 6px #22c55e'
                                    }}></span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: cb.current_status === 'IN_PRODUCTION' ? '#eab308' : '#22c55e' }}>
                                        {cb.current_status === 'IN_PRODUCTION' ? 'Production' : 'Stock'}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                                <div>
                                    <span style={{ color: '#aaa' }}>Core Box Name: </span>
                                    <span style={{ fontWeight: 500, color: '#fff', wordBreak: 'break-all' }}>{cb.name}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#aaa' }}>Customer: </span>
                                    <span style={{ fontWeight: 500, color: '#fff', wordBreak: 'break-all' }}>
                                        {`${cb.customer_code || ''} - ${cb.customer_name || ''}`}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#aaa' }}>Type: </span>
                                    <span style={{ fontWeight: 500, color: '#fff' }}>{cb.core_box_type}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#aaa' }}>Pattern: </span>
                                    <span style={{ fontWeight: 500, color: '#fff', wordBreak: 'break-all' }}>{cb.pattern_id || '-'}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#aaa' }}>Last Inspection: </span>
                                    <span style={{ fontWeight: 500, color: '#fff' }}>{formatDateTime(cb.last_inspection_date)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                                {cb.photos && cb.photos.length > 0 ? (
                                    <button type="button" onClick={() => setSelectedCoreBoxForPhoto(cb)} className="action-icon-btn edit-btn" style={{ padding: '4px 10px', height: '28px', fontSize: '0.8rem', width: 'auto', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                                        <ImageIcon size={14} /> View Photos
                                    </button>
                                ) : (
                                    <span style={{ color: '#666', fontSize: '0.8rem' }}>No master photos</span>
                                )}
                            </div>

                            {/* Mobile Footer Actions */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <button 
                                    type="button" 
                                    onClick={() => handleOutForProduction(cb)} 
                                    disabled={cb.current_status === 'IN_PRODUCTION' || !cb.last_inspection_date}
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
                                        cursor: (cb.current_status === 'IN_PRODUCTION' || !cb.last_inspection_date) ? 'not-allowed' : 'pointer',
                                        opacity: (cb.current_status === 'IN_PRODUCTION' || !cb.last_inspection_date) ? 0.4 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Out Prod
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => handleReturnFromProduction(cb)} 
                                    disabled={cb.current_status === 'IN_STOCK'}
                                    style={{
                                        border: '1px solid #ef4444',
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
                                        background: 'transparent',
                                        flex: 1,
                                        margin: 0,
                                        cursor: cb.current_status === 'IN_STOCK' ? 'not-allowed' : 'pointer',
                                        opacity: cb.current_status === 'IN_STOCK' ? 0.4 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Return
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedCoreBoxForEntry(cb)} 
                                    disabled={cb.current_status === 'IN_PRODUCTION'}
                                    style={{
                                        border: '1px solid #22d3ee',
                                        color: '#22d3ee',
                                        padding: '0 8px',
                                        height: '30px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'nowrap',
                                        background: 'transparent',
                                        flex: 1,
                                        margin: 0,
                                        cursor: cb.current_status === 'IN_PRODUCTION' ? 'not-allowed' : 'pointer',
                                        opacity: cb.current_status === 'IN_PRODUCTION' ? 0.4 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Entry
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => fetchLogsForCoreBox(cb)} 
                                    style={{
                                        border: '1px solid #a855f7',
                                        color: '#a855f7',
                                        padding: '0 8px',
                                        height: '30px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        whiteSpace: 'nowrap',
                                        background: 'transparent',
                                        flex: 1,
                                        margin: 0,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Logs
                                </button>
                                {isSuperuser && (
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedCoreBoxAudit(cb)} 
                                        style={{
                                            border: '1px solid #3b82f6',
                                            color: '#3b82f6',
                                            padding: '0 8px',
                                            height: '30px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            borderRadius: '4px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            whiteSpace: 'nowrap',
                                            background: 'transparent',
                                            flex: 1.2,
                                            margin: 0,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <History size={13} style={{ marginRight: '3px' }} /> Audit
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 10px' }}>
                <button 
                    type="button" 
                    onClick={() => setPage(p => Math.max(p - 1, 1))} 
                    disabled={page === 1}
                    className="btn-secondary"
                    style={{ minWidth: '80px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    Previous
                </button>
                <span style={{ fontSize: '0.9rem', color: '#ccc' }}>Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong></span>
                <button 
                    type="button" 
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
                    disabled={page === totalPages}
                    className="btn-secondary"
                    style={{ minWidth: '80px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    Next
                </button>
            </div>

            {/* MODAL 1: VIEW ATTACHMENTS */}
            {selectedCoreBoxForPhoto && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '1.5rem', border: '1px solid rgba(255,107,53,0.3)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-molten-yellow)' }}>Photos for {selectedCoreBoxForPhoto.core_box_id}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto', padding: '5px' }}>
                            {selectedCoreBoxForPhoto.photos?.map((ph, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', padding: '6px' }}>
                                    <img src={ph} alt={`master-${idx}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', display: 'block', marginBottom: '6px' }} />
                                    <a 
                                        href={ph} 
                                        download={`corebox_${selectedCoreBoxForPhoto.core_box_id}_${idx + 1}.jpg`} 
                                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 'auto' }}
                                    >
                                        <Download size={12} /> Download
                                    </a>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button 
                                type="button" 
                                onClick={() => setSelectedCoreBoxForPhoto(null)} 
                                className="btn-secondary"
                                style={{ padding: '0 1.5rem', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: ADD LOG ENTRY */}
            {selectedCoreBoxForEntry && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '1.5rem', border: '1px solid rgba(255,107,53,0.3)' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--color-molten-yellow)' }}>Add Entry ({selectedCoreBoxForEntry.core_box_id})</h3>
                        
                        <form onSubmit={handleEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Entry Type Radio Buttons */}
                            <div className="input-group">
                                <label style={{ color: '#ccc', fontWeight: 600, fontSize: '0.85rem' }}>Entry Type <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px' }}>
                                    {[
                                        { value: 'INSPECTION', label: 'Inspection' },
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

                            {/* Description */}
                            <div className="input-group">
                                <label style={{ color: '#ccc', fontWeight: 600, fontSize: '0.85rem' }}>Description <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                                <textarea 
                                    rows={3} 
                                    placeholder="Enter description/remarks here..."
                                    value={entryDescription}
                                    onChange={(e) => setEntryDescription(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.9rem', marginTop: '6px', resize: 'vertical' }}
                                    required
                                />
                            </div>

                            {/* Multiple Photos Upload */}
                            <div className="input-group">
                                <label style={{ color: '#ccc', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Upload size={16} /> Attach Photos (Multiple)
                                </label>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    onChange={handlePhotoUploadChange}
                                    style={{ display: 'none' }}
                                    id="photo-uploader"
                                />
                                <label 
                                    htmlFor="photo-uploader" 
                                    style={{
                                        display: 'block', padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.05)',
                                        border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer',
                                        marginTop: '6px', fontSize: '0.9rem', color: '#ccc', transition: 'all 0.2s'
                                    }}
                                >
                                    Click to browse and upload multiple images
                                </label>
                                
                                {/* Photo Previews Grid */}
                                {entryPhotos.length > 0 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px', marginTop: '10px' }}>
                                        {entryPhotos.map((img, index) => (
                                            <div key={index} style={{ position: 'relative', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <img src={img} alt={`preview-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveEntryPhoto(index)}
                                                    style={{
                                                        position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%',
                                                        background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: 'white', fontSize: '10px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                    }}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
                                <button 
                                    type="button" 
                                    onClick={() => { setSelectedCoreBoxForEntry(null); setEntryPhotos([]); setEntryDescription(''); }} 
                                    className="btn-secondary"
                                    disabled={entryLoading}
                                    style={{ margin: 0, flex: 1, height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.25rem' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary" 
                                    disabled={entryLoading}
                                    style={{ margin: 0, flex: 1, height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.25rem' }}
                                >
                                    {entryLoading ? 'Saving...' : 'Save Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: LOG HISTORY */}
            {logsCoreBox && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900
                }}>
                    <div className="glass-panel" style={{ width: '95%', maxWidth: '750px', padding: '1.5rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,107,53,0.3)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-molten-yellow)', flexShrink: 0 }}>Log History for {logsCoreBox.core_box_id}</h3>
                        
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                            {logsLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>Loading history...</div>
                            ) : coreBoxLogs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>No log entries found.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {coreBoxLogs.map(log => (
                                        <div key={log.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${getEntryTypeColor(log.type_of_entry)}`, borderRadius: '0 6px 6px 0', position: 'relative' }}>
                                            


                                            {editingLogId === log.id ? (
                                                <form onSubmit={(e) => handleEditLogSubmit(e, log.id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Date & Time</label>
                                                            <input 
                                                                type="datetime-local" 
                                                                value={editLogDate} 
                                                                onChange={(e) => setEditLogDate(e.target.value)}
                                                                style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Description</label>
                                                        <textarea 
                                                            rows={2} 
                                                            value={editLogDescription} 
                                                            onChange={(e) => setEditLogDescription(e.target.value)}
                                                            style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                                            required
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                        <button type="button" onClick={() => setEditingLogId(null)} className="btn-secondary" style={{ margin: 0, width: 'auto', padding: '4px 10px', height: '26px', fontSize: '0.75rem' }} disabled={editLogLoading}>Cancel</button>
                                                        <button type="submit" className="btn-primary" style={{ margin: 0, width: 'auto', padding: '4px 10px', height: '26px', fontSize: '0.75rem' }} disabled={editLogLoading}>
                                                            {editLogLoading ? 'Saving...' : 'Save'}
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ 
                                                                fontSize: '0.85rem', fontWeight: 'bold', color: getEntryTypeColor(log.type_of_entry),
                                                                background: `rgba(${log.type_of_entry === 'INWARD' ? '34,197,94' : log.type_of_entry === 'OUTWARD' ? '239,68,68' : log.type_of_entry === 'INSPECTION' ? '59,130,246' : '234,179,8'}, 0.1)`,
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
                                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#eee', whiteSpace: 'pre-wrap' }}>{log.description}</p>
                                                    
                                                    {log.photos && log.photos.length > 0 && (
                                                        <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#ccc' }}>
                                                            <strong>Log Photos ({log.photos.length}):</strong>{' '}
                                                            {log.photos.map((ph, idx) => (
                                                                <button 
                                                                    key={idx} 
                                                                    type="button" 
                                                                    onClick={() => setSelectedLogPhoto(ph)} 
                                                                    style={{ background: 'none', border: 'none', color: 'var(--color-accent)', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginRight: '10px' }}
                                                                >
                                                                    <ImageIcon size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} /> View Photo {idx + 1}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', flexShrink: 0 }}>
                            <button 
                                type="button" 
                                onClick={() => setLogsCoreBox(null)} 
                                className="btn-secondary"
                                style={{ padding: '0 1.5rem', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NESTED MODAL: VIEW FULL LOG PHOTO */}
            {selectedLogPhoto && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 950
                }}>
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <img src={selectedLogPhoto} alt="log-full" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', marginTop: '5px' }}>
                            <a 
                                href={selectedLogPhoto} 
                                download="log_photo.jpg" 
                                className="btn-primary" 
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '32px', padding: '0 16px', fontSize: '0.85rem', width: 'auto', margin: 0 }}
                            >
                                <Download size={14} style={{ marginRight: '4px' }} /> Download
                            </a>
                            <button 
                                type="button" 
                                onClick={() => setSelectedLogPhoto(null)} 
                                className="btn-secondary"
                                style={{ padding: '0 16px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', margin: 0 }}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: AUDIT LOG */}
            {selectedCoreBoxAudit && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '480px', padding: '1.5rem', border: '1px solid rgba(255,107,53,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--color-molten-yellow)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <History size={18} /> Record Audit Log
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#aaa', display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Created By</span>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{selectedCoreBoxAudit.created_by || 'System'}</span>
                            </div>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#aaa', display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Created At</span>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{formatDateTime(selectedCoreBoxAudit.created_at || null)}</span>
                            </div>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#aaa', display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Last Updated By</span>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{selectedCoreBoxAudit.updated_by || 'System'}</span>
                            </div>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#aaa', display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Last Updated At</span>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{formatDateTime(selectedCoreBoxAudit.updated_at || null)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button 
                                type="button" 
                                onClick={() => setSelectedCoreBoxAudit(null)} 
                                className="btn-secondary"
                                style={{ padding: '0 1.5rem', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                Close
                            </button>
                        </div>
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
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{formatDateTime(selectedLogForAudit.created_at || null)}</div>
                            </div>
                            
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Last Edited By</div>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedLogForAudit.updated_by || 'System'}</div>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{formatDateTime(selectedLogForAudit.updated_at || null)}</div>
                            </div>
                        </div>

                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={() => setSelectedLogForAudit(null)}
                            style={{ marginTop: '1.5rem', width: '100%', height: '38px', minHeight: 'auto', margin: '1.5rem 0 0 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoreBoxFlowTab;
