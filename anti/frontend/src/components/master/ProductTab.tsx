import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import SearchableSelect from '../common/SearchableSelect';
import '../master/MasterStyles.css';

interface Product {
    id: number;
    product_id: string;
    name: string;
    customer: number;
    customer_name?: string;
    is_active: boolean;
}

interface Customer {
    id: number;
    name: string;
    customer_id: string;
}

const ProductTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('product_search_query') || '';
    });
    
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        product_id: '',
        name: '',
        customer: '',
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

    useEffect(() => { fetchProducts(page); }, [page]);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    const fetchDropdowns = async () => {
        try {
            const res = await api.get('/api/inventory/customers/?page_size=300&is_active=true');
            setCustomers(res.data.results || res.data);
        } catch (err) {
            console.error('Failed to load customers dropdown', err);
        }
    };

    const fetchProducts = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/inventory/products/?page=${pageNumber}&page_size=10&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setProducts(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setProducts(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (prod: Product) => {
        setEditingId(prod.id);
        setFormData({
            product_id: prod.product_id,
            name: prod.name,
            customer: prod.customer ? prod.customer.toString() : '',
            is_active: prod.is_active
        });
        setErrors({});
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            product_id: '',
            name: '',
            customer: '',
            is_active: true
        });
        setErrors({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        if (!formData.customer) {
            showToast('Customer is a mandatory field.', 'error');
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            customer: parseInt(formData.customer)
        };

        try {
            if (editingId) {
                await api.put(`/api/inventory/products/${editingId}/`, payload);
                showToast('Product updated successfully', 'success');
            } else {
                await api.post('/api/inventory/products/', payload);
                showToast('Product added successfully', 'success');
                setPage(1);
            }
            cancelEdit();
            fetchProducts(editingId ? page : 1);
        } catch (err: any) {
            if (err.response?.data) {
                setErrors(err.response.data);
                showToast('Unable to save product. Please check the fields.', 'error');
            } else {
                showToast('Network error while connecting to server.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('product_search_query', searchQuery);
        setPage(1);
        fetchProducts(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('product_search_query');
        setPage(1);
        fetchProducts(1, '');
    };

    const customerOptions = customers.map(c => ({ value: c.id, label: `${c.name} (${c.customer_id})` }));

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Product Master</h1>
                <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Manage all production products here.</p>
            </div>
            <div className="glass-panel" style={{padding: '2rem'}}>
                <div className="tab-split-view">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                        {/* Search Bar */}
                        <div className="search-bar-container" style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                className="glass-input" 
                                placeholder="Search products..." 
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
                                <th>Product ID</th>
                                <th>Product Name</th>
                                <th>Customer</th>
                                <th style={{width: '60px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr><td colSpan={4} style={{textAlign:'center', padding:'2rem'}}>No products found.</td></tr>
                            ) : products.map(prod => (
                                <tr key={prod.id} className={(editingId === prod.id ? 'editing-row ' : '') + (!prod.is_active ? 'inactive-row' : '')}>
                                    <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{prod.product_id}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span 
                                                style={{ 
                                                    width: '8px', 
                                                    height: '8px', 
                                                    borderRadius: '50%', 
                                                    background: prod.is_active ? '#22c55e' : '#ef4444',
                                                    boxShadow: prod.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                                                    display: 'inline-block',
                                                    flexShrink: 0
                                                }} 
                                                title={prod.is_active ? 'Active' : 'Inactive'}
                                            />
                                            <span style={{ fontWeight: '600', color: '#fff' }}>{prod.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '500' }}>{prod.customer_name || '-'}</td>
                                    <td>
                                        <button className="action-icon-btn edit-btn" onClick={() => handleEdit(prod)} title="Edit Product">
                                            <Edit2 size={16} />
                                        </button>
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
                    {products.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No products found.</div>
                    ) : products.map(prod => (
                        <div className="mobile-card" key={prod.id}>
                            <div className="mobile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3>{prod.name}</h3>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: prod.is_active ? '#4ade80' : '#f87171' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: prod.is_active ? '#22c55e' : '#ef4444', boxShadow: prod.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444' }}></span>
                                    {prod.is_active ? 'Active' : 'Inactive'}
                                </span>
                             </div>
                             <div className="mobile-card-body">
                                 <p><strong>Product ID</strong> <span className="monospace-text" style={{ color: 'var(--color-molten-yellow)' }}>{prod.product_id}</span></p>
                                 <p><strong>Customer</strong> <span>{prod.customer_name || '-'}</span></p>
                             </div>
                             <div className="mobile-card-actions">
                                 <button className="action-icon-btn edit-btn" onClick={() => handleEdit(prod)} title="Edit Product">
                                     <Edit2 size={16} /> Edit
                                 </button>
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

            <div className="form-panel">
                <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', height: '2rem', marginBottom: '1rem' }}>
                    {editingId ? 'Edit Product' : 'Add Product'}
                </h3>
                <form onSubmit={handleSubmit}>
                    {/* Product ID */}
                    <div className="input-group">
                        <label>Product ID <span className="required-asterisk">*</span></label>
                        <input className="glass-input" required maxLength={15} pattern="^[A-Za-z0-9_\-]+$" title="Alphanumeric, dashes, and underscores only. Max 15 chars." value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value.toUpperCase()})} />
                        {errors.product_id && <span className="error-text">{errors.product_id}</span>}
                    </div>

                    {/* Product Name */}
                    <div className="input-group">
                        <label>Product Name <span className="required-asterisk">*</span></label>
                        <input className="glass-input" required maxLength={100} title="Maximum 100 characters" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    {/* Customer */}
                    <div className="input-group">
                        <label>Customer <span className="required-asterisk">*</span></label>
                        <SearchableSelect
                            options={customerOptions}
                            value={formData.customer}
                            onChange={val => setFormData({ ...formData, customer: val })}
                            placeholder="Select customer..."
                        />
                        {errors.customer && <span className="error-text">{errors.customer}</span>}
                    </div>

                    {/* Active Checkbox */}
                    <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                        <input type="checkbox" id="prod-active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                        <label htmlFor="prod-active" style={{ margin: 0, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' }}>Active Record</label>
                    </div>
                    
                    <div style={{display: 'flex', gap: '10px', marginTop: '1.5rem', minHeight: '50px'}}>
                        <button type="submit" disabled={loading} className="btn-primary" style={{margin: 0, flex: 1}}>
                            {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                        </button>
                        {editingId && (
                            <button type="button" onClick={cancelEdit} className="btn-secondary" style={{margin: 0, flex: 1}}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
            </div>
        </div>
    );
};
export default ProductTab;
