import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import '../master/MasterStyles.css';

interface ProductStockLog {
    id: number;
    customer_name: string;
    customer_code: string;
    product_name: string;
    product_code: string;
    batch_no: string;
    quantity: number;
    corrected_quantity: number;
    reason: string;
    created_at: string;
    created_by: string;
}

const ProductStockLogTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [logs, setLogs] = useState<ProductStockLog[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('product_stock_log_search_query') || '';
    });
    const [loading, setLoading] = useState(false);

    const fetchLogs = async (pageNum = 1, searchVal = searchQuery) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/inventory/product-stock-correction-log/`, {
                params: {
                    page: pageNum,
                    search: searchVal
                }
            });
            setLogs(res.data.results || []);
            setTotalPages(Math.ceil((res.data.count || 0) / 10));
        } catch (err: any) {
            console.error(err);
            showToast('Failed to fetch product stock correction logs.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const handleSearch = () => {
        setPage(1);
        sessionStorage.setItem('product_stock_log_search_query', searchQuery);
        fetchStocks(1, searchQuery);
    };

    const fetchStocks = (pageNum: number, query: string) => {
        fetchLogs(pageNum, query);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setPage(1);
        sessionStorage.removeItem('product_stock_log_search_query');
        fetchLogs(1, '');
    };

    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    const formatDateTime = (dtStr: string) => {
        try {
            const date = new Date(dtStr);
            return date.toLocaleString();
        } catch {
            return dtStr;
        }
    };

    return (
        <div className="tab-container" style={{ position: 'relative' }}>
            <div className="tab-header">
                <h2>Product Stock Correction Log</h2>
            </div>

            {/* Search Bar */}
            <div className="search-bar-container" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="search-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input 
                        type="text" 
                        placeholder="Search by Customer, Product, Batch No, Reason..." 
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

                <div className="data-table-container" ref={tableContainerRef}>
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Product / Batch</th>
                                <th>Customer Name / Code</th>
                                <th>Original Qty</th>
                                <th>Corrected Qty</th>
                                <th>Reason</th>
                                <th>Corrected By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading correction logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No correction logs found.</td></tr>
                            ) : logs.map(l => (
                                <tr key={l.id}>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={14} style={{ color: '#aaa' }} />
                                            <span>{formatDateTime(l.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="wrap-text">
                                        <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>{l.product_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-molten-yellow)', fontFamily: 'monospace', wordBreak: 'break-all' }}>Batch: {l.batch_no}</div>
                                    </td>
                                    <td className="wrap-text">
                                        <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>{l.customer_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: 'monospace', wordBreak: 'break-all' }}>{l.customer_code}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace' }} className="wrap-text">{l.quantity.toFixed(0)} Nos</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-glow-green)' }} className="wrap-text">{l.corrected_quantity.toFixed(0)} Nos</td>
                                    <td className="wrap-text" style={{ maxWidth: '200px', whiteSpace: 'normal', fontSize: '0.9rem', wordBreak: 'break-all' }}>{l.reason}</td>
                                    <td className="wrap-text">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={14} style={{ color: '#aaa', flexShrink: 0 }} />
                                            <span style={{ wordBreak: 'break-all' }}>{l.created_by}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="pagination-controls">
                    <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="page-btn">
                        &larr; Previous
                    </button>
                    <span className="page-info">Page {page} of {totalPages || 1}</span>
                    <button disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="page-btn">
                        Next &rarr;
                    </button>
                </div>
            </div>

            {/* Mobile View */}
            <div className="data-table-wrapper mobile-only-view">
                <div className="mobile-card-list" style={{ padding: '1rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading correction logs...</div>
                    ) : logs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No correction logs found.</div>
                    ) : logs.map(l => (
                        <div className="mobile-card" key={l.id} style={{ borderLeft: '3px solid var(--color-molten-yellow)' }}>
                            <div className="mobile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ wordBreak: 'break-all' }}>{l.product_name}</h3>
                                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{formatDateTime(l.created_at)}</span>
                            </div>
                            <div className="mobile-card-body">
                                <p style={{ wordBreak: 'break-all' }}><strong>Customer:</strong> <span style={{ wordBreak: 'break-all' }}>{l.customer_name} ({l.customer_code})</span></p>
                                <p><strong>Batch:</strong> <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{l.batch_no}</span></p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', margin: '8px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Original Qty</div>
                                        <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{l.quantity.toFixed(0)} Nos</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Corrected Qty</div>
                                        <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-glow-green)' }}>{l.corrected_quantity.toFixed(0)} Nos</div>
                                    </div>
                                </div>
                                <p><strong>Reason:</strong> <span style={{ color: '#ddd', wordBreak: 'break-all' }}>{l.reason}</span></p>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#aaa', marginTop: '6px' }}>
                                    <User size={14} style={{ flexShrink: 0 }} /> Corrected by: <strong style={{ wordBreak: 'break-all' }}>{l.created_by}</strong>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pagination-controls">
                    <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="page-btn">
                        &larr; Previous
                    </button>
                    <span className="page-info">Page {page} of {totalPages || 1}</span>
                    <button disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="page-btn">
                        Next &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductStockLogTab;
