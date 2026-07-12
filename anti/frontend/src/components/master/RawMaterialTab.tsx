import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './MasterStyles.css';

interface RawMaterial {
    id: number;
    code: string;
    name: string;
    unit: string;
    category: string;
    departments: string[];
    is_active: boolean;
}

const STATIC_DEPARTMENTS = [
    'Pattern',
    'Core',
    'Moulding',
    'Melting',
    'Pouring',
    'Short Blast',
    'Bed Grinding',
    'Despatch - Fettling',
    'Despatch - Hand Grinding',
    'Despatch - Painting'
];

const STATIC_UNITS = [
    'Nos', 'Kg', 'g', 'Pair', 'Set', 'Box', 'Bag', 'Can', 'Litre', 'Millilitre', 
    'Meter', 'Centimeter', 'Inch', 'Packet', 'Roll', 'Bottle', 'Foot', 
    'Square Feet', 'Square Meter', 'Cubic Meter', 'Ton', 'Sheet', 'Piece'
];

const RawMaterialTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('raw_material_search_query') || '';
    });
    
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        code: '', name: '', unit: 'Kg', category: 'RAW_MATERIAL', departments: [] as string[], is_active: true
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => { 
        fetchMaterials(page); 
    }, [page]);

    const fetchMaterials = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/inventory/raw-materials/?page=${pageNumber}&page_size=10&search=${encodeURIComponent(term)}`);
            if (res.data.results) {
                setMaterials(res.data.results);
                setTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setMaterials(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (mat: RawMaterial) => {
        setEditingId(mat.id);
        setFormData({
            code: mat.code,
            name: mat.name,
            unit: mat.unit,
            category: mat.category || 'RAW_MATERIAL',
            departments: mat.departments || [],
            is_active: mat.is_active
        });
        setErrors({});
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ code: '', name: '', unit: 'Kg', category: 'RAW_MATERIAL', departments: [], is_active: true });
        setErrors({});
    };

    const toggleDepartment = (deptName: string) => {
        setFormData(prev => {
            const selected = prev.departments.includes(deptName)
                ? prev.departments.filter(name => name !== deptName)
                : [...prev.departments, deptName];
            return { ...prev, departments: selected };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            if (editingId) {
                await api.put(`/api/inventory/raw-materials/${editingId}/`, formData);
                showToast('Material updated successfully', 'success');
            } else {
                await api.post('/api/inventory/raw-materials/', formData);
                showToast('Material added successfully', 'success');
                setPage(1);
            }
            cancelEdit();
            fetchMaterials(editingId ? page : 1);
        } catch (err: any) {
            if (err.response?.data) {
                setErrors(err.response.data);
                showToast('Unable to save material. Check the highlighted inputs.', 'error');
            } else {
                showToast('Network connection failed.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('raw_material_search_query', searchQuery);
        setPage(1);
        fetchMaterials(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('raw_material_search_query');
        setPage(1);
        fetchMaterials(1, '');
    };

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Raw Material Master</h1>
                <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Manage all raw materials and production types.</p>
            </div>
            <div className="glass-panel" style={{padding: '2rem'}}>
                <div className="tab-split-view">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                        {/* Search Bar */}
                        <div className="search-bar-container" style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                className="glass-input" 
                                placeholder="Search raw materials..." 
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
                                <th>Departments</th>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Type (Unit)</th>
                                <th>Category</th>
                                <th style={{width: '60px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.length === 0 ? (
                                <tr><td colSpan={6} style={{textAlign:'center', padding:'2rem'}}>No raw materials recorded yet.</td></tr>
                            ) : materials.map(mat => (
                                <tr key={mat.id} className={(editingId === mat.id ? 'editing-row ' : '') + (!mat.is_active ? 'inactive-row' : '')}>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {mat.departments?.length > 0 ? (
                                                mat.departments.map(dept => (
                                                    <span key={dept} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {dept}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>Unassigned</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span 
                                                style={{ 
                                                    width: '8px', 
                                                    height: '8px', 
                                                    borderRadius: '50%', 
                                                    background: mat.is_active ? '#22c55e' : '#ef4444',
                                                    boxShadow: mat.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                                                    display: 'inline-block',
                                                    flexShrink: 0
                                                }} 
                                                title={mat.is_active ? 'Active' : 'Inactive'}
                                            />
                                            <span style={{ fontWeight: '600', color: '#fff' }}>{mat.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '700', fontFamily: 'monospace', letterSpacing: '0.5px', color: 'var(--color-molten-yellow)' }} title={mat.code}>{mat.code}</td>
                                    <td>
                                        <span className="unit-badge kg">
                                            {mat.unit}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: '600', fontSize: '0.9rem', color: mat.category === 'PRODUCTION' ? '#ff6b35' : '#4cc9f0' }}>
                                        {mat.category === 'PRODUCTION' ? 'Production' : 'Raw Material'}
                                    </td>
                                    <td>
                                        <button className="action-icon-btn edit-btn" onClick={() => handleEdit(mat)} title="Edit Material">
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
                    {materials.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No raw materials recorded yet.</div>
                    ) : materials.map(mat => (
                        <div className="mobile-card" key={mat.id}>
                            <div className="mobile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3>{mat.name}</h3>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: mat.is_active ? '#4ade80' : '#f87171' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: mat.is_active ? '#22c55e' : '#ef4444', boxShadow: mat.is_active ? '0 0 8px #22c55e' : '0 0 8px #ef4444' }}></span>
                                    {mat.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="mobile-card-body">
                                <div className="mobile-card-chips" style={{ marginBottom: '8px' }}>
                                    <strong>Departments</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                        {mat.departments?.length > 0 ? (
                                            mat.departments.map(dept => (
                                                <span key={dept} className="chip">
                                                    {dept}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ color: '#666', fontSize: '0.85rem' }}>None</span>
                                        )}
                                    </div>
                                </div>
                                <p><strong>Material Code</strong> <span className="monospace-text" style={{ color: 'var(--color-molten-yellow)' }}>{mat.code}</span></p>
                                <p><strong>Type (Unit)</strong> <span className="unit-badge kg">{mat.unit}</span></p>
                                <p><strong>Category</strong> <span style={{ fontWeight: '600', color: mat.category === 'PRODUCTION' ? '#ff6b35' : '#4cc9f0' }}>{mat.category === 'PRODUCTION' ? 'Production' : 'Raw Material'}</span></p>
                            </div>
                            <div className="mobile-card-actions">
                                <button className="action-icon-btn edit-btn" onClick={() => handleEdit(mat)} title="Edit Material">
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
                    {editingId ? 'Edit Material' : 'Add Material'}
                </h3>
                <form onSubmit={handleSubmit}>
                    {/* Department Dropdown Multi-Select */}
                    <div 
                        className="input-group" 
                        style={{position: 'relative'}}
                        tabIndex={0}
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setIsDropdownOpen(false);
                            }
                        }}
                    >
                        <label>Department <span className="required-asterisk">*</span></label>
                        <div 
                            className="glass-input" 
                            style={{ 
                                cursor: 'pointer', 
                                minHeight: '42px', 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '5px', 
                                alignItems: 'center',
                                padding: '8px 12px'
                            }}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {formData.departments.length === 0 ? (
                                <span style={{ color: '#888' }}>Select Departments...</span>
                            ) : (
                                formData.departments.map(dept => (
                                    <span 
                                        key={dept} 
                                        style={{ 
                                            background: 'rgba(255, 107, 53, 0.15)', 
                                            padding: '4px 10px', 
                                            borderRadius: '12px', 
                                            fontSize: '0.85rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            border: '1px solid rgba(255, 107, 53, 0.4)',
                                            color: '#e2e8f0'
                                        }}
                                    >
                                        {dept}
                                        <span 
                                            style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: '1', color: 'var(--molten-orange)' }} 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                toggleDepartment(dept); 
                                            }}
                                            title="Remove"
                                        >×</span>
                                    </span>
                                ))
                            )}
                        </div>
                        {isDropdownOpen && (
                            <div 
                                style={{ 
                                    position: 'absolute', 
                                    top: 'calc(100% + 4px)', 
                                    left: 0, width: '100%', 
                                    background: 'rgba(20, 24, 34, 0.95)', 
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255,107,53,0.3)',
                                    borderRadius: '6px',
                                    zIndex: 1000,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0px 10px 30px rgba(0,0,0,0.6)'
                                }}
                            >
                                {STATIC_DEPARTMENTS.map(dept => (
                                    <div 
                                        key={dept} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDepartment(dept);
                                        }}
                                        style={{ 
                                            padding: '10px 15px', 
                                            cursor: 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '12px', 
                                            borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                            background: formData.departments.includes(dept) ? 'rgba(255, 107, 53, 0.1)' : 'transparent',
                                            transition: 'background 0.2s ease'
                                        }}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={formData.departments.includes(dept)} 
                                            onChange={() => {}}
                                            style={{ 
                                                accentColor: 'var(--molten-orange)',
                                                width: '16px',
                                                height: '16px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{color: formData.departments.includes(dept) ? '#fff' : '#ccc', fontWeight: formData.departments.includes(dept) ? '500' : 'normal'}}>
                                            {dept}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {errors.departments && <span className="error-text">{errors.departments}</span>}
                    </div>

                    {/* Name */}
                    <div className="input-group">
                        <label>Material Name <span className="required-asterisk">*</span></label>
                        <input className="glass-input" required maxLength={100} title="Maximum 100 characters" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    {/* Code */}
                    <div className="input-group">
                        <label>Material Code <span className="required-asterisk">*</span></label>
                        <input className="glass-input" required maxLength={15} pattern="^[A-Za-z0-9_\-]+$" title="Alphanumeric characters, dashes, and underscores only. Max 15 chars." value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                        {errors.code && <span className="error-text">{errors.code}</span>}
                    </div>

                    {/* Type Dropdown Single-Select */}
                    <div className="input-group">
                        <label>Type <span className="required-asterisk">*</span></label>
                        <select className="glass-select" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                            {STATIC_UNITS.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                        {errors.unit && <span className="error-text">{errors.unit}</span>}
                    </div>

                    {/* Radio buttons for Production / Raw Material Category */}
                    <div className="input-group">
                        <label>Production / Raw Material <span className="required-asterisk">*</span></label>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '0.95rem' }}>
                                <input 
                                    type="radio" 
                                    name="category" 
                                    value="PRODUCTION" 
                                    checked={formData.category === 'PRODUCTION'} 
                                    onChange={() => setFormData({...formData, category: 'PRODUCTION'})} 
                                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                                />
                                Production
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '0.95rem' }}>
                                <input 
                                    type="radio" 
                                    name="category" 
                                    value="RAW_MATERIAL" 
                                    checked={formData.category === 'RAW_MATERIAL'} 
                                    onChange={() => setFormData({...formData, category: 'RAW_MATERIAL'})} 
                                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                                />
                                Raw Material
                            </label>
                        </div>
                        {errors.category && <span className="error-text">{errors.category}</span>}
                    </div>

                    {/* Active Checkbox */}
                    <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                        <input type="checkbox" id="raw-active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                        <label htmlFor="raw-active" style={{ margin: 0, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' }}>Active Record</label>
                    </div>

                    {/* Form actions */}
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
export default RawMaterialTab;
