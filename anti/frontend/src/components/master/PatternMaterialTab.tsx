import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Edit2, Plus, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import '../master/MasterStyles.css';

interface PatternMaterial {
    id: number;
    material_id: string;
    name: string;
    is_active: boolean;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}

const PatternMaterialTab: React.FC = () => {
    const { showToast } = useToast();
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [materials, setMaterials] = useState<PatternMaterial[]>([]);
    const [auditLogData, setAuditLogData] = useState<{ created_by?: string; created_at?: string; updated_by?: string; updated_at?: string } | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState(() => {
        return sessionStorage.getItem('pattern_material_search_query') || '';
    });
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        material_id: '',
        name: '',
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

    useEffect(() => { fetchMaterials(page); }, [page]);

    const fetchMaterials = async (pageNumber: number, searchVal?: string) => {
        const term = searchVal !== undefined ? searchVal : searchQuery;
        try {
            const res = await api.get(`/api/inventory/pattern-materials/?page=${pageNumber}&page_size=10&search=${encodeURIComponent(term)}`);
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

    const handleEdit = (mat: PatternMaterial) => {
        setEditingId(mat.id);
        setFormData({
            material_id: mat.material_id,
            name: mat.name,
            is_active: mat.is_active
        });
        setErrors({});
        setViewMode('edit');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            material_id: '',
            name: '',
            is_active: true
        });
        setErrors({});
        setViewMode('list');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            if (editingId) {
                await api.put(`/api/inventory/pattern-materials/${editingId}/`, formData);
                showToast('Material updated successfully', 'success');
            } else {
                await api.post('/api/inventory/pattern-materials/', formData);
                showToast('Material added successfully', 'success');
                setPage(1);
            }
            cancelEdit();
            fetchMaterials(editingId ? page : 1);
        } catch (err: any) {
            if (err.response?.data) {
                setErrors(err.response.data);
                showToast('Unable to save material. Please check the fields.', 'error');
            } else {
                showToast('Network error while connecting to server.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        sessionStorage.setItem('pattern_material_search_query', searchQuery);
        setPage(1);
        fetchMaterials(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        sessionStorage.removeItem('pattern_material_search_query');
        setPage(1);
        fetchMaterials(1, '');
    };

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pattern Material Master</h1>
                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Configure material types (Aluminum, Wood, Cast Iron) mapping to plates and toolings.</p>
                </div>
                {viewMode === 'list' && (
                    <button className="btn-primary" onClick={() => { cancelEdit(); setViewMode('create'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', fontSize: '0.9rem', padding: '0 16px', margin: 0 }}>
                        <Plus size={16} /> New Material
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
                                placeholder="Search pattern materials..." 
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
                                            <th>Material ID</th>
                                            <th>Material Name</th>
                                            <th style={{width: '80px', textAlign: 'center'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {materials.length === 0 ? (
                                            <tr><td colSpan={3} style={{textAlign:'center', padding:'2rem'}}>No pattern materials found.</td></tr>
                                        ) : materials.map(mat => (
                                            <tr key={mat.id} className={(editingId === mat.id ? 'editing-row ' : '') + (!mat.is_active ? 'inactive-row' : '')}>
                                                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-molten-yellow)' }}>{mat.material_id}</td>
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
                                                 <td>
                                                     <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                         <button className="action-icon-btn edit-btn" onClick={() => handleEdit(mat)} title="Edit Material">
                                                             <Edit2 size={16} />
                                                         </button>
                                                         {sessionStorage.getItem('is_superuser') === 'true' && (
                                                             <button className="action-icon-btn history-btn" onClick={() => setAuditLogData({ created_by: mat.created_by, created_at: mat.created_at, updated_by: mat.updated_by, updated_at: mat.updated_at })} title="Audit Log" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
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
                                {materials.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No pattern materials found.</div>
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
                                            <p><strong>Material ID</strong> <span className="monospace-text" style={{ color: 'var(--color-molten-yellow)' }}>{mat.material_id}</span></p>
                                        </div>
                                        <div className="mobile-card-actions">
                                            <button className="action-icon-btn edit-btn" onClick={() => handleEdit(mat)} title="Edit Material">
                                                <Edit2 size={16} /> Edit
                                            </button>
                                            {sessionStorage.getItem('is_superuser') === 'true' && (
                                                <button className="action-icon-btn history-btn" onClick={() => setAuditLogData({ created_by: mat.created_by, created_at: mat.created_at, updated_by: mat.updated_by, updated_at: mat.updated_at })} title="Audit Log" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
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
                            {editingId ? 'Edit Material' : 'Add Material'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            {/* Material ID */}
                            <div className="input-group">
                                <label>Material ID <span className="required-asterisk">*</span></label>
                                <input className="glass-input" required maxLength={15} pattern="^[A-Za-z0-9_\-]+$" title="Alphanumeric, dashes, and underscores only. Max 15 chars." value={formData.material_id} onChange={e => setFormData({...formData, material_id: e.target.value.toUpperCase()})} />
                                {errors.material_id && <span className="error-text">{errors.material_id}</span>}
                            </div>

                            {/* Material Name */}
                            <div className="input-group">
                                <label>Material Name <span className="required-asterisk">*</span></label>
                                <input className="glass-input" required maxLength={100} placeholder="" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>

                            {/* Active Checkbox */}
                            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                                <input type="checkbox" id="mat-active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                                <label htmlFor="mat-active" style={{ margin: 0, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' }}>Active Record</label>
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
export default PatternMaterialTab;
