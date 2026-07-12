import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import SearchableSelect from '../common/SearchableSelect';
import { Plus, Trash2, Eye, X, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import '../master/MasterStyles.css';

interface InwardItem {
    id?: number;
    raw_material: number;
    raw_material_code?: string;
    raw_material_name?: string;
    quantity: number | '';
    rate: number | '';
    gst: number;
    cgst?: number;
    sgst?: number;
    batch: string;
    expiry_date: string;
    amount?: number;
    sub_total?: number;
    current_stock?: number;
}

interface PurchaseInward {
    id: number;
    inward_number: string;
    supplier: number;
    supplier_name: string;
    inward_date: string;
    bill_no: string;
    bill_date: string;
    remarks: string;
    items: InwardItem[];
}

interface Supplier { id: number; name: string; is_active: boolean; }
interface RawMaterial { id: number; code: string; name: string; is_active: boolean; }

const PurchaseInwardTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };
    const [inwards, setInwards] = useState<PurchaseInward[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('purchase_inward_search_query') || '';
    });
    const [loading, setLoading] = useState(false);
    
    // View state: 'list', 'create', 'view'
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
    const [viewingInward, setViewingInward] = useState<PurchaseInward | null>(null);
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
    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);
    const [billNo, setBillNo] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [items, setItems] = useState<InwardItem[]>([{ raw_material: '', quantity: '', rate: '', gst: 18.0, batch: '', expiry_date: '' } as unknown as InwardItem]);

    useEffect(() => {
        fetchInwards(page);
    }, [page]);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    const fetchInwards = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/purchases/purchase-inwards/?page=${pageNumber}&page_size=10&from_month=${fromMonth}&to_month=${toMonth}&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setInwards(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setInwards(res.data);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load purchase inwards', 'error');
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('purchase_inward_search_query', searchQuery);
        setPage(1);
        fetchInwards(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('purchase_inward_search_query');
        setPage(1);
        fetchInwards(1, '');
    };

    const fetchDropdowns = async () => {
        try {
            const supRes = await api.get('/api/inventory/suppliers/?page_size=300&is_active=true');
            const matRes = await api.get('/api/inventory/raw-materials/?page_size=300&is_active=true');
            setSuppliers(supRes.data.results || supRes.data);
            setMaterials(matRes.data.results || matRes.data);
        } catch (err) {
            console.error('Failed to load dropdowns', err);
        }
    };

    const handleItemChange = async (index: number, field: keyof InwardItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
        
        if (field === 'raw_material') {
            const matId = Number(value);
            if (matId && !isNaN(matId)) {
                try {
                    const res = await api.get(`/api/inventory/raw-materials/${matId}/stock/`);
                    const updated = [...newItems];
                    updated[index].current_stock = res.data.current_stock;
                    if (res.data.last_rate > 0) {
                        updated[index].rate = res.data.last_rate;
                    }
                    updated[index].gst = res.data.last_gst !== undefined ? res.data.last_gst : 18.0;
                    setItems(updated);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    };

    const addRow = () => {
        setItems([...items, { raw_material: '', quantity: '', rate: '', gst: 18.0, batch: '', expiry_date: '' } as unknown as InwardItem]);
    };

    const removeRow = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const resetForm = () => {
        setSupplierId('');
        setInwardDate(new Date().toISOString().split('T')[0]);
        setBillNo('');
        setBillDate(new Date().toISOString().split('T')[0]);
        setRemarks('');
        setItems([{ raw_material: '', quantity: '', rate: '', gst: 18.0, batch: '', expiry_date: '' } as unknown as InwardItem]);
        setViewMode('list');
    };

    const handleEditClick = (inward: PurchaseInward) => {
        setSupplierId(inward.supplier);
        setInwardDate(inward.inward_date);
        setBillNo(inward.bill_no);
        setBillDate(inward.bill_date);
        setRemarks(inward.remarks || '');
        
        const itemsWithStock = inward.items.map(async (item) => {
            let stockVal = 0;
            try {
                const res = await api.get(`/api/inventory/raw-materials/${item.raw_material}/stock/`);
                stockVal = res.data.current_stock;
            } catch (err) {
                console.error(err);
            }
            return {
                ...item,
                current_stock: stockVal
            };
        });
        
        Promise.all(itemsWithStock).then((resolvedItems) => {
            setItems(resolvedItems as any);
            setViewingInward(inward);
            setViewMode('edit');
        });
    };

    const handleSubmit = async (e: React.FormEvent, submitStatus: 'DRAFT' | 'COMPLETED') => {
        e.preventDefault();
        setLoading(true);
        
        // Validation
        if (!supplierId) { showToast('Supplier is required', 'error'); setLoading(false); return; }
        if (!billNo.trim()) { showToast('Bill Number is required', 'error'); setLoading(false); return; }
        if (!billDate) { showToast('Bill Date is required', 'error'); setLoading(false); return; }
        
        if (items.some(i => !i.raw_material || !i.quantity || !i.rate)) {
            showToast('Raw material, quantity, and rate are required for all items', 'error');
            setLoading(false);
            return;
        }

        const payload = {
            supplier: supplierId,
            inward_date: inwardDate,
            bill_no: billNo.trim(),
            bill_date: billDate,
            remarks: remarks ? remarks.trim() : '',
            status: submitStatus,
            items: items.map(i => ({
                raw_material: i.raw_material,
                quantity: Number(i.quantity),
                rate: Number(i.rate),
                gst: Number(i.gst),
                batch: i.batch ? i.batch.trim() : '',
                expiry_date: i.expiry_date || null
            }))
        };

        try {
            if (viewMode === 'edit' && viewingInward) {
                await api.put(`/api/purchases/purchase-inwards/${viewingInward.id}/`, payload);
                showToast('Purchase Inward updated successfully', 'success');
            } else {
                await api.post('/api/purchases/purchase-inwards/', payload);
                showToast('Purchase Inward created successfully', 'success');
            }
            resetForm();
            fetchInwards(1);
        } catch (err: any) {
            showToast(err.response?.data?.bill_no?.[0] || err.response?.data?.detail || 'Error saving Purchase Inward', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getItemAmount = (item: InwardItem) => {
        return (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    };

    const getItemCGST = (item: InwardItem) => {
        return (getItemAmount(item) * ((Number(item.gst) || 0) / 100.0)) / 2.0;
    };

    const getItemSGST = (item: InwardItem) => {
        return (getItemAmount(item) * ((Number(item.gst) || 0) / 100.0)) / 2.0;
    };

    const getItemSubtotal = (item: InwardItem) => {
        return getItemAmount(item) + getItemCGST(item) + getItemSGST(item);
    };

    const calculateTotal = (itemList: InwardItem[]) => {
        return itemList.reduce((sum, item) => sum + getItemSubtotal(item), 0);
    };

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Purchase Inward</h1>
                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Direct material receipt tracking.</p>
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
                        <button className="btn-secondary" onClick={() => { setPage(1); fetchInwards(1); }} style={{ padding: '0 12px', margin: 0, height: '30px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Filter
                        </button>
                        <button className="btn-primary" onClick={() => setViewMode('create')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '30px', fontSize: '0.85rem', padding: '0 12px', margin: 0 }}>
                            <Plus size={14} /> New Inward
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
                            placeholder="Search by Inward No, Supplier, Bill Number..." 
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
                                        <th>Inward Number</th>
                                        <th>Inward Date</th>
                                        <th>Supplier</th>
                                        <th>Bill Number</th>
                                        <th>Bill Date</th>
                                        <th>Total Value (₹)</th>
                                        <th>Status</th>
                                        <th>Remarks</th>
                                        <th style={{textAlign: 'center'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inwards.length === 0 ? (
                                        <tr><td colSpan={9} style={{textAlign:'center', padding:'2rem'}}>No Purchase Inwards found.</td></tr>
                                    ) : inwards.map(inward => (
                                        <tr key={inward.id}>
                                            <td style={{ fontWeight: '700', fontFamily: 'monospace', letterSpacing: '0.5px', color: 'var(--color-molten-yellow)' }} title={inward.inward_number}>{inward.inward_number}</td>
                                            <td style={{ fontFamily: 'monospace' }} title={inward.inward_date}>{inward.inward_date}</td>
                                            <td style={{ fontWeight: '500' }} title={inward.supplier_name}>{inward.supplier_name}</td>
                                            <td style={{ fontWeight: '500' }} title={inward.bill_no}>{inward.bill_no}</td>
                                            <td style={{ fontFamily: 'monospace' }} title={inward.bill_date}>{inward.bill_date}</td>
                                            <td style={{ fontWeight: '700', fontFamily: 'monospace', color: '#fff' }} title={`₹ ${calculateTotal(inward.items).toFixed(2)}`}>₹ {calculateTotal(inward.items).toFixed(2)}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: inward.status === 'COMPLETED' ? '#22c55e' : '#9ca3af',
                                                        boxShadow: inward.status === 'COMPLETED' ? '0 0 8px #22c55e' : '0 0 4px #9ca3af'
                                                    }}></span>
                                                    <span style={{ fontSize: '0.85rem', color: inward.status === 'COMPLETED' ? '#22c55e' : '#aaa', fontWeight: 600 }}>
                                                        {inward.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ color: '#ccc' }} title={inward.remarks}>{inward.remarks}</td>
                                            <td style={{textAlign: 'center'}}>
                                                <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                                    <button className="action-icon-btn view-btn" onClick={() => { setViewingInward(inward); setViewMode('view'); }} title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    {inward.status === 'DRAFT' && (
                                                        <button type="button" className="action-icon-btn edit-btn" onClick={() => handleEditClick(inward)} title="Edit Inward" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
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
                            {inwards.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No Purchase Inwards found.</div>
                            ) : inwards.map(inward => (
                                <div className="mobile-card" key={inward.id}>
                                    <div className="mobile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>{inward.inward_number}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: inward.status === 'COMPLETED' ? '#22c55e' : '#9ca3af',
                                                boxShadow: inward.status === 'COMPLETED' ? '0 0 8px #22c55e' : '0 0 4px #9ca3af'
                                            }}></span>
                                            <span style={{ fontSize: '0.8rem', color: inward.status === 'COMPLETED' ? '#22c55e' : '#aaa', fontWeight: 600 }}>
                                                {inward.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mobile-card-body">
                                        <p><strong>Date:</strong> <span className="monospace-text">{inward.inward_date}</span></p>
                                        <p><strong>Supplier:</strong> <span>{inward.supplier_name}</span></p>
                                        <p><strong>Bill No:</strong> <span>{inward.bill_no} ({inward.bill_date})</span></p>
                                        <p><strong>Total Value:</strong> <strong className="amount-highlight">₹ {calculateTotal(inward.items).toFixed(2)}</strong></p>
                                        <p><strong>Remarks:</strong> <span>{inward.remarks}</span></p>
                                    </div>
                                    <div className="mobile-card-actions" style={{ display: 'flex', gap: '10px' }}>
                                        <button className="action-icon-btn view-btn" onClick={() => { setViewingInward(inward); setViewMode('view'); }} title="View Details">
                                            <Eye size={14} /> Details
                                        </button>
                                        {inward.status === 'DRAFT' && (
                                            <button type="button" className="action-icon-btn edit-btn" onClick={() => handleEditClick(inward)} title="Edit Inward" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Edit2 size={14} /> Edit
                                            </button>
                                        )}
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

            {(viewMode === 'create' || viewMode === 'edit') && (
                <div className="glass-panel form-panel-responsive">
                    <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--color-molten-yellow)' }}>
                        {viewMode === 'edit' ? `Edit Purchase Inward: ${viewingInward?.inward_number}` : 'Create Purchase Inward'}
                    </h2>
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="form-grid-responsive">
                            <div className="input-group">
                                <label>Supplier <span className="required-asterisk">*</span></label>
                                <SearchableSelect 
                                    className="glass-input"
                                    required
                                    value={supplierId}
                                    onChange={(val) => setSupplierId(Number(val))}
                                    options={suppliers.filter(s => s.is_active).map(s => ({ value: s.id, label: s.name }))}
                                    placeholder="Select a Supplier"
                                />
                            </div>
                            <div className="input-group">
                                <label>Inward Date <span className="required-asterisk">*</span></label>
                                <input type="date" className="glass-input" required value={inwardDate} onChange={e => setInwardDate(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>Bill Number <span className="required-asterisk">*</span></label>
                                <input type="text" className="glass-input" required value={billNo} onChange={e => setBillNo(e.target.value)} maxLength={20} placeholder="Enter Bill No" />
                            </div>
                            <div className="input-group">
                                <label>Bill Date <span className="required-asterisk">*</span></label>
                                <input type="date" className="glass-input" required value={billDate} onChange={e => setBillDate(e.target.value)} />
                            </div>
                        </div>

                        {/* Desktop Line Items Table */}
                        <div className="desktop-po-items-table data-table-container" style={{marginBottom: '2rem', border: '1px solid rgba(255,107,53,0.2)', overflowX: 'auto'}}>
                            <table className="glass-table" style={{minWidth: '1100px'}}>
                                <thead>
                                    <tr>
                                        <th style={{width: '25%'}}>Raw Material</th>
                                        <th style={{width: '8%', textAlign: 'right'}}>Stock</th>
                                        <th style={{width: '10%'}}>Quantity</th>
                                        <th style={{width: '10%'}}>Rate (₹)</th>
                                        <th style={{width: '10%'}}>GST (%)</th>
                                        <th style={{width: '8%', textAlign: 'right'}}>CGST</th>
                                        <th style={{width: '8%', textAlign: 'right'}}>SGST</th>
                                        <th style={{width: '12%'}}>Batch No</th>
                                        <th style={{width: '12%'}}>Expiry Date</th>
                                        <th style={{width: '10%', textAlign: 'right'}}>Subtotal</th>
                                        <th style={{width: '4%'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{verticalAlign: 'top', overflow: 'visible'}}>
                                                <SearchableSelect
                                                    className="glass-input"
                                                    required
                                                    value={item.raw_material}
                                                    onChange={(val) => handleItemChange(index, 'raw_material', val)}
                                                    style={{padding: '8px', border: 'none', background: 'rgba(0,0,0,0.3)'}}
                                                    options={materials.filter(m => m.is_active).map(m => ({ value: m.id, label: `${m.name} (${m.code})` }))}
                                                    placeholder="Select Material"
                                                />
                                            </td>
                                            <td style={{verticalAlign: 'top', paddingTop: '1.2rem', textAlign: 'right', fontFamily: 'monospace'}}>
                                                {item.current_stock !== undefined ? item.current_stock.toFixed(2) : '-'}
                                            </td>
                                            <td style={{verticalAlign: 'top'}}>
                                                <input type="number" min="0.01" step="0.01" className="glass-input" required value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} style={{padding: '8px', border: 'none', background: 'rgba(0,0,0,0.3)'}} />
                                            </td>
                                            <td style={{verticalAlign: 'top'}}>
                                                <input type="number" min="0.00" step="0.01" className="glass-input" required value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} style={{padding: '8px', border: 'none', background: 'rgba(0,0,0,0.3)'}} />
                                            </td>
                                            <td style={{verticalAlign: 'top'}}>
                                                <select className="glass-input" required value={item.gst} onChange={e => handleItemChange(index, 'gst', Number(e.target.value))} style={{padding: '8px', border: 'none', background: 'rgba(0,0,0,0.3)', color: 'white', cursor: 'pointer'}}>
                                                    <option value="0">0%</option>
                                                    <option value="5">5%</option>
                                                    <option value="12">12%</option>
                                                    <option value="18">18%</option>
                                                    <option value="28">28%</option>
                                                </select>
                                            </td>
                                            <td style={{verticalAlign: 'top', paddingTop: '1.2rem', textAlign: 'right', fontFamily: 'monospace'}}>
                                                ₹ {getItemCGST(item).toFixed(2)}
                                            </td>
                                            <td style={{verticalAlign: 'top', paddingTop: '1.2rem', textAlign: 'right', fontFamily: 'monospace'}}>
                                                ₹ {getItemSGST(item).toFixed(2)}
                                            </td>
                                            <td style={{verticalAlign: 'top'}}>
                                                <input type="text" className="glass-input" value={item.batch} placeholder="Batch Code (Optional)" onChange={e => handleItemChange(index, 'batch', e.target.value)} style={{padding: '8px', border: 'none', background: 'rgba(0,0,0,0.3)'}} />
                                            </td>
                                            <td style={{verticalAlign: 'top'}}>
                                                <input type="date" className="glass-input" value={item.expiry_date} onChange={e => handleItemChange(index, 'expiry_date', e.target.value)} style={{padding: '8px', border: 'none', background: 'rgba(0,0,0,0.3)', width: '130px', fontSize: '0.85rem'}} />
                                            </td>
                                            <td style={{verticalAlign: 'top', paddingTop: '1.2rem', fontWeight: 'bold', textAlign: 'right'}}>
                                                ₹ {getItemSubtotal(item).toFixed(2)}
                                            </td>
                                            <td style={{verticalAlign: 'top', paddingTop: '1rem'}}>
                                                <button type="button" className="action-icon-btn" onClick={() => removeRow(index)} disabled={items.length === 1}>
                                                    <Trash2 size={16} color={items.length === 1 ? '#555' : '#ef4444'} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <button type="button" className="btn-secondary" onClick={addRow} disabled={items.some(i => !i.raw_material || !i.quantity || !i.rate)} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', opacity: items.some(i => !i.raw_material || !i.quantity || !i.rate) ? 0.5 : 1, cursor: items.some(i => !i.raw_material || !i.quantity || !i.rate) ? 'not-allowed' : 'pointer'}}>
                                    <Plus size={16} /> Add Row
                                </button>
                                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-molten-yellow)'}}>
                                    Total: ₹ {calculateTotal(items).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Line Items Cards */}
                        <div className="mobile-po-items-cards">
                            {items.map((item, index) => (
                                <div className="po-item-card" key={index}>
                                    <div className="po-item-card-header">
                                        <h4>Item #{index + 1}</h4>
                                        <button type="button" className="action-icon-btn delete-btn" onClick={() => removeRow(index)} disabled={items.length === 1}>
                                            <Trash2 size={16} color={items.length === 1 ? '#555' : '#ef4444'} />
                                        </button>
                                    </div>
                                    <div className="po-item-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="input-group">
                                            <label>Raw Material <span className="required-asterisk">*</span></label>
                                            <SearchableSelect
                                                className="glass-input"
                                                required
                                                value={item.raw_material}
                                                onChange={(val) => handleItemChange(index, 'raw_material', val)}
                                                style={{padding: '8px', border: 'none', background: 'rgba(0,0,0,0.3)'}}
                                                options={materials.filter(m => m.is_active).map(m => ({ value: m.id, label: `${m.name} (${m.code})` }))}
                                                placeholder="Select Material"
                                            />
                                            {item.current_stock !== undefined && (
                                                <div style={{fontSize: '0.75rem', marginTop: '4px', color: '#a3e635', fontWeight: 500}}>
                                                    Current Stock: {item.current_stock.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="po-item-card-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))'}}>
                                            <div className="input-group">
                                                <label>Quantity <span className="required-asterisk">*</span></label>
                                                <input type="number" min="0.01" step="0.01" className="glass-input" required value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                                            </div>
                                            <div className="input-group">
                                                <label>Rate (₹) <span className="required-asterisk">*</span></label>
                                                <input type="number" min="0.00" step="0.01" className="glass-input" required value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} />
                                            </div>
                                            <div className="input-group">
                                                <label>GST (%) <span className="required-asterisk">*</span></label>
                                                <select className="glass-input" required value={item.gst} onChange={e => handleItemChange(index, 'gst', Number(e.target.value))} style={{color: 'white', background: 'rgba(0,0,0,0.3)'}}>
                                                    <option value="0">0%</option>
                                                    <option value="5">5%</option>
                                                    <option value="12">12%</option>
                                                    <option value="18">18%</option>
                                                    <option value="28">28%</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', color:'#aaa'}}>
                                            <span>CGST: ₹{getItemCGST(item).toFixed(2)}</span>
                                            <span>SGST: ₹{getItemSGST(item).toFixed(2)}</span>
                                        </div>
                                        <div className="po-item-card-grid">
                                            <div className="input-group">
                                                <label>Batch No</label>
                                                <input type="text" className="glass-input" value={item.batch} placeholder="Batch Code (Optional)" onChange={e => handleItemChange(index, 'batch', e.target.value)} />
                                            </div>
                                            <div className="input-group">
                                                <label>Expiry Date</label>
                                                <input type="date" className="glass-input" value={item.expiry_date} onChange={e => handleItemChange(index, 'expiry_date', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="po-item-amount-row">
                                            <span>Subtotal:</span>
                                            <strong style={{ color: '#fff', fontSize: '1.05rem' }}>₹ {getItemSubtotal(item).toFixed(2)}</strong>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', background: 'rgba(255, 107, 53, 0.03)', border: '1px solid rgba(255, 107, 53, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                                <button type="button" className="btn-secondary" onClick={addRow} disabled={items.some(i => !i.raw_material || !i.quantity || !i.rate)} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%'}}>
                                    <Plus size={16} /> Add Row
                                </button>
                                <div style={{fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--color-molten-yellow)', textAlign: 'center'}}>
                                    Total: ₹ {calculateTotal(items).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="input-group" style={{marginBottom: '2rem'}}>
                            <label>Remarks</label>
                            <textarea className="glass-input" value={remarks} maxLength={250} title="Maximum 250 characters" onChange={e => setRemarks(e.target.value)} style={{minHeight: '80px', resize: 'vertical'}} placeholder="Optional Inward notes (Max 250 characters)..." />
                        </div>

                        <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', flexWrap: 'wrap'}}>
                            <button type="button" onClick={resetForm} className="btn-secondary" style={{width: '150px'}}>
                                Cancel
                            </button>
                            <button type="button" onClick={(e) => handleSubmit(e, 'DRAFT')} disabled={loading} className="btn-secondary" style={{width: '150px', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)'}}>
                                Save as Draft
                            </button>
                            <button type="button" onClick={(e) => handleSubmit(e, 'COMPLETED')} disabled={loading} className="btn-primary" style={{width: '200px', margin: 0}}>
                                {loading ? 'Processing...' : 'Save & Complete'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {viewMode === 'view' && viewingInward && (
                <div className="glass-panel" style={{padding: '2rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,107,53,0.2)', paddingBottom: '1rem'}}>
                        <h2 style={{margin: 0, color: 'var(--color-molten-yellow)'}}>Purchase Inward: {viewingInward.inward_number}</h2>
                        <button type="button" onClick={() => setViewMode('list')} className="action-icon-btn" style={{background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%'}}>
                            <X size={20} color="white" />
                        </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div><strong>Supplier:</strong> <br/><span style={{fontSize: '1.1rem', fontWeight: 500}}>{viewingInward.supplier_name}</span></div>
                        <div><strong>Inward Date:</strong> <br/><span style={{fontSize: '1.1rem', fontFamily: 'monospace'}}>{viewingInward.inward_date}</span></div>
                        <div><strong>Bill Number:</strong> <br/><span style={{fontSize: '1.1rem'}}>{viewingInward.bill_no}</span></div>
                        <div><strong>Bill Date:</strong> <br/><span style={{fontSize: '1.1rem', fontFamily: 'monospace'}}>{viewingInward.bill_date}</span></div>
                        <div>
                            <strong>Status:</strong> <br/>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: viewingInward.status === 'COMPLETED' ? '#22c55e' : '#9ca3af',
                                    boxShadow: viewingInward.status === 'COMPLETED' ? '0 0 8px #22c55e' : '0 0 4px #9ca3af'
                                }}></span>
                                <span style={{ fontSize: '1.1rem', color: viewingInward.status === 'COMPLETED' ? '#22c55e' : '#aaa', fontWeight: 600 }}>
                                    {viewingInward.status}
                                </span>
                            </div>
                        </div>
                        <div style={{gridColumn: '1 / -1'}}><strong>Remarks:</strong> <br/><span style={{fontSize: '1.1rem', color: '#aaa'}}>{viewingInward.remarks}</span></div>
                    </div>

                    <h3 style={{marginBottom: '1rem'}}>Line Items</h3>
                    {/* Desktop details table */}
                    <div className="desktop-po-items-table data-table-container" style={{overflowX: 'auto'}}>
                        <table className="glass-table" style={{minWidth: '900px'}}>
                            <thead>
                                <tr>
                                    <th>Material Code</th>
                                    <th>Material Name</th>
                                    <th style={{textAlign:'right'}}>Quantity</th>
                                    <th style={{textAlign:'right'}}>Rate (₹)</th>
                                    <th style={{textAlign:'right'}}>GST</th>
                                    <th style={{textAlign:'right'}}>CGST (₹)</th>
                                    <th style={{textAlign:'right'}}>SGST (₹)</th>
                                    <th>Batch</th>
                                    <th>Expiry Date</th>
                                    <th style={{textAlign:'right'}}>Subtotal (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewingInward.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.raw_material_code}</td>
                                        <td>{item.raw_material_name}</td>
                                        <td style={{textAlign:'right'}}>{item.quantity}</td>
                                        <td style={{textAlign:'right'}}>{item.rate}</td>
                                        <td style={{textAlign:'right'}}>{item.gst}%</td>
                                        <td style={{textAlign:'right'}}>{item.cgst?.toFixed(2)}</td>
                                        <td style={{textAlign:'right'}}>{item.sgst?.toFixed(2)}</td>
                                        <td>{item.batch}</td>
                                        <td style={{fontFamily: 'monospace'}}>{item.expiry_date}</td>
                                        <td style={{textAlign:'right', fontWeight: 'bold'}}>{item.sub_total?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={9} style={{textAlign: 'right', fontWeight: 'bold'}}>Total Amount:</td>
                                    <td style={{textAlign: 'right', fontWeight: 'bold', color: 'var(--color-molten-yellow)', fontSize: '1.1rem'}}>₹ {calculateTotal(viewingInward.items).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile details cards */}
                    <div className="mobile-po-view-cards">
                        {viewingInward.items.map(item => (
                            <div className="po-item-view-card" key={item.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{item.raw_material_code}</span>
                                    <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>{item.raw_material_name}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: '#ccc' }}>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span>Quantity:</span> <strong>{item.quantity}</strong>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span>Rate:</span> <strong>₹{item.rate}</strong>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span>GST:</span> <strong>{item.gst}%</strong>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span>CGST:</span> <strong>₹{item.cgst?.toFixed(2)}</strong>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span>SGST:</span> <strong>₹{item.sgst?.toFixed(2)}</strong>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span>Batch No:</span> <strong>{item.batch}</strong>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span>Expiry:</span> <strong>{item.expiry_date}</strong>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: '8px', paddingTop: '8px' }}>
                                    <span style={{ color: '#888' }}>Subtotal:</span>
                                    <strong style={{ color: '#fff' }}>₹ {item.sub_total?.toFixed(2)}</strong>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,107,53,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,107,53,0.2)' }}>
                            <strong style={{ color: '#aaa' }}>Total Amount:</strong>
                            <strong style={{ color: 'var(--color-molten-yellow)', fontSize: '1.1rem' }}>₹ {calculateTotal(viewingInward.items).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseInwardTab;
