import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, Plus, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './MasterStyles.css';

interface Supplier {
    id: number;
    supplier_id: string;
    name: string;
    code: string;
    gst_number?: string;
    address_line1?: string;
    address_line2?: string;
    area?: string;
    pincode?: string;
    pan?: string;
    is_active: boolean;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}

const SupplierTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [auditLogData, setAuditLogData] = useState<{ created_by?: string; created_at?: string; updated_by?: string; updated_at?: string } | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('supplier_search_query') || '';
    });
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        supplier_id: '',
        name: '',
        code: '',
        gst_number: '',
        address_line1: '',
        address_line2: '',
        area: '',
        pincode: '',
        pan: '',
        is_active: true
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => { fetchSuppliers(page); }, [page]);

    const fetchSuppliers = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/inventory/suppliers/?page=${pageNumber}&page_size=10&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setSuppliers(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setSuppliers(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (sup: Supplier) => {
        setEditingId(sup.id);
        setFormData({
            supplier_id: sup.supplier_id,
            name: sup.name,
            code: sup.code,
            gst_number: sup.gst_number || '',
            address_line1: sup.address_line1 || '',
            address_line2: sup.address_line2 || '',
            area: sup.area || '',
            pincode: sup.pincode || '',
            pan: sup.pan || '',
            is_active: sup.is_active
        });
        setErrors({});
        setViewMode('edit');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            supplier_id: '',
            name: '',
            code: '',
            gst_number: '',
            address_line1: '',
            address_line2: '',
            area: '',
            pincode: '',
            pan: '',
            is_active: true
        });
        setErrors({});
        setViewMode('list');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Clear blank values for optional unique fields so backend doesn't trigger duplicate errors
        const payload = {
            ...formData,
            gst_number: formData.gst_number.trim() || null,
            pan: formData.pan.trim() || null
        };

        try {
            if (editingId) {
                await api.put(`/api/inventory/suppliers/${editingId}/`, payload);
                showToast('Supplier updated successfully', 'success');
            } else {
                await api.post('/api/inventory/suppliers/', payload);
                showToast('Supplier added successfully', 'success');
                setPage(1);
            }
            cancelEdit();
            fetchSuppliers(editingId ? page : 1);
        } catch (err: any) {
            if (err.response?.data) {
                setErrors(err.response.data);
                showToast('Unable to save supplier. Please check the fields.', 'error');
            } else {
                showToast('Network error while connecting to server.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('supplier_search_query', searchQuery);
        setPage(1);
        fetchSuppliers(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('supplier_search_query');
        setPage(1);
        fetchSuppliers(1, '');
    };

    const formatAddress = (sup: Supplier) => {
        const parts = [
            sup.address_line1,
            sup.address_line2,
            sup.area,
            sup.pincode && `PIN: ${sup.pincode}`
        ].filter(Boolean);
        return parts.join(', ') || '-';
    };

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Supplier Master</h1>
                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Manage all global suppliers here.</p>
                </div>
                {viewMode === 'list' && (
                    <button className="btn-primary" onClick={() => { cancelEdit(); setViewMode('create'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', fontSize: '0.9rem', padding: '0 16px', margin: 0 }}>
                        <Plus size={16} /> New Supplier
                    </button>
                )}
            </div>

            {viewMode === 'list' && (
                <div className="glass-panel" style={{padding: '2rem'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                        {/* Search Bar */}
                        <div className="search-bar-container" style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                className="glass-input" 
                                placeholder="Search suppliers..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                                style={{ margin: 0, flex: 1 }}
                            />
                            <button 
                                type="button" 
                                onClick={handleSearch} 
                                className="btn-primary" 
                                style={{ margin: 0, padding: '0 1.5rem', width: 'auto', minHeight: 'auto', height: '42px' }}
                            >
                                Search
                            </button>
                            {searchQuery && (
                                <button 
                                    type="button" 
                                    onClick={handleClearSearch} 
                                    className="btn-secondary" 
                                    style={{ margin: 0, padding: '0 1rem', width: 'auto', minHeight: 'auto', height: '42px' }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Desktop View */}
                        <div className="data-table-wrapper desktop-only-view">
                            {/* Floating scroll arrows */}
                            <button 
                                type="button" 
                                onClick={() => scrollTable('left')} 
                                style={{ 
                                    position: 'absolute', 
                                    left: '-26px', 
                                    top: '12px', 
                                    zIndex: 100, 
                                    background: 'linear-gradient(135deg, #ff6b35, #ff9f43)', 
                                    border: 'none', 
                                    color: '#fff', 
                                    width: '36px', 
                                    height: '36px', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    cursor: 'pointer', 
                                    boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4)',
                                    backdropFilter: 'blur(4px)',
                                    transition: 'all 0.2s ease',
                                    outline: 'none'
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
                                    position: 'absolute', 
                                    right: '-26px', 
                                    top: '12px', 
                                    zIndex: 100, 
                                    background: 'linear-gradient(135deg, #ff6b35, #ff9f43)', 
                                    border: 'none', 
                                    color: '#fff', 
                                    width: '36px', 
                                    height: '36px', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    cursor: 'pointer', 
                                    boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4)',
                                    backdropFilter: 'blur(4px)',
                                    transition: 'all 0.2s ease',
                                    outline: 'none'
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
                                            <th>Supplier ID</th>
                                            <th>Supplier Name</th>
                                            <th>Supplier Code</th>
                                            <th>GST NO</th>
                                            <th>Address</th>
                                            <th>PAN</th>
                                            <th style={{width: '80px', textAlign: 'center'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suppliers.length === 0 ? (
                                            <tr><td colSpan={7} style={{textAlign:'center', padding:'2rem'}}>No suppliers found.</td></tr>
                                        ) : suppliers.map(sup => (
                                            <tr key={sup.id} className={(editingId === sup.id ? 'editing-row ' : '') + (!sup.is_active ? 'inactive-row' : '')}>
                                                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{sup.supplier_id}</td>
                                                <td className="wrap-text">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span 
                                                            style={{ 
                                                                width: '8px', 
                                                                height: '8px', 
                                                                borderRadius: '50%', 
                                                                background: sup.is_active ? '#22c55e' : '#ef4444',
                                                                boxShadow: sup.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                                                                display: 'inline-block',
                                                                flexShrink: 0
                                                            }} 
                                                            title={sup.is_active ? 'Active' : 'Inactive'}
                                                        />
                                                        <span style={{ fontWeight: '600', color: '#fff' }}>{sup.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{sup.code}</td>
                                                <td>
                                                    {sup.gst_number ? (
                                                        <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px', color: '#4cc9f0', background: 'rgba(76,201,240,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(76,201,240,0.1)' }}>
                                                            {sup.gst_number}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td style={{ color: '#aaa', fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={formatAddress(sup)}>
                                                    {formatAddress(sup)}
                                                </td>
                                                <td style={{ fontFamily: 'monospace' }}>{sup.pan || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                        <button className="action-icon-btn edit-btn" onClick={() => handleEdit(sup)} title="Edit Supplier">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        {sessionStorage.getItem('is_superuser') === 'true' && (
                                                            <button className="action-icon-btn history-btn" onClick={() => setAuditLogData({ created_by: sup.created_by, created_at: sup.created_at, updated_by: sup.updated_by, updated_at: sup.updated_at })} title="Audit Log" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                                                                <History size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            <div className="pagination-controls">
                                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="page-btn">
                                    &larr; Previous
                                </button>
                                <span className="page-info">Page {page} of {totalPages || 1}</span>
                                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="page-btn">
                                    Next &rarr;
                                </button>
                            </div>
                        </div>

                        {/* Mobile View */}
                        <div className="data-table-wrapper mobile-only-view">
                            <div className="mobile-card-list" style={{ padding: '1rem' }}>
                                {suppliers.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No suppliers found.</div>
                                ) : suppliers.map(sup => (
                                    <div className="mobile-card" key={sup.id}>
                                        <div className="mobile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <h3>{sup.name}</h3>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: sup.is_active ? '#4ade80' : '#f87171' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sup.is_active ? '#22c55e' : '#ef4444', boxShadow: sup.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444' }}></span>
                                                {sup.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="mobile-card-body">
                                            <p><strong>Supplier ID</strong> <span className="monospace-text" style={{ color: 'var(--color-molten-yellow)' }}>{sup.supplier_id}</span></p>
                                            <p><strong>Code</strong> <span className="monospace-text">{sup.code}</span></p>
                                            <p><strong>GST Number</strong> <span className="monospace-text">{sup.gst_number || '-'}</span></p>
                                            <p><strong>Address</strong> <span style={{ textAlign: 'right', fontSize: '0.9rem' }}>{formatAddress(sup)}</span></p>
                                            <p><strong>PAN</strong> <span className="monospace-text">{sup.pan || '-'}</span></p>
                                        </div>
                                        <div className="mobile-card-actions">
                                            <button className="action-icon-btn edit-btn" onClick={() => handleEdit(sup)} title="Edit Supplier">
                                                <Edit2 size={16} /> Edit
                                            </button>
                                            {sessionStorage.getItem('is_superuser') === 'true' && (
                                                <button className="action-icon-btn history-btn" onClick={() => setAuditLogData({ created_by: sup.created_by, created_at: sup.created_at, updated_by: sup.updated_by, updated_at: sup.updated_at })} title="Audit Log" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    <History size={16} /> Log
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Shared Pagination Controls */}
                            <div className="pagination-controls">
                                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="page-btn">
                                    &larr; Previous
                                </button>
                                <span className="page-info">Page {page} of {totalPages || 1}</span>
                                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="page-btn">
                                    Next &rarr;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(viewMode === 'create' || viewMode === 'edit') && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div className="form-panel" style={{ width: '100%', maxWidth: '600px' }}>
                        <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', height: '2rem', marginBottom: '1rem' }}>
                            {editingId ? 'Edit Supplier' : 'Add Supplier'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            {/* Supplier ID */}
                            <div className="input-group">
                                <label>Supplier ID <span className="required-asterisk">*</span></label>
                                <input className="glass-input" required maxLength={15} pattern="^[A-Za-z0-9_\-]+$" title="Alphanumeric, dashes, and underscores only. Max 15 chars." value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value.toUpperCase()})} />
                                {errors.supplier_id && <span className="error-text">{errors.supplier_id}</span>}
                            </div>

                            {/* Supplier Name */}
                            <div className="input-group">
                                <label>Supplier Name <span className="required-asterisk">*</span></label>
                                <input className="glass-input" required maxLength={100} title="Maximum 100 characters" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>

                            {/* Supplier Code */}
                            <div className="input-group">
                                <label>Supplier Code <span className="required-asterisk">*</span></label>
                                <input className="glass-input" required maxLength={15} pattern="^[A-Za-z0-9_\-]+$" title="Alphanumeric, dashes, and underscores only. Max 15 chars." value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                                {errors.code && <span className="error-text">{errors.code}</span>}
                            </div>

                            {/* GST NO */}
                            <div className="input-group">
                                <label>GST NO (Optional)</label>
                                <input className="glass-input" maxLength={15} minLength={15} pattern="^[a-zA-Z0-9]{15}$" title="GST Number must be exactly 15 alphanumeric characters" value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value.toUpperCase()})} />
                                {errors.gst_number && <span className="error-text">{errors.gst_number}</span>}
                            </div>

                            {/* Address Line 1 */}
                            <div className="input-group">
                                <label>Address Line 1 (Optional)</label>
                                <input className="glass-input" maxLength={100} title="Maximum 100 characters" value={formData.address_line1} onChange={e => setFormData({...formData, address_line1: e.target.value})} />
                                {errors.address_line1 && <span className="error-text">{errors.address_line1}</span>}
                            </div>

                            {/* Address Line 2 */}
                            <div className="input-group">
                                <label>Address Line 2 (Optional)</label>
                                <input className="glass-input" maxLength={100} title="Maximum 100 characters" value={formData.address_line2} onChange={e => setFormData({...formData, address_line2: e.target.value})} />
                                {errors.address_line2 && <span className="error-text">{errors.address_line2}</span>}
                            </div>

                            {/* Area */}
                            <div className="input-group">
                                <label>Area (Optional)</label>
                                <input className="glass-input" maxLength={50} title="Maximum 50 characters" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                                {errors.area && <span className="error-text">{errors.area}</span>}
                            </div>

                            {/* Pincode */}
                            <div className="input-group">
                                <label>Pincode (Optional)</label>
                                <input className="glass-input" maxLength={10} pattern="^[0-9]{5,10}$" title="5 to 10 digits" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                                {errors.pincode && <span className="error-text">{errors.pincode}</span>}
                            </div>

                            {/* PAN */}
                            <div className="input-group">
                                <label>PAN (Optional)</label>
                                <input className="glass-input" maxLength={10} minLength={10} pattern="^[a-zA-Z0-9]{10}$" title="PAN must be exactly 10 alphanumeric characters" value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value.toUpperCase()})} />
                                {errors.pan && <span className="error-text">{errors.pan}</span>}
                            </div>

                            {/* Active Checkbox */}
                            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                                <input type="checkbox" id="sup-active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                                <label htmlFor="sup-active" style={{ margin: 0, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' }}>Active Record</label>
                            </div>
                            
                            <div style={{display: 'flex', gap: '10px', marginTop: '1.5rem', minHeight: '50px'}}>
                                <button type="submit" disabled={loading} className="btn-primary" style={{margin: 0, flex: 1}}>
                                    {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                                </button>
                                <button type="button" onClick={cancelEdit} className="btn-secondary" style={{margin: 0, flex: 1}}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {auditLogData && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="glass-panel" style={{
                        width: '90%',
                        maxWidth: '400px',
                        padding: '1.5rem',
                        position: 'relative',
                        border: '1px solid rgba(255,107,53,0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--color-molten-yellow)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', fontSize: '1.1rem' }}>
                            Record Audit Log
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: '#fff' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Created By</div>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{auditLogData.created_by || 'System'}</div>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{auditLogData.created_at ? new Date(auditLogData.created_at).toLocaleString() : '-'}</div>
                            </div>
                            
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Last Edited By</div>
                                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{auditLogData.updated_by || 'System'}</div>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{auditLogData.updated_at ? new Date(auditLogData.updated_at).toLocaleString() : '-'}</div>
                            </div>
                        </div>

                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={() => setAuditLogData(null)}
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
export default SupplierTab;
