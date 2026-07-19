import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, Search, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import '../master/MasterStyles.css';

interface MaterialStock {
    id: number;
    raw_material: number;
    raw_material_name: string;
    raw_material_code: string;
    material_unit: string;
    material_category: string;
    batch_no: string;
    expiry_date: string | null;
    quantity: number;
}

interface GroupedMaterialStock {
    raw_material_id: number;
    raw_material_name: string;
    raw_material_code: string;
    material_category: string;
    material_unit: string;
    total_quantity: number;
    batches: MaterialStock[];
}

const MaterialStockTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('material_stock_search_query') || '';
    });
    const [loading, setLoading] = useState(false);

    // Grouped data state computed from rawStocks
    const [groupedStocks, setGroupedStocks] = useState<GroupedMaterialStock[]>([]);

    // Detail Popup Modal State
    const [selectedGroup, setSelectedGroup] = useState<GroupedMaterialStock | null>(null);

    // Correction Modal States
    const [selectedStock, setSelectedStock] = useState<MaterialStock | null>(null);
    const [correctedQty, setCorrectedQty] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchStocks = async (pageNum = 1, searchVal = searchQuery) => {
        setLoading(true);
        try {
            // Request page_size=100 to ensure we load all records for grouped client-side aggregation
            const res = await api.get(`/api/inventory/material-stock/`, {
                params: {
                    page: pageNum,
                    page_size: 100,
                    search: searchVal
                }
            });
            const results: MaterialStock[] = res.data.results || [];

            // Group by raw material ID
            const groups: { [key: number]: GroupedMaterialStock } = {};
            results.forEach(item => {
                const matId = item.raw_material;
                if (!groups[matId]) {
                    groups[matId] = {
                        raw_material_id: matId,
                        raw_material_name: item.raw_material_name,
                        raw_material_code: item.raw_material_code,
                        material_category: item.material_category,
                        material_unit: item.material_unit,
                        total_quantity: 0,
                        batches: []
                    };
                }
                groups[matId].total_quantity += item.quantity;
                groups[matId].batches.push(item);
            });

            const groupedArray = Object.values(groups);
            setGroupedStocks(groupedArray);
            setTotalPages(Math.ceil((groupedArray.length || 0) / 10));
        } catch (err: any) {
            console.error(err);
            showToast('Failed to fetch raw material stock records.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStocks(page);
    }, [page]);

    // Keep active selected group popup in sync when stock updates
    useEffect(() => {
        if (selectedGroup) {
            const updatedGroup = groupedStocks.find(g => g.raw_material_id === selectedGroup.raw_material_id);
            if (updatedGroup) {
                setSelectedGroup(updatedGroup);
            } else {
                setSelectedGroup(null);
            }
        }
    }, [groupedStocks]);

    const handleSearch = () => {
        setPage(1);
        sessionStorage.setItem('material_stock_search_query', searchQuery);
        fetchStocks(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setPage(1);
        sessionStorage.removeItem('material_stock_search_query');
        fetchStocks(1, '');
    };

    const handleCorrectStockClick = (stock: MaterialStock, e: React.MouseEvent) => {
        e.stopPropagation(); // Avoid triggering row clicks
        setSelectedStock(stock);
        setCorrectedQty(stock.quantity.toString());
        setReason('');
        setShowConfirm(false);
    };

    const handleOpenConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!correctedQty || isNaN(Number(correctedQty)) || Number(correctedQty) < 0) {
            showToast('Please enter a valid non-negative corrected quantity.', 'error');
            return;
        }
        if (!reason.trim()) {
            showToast('Reason is required for stock corrections.', 'error');
            return;
        }
        setShowConfirm(true);
    };

    const handleSaveCorrection = async () => {
        if (!selectedStock) return;
        setSaving(true);
        try {
            await api.post(`/api/inventory/material-stock/${selectedStock.id}/correct_stock/`, {
                corrected_quantity: Number(correctedQty),
                reason: reason
            });
            showToast('Stock corrected successfully!', 'success');
            setSelectedStock(null);
            setShowConfirm(false);
            fetchStocks(page);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.detail || 'Failed to correct stock.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    // Paginate grouped stock array locally
    const paginatedGrouped = groupedStocks.slice((page - 1) * 10, page * 10);

    return (
        <div className="tab-container" style={{ position: 'relative' }}>
            <div className="tab-header">
                <h2>Raw Material Stock (Grouped)</h2>
            </div>

            {/* Search Bar */}
            <div className="search-bar-container" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="search-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input 
                        type="text" 
                        placeholder="Search by Raw Material or Batch No..." 
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
                                <th>Raw Material Name / Code</th>
                                <th>Material Type</th>
                                <th>Total Quantity</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading stock records...</td></tr>
                            ) : paginatedGrouped.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No stock records found.</td></tr>
                            ) : paginatedGrouped.map(st => (
                                <tr key={st.raw_material_id} onClick={() => setSelectedGroup(st)} style={{ cursor: 'pointer' }} className="hover-row">
                                    <td className="wrap-text">
                                        <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>{st.raw_material_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: 'monospace', wordBreak: 'break-all' }}>{st.raw_material_code}</div>
                                    </td>
                                    <td style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>{st.material_category === 'RAW_MATERIAL' ? 'Raw Material' : 'Production'}</td>
                                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>
                                        {st.total_quantity.toFixed(2)} <span style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'normal' }}>{st.material_unit}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button className="action-icon-btn view-btn" style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--color-molten-yellow)', border: '1px solid rgba(255,107,53,0.3)' }} title="View Batches">
                                            <Eye size={16} />
                                        </button>
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
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading stock records...</div>
                    ) : paginatedGrouped.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No stock records found.</div>
                    ) : paginatedGrouped.map(st => (
                        <div className="mobile-card hover-row" key={st.raw_material_id} onClick={() => setSelectedGroup(st)} style={{ cursor: 'pointer' }}>
                            <div className="mobile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ wordBreak: 'break-all' }}>{st.raw_material_name}</h3>
                                <span style={{ fontSize: '0.85rem', color: '#aaa', wordBreak: 'break-all' }}>{st.raw_material_code}</span>
                            </div>
                            <div className="mobile-card-body">
                                <p><strong>Type:</strong> <span style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>{st.material_category === 'RAW_MATERIAL' ? 'Raw Material' : 'Production'}</span></p>
                                <p><strong>Total Qty:</strong> <strong className="amount-highlight">{st.total_quantity.toFixed(2)} {st.material_unit}</strong></p>
                            </div>
                            <div className="mobile-card-actions" style={{ justifyContent: 'flex-end' }}>
                                <span style={{ color: 'var(--color-molten-yellow)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Eye size={16} /> View Batches
                                </span>
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

            {/* Popup Modal: Group Batches & Expiries Details */}
            {selectedGroup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="glass-panel" style={{
                        width: '90%', maxWidth: '650px', padding: '1.5rem',
                        position: 'relative', border: '1px solid rgba(255,107,53,0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxHeight: '85vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--color-molten-yellow)', fontSize: '1.3rem', wordBreak: 'break-all' }}>
                                    {selectedGroup.raw_material_name}
                                </h3>
                                <div style={{ fontSize: '0.85rem', color: '#aaa', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>
                                    Code: {selectedGroup.raw_material_code} | Type: {selectedGroup.material_category === 'RAW_MATERIAL' ? 'Raw Material' : 'Production'}
                                </div>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', outline: 'none' }}>
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                            <table className="glass-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr>
                                        <th>Batch No</th>
                                        <th>Expiry Date</th>
                                        <th>Quantity</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Correct</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedGroup.batches.map(b => (
                                        <tr key={b.id}>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }} className="wrap-text">{b.batch_no || '-'}</td>
                                            <td>{b.expiry_date || '-'}</td>
                                            <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                {b.quantity.toFixed(2)} <span style={{ fontWeight: 'normal', color: '#ccc', fontSize: '0.8rem' }}>{selectedGroup.material_unit}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button className="action-icon-btn edit-btn" onClick={(e) => handleCorrectStockClick(b, e)} title="Correct Batch Quantity" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                                                    <Edit2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Flow: Stock Correction Popup */}
            {selectedStock && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="glass-panel" style={{
                        width: '90%', maxWidth: '450px', padding: '1.5rem',
                        position: 'relative', border: '1px solid rgba(255,107,53,0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-molten-yellow)', fontSize: '1.2rem' }}>
                                Stock Correction Form
                            </h3>
                            <button onClick={() => setSelectedStock(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleOpenConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                    <div style={{ marginBottom: '4px' }}><strong>Material:</strong> {selectedStock.raw_material_name} ({selectedStock.raw_material_code})</div>
                                    <div style={{ marginBottom: '4px' }}><strong>Type:</strong> {selectedStock.material_category === 'RAW_MATERIAL' ? 'Raw Material' : 'Production'}</div>
                                    <div style={{ marginBottom: '4px' }}><strong>Batch No:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{selectedStock.batch_no || '-'}</span></div>
                                <div style={{ marginBottom: '4px' }}><strong>Expiry:</strong> {selectedStock.expiry_date || '-'}</div>
                                <div><strong>Current Quantity:</strong> <span style={{ fontWeight: '700' }}>{selectedStock.quantity.toFixed(2)} {selectedStock.material_unit}</span></div>
                            </div>

                            <div className="input-group">
                                <label>Corrected Quantity *</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    required 
                                    className="glass-input" 
                                    value={correctedQty} 
                                    onChange={e => setCorrectedQty(e.target.value)} 
                                    placeholder="Enter corrected quantity..." 
                                />
                            </div>

                            <div className="input-group">
                                <label>Reason *</label>
                                <textarea 
                                    required 
                                    className="glass-input" 
                                    rows={3}
                                    style={{ padding: '8px', minHeight: '60px' }}
                                    value={reason} 
                                    onChange={e => setReason(e.target.value)} 
                                    placeholder="Enter correction reason (e.g. wastage, spill, count audit)..." 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setSelectedStock(null)} style={{ margin: 0, flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ margin: 0, flex: 1, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                                    Confirm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Secondary Confirmation Popup (Nested) */}
            {showConfirm && selectedStock && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2100, animation: 'fadeIn 0.15s ease-out'
                }}>
                    <div className="glass-panel" style={{
                        width: '90%', maxWidth: '380px', padding: '1.5rem',
                        textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.4)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#ef4444', fontSize: '1.25rem' }}>
                            Are you absolutely sure?
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#ddd', lineHeight: '1.4', margin: '0 0 1.5rem 0', wordBreak: 'break-all' }}>
                            You are correcting the stock of <strong>{selectedStock.raw_material_name}</strong> (Batch: {selectedStock.batch_no || '-'}) from <strong>{selectedStock.quantity.toFixed(2)}</strong> to <strong>{Number(correctedQty).toFixed(2)}</strong>. This action will be permanently logged.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setShowConfirm(false)} style={{ margin: 0, flex: 1 }}>
                                Cancel
                            </button>
                            <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveCorrection} style={{ margin: 0, flex: 1, background: '#ef4444', border: 'none' }}>
                                {saving ? 'Saving...' : 'Yes, Correct'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaterialStockTab;
