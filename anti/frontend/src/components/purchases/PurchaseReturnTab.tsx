import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import SearchableSelect from '../common/SearchableSelect';
import { Plus, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import '../master/MasterStyles.css';

interface ReturnItem {
    id?: number;
    purchase_inward_item?: number;
    raw_material: number;
    raw_material_code?: string;
    raw_material_name?: string;
    returned_quantity: number | '';
    rate: number | '';
    amount?: number;
    inward_quantity?: number;
    already_rejected?: number;
    already_returned?: number;
    max_returnable?: number;
    gst?: number;
}

interface PurchaseReturn {
    id: number;
    return_number: string;
    purchase_inward: number;
    inward_number: string;
    supplier_name: string;
    return_date: string;
    remarks: string;
    items: ReturnItem[];
}

interface PurchaseInward {
    id: number;
    inward_number: string;
    supplier_name: string;
}

const PurchaseReturnTab: React.FC = () => {
    const { showToast } = useToast();
    const [returns, setReturns] = useState<PurchaseReturn[]>([]);
    const [inwards, setInwards] = useState<PurchaseInward[]>([]);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('purchase_return_search_query') || '';
    });
    const [loading, setLoading] = useState(false);
    
    // View state: 'list', 'create', 'view'
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'view'>('list');
    const [viewingReturn, setViewingReturn] = useState<PurchaseReturn | null>(null);
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
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [formItems, setFormItems] = useState<ReturnItem[]>([]);
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
        fetchReturns(page);
    }, [page]);



    const fetchReturns = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/purchases/purchase-returns/?page=${pageNumber}&page_size=10&from_month=${fromMonth}&to_month=${toMonth}&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setReturns(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setReturns(res.data);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load purchase returns', 'error');
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
        sessionStorage.setItem('purchase_return_search_query', searchQuery);
        setPage(1);
        fetchReturns(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('purchase_return_search_query');
        setPage(1);
        fetchReturns(1, '');
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
                max_returnable: item.max_returnable,
                returned_quantity: '' as unknown as number,
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
        updated[index].returned_quantity = qty as number;
        setFormItems(updated);
    };

    const resetForm = () => {
        setInwardId('');
        setReturnDate(new Date().toISOString().split('T')[0]);
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

        const validItems = formItems.filter(i => Number(i.returned_quantity) > 0);
        if (validItems.length === 0) {
            showToast('At least one item must have a returned quantity greater than 0', 'error');
            setLoading(false);
            return;
        }

        // Frontend validation
        for (const item of validItems) {
            if (Number(item.returned_quantity) > (item.max_returnable || 0)) {
                showToast(`Returned quantity for ${item.raw_material_code} cannot exceed maximum returnable (${item.max_returnable})`, 'error');
                setLoading(false);
                return;
            }
        }

        const payload = {
            purchase_inward: inwardId,
            return_date: returnDate,
            remarks: remarks,
            items: validItems.map(i => ({
                purchase_inward_item: i.purchase_inward_item,
                raw_material: i.raw_material,
                returned_quantity: Number(i.returned_quantity),
                rate: Number(i.rate)
            }))
        };

        try {
            await api.post('/api/purchases/purchase-returns/', payload);
            showToast('Purchase Return recorded successfully', 'success');
            resetForm();
            fetchReturns(1);
        } catch (err: any) {
            showToast(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Error saving return record', 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (itemList: ReturnItem[]) => {
        return itemList.reduce((sum, item) => {
            const qty = Number(item.returned_quantity) || 0;
            const rate = Number(item.rate) || 0;
            const gst = Number(item.gst) || 18.0;
            return sum + (qty * rate * (1.0 + gst / 100.0));
        }, 0);
    };

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Purchase Return</h1>
                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Supplier return transaction logs.</p>
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
                        <button className="btn-secondary" onClick={() => { setPage(1); fetchReturns(1); }} style={{ padding: '0 12px', margin: 0, height: '30px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Filter
                        </button>
                        <button className="btn-primary" onClick={() => setViewMode('create')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '30px', fontSize: '0.85rem', padding: '0 12px', margin: 0 }}>
                            <Plus size={14} /> New Return
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
                            placeholder="Search by Return ID, Inward No, Supplier..." 
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
                                        <th>Return Number</th>
                                        <th>Return Date</th>
                                        <th>Inward Link</th>
                                        <th>Supplier Name</th>
                                        <th>Total Return Value</th>
                                        <th>Remarks</th>
                                        <th style={{textAlign: 'center'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returns.length === 0 ? (
                                        <tr><td colSpan={7} style={{textAlign:'center', padding:'2rem'}}>No Return records found.</td></tr>
                                    ) : returns.map(ret => (
                                        <tr key={ret.id}>
                                            <td style={{ fontWeight: '700', fontFamily: 'monospace', letterSpacing: '0.5px', color: 'var(--color-molten-yellow)' }} title={ret.return_number}>{ret.return_number}</td>
                                            <td style={{ fontFamily: 'monospace' }} title={ret.return_date}>{ret.return_date}</td>
                                            <td style={{ fontWeight: '600', fontFamily: 'monospace' }} title={ret.inward_number}>{ret.inward_number}</td>
                                            <td style={{ fontWeight: '500' }} title={ret.supplier_name}>{ret.supplier_name}</td>
                                            <td style={{ fontWeight: '700', fontFamily: 'monospace', color: '#fff' }} title={`₹ ${calculateTotal(ret.items).toFixed(2)}`}>₹ {calculateTotal(ret.items).toFixed(2)}</td>
                                            <td style={{ color: '#ccc' }} title={ret.remarks}>{ret.remarks || '-'}</td>
                                            <td style={{textAlign: 'center'}}>
                                                <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                                    <button className="action-icon-btn view-btn" onClick={() => { setViewingReturn(ret); setViewMode('view'); }} title="View Details">
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
                            {returns.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No Return records found.</div>
                            ) : returns.map(ret => (
                                <div className="mobile-card" key={ret.id}>
                                    <div className="mobile-card-header">
                                        <h3>{ret.return_number}</h3>
                                    </div>
                                    <div className="mobile-card-body">
                                        <p><strong>Date:</strong> <span className="monospace-text">{ret.return_date}</span></p>
                                        <p><strong>Inward Ref:</strong> <span className="monospace-text">{ret.inward_number}</span></p>
                                        <p><strong>Supplier:</strong> <span>{ret.supplier_name}</span></p>
                                        <p><strong>Total Value:</strong> <strong className="amount-highlight">₹ {calculateTotal(ret.items).toFixed(2)}</strong></p>
                                        <p><strong>Remarks:</strong> <span>{ret.remarks || '-'}</span></p>
                                    </div>
                                    <div className="mobile-card-actions">
                                        <button className="action-icon-btn view-btn" onClick={() => { setViewingReturn(ret); setViewMode('view'); }} title="View Details">
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
                                <label>Return Date <span className="required-asterisk">*</span></label>
                                <input type="date" className="glass-input" required value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                            </div>
                        </div>

                        {formItems.length > 0 && (
                            <>
                                <h3 style={{marginBottom: '1rem'}}>Accepted Line Items</h3>
                                
                                {/* Desktop items grid */}
                                {/* Desktop items grid */}
                                <div className="data-table-wrapper desktop-only-view" style={{position: 'relative', marginBottom: '2rem', border: '1px solid rgba(255,107,53,0.2)', width: '100%'}}>
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
                                                    <th style={{width: '10%', textAlign:'right'}}>Rejected Qty</th>
                                                    <th style={{width: '10%', textAlign:'right'}}>Already Returned</th>
                                                    <th style={{width: '10%', textAlign:'right'}}>Max Returnable</th>
                                                    <th style={{width: '10%'}}>Returned Qty</th>
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
                                                        <td style={{textAlign:'right', color: '#22c55e', fontWeight: 600}}>{item.max_returnable}</td>
                                                        <td>
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max={item.max_returnable} 
                                                                step="0.01" 
                                                                className="glass-input" 
                                                                value={item.returned_quantity} 
                                                                disabled={!(item.max_returnable && item.max_returnable > 0)}
                                                                onChange={e => handleQtyChange(index, e.target.value)} 
                                                                style={{padding: '8px', border: 'none', background: 'rgba(255,107,53,0.1)'}} 
                                                            />
                                                        </td>
                                                        <td style={{textAlign:'right'}}>₹ {Number(item.rate).toFixed(2)}</td>
                                                        <td style={{textAlign:'right'}}>{item.gst}%</td>
                                                        <td style={{textAlign:'right', fontWeight: 'bold'}}>
                                                            ₹ {((Number(item.returned_quantity) || 0) * (Number(item.rate) || 0) * (1.0 + (Number(item.gst) || 18.0) / 100.0)).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div style={{padding: '1rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                                            <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-molten-yellow)'}}>
                                                Total Return: ₹ {calculateTotal(formItems).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile items card list */}
                                <div className="mobile-po-items-cards">
                                    {formItems.map((item, index) => (
                                        <div className="po-item-card" key={index}>
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
                                                        <span>Max Returnable:</span> <strong style={{color: '#22c55e'}}>{item.max_returnable}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>Rate:</span> <strong>₹{Number(item.rate).toFixed(2)}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span>GST:</span> <strong>{item.gst}%</strong>
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Returned Quantity</label>
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max={item.max_returnable} 
                                                        step="0.01" 
                                                        className="glass-input" 
                                                        value={item.returned_quantity} 
                                                        disabled={!(item.max_returnable && item.max_returnable > 0)}
                                                        onChange={e => handleQtyChange(index, e.target.value)} 
                                                    />
                                                </div>
                                                <div className="po-item-amount-row">
                                                    <span>Subtotal Return:</span>
                                                    <strong style={{ color: 'var(--color-molten-yellow)', fontSize: '1.05rem' }}>₹ {((Number(item.returned_quantity) || 0) * (Number(item.rate) || 0) * (1.0 + (Number(item.gst) || 18.0) / 100.0)).toFixed(2)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ padding: '1rem', background: 'rgba(255,107,53,0.05)', borderRadius: '12px', border: '1px solid rgba(255,107,53,0.1)', textAlign: 'center' }}>
                                        <div style={{fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--color-molten-yellow)'}}>
                                            Total Return: ₹ {calculateTotal(formItems).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="input-group" style={{marginBottom: '2rem'}}>
                            <label>Remarks / Reason for Return</label>
                            <textarea className="glass-input" value={remarks} maxLength={250} title="Maximum 250 characters" onChange={e => setRemarks(e.target.value)} style={{minHeight: '80px', resize: 'vertical'}} placeholder="Reason for purchase return (Max 250 characters)..." />
                        </div>

                        <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem'}}>
                            <button type="button" onClick={resetForm} className="btn-secondary" style={{width: '150px'}}>
                                Cancel
                            </button>
                            <button type="submit" disabled={loading || formItems.length === 0} className="btn-primary" style={{width: '200px', margin: 0}}>
                                {loading ? 'Processing...' : 'Record Return'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {viewMode === 'view' && viewingReturn && (
                <div className="glass-panel" style={{padding: '2rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,107,53,0.2)', paddingBottom: '1rem'}}>
                        <h2 style={{margin: 0, color: 'var(--color-molten-yellow)'}}>Purchase Return: {viewingReturn.return_number}</h2>
                        <button type="button" onClick={() => setViewMode('list')} className="action-icon-btn" style={{background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%'}}>
                            <X size={20} color="white" />
                        </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        <div><strong>Supplier Name:</strong> <br/><span style={{fontSize: '1.1rem', fontWeight: 500}}>{viewingReturn.supplier_name}</span></div>
                        <div><strong>Return Date:</strong> <br/><span style={{fontSize: '1.1rem', fontFamily: 'monospace'}}>{viewingReturn.return_date}</span></div>
                        <div><strong>Inward Link:</strong> <br/><span style={{fontSize: '1.1rem', fontFamily: 'monospace'}}>{viewingReturn.inward_number}</span></div>
                        <div><strong>Remarks / Reason:</strong> <br/><span style={{fontSize: '1.1rem', color: '#aaa'}}>{viewingReturn.remarks || 'N/A'}</span></div>
                    </div>

                    <h3 style={{marginBottom: '1rem'}}>Returned Line Items</h3>
                    {/* Desktop details table */}
                    <div className="desktop-po-items-table data-table-container">
                        <table className="glass-table">
                            <thead>
                                <tr>
                                    <th>Material Code</th>
                                    <th>Material Name</th>
                                    <th style={{textAlign:'right'}}>Returned Quantity</th>
                                    <th style={{textAlign:'right'}}>Rate (₹)</th>
                                    <th style={{textAlign:'right'}}>Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewingReturn.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.raw_material_code}</td>
                                        <td>{item.raw_material_name}</td>
                                        <td style={{textAlign:'right'}}>{item.returned_quantity}</td>
                                        <td style={{textAlign:'right'}}>{item.rate}</td>
                                        <td style={{textAlign:'right', fontWeight: 'bold'}}>{item.amount?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={4} style={{textAlign: 'right', fontWeight: 'bold'}}>Total Value:</td>
                                    <td style={{textAlign: 'right', fontWeight: 'bold', color: 'var(--color-molten-yellow)', fontSize: '1.1rem'}}>₹ {calculateTotal(viewingReturn.items).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile details cards */}
                    <div className="mobile-po-view-cards">
                        {viewingReturn.items.map(item => (
                            <div className="po-item-view-card" key={item.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{item.raw_material_code}</span>
                                    <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>{item.raw_material_name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ccc' }}>
                                    <span>Returned Qty: <strong>{item.returned_quantity}</strong></span>
                                    <span>Rate: <strong>₹{item.rate}</strong></span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: '8px', paddingTop: '8px' }}>
                                    <span style={{ color: '#888' }}>Subtotal:</span>
                                    <strong style={{ color: '#fff' }}>₹ {item.amount?.toFixed(2)}</strong>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,107,53,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,107,53,0.2)' }}>
                            <strong style={{ color: '#aaa' }}>Total Return Value:</strong>
                            <strong style={{ color: 'var(--color-molten-yellow)', fontSize: '1.1rem' }}>₹ {calculateTotal(viewingReturn.items).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseReturnTab;
