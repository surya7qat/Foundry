import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, Plus, Trash2, Image as ImageIcon, Download, ChevronLeft, ChevronRight, History, Package } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import SearchableSelect from '../common/SearchableSelect';
import '../master/MasterStyles.css';

interface ProductCavity {
    product_id: string;
    cavity: number;
    core_weight?: number;
    part?: string;
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

interface RawMaterial {
    id: number;
    code: string;
    name: string;
    unit: string;
    departments: string[];
}

interface CoreBoxRawMaterial {
    raw_material_id: string;
    usage_type: 'PERCENTAGE' | 'UNIT';
    value: number;
}

interface ProductMaster {
    id: number;
    name: string;
    product_id: string;
    customer: number;
}

interface CoreBox {
    id: number;
    customer: number;
    customer_name?: string;
    core_box_id: string;
    name: string;
    top_core_box?: number;
    top_core_box_name?: string;
    bottom_core_box?: number;
    bottom_core_box_name?: string;
    products: ProductCavity[];
    core_box_type: string;
    total_weight?: number;
    raw_materials?: CoreBoxRawMaterial[];
    photos: string[];
    description: string;
    is_active: boolean;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}

const CoreBoxTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [coreBoxes, setCoreBoxes] = useState<CoreBox[]>([]);
    const [auditLogData, setAuditLogData] = useState<{ created_by?: string; created_at?: string; updated_by?: string; updated_at?: string } | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [patternMaterials, setPatternMaterials] = useState<PatternMaterial[]>([]);
    const [allProducts, setAllProducts] = useState<ProductMaster[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    
    // Modal states for Raw Materials Configuration popup
    const [rawMaterialsModalCb, setRawMaterialsModalCb] = useState<CoreBox | null>(null);
    const [modalRawMaterials, setModalRawMaterials] = useState<CoreBoxRawMaterial[]>([]);
    const [modalSaving, setModalSaving] = useState(false);
    const [modalErrors, setModalErrors] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('core_box_search_query') || '';
    });
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        customer: '',
        core_box_id: '',
        name: '',
        top_core_box: '',
        bottom_core_box: '',
        core_box_type: 'CO2',
        description: '',
        is_active: true,
        products: [] as ProductCavity[],
        photos: [] as string[],
        total_weight: 0,
        raw_materials: [] as CoreBoxRawMaterial[]
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
        fetchCoreBoxes(page);
    }, [page]);

    useEffect(() => {
        loadDropdownOptions();
    }, []);

    const fetchCoreBoxes = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/inventory/core-boxes/?page=${pageNumber}&page_size=10&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setCoreBoxes(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setCoreBoxes(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadDropdownOptions = async () => {
        try {
            const [custRes, matRes, prodRes, rawRes] = await Promise.all([
                api.get('/api/inventory/customers/?is_active=true&page_size=100'),
                api.get('/api/inventory/pattern-materials/?is_active=true&page_size=100'),
                api.get('/api/inventory/products/?is_active=true&page_size=100'),
                api.get('/api/inventory/raw-materials/?is_active=true&page_size=100')
            ]);
            setCustomers(custRes.data.results || custRes.data);
            setPatternMaterials(matRes.data.results || matRes.data);
            setAllProducts(prodRes.data.results || prodRes.data);
            setRawMaterials(rawRes.data.results || rawRes.data);
        } catch (err) {
            console.error("Failed to load dropdown options", err);
        }
    };

    const handleOpenRawMaterialsModal = (cb: CoreBox) => {
        setRawMaterialsModalCb(cb);
        setModalRawMaterials(cb.raw_materials || []);
        setModalErrors(null);
    };

    const getMaterialUnit = (rawMaterialId: string | number) => {
        const mat = rawMaterials.find(rm => rm.id.toString() === rawMaterialId?.toString());
        return mat ? mat.unit : 'Unit';
    };

    const handleSaveRawMaterials = async () => {
        if (!rawMaterialsModalCb) return;
        
        // Filter empty raw material rows
        const validRows = modalRawMaterials.filter(row => row.raw_material_id);
        
        // Validation check: sum of percentages must be <= 100%
        let totalPercent = 0;
        for (const r of validRows) {
            if (r.usage_type === 'PERCENTAGE') {
                const val = parseFloat(r.value as any) || 0;
                if (val < 0 || val > 100) {
                    setModalErrors("Percentage values must be between 0 and 100.");
                    return;
                }
                totalPercent += val;
            }
        }
        if (totalPercent > 100) {
            setModalErrors(`Total percentage (${totalPercent.toFixed(2)}%) cannot exceed 100%.`);
            return;
        }
        
        setModalSaving(true);
        try {
            const payload = {
                ...rawMaterialsModalCb,
                customer: rawMaterialsModalCb.customer,
                top_core_box: rawMaterialsModalCb.top_core_box,
                bottom_core_box: rawMaterialsModalCb.bottom_core_box,
                raw_materials: validRows
            };
            await api.put(`/api/inventory/core-boxes/${rawMaterialsModalCb.id}/`, payload);
            showToast("Raw materials configuration saved successfully", "success");
            fetchCoreBoxes(page);
            setRawMaterialsModalCb(null);
        } catch (err: any) {
            console.error(err);
            setModalErrors(err.response?.data?.detail || "Failed to save raw materials configuration.");
        } finally {
            setModalSaving(false);
        }
    };

    const handleEdit = (cb: CoreBox) => {
        setEditingId(cb.id);
        setFormData({
            customer: cb.customer ? cb.customer.toString() : '',
            core_box_id: cb.core_box_id || '',
            name: cb.name,
            top_core_box: cb.top_core_box?.toString() || '',
            bottom_core_box: cb.bottom_core_box?.toString() || '',
            core_box_type: cb.core_box_type,
            description: cb.description || '',
            is_active: cb.is_active,
            products: cb.products || [],
            photos: cb.photos || [],
            total_weight: cb.total_weight || 0,
            raw_materials: cb.raw_materials || []
        });
        setErrors({});
        setViewMode('edit');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            customer: '',
            core_box_id: '',
            name: '',
            top_core_box: '',
            bottom_core_box: '',
            core_box_type: 'CO2',
            description: '',
            is_active: true,
            products: [],
            photos: [],
            total_weight: 0,
            raw_materials: []
        });
        setErrors({});
        setViewMode('list');
    };

    const handleAddProductRow = () => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, { product_id: '', cavity: 1, core_weight: 0, part: '' }]
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
        const filteredProducts = formData.products.filter(p => p.product_id);
        if (filteredProducts.length === 0) {
            showToast("At least one Product with Cavity is required.", "error");
            setLoading(false);
            return;
        }

        const validProducts = filteredProducts.map(p => ({
            product_id: p.product_id,
            cavity: (p.cavity as any) === '' ? 1 : (parseInt(p.cavity as any) || 1),
            core_weight: (p.core_weight as any) === '' ? 0 : (parseFloat(p.core_weight as any) || 0),
            part: p.part || ''
        }));

        const payload = {
            ...formData,
            customer: parseInt(formData.customer),
            top_core_box: formData.top_core_box ? parseInt(formData.top_core_box) : null,
            bottom_core_box: formData.bottom_core_box ? parseInt(formData.bottom_core_box) : null,
            products: validProducts,
            total_weight: parseFloat(formData.total_weight as any) || 0,
            raw_materials: formData.raw_materials || []
        };

        try {
            if (editingId) {
                await api.put(`/api/inventory/core-boxes/${editingId}/`, payload);
                showToast('Core Box updated successfully', 'success');
            } else {
                await api.post('/api/inventory/core-boxes/', payload);
                showToast('Core Box added successfully', 'success');
                setPage(1);
            }
            cancelEdit();
            fetchCoreBoxes(editingId ? page : 1);
        } catch (err: any) {
            if (err.response?.data) {
                setErrors(err.response.data);
                showToast('Unable to save Core Box. Check fields.', 'error');
            } else {
                showToast('Network error while connecting to server.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('core_box_search_query', searchQuery);
        setPage(1);
        fetchCoreBoxes(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('core_box_search_query');
        setPage(1);
        fetchCoreBoxes(1, '');
    };

    const getProductName = (prodId: string) => {
        const found = allProducts.find(p => p.id.toString() === prodId || p.product_id === prodId);
        return found ? found.name : prodId;
    };

    const calculateCoreBoxMetrics = (cb: CoreBox) => {
        const totalWeight = cb.total_weight || 0;
        let totalPcsWeight = 0;
        cb.products?.forEach(p => {
            const cavity = p.cavity || 0;
            const coreWeight = p.core_weight || 0;
            totalPcsWeight += cavity * coreWeight;
        });
        const wastage = totalWeight - totalPcsWeight;
        return {
            totalPcsWeight,
            wastage
        };
    };

    // Prepare dropdown options formatted as { value, label } for SearchableSelect
    const customerOptions = customers.map(c => ({ value: c.id, label: `${c.name} (${c.customer_id})` }));
    const materialOptions = patternMaterials.map(pm => ({ value: pm.id, label: `${pm.name} (${pm.material_id})` }));
    const productOptions = allProducts
        .filter(p => p.customer?.toString() === formData.customer?.toString())
        .map(p => ({ value: p.id, label: p.name }));

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Core Box Master</h1>
                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Configure core boxes, cavities, and properties.</p>
                </div>
                {viewMode === 'list' && (
                    <button className="btn-primary" onClick={() => { cancelEdit(); setViewMode('create'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', fontSize: '0.9rem', padding: '0 16px', margin: 0 }}>
                        <Plus size={16} /> New Core Box
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
                                placeholder="Search core boxes..." 
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
                                            <th>Customer Name</th>
                                            <th>Core Box ID</th>
                                            <th>Core Box Name</th>
                                            <th>Top Box Mat.</th>
                                            <th>Bottom Box Mat.</th>
                                            <th>Type</th>
                                            <th>Total Weight</th>
                                            <th>Products (Cavities & Weight)</th>
                                            <th>Wastage</th>
                                            <th style={{width: '80px', textAlign: 'center'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coreBoxes.length === 0 ? (
                                            <tr><td colSpan={10} style={{textAlign:'center', padding:'2rem'}}>No Core Boxes recorded yet.</td></tr>
                                        ) : coreBoxes.map(cb => {
                                            const metrics = calculateCoreBoxMetrics(cb);
                                            return (
                                                <tr key={cb.id} className={(editingId === cb.id ? 'editing-row ' : '') + (!cb.is_active ? 'inactive-row' : '')}>
                                                    <td className="wrap-text">{cb.customer_name || '-'}</td>
                                                    <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }} className="wrap-text">{cb.core_box_id}</td>
                                                    <td className="wrap-text">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span 
                                                                style={{ 
                                                                    width: '8px', 
                                                                    height: '8px', 
                                                                    borderRadius: '50%', 
                                                                    background: cb.is_active ? '#22c55e' : '#ef4444',
                                                                    boxShadow: cb.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                                                                    display: 'inline-block',
                                                                    flexShrink: 0
                                                                }} 
                                                                title={cb.is_active ? 'Active' : 'Inactive'}
                                                            />
                                                            <span style={{ fontWeight: '600', color: '#fff', wordBreak: 'break-all' }}>{cb.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="wrap-text">{cb.top_core_box_name || '-'}</td>
                                                    <td className="wrap-text">{cb.bottom_core_box_name || '-'}</td>
                                                    <td style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}>{cb.core_box_type}</td>
                                                    <td style={{ fontFamily: 'monospace' }}>{(cb.total_weight || 0).toFixed(3)} Kg</td>
                                                    <td className="wrap-text">
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {cb.products?.map((p, idx) => {
                                                                const cavity = p.cavity || 0;
                                                                const coreWeight = p.core_weight || 0;
                                                                const itemTotalWeight = cavity * coreWeight;
                                                                return (
                                                                    <span key={idx} style={{ fontSize: '0.8rem', color: '#ccc', display: 'block' }}>
                                                                        {getProductName(p.product_id)} {p.part ? `(${p.part})` : ''}: Cavity <strong>{cavity}</strong> * <strong>{coreWeight.toFixed(3)}</strong> Kg = <strong>{itemTotalWeight.toFixed(3)}</strong> Kg
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontFamily: 'monospace', color: metrics.wastage >= 0 ? '#fbbf24' : '#ef4444' }}>
                                                        {metrics.wastage.toFixed(3)} Kg
                                                    </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                        <button className="action-icon-btn edit-btn" onClick={() => handleEdit(cb)} title="Edit Core Box">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            className="action-icon-btn raw-materials-btn" 
                                                            onClick={() => handleOpenRawMaterialsModal(cb)} 
                                                            title="Configure Raw Materials" 
                                                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                                                        >
                                                            <Package size={16} />
                                                        </button>
                                                        {sessionStorage.getItem('is_superuser') === 'true' && (
                                                            <button className="action-icon-btn history-btn" onClick={() => setAuditLogData({ created_by: cb.created_by, created_at: cb.created_at, updated_by: cb.updated_by, updated_at: cb.updated_at })} title="Audit Log" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                                                                <History size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })}
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
                                {coreBoxes.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No Core Boxes found.</div>
                                ) : coreBoxes.map(cb => (
                                    <div className="mobile-card" key={cb.id}>
                                        <div className="mobile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <h3 style={{ wordBreak: 'break-all' }}>{cb.name}</h3>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: cb.is_active ? '#4ade80' : '#f87171' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cb.is_active ? '#22c55e' : '#ef4444', boxShadow: cb.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444' }}></span>
                                                {cb.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="mobile-card-body">
                                            <p><strong>Customer</strong> <span style={{ wordBreak: 'break-all' }}>{cb.customer_name || '-'}</span></p>
                                            <p><strong>Core Box ID</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>{cb.core_box_id}</span></p>
                                            <p><strong>Top Box Mat.</strong> <span style={{ wordBreak: 'break-all' }}>{cb.top_core_box_name || '-'}</span></p>
                                            <p><strong>Bottom Box Mat.</strong> <span style={{ wordBreak: 'break-all' }}>{cb.bottom_core_box_name || '-'}</span></p>
                                            <p><strong>Type</strong> <span>{cb.core_box_type}</span></p>
                                            <p><strong>Total Weight</strong> <span style={{ fontFamily: 'monospace' }}>{(cb.total_weight || 0).toFixed(3)} Kg</span></p>
                                            <p><strong>Wastage</strong> <span style={{ fontFamily: 'monospace', color: calculateCoreBoxMetrics(cb).wastage >= 0 ? '#fbbf24' : '#ef4444' }}>{calculateCoreBoxMetrics(cb).wastage.toFixed(3)} Kg</span></p>
                                            <div className="mobile-card-chips" style={{ marginTop: '8px' }}>
                                                <strong>Products, Cavities & Weights</strong>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                                    {cb.products?.map((p, idx) => {
                                                        const cavity = p.cavity || 0;
                                                        const coreWeight = p.core_weight || 0;
                                                        const itemTotalWeight = cavity * coreWeight;
                                                        return (
                                                            <span key={idx} style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                                                {getProductName(p.product_id)} {p.part ? `(${p.part})` : ''}: Cavity {cavity} * {coreWeight.toFixed(3)} Kg = {itemTotalWeight.toFixed(3)} Kg
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {cb.photos?.length > 0 && (
                                                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                                                    {cb.photos.map((ph, idx) => (
                                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <img src={ph} alt="Core Box" style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} />
                                                            <a href={ph} download={`corebox_${cb.core_box_id}_${idx + 1}.jpg`} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
                                                                <Download size={10} /> Download
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mobile-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button className="action-icon-btn edit-btn" onClick={() => handleEdit(cb)} title="Edit Core Box">
                                                <Edit2 size={16} /> Edit
                                            </button>
                                            <button 
                                                className="action-icon-btn raw-materials-btn" 
                                                onClick={() => handleOpenRawMaterialsModal(cb)} 
                                                title="Configure Raw Materials" 
                                                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}
                                            >
                                                <Package size={16} /> Materials
                                            </button>
                                            {sessionStorage.getItem('is_superuser') === 'true' && (
                                                <button className="action-icon-btn history-btn" onClick={() => setAuditLogData({ created_by: cb.created_by, created_at: cb.created_at, updated_by: cb.updated_by, updated_at: cb.updated_at })} title="Audit Log" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
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
                            {editingId ? 'Edit Core Box' : 'Add Core Box'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            {/* Customer Auto-suggestion Dropdown */}
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

                            {/* Core Box ID */}
                            <div className="input-group">
                                <label>Core Box ID <span className="required-asterisk">*</span></label>
                                <input className="glass-input" required maxLength={15} pattern="^[A-Za-z0-9_\-]+$" title="Alphanumeric, dashes, and underscores only. Max 15 chars." placeholder="" value={formData.core_box_id} onChange={e => setFormData({...formData, core_box_id: e.target.value.toUpperCase()})} />
                                {errors.core_box_id && <span className="error-text">{errors.core_box_id}</span>}
                            </div>

                            {/* Core Box Name */}
                            <div className="input-group">
                                <label>Core Box Name <span className="required-asterisk">*</span></label>
                                <input className="glass-input" required maxLength={100} placeholder="" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>

                            {/* Top Core Box Dropdown */}
                            <div className="input-group">
                                <label>Top Core Box Material</label>
                                <SearchableSelect 
                                    options={materialOptions}
                                    value={formData.top_core_box}
                                    onChange={val => setFormData({ ...formData, top_core_box: val })}
                                    placeholder="-- Type to search Material --"
                                />
                                {errors.top_core_box && <span className="error-text">{errors.top_core_box}</span>}
                            </div>

                            {/* Bottom Core Box Dropdown */}
                            <div className="input-group">
                                <label>Bottom Core Box Material</label>
                                <SearchableSelect 
                                    options={materialOptions}
                                    value={formData.bottom_core_box}
                                    onChange={val => setFormData({ ...formData, bottom_core_box: val })}
                                    placeholder="-- Type to search Material --"
                                />
                                {errors.bottom_core_box && <span className="error-text">{errors.bottom_core_box}</span>}
                            </div>

                            {/* Core Box Type Radio buttons */}
                            <div className="input-group">
                                <label>Core Box Type <span className="required-asterisk">*</span></label>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '4px' }}>
                                    {['CO2', 'OIL', 'AMINE'].map(t => (
                                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, color: 'white' }}>
                                            <input 
                                                type="radio" 
                                                name="core_box_type" 
                                                value={t} 
                                                checked={formData.core_box_type === t} 
                                                onChange={() => setFormData({...formData, core_box_type: t})} 
                                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                                            />
                                            {t}
                                        </label>
                                    ))}
                                </div>
                                {errors.core_box_type && <span className="error-text">{errors.core_box_type}</span>}
                            </div>

                            {/* Total Weight in Single Take */}
                            <div className="input-group">
                                <label>Total Weight in Single Take (Kg) <span className="required-asterisk">*</span></label>
                                <input 
                                    type="number" 
                                    className="glass-input" 
                                    required 
                                    min="0"
                                    step="0.001"
                                    placeholder="Enter total weight in single take..." 
                                    value={formData.total_weight === 0 ? '' : formData.total_weight} 
                                    onChange={e => setFormData({...formData, total_weight: parseFloat(e.target.value) || 0})} 
                                />
                                {errors.total_weight && <span className="error-text">{errors.total_weight}</span>}
                            </div>

                            {/* Products with cavity and core weight dynamically managed */}
                            <div style={{ marginTop: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <h4 style={{ margin: 0, color: 'var(--color-molten-yellow)', fontSize: '0.95rem' }}>Products, Cavities & Weights</h4>
                                    <button type="button" onClick={handleAddProductRow} disabled={!formData.customer} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto', width: 'auto', margin: 0 }}>
                                        + Add Row
                                    </button>
                                </div>
                                
                                {!formData.customer ? (
                                    <span style={{ fontSize: '0.85rem', color: '#888' }}>Please select a customer first to add products.</span>
                                ) : formData.products.length === 0 ? (
                                    <span style={{ fontSize: '0.85rem', color: '#888' }}>No products added. Add at least one row.</span>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {formData.products.map((p, index) => (
                                            <div key={index} style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '8px', 
                                                padding: '10px', 
                                                background: 'rgba(255, 255, 255, 0.02)', 
                                                border: '1px solid rgba(255, 255, 255, 0.05)', 
                                                borderRadius: '6px' 
                                            }}>
                                                {/* Row 1: Product dropdown & delete button */}
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <SearchableSelect
                                                            options={productOptions}
                                                            value={p.product_id}
                                                            onChange={val => handleProductRowChange(index, 'product_id', val)}
                                                            placeholder="Select Product..."
                                                        />
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveProductRow(index)} style={{ padding: '0 8px', height: '36px', minHeight: 'auto', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, flexShrink: 0 }} className="action-icon-btn delete-btn">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                {/* Row 2: Part name, Cavity, and Weight inputs side-by-side with wrapping */}
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <input 
                                                        type="text" 
                                                        className="glass-input" 
                                                        style={{ flex: 2, minWidth: '110px', margin: 0 }} 
                                                        placeholder="Part / Core Name" 
                                                        value={p.part || ''} 
                                                        onChange={e => handleProductRowChange(index, 'part', e.target.value)} 
                                                    />
                                                    <input 
                                                        type="number" 
                                                        className="glass-input" 
                                                        style={{ flex: 1, minWidth: '60px', margin: 0 }} 
                                                        min={1} 
                                                        placeholder="Cavity" 
                                                        value={p.cavity} 
                                                        onChange={e => handleProductRowChange(index, 'cavity', e.target.value === '' ? '' : parseInt(e.target.value))} 
                                                    />
                                                    <input 
                                                        type="number" 
                                                        className="glass-input" 
                                                        style={{ flex: 1.5, minWidth: '80px', margin: 0 }} 
                                                        min={0} 
                                                        step="0.001"
                                                        placeholder="Weight (Kg)" 
                                                        value={p.core_weight === undefined || p.core_weight === null ? '' : p.core_weight} 
                                                        onChange={e => handleProductRowChange(index, 'core_weight', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {errors.products && <span className="error-text" style={{ display: 'block', marginTop: '5px' }}>{errors.products}</span>}
                            </div>

                            {/* Core Box Photos (Max 3 JPGs) */}
                            <div className="input-group" style={{ marginTop: '1.5rem' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Core Box Photos (Max 3 JPGs)</span>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>{formData.photos.length}/3 uploaded</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                    <input 
                                        type="file" 
                                        accept="image/jpeg,image/jpg" 
                                        multiple 
                                        id="corebox-photo-upload" 
                                        onChange={handlePhotoUpload} 
                                        style={{ display: 'none' }} 
                                        disabled={formData.photos.length >= 3} 
                                    />
                                    <label htmlFor="corebox-photo-upload" style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '6px', 
                                        background: 'rgba(255,255,255,0.05)', 
                                        border: '1px dashed rgba(255,255,255,0.2)', 
                                        borderRadius: '6px', 
                                        padding: '10px 15px', 
                                        cursor: formData.photos.length >= 3 ? 'not-allowed' : 'pointer', 
                                        margin: 0,
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        flex: 1
                                    }}>
                                        <ImageIcon size={16} /> Upload JPG Photos
                                    </label>
                                    
                                    {formData.photos.length > 0 && (
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, photos: [] }))} className="btn-secondary" style={{ margin: 0, padding: '0 10px', minHeight: 'auto', height: '42px', fontSize: '0.85rem' }}>
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                
                                {formData.photos.length > 0 && (
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        {formData.photos.map((ph, idx) => (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <img src={ph} alt="Upload Thumbnail" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                                                <a href={ph} download={`corebox_new_${idx + 1}.jpg`} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
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
                                <textarea className="glass-input" maxLength={250} style={{ minHeight: '60px', padding: '8px' }} placeholder="Notes about this core box..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                {errors.description && <span className="error-text">{errors.description}</span>}
                            </div>

                            {/* Active Checkbox */}
                            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                                <input type="checkbox" id="cb-active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                                <label htmlFor="cb-active" style={{ margin: 0, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' }}>Active Record</label>
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

            {rawMaterialsModalCb && (
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
                        width: '95%',
                        maxWidth: '650px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '1.5rem',
                        position: 'relative',
                        border: '1px solid rgba(16,185,129,0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-molten-yellow)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Raw Materials for {rawMaterialsModalCb.name}</span>
                            <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'normal' }}>Total Weight: <strong>{(rawMaterialsModalCb.total_weight || 0).toFixed(3)} Kg</strong></span>
                        </h3>

                        {modalErrors && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                {modalErrors}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#ccc' }}>Define core production ingredients:</span>
                            <button 
                                type="button" 
                                onClick={() => setModalRawMaterials(prev => [...prev, { raw_material_id: '', usage_type: 'PERCENTAGE', value: 0 }])} 
                                className="btn-secondary" 
                                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto', width: 'auto', margin: 0 }}
                            >
                                + Add Raw Material
                            </button>
                        </div>

                        {modalRawMaterials.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#888', fontSize: '0.9rem' }}>
                                No raw materials configured. Click "+ Add Raw Material" to define.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
                                {modalRawMaterials.map((row, index) => {
                                    const unit = getMaterialUnit(row.raw_material_id);
                                    const val = parseFloat(row.value as any) || 0;
                                    const calcWeight = row.usage_type === 'PERCENTAGE' 
                                        ? ((val / 100) * (rawMaterialsModalCb.total_weight || 0)) 
                                        : val;

                                    return (
                                        <div key={index} style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '8px', 
                                            padding: '10px', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            border: '1px solid rgba(255,255,255,0.05)', 
                                            borderRadius: '6px' 
                                        }}>
                                            {/* Row 1: Dropdown and Trash Button */}
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <SearchableSelect
                                                        options={rawMaterials.filter(rm => rm.departments && rm.departments.includes('Core')).map(rm => ({ value: rm.id, label: `[${rm.code}] ${rm.name}` }))}
                                                        value={row.raw_material_id}
                                                        onChange={val => {
                                                            const updated = [...modalRawMaterials];
                                                            updated[index] = { ...updated[index], raw_material_id: val };
                                                            setModalRawMaterials(updated);
                                                        }}
                                                        placeholder="Select Raw Material..."
                                                    />
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setModalRawMaterials(prev => prev.filter((_, i) => i !== index))} 
                                                    style={{ padding: '0 8px', height: '36px', minHeight: 'auto', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, flexShrink: 0 }} 
                                                    className="action-icon-btn delete-btn"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Row 2: Usage Type, Qty Value, and dynamic calculation preview */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <select
                                                    className="glass-input"
                                                    style={{ flex: 1, minWidth: '120px', margin: 0, padding: '8px', height: '36px' }}
                                                    value={row.usage_type}
                                                    onChange={e => {
                                                        const updated = [...modalRawMaterials];
                                                        updated[index] = { ...updated[index], usage_type: e.target.value as any };
                                                        setModalRawMaterials(updated);
                                                    }}
                                                >
                                                    <option value="PERCENTAGE">Percentage (%)</option>
                                                    <option value="UNIT">Unit ({unit})</option>
                                                </select>

                                                <input 
                                                    type="number"
                                                    className="glass-input"
                                                    style={{ flex: 1, minWidth: '90px', margin: 0, padding: '8px', height: '36px' }}
                                                    min="0"
                                                    max={row.usage_type === 'PERCENTAGE' ? 100 : undefined}
                                                    step="0.01"
                                                    placeholder={row.usage_type === 'PERCENTAGE' ? "Pct (%)" : "Qty"}
                                                    value={row.value === 0 ? '' : row.value}
                                                    onChange={e => {
                                                        const updated = [...modalRawMaterials];
                                                        updated[index] = { ...updated[index], value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 };
                                                        setModalRawMaterials(updated);
                                                    }}
                                                />

                                                <div style={{ flex: 1.5, minWidth: '150px', fontSize: '0.85rem', color: '#aaa', fontFamily: 'monospace', textAlign: 'right' }}>
                                                    {row.usage_type === 'PERCENTAGE' ? (
                                                        <span>
                                                            Weight: <strong>{calcWeight.toFixed(3)}</strong> Kg
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            Qty: <strong>{val.toFixed(3)}</strong> {unit}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Calculations summary */}
                        {modalRawMaterials.length > 0 && (
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '12px', fontSize: '0.85rem', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Total Percentage Configured:</span>
                                    <strong style={{ color: 'var(--color-molten-yellow)', fontFamily: 'monospace' }}>
                                        {modalRawMaterials.filter(r => r.usage_type === 'PERCENTAGE').reduce((sum, r) => sum + (parseFloat(r.value as any) || 0), 0).toFixed(2)}%
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Base Remaining (100% - Total):</span>
                                    <strong style={{ color: '#4ade80', fontFamily: 'monospace' }}>
                                        {Math.max(0, 100 - modalRawMaterials.filter(r => r.usage_type === 'PERCENTAGE').reduce((sum, r) => sum + (parseFloat(r.value as any) || 0), 0)).toFixed(2)}%
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Calculated Base Weight:</span>
                                    <strong style={{ color: '#4ade80', fontFamily: 'monospace' }}>
                                        {((Math.max(0, 100 - modalRawMaterials.filter(r => r.usage_type === 'PERCENTAGE').reduce((sum, r) => sum + (parseFloat(r.value as any) || 0), 0)) / 100) * (rawMaterialsModalCb.total_weight || 0)).toFixed(3)} Kg
                                    </strong>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', minHeight: '40px' }}>
                            <button 
                                type="button" 
                                className="btn-primary" 
                                disabled={modalSaving} 
                                onClick={handleSaveRawMaterials}
                                style={{ margin: 0, flex: 1 }}
                            >
                                {modalSaving ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={() => setRawMaterialsModalCb(null)}
                                style={{ margin: 0, flex: 1 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default CoreBoxTab;
