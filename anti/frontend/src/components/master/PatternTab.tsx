import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, Plus, Trash2, Image as ImageIcon, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import SearchableSelect from '../common/SearchableSelect';
import SearchableMultiSelect from '../common/SearchableMultiSelect';
import '../master/MasterStyles.css';

interface ProductCavity {
    product_id: string;
    cavity: number;
    material_type_id: string; // Map to pattern material, top plate material, etc.
}

interface Customer {
    id: number;
    name: string;
    customer_id: string;
}

interface PatternMaterial {
    id: number;
    name: string;
    material_id: string;
}

interface ProductMaster {
    id: number;
    name: string;
    product_id: string;
    customer: number;
}

interface CoreBoxMaster {
    id: number;
    name: string;
    core_box_id?: string;
}

interface Pattern {
    id: number;
    customer: number;
    customer_name?: string;
    pattern_id: string;
    top_plate?: number;
    top_plate_name?: string;
    bottom_plate?: number;
    bottom_plate_name?: string;
    products: ProductCavity[];
    core_boxes: number[];
    pattern_type: string;
    photos: string[];
    description: string;
    is_active: boolean;
}

const PatternTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [materials, setMaterials] = useState<PatternMaterial[]>([]);
    const [allProducts, setAllProducts] = useState<ProductMaster[]>([]);
    const [coreBoxes, setCoreBoxes] = useState<CoreBoxMaster[]>([]);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('pattern_search_query') || '';
    });
    
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        customer: '',
        pattern_id: '',
        top_plate: '',
        bottom_plate: '',
        pattern_type: 'CO2',
        description: '',
        is_active: true,
        products: [] as ProductCavity[],
        core_boxes: [] as number[],
        photos: [] as string[]
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

    useEffect(() => {
        fetchPatterns(page);
    }, [page]);

    useEffect(() => {
        loadDropdownOptions();
    }, []);

    const fetchPatterns = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/inventory/patterns/?page=${pageNumber}&page_size=10&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setPatterns(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setPatterns(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadDropdownOptions = async () => {
        try {
            const [custRes, matRes, prodRes, cbRes] = await Promise.all([
                api.get('/api/inventory/customers/?is_active=true&page_size=100'),
                api.get('/api/inventory/pattern-materials/?is_active=true&page_size=100'),
                api.get('/api/inventory/products/?is_active=true&page_size=100'),
                api.get('/api/inventory/core-boxes/?is_active=true&page_size=100')
            ]);
            setCustomers(custRes.data.results || custRes.data);
            setMaterials(matRes.data.results || matRes.data);
            setAllProducts(prodRes.data.results || prodRes.data);
            setCoreBoxes(cbRes.data.results || cbRes.data);
        } catch (err) {
            console.error("Failed to load dropdown options", err);
        }
    };

    const handleEdit = (pat: Pattern) => {
        setEditingId(pat.id);
        setFormData({
            customer: pat.customer.toString(),
            pattern_id: pat.pattern_id,
            top_plate: pat.top_plate?.toString() || '',
            bottom_plate: pat.bottom_plate?.toString() || '',
            pattern_type: pat.pattern_type,
            description: pat.description || '',
            is_active: pat.is_active,
            products: pat.products || [],
            core_boxes: pat.core_boxes || [],
            photos: pat.photos || []
        });
        setErrors({});
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            customer: '',
            pattern_id: '',
            top_plate: '',
            bottom_plate: '',
            pattern_type: 'CO2',
            description: '',
            is_active: true,
            products: [],
            core_boxes: [],
            photos: []
        });
        setErrors({});
    };

    const handleAddProductRow = () => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, { product_id: '', cavity: 1, material_type_id: '' }]
        }));
    };

    const handleRemoveProductRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index)
        }));
    };

    const handleProductRowChange = (index: number, field: keyof ProductCavity, value: any) => {
        setFormData(prev => {
            const updated = [...prev.products];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, products: updated };
        });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files).slice(0, 3); // Max 3 photos
            const base64Promises = filesArray.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
            });
            Promise.all(base64Promises).then(base64s => {
                setFormData(prev => ({ ...prev, photos: base64s }));
            }).catch(err => {
                console.error(err);
                showToast("Failed to load photos", "error");
            });
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Validate products
        const filteredProducts = formData.products.filter(p => p.product_id && p.material_type_id);
        if (filteredProducts.length === 0) {
            showToast("At least one Product with Cavity and Material is required.", "error");
            setLoading(false);
            return;
        }

        const validProducts = filteredProducts.map(p => ({
            product_id: p.product_id,
            cavity: p.cavity === '' ? 1 : (parseInt(p.cavity as any) || 1),
            material_type_id: p.material_type_id
        }));

        const payload = {
            ...formData,
            customer: parseInt(formData.customer),
            top_plate: formData.top_plate ? parseInt(formData.top_plate) : null,
            bottom_plate: formData.bottom_plate ? parseInt(formData.bottom_plate) : null,
            products: validProducts
        };

        try {
            if (editingId) {
                await api.put(`/api/inventory/patterns/${editingId}/`, payload);
                showToast('Pattern updated successfully', 'success');
            } else {
                await api.post('/api/inventory/patterns/', payload);
                showToast('Pattern added successfully', 'success');
                setPage(1);
            }
            cancelEdit();
            fetchPatterns(editingId ? page : 1);
        } catch (err: any) {
            if (err.response?.data) {
                setErrors(err.response.data);
                showToast('Unable to save pattern. Check fields.', 'error');
            } else {
                showToast('Network error while connecting to server.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('pattern_search_query', searchQuery);
        setPage(1);
        fetchPatterns(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('pattern_search_query');
        setPage(1);
        fetchPatterns(1, '');
    };

    const getProductName = (prodId: string) => {
        const found = allProducts.find(p => p.id.toString() === prodId || p.product_id === prodId);
        return found ? found.name : prodId;
    };

    const getMaterialName = (matId: string) => {
        const found = materials.find(m => m.id.toString() === matId || m.material_id === matId);
        return found ? found.name : matId;
    };

    const getCoreBoxNames = (ids: number[]) => {
        return ids.map(id => {
            const found = coreBoxes.find(cb => cb.id === id);
            return found ? found.name : id.toString();
        }).join(', ') || '-';
    };

    // Formatted dropdown options for SearchableSelect
    const customerOptions = customers.map(c => ({ value: c.id, label: `${c.name} (${c.customer_id})` }));
    const materialOptions = materials.map(m => ({ value: m.id, label: `${m.name} (${m.material_id})` }));
    const productOptions = allProducts
        .filter(p => p.customer?.toString() === formData.customer?.toString())
        .map(p => ({ value: p.id, label: p.name }));
    const coreBoxOptions = coreBoxes.map(cb => ({ value: cb.id, label: `${cb.name} (${cb.core_box_id})` }));

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pattern Master</h1>
                <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Configure patterns, plate assemblies, and products.</p>
            </div>
            <div className="glass-panel" style={{padding: '2rem'}}>
                <div className="tab-split-view">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                        {/* Search Bar */}
                        <div className="search-bar-container" style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                className="glass-input" 
                                placeholder="Search patterns..." 
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
                                <th>Pattern ID</th>
                                <th>Customer</th>
                                <th>Top Plate Mat.</th>
                                <th>Bottom Plate Mat.</th>
                                <th>Products & Cavity (Material)</th>
                                <th>Core Boxes</th>
                                <th>Type</th>
                                <th style={{width: '60px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {patterns.length === 0 ? (
                                <tr><td colSpan={8} style={{textAlign:'center', padding:'2rem'}}>No patterns found.</td></tr>
                            ) : patterns.map(pat => (
                                <tr key={pat.id} className={(editingId === pat.id ? 'editing-row ' : '') + (!pat.is_active ? 'inactive-row' : '')}>
                                    <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{pat.pattern_id}</td>
                                    <td>{pat.customer_name || '-'}</td>
                                    <td>{pat.top_plate_name || '-'}</td>
                                    <td>{pat.bottom_plate_name || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {pat.products?.map((p, idx) => (
                                                <span key={idx} style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                                    {getProductName(p.product_id)} (x{p.cavity}) - <strong style={{color: '#4cc9f0'}}>{getMaterialName(p.material_type_id)}</strong>
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: '#ccc', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getCoreBoxNames(pat.core_boxes)}>
                                        {getCoreBoxNames(pat.core_boxes)}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span 
                                                style={{ 
                                                    width: '8px', 
                                                    height: '8px', 
                                                    borderRadius: '50%', 
                                                    background: pat.is_active ? '#22c55e' : '#ef4444',
                                                    boxShadow: pat.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                                                    display: 'inline-block',
                                                    flexShrink: 0
                                                }} 
                                                title={pat.is_active ? 'Active' : 'Inactive'}
                                            />
                                            <span style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}>
                                                {pat.pattern_type === 'BLACK_SAND' ? 'BLACK SAND' : pat.pattern_type}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="action-icon-btn edit-btn" onClick={() => handleEdit(pat)} title="Edit Pattern">
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
                    {patterns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No patterns found.</div>
                    ) : patterns.map(pat => (
                        <div className="mobile-card" key={pat.id}>
                            <div className="mobile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3>Pattern {pat.pattern_id}</h3>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: pat.is_active ? '#4ade80' : '#f87171' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pat.is_active ? '#22c55e' : '#ef4444', boxShadow: pat.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444' }}></span>
                                    {pat.is_active ? 'Active' : 'Inactive'}
                                </span>
                             </div>
                             <div className="mobile-card-body">
                                 <p><strong>Customer</strong> <span>{pat.customer_name || '-'}</span></p>
                                 <p><strong>Top Plate Mat.</strong> <span>{pat.top_plate_name || '-'}</span></p>
                                 <p><strong>Bottom Plate Mat.</strong> <span>{pat.bottom_plate_name || '-'}</span></p>
                                 <p><strong>Type</strong> <span>{pat.pattern_type}</span></p>
                                 <p><strong>Core Boxes</strong> <span style={{ fontSize: '0.9rem' }}>{getCoreBoxNames(pat.core_boxes)}</span></p>
                                 <div className="mobile-card-chips" style={{ marginTop: '8px' }}>
                                     <strong>Products & Cavities (Material)</strong>
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                         {pat.products?.map((p, idx) => (
                                             <span key={idx} style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                                 {getProductName(p.product_id)} (x{p.cavity}) - {getMaterialName(p.material_type_id)}
                                             </span>
                                         ))}
                                     </div>
                                 </div>
                                 {pat.photos?.length > 0 && (
                                     <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                                         {pat.photos.map((ph, idx) => (
                                             <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                 <img src={ph} alt="Pattern" style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} />
                                                 <a href={ph} download={`pattern_${pat.pattern_id}_${idx + 1}.jpg`} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
                                                     <Download size={10} /> Download
                                                 </a>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                             <div className="mobile-card-actions">
                                 <button className="action-icon-btn edit-btn" onClick={() => handleEdit(pat)} title="Edit Pattern">
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

            <div className="form-panel" style={{ maxWidth: '450px' }}>
                <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', height: '2rem', marginBottom: '1rem' }}>
                    {editingId ? 'Edit Pattern' : 'Add Pattern'}
                </h3>
                <form onSubmit={handleSubmit}>
                    {/* Customer Dropdown */}
                    <div className="input-group">
                        <label>Select Customer <span className="required-asterisk">*</span></label>
                        <SearchableSelect 
                            options={customerOptions}
                            value={formData.customer}
                            onChange={val => setFormData({ ...formData, customer: val, products: [] })}
                            placeholder="-- Type to search Customer --"
                            required
                        />
                        {errors.customer && <span className="error-text">{errors.customer}</span>}
                    </div>

                    {/* Pattern ID */}
                    <div className="input-group">
                        <label>Pattern ID <span className="required-asterisk">*</span></label>
                        <input className="glass-input" required maxLength={15} pattern="^[A-Za-z0-9_\-]+$" title="Alphanumeric, dashes, and underscores only. Max 15 chars." placeholder="" value={formData.pattern_id} onChange={e => setFormData({...formData, pattern_id: e.target.value.toUpperCase()})} />
                        {errors.pattern_id && <span className="error-text">{errors.pattern_id}</span>}
                    </div>

                    {/* Top Plate Material Dropdown */}
                    <div className="input-group">
                        <label>Top Plate Material</label>
                        <SearchableSelect 
                            options={materialOptions}
                            value={formData.top_plate}
                            onChange={val => setFormData({ ...formData, top_plate: val })}
                            placeholder="-- Type to search Material --"
                        />
                        {errors.top_plate && <span className="error-text">{errors.top_plate}</span>}
                    </div>

                    {/* Bottom Plate Material Dropdown */}
                    <div className="input-group">
                        <label>Bottom Plate Material</label>
                        <SearchableSelect 
                            options={materialOptions}
                            value={formData.bottom_plate}
                            onChange={val => setFormData({ ...formData, bottom_plate: val })}
                            placeholder="-- Type to search Material --"
                        />
                        {errors.bottom_plate && <span className="error-text">{errors.bottom_plate}</span>}
                    </div>

                    {/* Product, Cavity & Material Type Dynamics Table */}
                    <div className="input-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ margin: 0, fontSize: '0.9rem', color: '#ff6b35' }}>Product & Cavity Table <span className="required-asterisk">*</span></label>
                            <button type="button" onClick={handleAddProductRow} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Plus size={14} /> Add Row
                            </button>
                        </div>
                        {formData.products.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ flex: 1.8 }}>
                                    <SearchableSelect 
                                        options={productOptions}
                                        value={item.product_id}
                                        onChange={val => handleProductRowChange(idx, 'product_id', val)}
                                        placeholder="Product..."
                                        required
                                    />
                                </div>
                                <input type="number" className="glass-input" style={{ width: '55px', padding: '6px', textAlign: 'center', fontSize: '0.85rem', minHeight: '38px' }} min={1} max={100} value={item.cavity} onChange={e => handleProductRowChange(idx, 'cavity', e.target.value === '' ? '' : parseInt(e.target.value))} required />
                                <div style={{ flex: 1.8 }}>
                                    <SearchableSelect 
                                        options={materialOptions}
                                        value={item.material_type_id}
                                        onChange={val => handleProductRowChange(idx, 'material_type_id', val)}
                                        placeholder="Material..."
                                        required
                                    />
                                </div>
                                <button type="button" onClick={() => handleRemoveProductRow(idx)} className="action-icon-btn delete-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '6px', borderRadius: '4px', height: '38px', width: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Core Box Multi-Select */}
                    <div className="input-group">
                        <label style={{ marginBottom: '6px' }}>Core Box (Select multiple)</label>
                        <SearchableMultiSelect 
                            options={coreBoxOptions}
                            selectedValues={formData.core_boxes}
                            onChange={(vals) => setFormData(prev => ({ ...prev, core_boxes: vals as number[] }))}
                            placeholder="Type to search and select Core Box..."
                        />
                    </div>

                    {/* Pattern Type Dropdown */}
                    <div className="input-group">
                        <label>Pattern Type</label>
                        <select className="glass-input" value={formData.pattern_type} onChange={e => setFormData({...formData, pattern_type: e.target.value})}>
                            <option value="CO2">Co2</option>
                            <option value="BLACK_SAND">Black Sand</option>
                        </select>
                        {errors.pattern_type && <span className="error-text">{errors.pattern_type}</span>}
                    </div>

                    {/* Photo Upload */}
                    <div className="input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ImageIcon size={16} /> Upload Photo (Max 3 JPG)</label>
                        <input type="file" multiple accept=".jpg,.jpeg" onChange={handlePhotoUpload} style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginTop: '4px' }} />
                        {formData.photos.length > 0 && (
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {formData.photos.map((ph, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <img src={ph} alt="Upload Thumbnail" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                                        <a href={ph} download={`pattern_new_${idx + 1}.jpg`} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
                                            <Download size={10} /> Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="input-group">
                        <label>Description</label>
                        <textarea className="glass-input" maxLength={250} style={{ minHeight: '60px', padding: '8px' }} placeholder="Notes about this pattern..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        {errors.description && <span className="error-text">{errors.description}</span>}
                    </div>

                    {/* Active Checkbox */}
                    <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                        <input type="checkbox" id="pat-active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                        <label htmlFor="pat-active" style={{ margin: 0, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' }}>Active Record</label>
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
export default PatternTab;
