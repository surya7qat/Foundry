import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, Search, X, ChevronLeft, ChevronRight, Plus, Eye } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import '../master/MasterStyles.css';

interface ProductStock {
    id: number;
    customer: number;
    customer_name: string;
    customer_code: string;
    product: number;
    product_name: string;
    product_code: string;
    batch_no: string;
    quantity: number;
}

interface GroupedProductStock {
    product_id: number;
    product_name: string;
    product_code: string;
    customer_name: string;
    customer_code: string;
    total_quantity: number;
    batches: ProductStock[];
}

interface Customer {
    id: number;
    name: string;
    code: string;
}

interface Product {
    id: number;
    name: string;
    product_id: string;
    customer: number;
}

const ProductStockTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [groupedStocks, setGroupedStocks] = useState<GroupedProductStock[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('product_stock_search_query') || '';
    });
    const [loading, setLoading] = useState(false);

    // Group Details Popup State
    const [selectedGroup, setSelectedGroup] = useState<GroupedProductStock | null>(null);

    // Dropdowns for New Record Form
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState<string>('');
    const [newProduct, setNewProduct] = useState<string>('');
    const [newBatchNo, setNewBatchNo] = useState<string>('');
    const [newQty, setNewQty] = useState<string>('');

    // Correction Modal States
    const [selectedStock, setSelectedStock] = useState<ProductStock | null>(null);
    const [correctedQty, setCorrectedQty] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchStocks = async (pageNum = 1, searchVal = searchQuery) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/inventory/product-stock/`, {
                params: {
                    page: pageNum,
                    page_size: 100,
                    search: searchVal
                }
            });
            const results: ProductStock[] = res.data.results || [];

            // Group by Product ID
            const groups: { [key: number]: GroupedProductStock } = {};
            results.forEach(item => {
                const prodId = item.product;
                if (!groups[prodId]) {
                    groups[prodId] = {
                        product_id: prodId,
                        product_name: item.product_name,
                        product_code: item.product_code,
                        customer_name: item.customer_name,
                        customer_code: item.customer_code,
                        total_quantity: 0,
                        batches: []
                    };
                }
                groups[prodId].total_quantity += item.quantity;
                groups[prodId].batches.push(item);
            });

            const groupedArray = Object.values(groups);
            setGroupedStocks(groupedArray);
            setTotalPages(Math.ceil((groupedArray.length || 0) / 10));
        } catch (err: any) {
            console.error(err);
            showToast('Failed to fetch product stock records.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const [custRes, prodRes] = await Promise.all([
                api.get('/api/inventory/customers/?page_size=100'),
                api.get('/api/inventory/products/?page_size=100')
            ]);
            setCustomers(custRes.data.results || []);
            setProducts(prodRes.data.results || []);
        } catch (err) {
            console.error('Failed to fetch dropdown datasets', err);
        }
    };

    useEffect(() => {
        fetchStocks(page);
        fetchDropdowns();
    }, [page]);

    // Keep active selected group popup in sync when stock updates
    useEffect(() => {
        if (selectedGroup) {
            const updatedGroup = groupedStocks.find(g => g.product_id === selectedGroup.product_id);
            if (updatedGroup) {
                setSelectedGroup(updatedGroup);
            } else {
                setSelectedGroup(null);
            }
        }
    }, [groupedStocks]);

    const handleSearch = () => {
        setPage(1);
        sessionStorage.setItem('product_stock_search_query', searchQuery);
        fetchStocks(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setPage(1);
        sessionStorage.removeItem('product_stock_search_query');
        fetchStocks(1, '');
    };

    const handleNewRecordClick = () => {
        setNewCustomer('');
        setNewProduct('');
        setNewBatchNo('');
        setNewQty('');
        setShowNewModal(true);
    };

    const handleCreateProductStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomer || !newProduct || !newBatchNo.trim() || !newQty) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        if (isNaN(Number(newQty)) || Number(newQty) < 0) {
            showToast('Quantity must be a non-negative number.', 'error');
            return;
        }

        setSaving(true);
        try {
            await api.post('/api/inventory/product-stock/', {
                customer: Number(newCustomer),
                product: Number(newProduct),
                batch_no: newBatchNo.trim(),
                quantity: Number(newQty)
            });
            showToast('Product Stock entry created successfully!', 'success');
            setShowNewModal(false);
            fetchStocks(1);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to create product stock entry.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCorrectStockClick = (stock: ProductStock, e: React.MouseEvent) => {
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
            await api.post(`/api/inventory/product-stock/${selectedStock.id}/correct_stock/`, {
                corrected_quantity: Number(correctedQty),
                reason: reason
            });
            showToast('Product stock corrected successfully!', 'success');
            setSelectedStock(null);
            setShowConfirm(false);
            fetchStocks(page);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.detail || 'Failed to correct product stock.', 'error');
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

    // Filter products list based on selected customer in creation modal
    const filteredProductsForNew = products.filter(p => !newCustomer || p.customer === Number(newCustomer));
    const paginatedGrouped = groupedStocks.slice((page - 1) * 10, page * 10);

    return (
        <div className="tab-container" style={{ position: 'relative' }}>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Product Stock (Grouped)</h2>
                <button className="btn-primary" onClick={handleNewRecordClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Plus size={18} /> New Entry
                </button>
            </div>

            {/* Search Bar */}
            <div className="search-bar-container" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="search-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input 
                        type="text" 
                        placeholder="Search by Customer, Product or Batch No..." 
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
                                <th>Customer Name / Code</th>
                                <th>Product Name / ID</th>
                                <th>Total Quantity</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading product stock records...</td></tr>
                            ) : paginatedGrouped.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No stock records found.</td></tr>
                            ) : paginatedGrouped.map(st => (
                                <tr key={st.product_id} onClick={() => setSelectedGroup(st)} style={{ cursor: 'pointer' }} className="hover-row">
                                    <td>
                                        <div style={{ fontWeight: '600' }}>{st.customer_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: 'monospace' }}>{st.customer_code}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '600' }}>{st.product_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: 'monospace' }}>{st.product_code}</div>
                                    </td>
                                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>
                                        {st.total_quantity.toFixed(0)} <span style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'normal' }}>Nos</span>
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
                        <div className="mobile-card hover-row" key={st.product_id} onClick={() => setSelectedGroup(st)} style={{ cursor: 'pointer' }}>
                            <div className="mobile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>{st.product_name}</h3>
                                <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{st.product_code}</span>
                            </div>
                            <div className="mobile-card-body">
                                <p><strong>Customer:</strong> <span>{st.customer_name} ({st.customer_code})</span></p>
                                <p><strong>Total Qty:</strong> <strong className="amount-highlight">{st.total_quantity.toFixed(0)} Nos</strong></p>
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

            {/* Form Modal: Add New Product Stock */}
            {showNewModal && (
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
                                Add Product Stock Entry
                            </h3>
                            <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProductStock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="input-group">
                                <label>Customer *</label>
                                <select 
                                    className="glass-input" 
                                    value={newCustomer} 
                                    onChange={e => {
                                        setNewCustomer(e.target.value);
                                        setNewProduct(''); // Reset product when customer changes
                                    }}
                                    required
                                >
                                    <option value="">-- Select Customer --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Product *</label>
                                <select 
                                    className="glass-input" 
                                    value={newProduct} 
                                    onChange={e => setNewProduct(e.target.value)}
                                    required
                                    disabled={!newCustomer}
                                >
                                    <option value="">-- Select Product --</option>
                                    {filteredProductsForNew.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.product_id})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Batch Number *</label>
                                <input 
                                    type="text" 
                                    className="glass-input" 
                                    value={newBatchNo} 
                                    onChange={e => setNewBatchNo(e.target.value)} 
                                    placeholder="e.g. B-PROD-999" 
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Initial Quantity *</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="1"
                                    className="glass-input" 
                                    value={newQty} 
                                    onChange={e => setNewQty(e.target.value)} 
                                    placeholder="Enter initial count..." 
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowNewModal(false)} style={{ margin: 0, flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={saving} style={{ margin: 0, flex: 1 }}>
                                    {saving ? 'Saving...' : 'Add Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Popup Modal: Group Batches Details */}
            {selectedGroup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="glass-panel" style={{
                        width: '90%', maxWidth: '600px', padding: '1.5rem',
                        position: 'relative', border: '1px solid rgba(255,107,53,0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxHeight: '85vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--color-molten-yellow)', fontSize: '1.3rem' }}>
                                    {selectedGroup.product_name}
                                </h3>
                                <div style={{ fontSize: '0.85rem', color: '#aaa', fontFamily: 'monospace', marginTop: '2px' }}>
                                    Product ID: {selectedGroup.product_code} | Customer: {selectedGroup.customer_name} ({selectedGroup.customer_code})
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
                                        <th>Quantity</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Correct</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedGroup.batches.map(b => (
                                        <tr key={b.id}>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{b.batch_no}</td>
                                            <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                {b.quantity.toFixed(0)} <span style={{ fontWeight: 'normal', color: '#ccc', fontSize: '0.8rem' }}>Nos</span>
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
                                Product Stock Correction
                            </h3>
                            <button onClick={() => setSelectedStock(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleOpenConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                <div style={{ marginBottom: '4px' }}><strong>Customer:</strong> {selectedStock.customer_name} ({selectedStock.customer_code})</div>
                                <div style={{ marginBottom: '4px' }}><strong>Product:</strong> {selectedStock.product_name} ({selectedStock.product_code})</div>
                                <div style={{ marginBottom: '4px' }}><strong>Batch No:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{selectedStock.batch_no}</span></div>
                                <div><strong>Current Quantity:</strong> <span style={{ fontWeight: '700' }}>{selectedStock.quantity.toFixed(0)} Nos</span></div>
                            </div>

                            <div className="input-group">
                                <label>Corrected Quantity *</label>
                                <input 
                                    type="number" 
                                    step="1"
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
                                    placeholder="Enter correction reason (e.g. damages, count recount, shipping delta)..." 
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
                        <p style={{ fontSize: '0.9rem', color: '#ddd', lineHeight: '1.4', margin: '0 0 1.5rem 0' }}>
                            You are correcting the stock of <strong>{selectedStock.product_name}</strong> (Batch: {selectedStock.batch_no}) from <strong>{selectedStock.quantity.toFixed(0)}</strong> to <strong>{Number(correctedQty).toFixed(0)}</strong>. This correction will be logged permanently.
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

export default ProductStockTab;
