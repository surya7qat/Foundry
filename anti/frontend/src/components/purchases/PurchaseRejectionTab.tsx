import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import SearchableSelect from '../common/SearchableSelect';
import { Plus, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import '../master/MasterStyles.css';

interface RejectionItem {
    id?: number;
    purchase_inward_item?: number;
    raw_material: number;
    raw_material_code?: string;
    raw_material_name?: string;
    rejected_quantity: number | '';
    rate: number | '';
    amount?: number;
    inward_quantity?: number;
    already_rejected?: number;
    already_returned?: number;
    max_rejectable?: number;
    gst?: number;
}

interface PurchaseRejection {
    id: number;
    rejection_number: string;
    purchase_inward: number;
    inward_number: string;
    supplier_name: string;
    rejection_date: string;
    remarks: string;
    items: RejectionItem[];
}

interface PurchaseInward {
    id: number;
    inward_number: string;
    supplier_name: string;
    items: Array<{
        raw_material: number;
        raw_material_code: string;
        raw_material_name: string;
        quantity: number;
        rate: number;
    }>;
}

const PurchaseRejectionTab: React.FC = () => {
    const { showToast } = useToast();
    const [rejections, setRejections] = useState<PurchaseRejection[]>([]);
    const [inwards, setInwards] = useState<PurchaseInward[]>([]);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('purchase_rejection_search_query') || '';
    });
    const [loading, setLoading] = useState(false);
    
    // View state: 'list', 'create', 'view'
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'view'>('list');
    const [viewingRejection, setViewingRejection] = useState<PurchaseRejection | null>(null);
    const [fromMonth, setFromMonth] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 2);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [toMonth, setToMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Create Form State
    const [inwardId, setInwardId] = useState<number | ''>('');
    const [rejectionDate, setRejectionDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [formItems, setFormItems] = useState<RejectionItem[]>([]);
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };
    const listTableContainerRef = React.useRef<HTMLDivElement>(null);
    const scrollListTable = (direction: 'left' | 'right') => {
        if (listTableContainerRef.current) {
            listTableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        fetchRejections(page);
    }, [page]);



    const fetchRejections = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/purchases/purchase-rejections/?page=${pageNumber}&page_size=10&from_month=${fromMonth}&to_month=${toMonth}&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setRejections(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setRejections(res.data);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load purchase rejections', 'error');
        }
    };

    const fetchInwardsDropdown = async (searchVal: string = '') => {
        if (viewMode !== 'create') return;
        try {
            const res = await api.get(`/api/purchases/purchase-inwards/?page_size=30&completed_only=true&search=${encodeURIComponent(searchVal)}`);
            setInwards(res.data.results || res.data);
        } catch (err) {
            console.error('Failed to load inwards dropdown', err);
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('purchase_rejection_search_query', searchQuery);
        setPage(1);
        fetchRejections(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('purchase_rejection_search_query');
        setPage(1);
        fetchRejections(1, '');
    };

    const handleInwardChange = async (selectedInwardId: number) => {
        setInwardId(selectedInwardId);
        if (!selectedInwardId) {
            setFormItems([]);
            return;
        }
        try {
            const res = await api.get(`/api/purchases/purchase-inwards/${selectedInwardId}/returnable_quantities/`);
            const mapped = res.data.map((item: any) => ({
                purchase_inward_item: item.purchase_inward_item,
                raw_material: item.raw_material,
                raw_material_code: item.raw_material_code,
                raw_material_name: item.raw_material_name,
                inward_quantity: item.inward_quantity,
                already_rejected: item.already_rejected,
                already_returned: item.already_returned,
                max_rejectable: item.max_returnable,
                rejected_quantity: '' as unknown as number,
                rate: item.rate,
                gst: item.gst
            }));
            setFormItems(mapped);
        } catch (err) {
            console.error('Failed to fetch returnable quantities', err);
            showToast('Failed to fetch returnable quantities for this Inward', 'error');
            setFormItems([]);
        }
    };

    const handleQtyChange = (index: number, val: string) => {
        const updated = [...formItems];
        const qty = val === '' ? '' : Number(val);
        updated[index].rejected_quantity = qty as number;
        setFormItems(updated);
    };

    const resetForm = () => {
        setInwardId('');
        setRejectionDate(new Date().toISOString().split('T')[0]);
        setRemarks('');
        setFormItems([]);
        setViewMode('list');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!inwardId) {
            showToast('Purchase Inward is required', 'error');
            setLoading(false);
            return;
        }

        const validItems = formItems.filter(i => Number(i.rejected_quantity) > 0);
        if (validItems.length === 0) {
            showToast('At least one item must have a rejected quantity greater than 0', 'error');
            setLoading(false);
            return;
        }

        // Frontend validation
        for (const item of validItems) {
            if (Number(item.rejected_quantity) > (item.max_rejectable ?? 0)) {
                showToast(`Rejected quantity for ${item.raw_material_code} cannot exceed maximum rejectable quantity (${item.max_rejectable})`, 'error');
                setLoading(false);
                return;
            }
        }

        const payload = {
            purchase_inward: inwardId,
            rejection_date: rejectionDate,
            remarks: remarks,
            items: validItems.map(i => ({
                purchase_inward_item: i.purchase_inward_item,
                raw_material: i.raw_material,
                rejected_quantity: Number(i.rejected_quantity),
                rate: Number(i.rate)
            }))
        };

        try {
            await api.post('/api/purchases/purchase-rejections/', payload);
            showToast('Purchase Rejection recorded successfully', 'success');
            resetForm();
            fetchRejections(1);
        } catch (err: any) {
            showToast(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Error saving rejection record', 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (itemList: RejectionItem[]) => {
        return itemList.reduce((sum, item) => {
            const qty = Number(item.rejected_quantity) || 0;
            const rate = Number(item.rate) || 0;
            const gst = Number(item.gst) || 18.0;
            return sum + (qty * rate * (1.0 + gst / 100.0));
        }, 0);
    };

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Purchase Rejection</h1>
                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>QC rejected material logs.</p>
                </div>
                {viewMode === 'list' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <div className="input-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ margin: 0, color: '#ccc', fontSize: '0.85rem' }}>From:</label>
                            <input 
                                type="month" 
                                className="glass-input" 
                                style={{ padding: '4px', width: '120px', fontSize: '0.85rem', height: '30px', cursor: 'pointer' }}
                                value={fromMonth}
                                onChange={(e) => setFromMonth(e.target.value)}
                                onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err) {} }}
                            />
                        </div>
                        <div className="input-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ margin: 0, color: '#ccc', fontSize: '0.85rem' }}>To:</label>
                            <input 
                                type="month" 
                                className="glass-input" 
                                style={{ padding: '4px', width: '120px', fontSize: '0.85rem', height: '30px', cursor: 'pointer' }}
                                value={toMonth}
                                onChange={(e) => setToMonth(e.target.value)}
                                onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err) {} }}
                            />
                        </div>
                        <button className="btn-secondary" onClick={() => { setPage(1); fetchRejections(1); }} style={{ padding: '0 12px', margin: 0, height: '30px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Filter
                        </button>
                        <button className="btn-primary" onClick={() => setViewMode('create')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '30px', fontSize: '0.85rem', padding: '0 12px', margin: 0 }}>
                            <Plus size={14} /> New Rejection
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'list' && (
                <div className="glass-panel" style={{padding: '2rem'}}>
                    {/* Search Bar */}
                    <div className="search-bar-container" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                        <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="Search by Rejection ID, Inward No, Supplier..." 
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
                    <div className="data-table-wrapper desktop-only-view" style={{width: '100%', minHeight: '500px', position: 'relative'}}>
                        {/* Floating scroll arrows */}
                        <button 
                            type="button" 
                            onClick={() => scrollListTable('left')} 
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
                            onClick={() => scrollListTable('right')} 
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

                        <div className="data-table-container" ref={listTableContainerRef}>
                            <table className="glass-table">
                                <thead>
                                    <tr>
                                        <th>Rejection Number</th>
                                        <th>Rejection Date</th>
                                        <th>Inward Link</th>
                                        <th>Supplier Name</th>
                                        <th>Total Rejection Value</th>
                                        <th>Remarks</th>
                                        <th style={{textAlign: 'center'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rejections.length === 0 ? (
                                        <tr><td colSpan={7} style={{textAlign:'center', padding:'2rem'}}>No Rejection records found.</td></tr>
                                    ) : rejections.map(rej => (
                                        <tr key={rej.id}>
                                            <td style={{ fontWeight: '700', fontFamily: 'monospace', letterSpacing: '0.5px', color: '#ef4444' }} title={rej.rejection_number}>{rej.rejection_number}</td>
                                            <td style={{ fontFamily: 'monospace' }} title={rej.rejection_date}>{rej.rejection_date}</td>
                                            <td style={{ fontWeight: '600', fontFamily: 'monospace' }} title={rej.inward_number}>{rej.inward_number}</td>
                                            <td style={{ fontWeight: '500' }} title={rej.supplier_name}>{rej.supplier_name}</td>
                                            <td style={{ fontWeight: '700', fontFamily: 'monospace', color: '#fff' }} title={`₹ ${calculateTotal(rej.items).toFixed(2)}`}>₹ {calculateTotal(rej.items).toFixed(2)}</td>
                                            <td style={{ color: '#ccc' }} title={rej.remarks}>{rej.remarks || '-'}</td>
                                            <td style={{textAlign: 'center'}}>
                                                <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                                    <button className="action-icon-btn view-btn" onClick={() => { setViewingRejection(rej); setViewMode('view'); }} title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
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
                    <div className="data-table-wrapper mobile-only-view" style={{width: '100%', minHeight: '500px'}}>
                        <div className="mobile-card-list" style={{ padding: '1rem' }}>
                            {rejections.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No Rejection records found.</div>
                            ) : rejections.map(rej => (
                                <div className="mobile-card" key={rej.id}>
                                    <div className="mobile-card-header">
                                        <h3 style={{color: '#ef4444'}}>{rej.rejection_number}</h3>
                                    </div>
                                    <div className="mobile-card-body">
                                        <p><strong>Date:</strong> <span className="monospace-text">{rej.rejection_date}</span></p>
                                        <p><strong>Inward Ref:</strong> <span className="monospace-text">{rej.inward_number}</span></p>
                                        <p><strong>Supplier:</strong> <span>{rej.supplier_name}</span></p>
                                        <p><strong>Total Value:</strong> <strong className="amount-highlight" style={{color: '#ef4444'}}>₹ {calculateTotal(rej.items).toFixed(2)}</strong></p>
                                        <p><strong>Remarks:</strong> <span>{rej.remarks || '-'}</span></p>
                                    </div>
                                    <div className="mobile-card-actions">
                                        <button className="action-icon-btn view-btn" onClick={() => { setViewingRejection(rej); setViewMode('view'); }} title="View Details">
                                            <Eye size={14} /> Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

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
            )}

            {viewMode === 'create' && (
                <div className="glass-panel" style={{padding: '2rem'}}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            <div className="input-group">
                                <label>Purchase Inward <span className="required-asterisk">*</span></label>
                                <SearchableSelect 
                                    className="glass-input"
                                    required
                                    value={inwardId}
                                    onChange={(val) => handleInwardChange(Number(val))}
                                    options={inwards.map(i => ({ value: i.id, label: `${i.inward_number} (${i.supplier_name})` }))}
                                    placeholder="Select Purchase Inward"
                                    onSearchChange={(val) => fetchInwardsDropdown(val)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Rejection Date <span className="required-asterisk">*</span></label>
                                <input type="date" className="glass-input" required value={rejectionDate} onChange={e => setRejectionDate(e.target.value)} />
                            </div>
                        </div>

                        {formItems.length > 0 && (
                            <>
                                <h3 style={{marginBottom: '1rem'}}>Inward Line Items</h3>
                                
                                {/* Desktop items grid */}
                                {/* Desktop items grid */}
                                <div className="data-table-wrapper desktop-only-view" style={{position: 'relative', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%'}}>
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

                                    <div className="data-table-container" ref={tableContainerRef} style={{ width: '100%', overflowX: 'auto', minWidth: 0 }}>
                                        <table className="glass-table">
                                            <thead>
                                                <tr>
                                                    <th style={{width: '26%'}}>Raw Material</th>
                                                    <th style={{width: '10%', textAlign:'right'}}>Inward Qty</th>
                                                    <th style={{width: '10%', textAlign:'right'}}>Already Rejected</th>
                                                    <th style={{width: '10%', textAlign:'right'}}>Already Returned</th>
                                                    <th style={{width: '10%', textAlign:'right'}}>Max Rejectable</th>
                                                    <th style={{width: '10%'}}>Rejected Qty</th>
                                                    <th style={{width: '10%', textAlign:'right'}}>Rate (₹)</th>
                                                    <th style={{width: '6%', textAlign:'right'}}>GST</th>
                                                    <th style={{width: '8%', textAlign:'right'}}>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.raw_material_name} ({item.raw_material_code})</td>
                                                        <td style={{textAlign:'right'}}>{item.inward_quantity}</td>
                                                        <td style={{textAlign:'right', color: '#ef4444'}}>{item.already_rejected}</td>
                                                        <td style={{textAlign:'right'}}>{item.already_returned}</td>
                                                        <td style={{textAlign:'right', color: '#22c55e', fontWeight: 600}}>{item.max_rejectable}</td>
                                                        <td>
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max={item.max_rejectable} 
                                                                step="0.01" 
                                                                className="glass-input" 
                                                                value={item.rejected_quantity} 
                                                                disabled={!(item.max_rejectable && item.max_rejectable > 0)}
                                                                onChange={e => handleQtyChange(index, e.target.value)} 
                                                                style={{padding: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.1)'}} 
                                                            />
                                                        </td>
                                                        <td style={{textAlign:'right'}}>₹ {Number(item.rate).toFixed(2)}</td>
                                                        <td style={{textAlign:'right'}}>{item.gst}%</td>
                                                        <td style={{textAlign:'right', fontWeight: 'bold'}}>
                                                            ₹ {((Number(item.rejected_quantity) || 0) * (Number(item.rate) || 0) * (1.0 + (Number(item.gst) || 18.0) / 100.0)).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div style={{padding: '1rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                                            <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444'}}>
                                                Total Rejection: ₹ {calculateTotal(formItems).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile items card list */}
                                <div className="mobile-po-items-cards">
                                    {formItems.map((item, index) => (
                                        <div className="po-item-card" key={index} style={{borderLeft: '4px solid #ef4444'}}>
                                            <div className="po-item-card-header">
                                                <h4>{item.raw_material_name} ({item.raw_material_code})</h4>
                                            </div>
                                            <div className="po-item-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: '#ccc'}}>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>Inward Quantity:</span> <strong>{item.inward_quantity}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>QC Rejected:</span> <strong style={{color: '#ef4444'}}>{item.already_rejected}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>Already Returned:</span> <strong>{item.already_returned}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>Max Rejectable:</span> <strong style={{color: '#22c55e'}}>{item.max_rejectable}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>Rate:</span> <strong>₹{Number(item.rate).toFixed(2)}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>GST:</span> <strong>{item.gst}%</strong>
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Rejected Quantity</label>
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max={item.max_rejectable} 
                                                        step="0.01" 
                                                        className="glass-input" 
                                                        value={item.rejected_quantity} 
                                                        disabled={!(item.max_rejectable && item.max_rejectable > 0)}
                                                        onChange={e => handleQtyChange(index, e.target.value)} 
                                                    />
                                                </div>
                                                <div className="po-item-amount-row">
                                                    <span>Subtotal Rejected:</span>
                                                    <strong style={{ color: '#ef4444', fontSize: '1.05rem' }}>₹ {((Number(item.rejected_quantity) || 0) * (Number(item.rate) || 0) * (1.0 + (Number(item.gst) || 18.0) / 100.0)).toFixed(2)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', textAlign: 'center' }}>
                                        <div style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#ef4444'}}>
                                            Total Rejection: ₹ {calculateTotal(formItems).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="input-group" style={{marginBottom: '2rem'}}>
                            <label>Remarks / Reason for Rejection</label>
                            <textarea className="glass-input" value={remarks} maxLength={250} title="Maximum 250 characters" onChange={e => setRemarks(e.target.value)} style={{minHeight: '80px', resize: 'vertical'}} placeholder="Reason for QC rejection (Max 250 characters)..." />
                        </div>

                        <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem'}}>
                            <button type="button" onClick={resetForm} className="btn-secondary" style={{width: '150px'}}>
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || formItems.length === 0} className="btn-primary" style={{width: '200px', margin: 0}}>
                                {loading ? 'Processing...' : 'Record Rejection'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {viewMode === 'view' && viewingRejection && (
                <div className="glass-panel" style={{padding: '2rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,107,53,0.2)', paddingBottom: '1rem'}}>
                        <h2 style={{margin: 0, color: '#ef4444'}}>Purchase Rejection: {viewingRejection.rejection_number}</h2>
                        <button type="button" onClick={() => setViewMode('list')} className="action-icon-btn" style={{background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%'}}>
                            <X size={20} color="white" />
                        </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        <div><strong>Supplier Name:</strong> <br/><span style={{fontSize: '1.1rem', fontWeight: 500}}>{viewingRejection.supplier_name}</span></div>
                        <div><strong>Rejection Date:</strong> <br/><span style={{fontSize: '1.1rem', fontFamily: 'monospace'}}>{viewingRejection.rejection_date}</span></div>
                        <div><strong>Inward Link:</strong> <br/><span style={{fontSize: '1.1rem', fontFamily: 'monospace'}}>{viewingRejection.inward_number}</span></div>
                        <div><strong>Remarks / Reason:</strong> <br/><span style={{fontSize: '1.1rem', color: '#aaa'}}>{viewingRejection.remarks || 'N/A'}</span></div>
                    </div>

                    <h3 style={{marginBottom: '1rem'}}>Rejected Line Items</h3>
                    {/* Desktop details table */}
                    <div className="desktop-po-items-table data-table-container">
                        <table className="glass-table">
                            <thead>
                                <tr>
                                    <th>Material Code</th>
                                    <th>Material Name</th>
                                    <th style={{textAlign:'right'}}>Rejected Quantity</th>
                                    <th style={{textAlign:'right'}}>Rate (₹)</th>
                                    <th style={{textAlign:'right'}}>Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewingRejection.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.raw_material_code}</td>
                                        <td>{item.raw_material_name}</td>
                                        <td style={{textAlign:'right'}}>{item.rejected_quantity}</td>
                                        <td style={{textAlign:'right'}}>{item.rate}</td>
                                        <td style={{textAlign:'right', fontWeight: 'bold'}}>{item.amount?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={4} style={{textAlign: 'right', fontWeight: 'bold'}}>Total Value:</td>
                                    <td style={{textAlign: 'right', fontWeight: 'bold', color: '#ef4444', fontSize: '1.1rem'}}>₹ {calculateTotal(viewingRejection.items).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile details cards */}
                    <div className="mobile-po-view-cards">
                        {viewingRejection.items.map(item => (
                            <div className="po-item-view-card" key={item.id} style={{borderLeft: '4px solid #ef4444'}}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#ef4444' }}>{item.raw_material_code}</span>
                                    <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>{item.raw_material_name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ccc' }}>
                                    <span>Rejected Qty: <strong>{item.rejected_quantity}</strong></span>
                                    <span>Rate: <strong>₹{item.rate}</strong></span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: '8px', paddingTop: '8px' }}>
                                    <span style={{ color: '#888' }}>Subtotal:</span>
                                    <strong style={{ color: '#fff' }}>₹ {item.amount?.toFixed(2)}</strong>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <strong style={{ color: '#aaa' }}>Total Rejection Value:</strong>
                            <strong style={{ color: '#ef4444', fontSize: '1.1rem' }}>₹ {calculateTotal(viewingRejection.items).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseRejectionTab;
