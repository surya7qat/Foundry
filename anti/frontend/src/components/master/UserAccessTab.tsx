import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Shield, Users, Settings, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import SearchableSelect from '../common/SearchableSelect';
import { useToast } from '../../contexts/ToastContext';
import './MasterStyles.css';

interface Role {
    id: number;
    name: string;
    can_access_dashboard: boolean;
    can_access_supplier_master: boolean;
    can_access_raw_material_master: boolean;
    can_access_customer_master: boolean;
    can_access_pattern_material_master: boolean;
    can_access_product_master: boolean;
    can_access_core_box_master: boolean;
    can_access_pattern_master: boolean;
    can_access_purchase_inward: boolean;
    can_access_purchase_rejection: boolean;
    can_access_purchase_return: boolean;
    can_access_material_stock: boolean;
    can_access_material_stock_log: boolean;
    can_access_product_stock: boolean;
    can_access_product_stock_log: boolean;
    can_access_pattern_flow: boolean;
}

interface CustomUser {
    id: number;
    username: string;
    email: string;
    role: number | null;
    role_name: string;
    is_active: boolean;
    is_superuser: boolean;
    show_customer_to_all_departments: boolean;
    show_supplier_to_all_departments: boolean;
}

const UserAccessTab: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'permissions'>('roles');
    const [loading, setLoading] = useState(false);

    // List states
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<CustomUser[]>([]);

    // View states
    const [roleViewMode, setRoleViewMode] = useState<'list' | 'create' | 'edit'>('list');
    const [userViewMode, setUserViewMode] = useState<'list' | 'create' | 'edit'>('list');

    // Editing IDs
    const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    // Pagination states
    const [rolePage, setRolePage] = useState(1);
    const [roleTotalPages, setRoleTotalPages] = useState(1);

    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);

    // Search states
    const [roleSearch, setRoleSearch] = useState(() => sessionStorage.getItem('role_search_query') || '');
    const [roleSearchQuery, setRoleSearchQuery] = useState(() => sessionStorage.getItem('role_search_query') || '');

    const [userSearch, setUserSearch] = useState(() => sessionStorage.getItem('user_search_query') || '');
    const [userSearchQuery, setUserSearchQuery] = useState(() => sessionStorage.getItem('user_search_query') || '');

    // Forms
    const [roleForm, setRoleForm] = useState({
        name: '',
        can_access_dashboard: true,
        can_access_supplier_master: false,
        can_access_raw_material_master: false,
        can_access_customer_master: false,
        can_access_pattern_material_master: false,
        can_access_product_master: false,
        can_access_core_box_master: false,
        can_access_pattern_master: false,
        can_access_purchase_inward: false,
        can_access_purchase_rejection: false,
        can_access_purchase_return: false,
        can_access_material_stock: false,
        can_access_material_stock_log: false,
        can_access_product_stock: false,
        can_access_product_stock_log: false,
        can_access_pattern_flow: false,
    });

    const [userForm, setUserForm] = useState({
        username: '',
        email: '',
        password: '',
        role: '',
        is_active: true,
    });

    const [permissionsForm, setPermissionsForm] = useState({
        show_customer_to_all_departments: true,
        show_supplier_to_all_departments: true,
    });
    const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<string>('');

    const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
    const [userErrors, setUserErrors] = useState<Record<string, string>>({});

    // Fetch Roles
    const fetchRoles = async (page = rolePage, search = roleSearchQuery) => {
        try {
            const res = await api.get(`/api/accounts/roles/?page=${page}&page_size=10&search=${encodeURIComponent(search)}`);
            if (res.data.results) {
                setRoles(res.data.results);
                setRoleTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setRoles(Array.isArray(res.data) ? res.data : []);
                setRoleTotalPages(1);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to fetch roles', 'error');
        }
    };

    // Fetch Users
    const fetchUsers = async (page = userPage, search = userSearchQuery) => {
        try {
            const res = await api.get(`/api/accounts/users/?page=${page}&page_size=10&search=${encodeURIComponent(search)}`);
            if (res.data.results) {
                setUsers(res.data.results);
                setUserTotalPages(Math.ceil(res.data.count / 10));
            } else {
                setUsers(Array.isArray(res.data) ? res.data : []);
                setUserTotalPages(1);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to fetch users', 'error');
        }
    };

    useEffect(() => {
        fetchRoles(rolePage, roleSearchQuery);
    }, [rolePage, roleSearchQuery]);

    useEffect(() => {
        fetchUsers(userPage, userSearchQuery);
    }, [userPage, userSearchQuery]);

    const roleTableContainerRef = useRef<HTMLDivElement>(null);
    const userTableContainerRef = useRef<HTMLDivElement>(null);

    const scrollRoleTable = (direction: 'left' | 'right') => {
        if (roleTableContainerRef.current) {
            roleTableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    const scrollUserTable = (direction: 'left' | 'right') => {
        if (userTableContainerRef.current) {
            userTableContainerRef.current.scrollBy({
                left: direction === 'left' ? -200 : 200,
                behavior: 'smooth'
            });
        }
    };

    const handleRoleSearch = () => {
        sessionStorage.setItem('role_search_query', roleSearch);
        setRolePage(1);
        setRoleSearchQuery(roleSearch);
    };

    const handleRoleClearSearch = () => {
        setRoleSearch('');
        sessionStorage.removeItem('role_search_query');
        setRolePage(1);
        setRoleSearchQuery('');
    };

    const handleUserSearch = () => {
        sessionStorage.setItem('user_search_query', userSearch);
        setUserPage(1);
        setUserSearchQuery(userSearch);
    };

    const handleUserClearSearch = () => {
        setUserSearch('');
        sessionStorage.removeItem('user_search_query');
        setUserPage(1);
        setUserSearchQuery('');
    };

    // Role CRUD Actions
    const handleRoleEdit = (role: Role) => {
        setEditingRoleId(role.id);
        setRoleForm({
            name: role.name,
            can_access_dashboard: role.can_access_dashboard,
            can_access_supplier_master: role.can_access_supplier_master,
            can_access_raw_material_master: role.can_access_raw_material_master,
            can_access_customer_master: role.can_access_customer_master,
            can_access_pattern_material_master: role.can_access_pattern_material_master,
            can_access_product_master: role.can_access_product_master,
            can_access_core_box_master: role.can_access_core_box_master,
            can_access_pattern_master: role.can_access_pattern_master,
            can_access_purchase_inward: role.can_access_purchase_inward,
            can_access_purchase_rejection: role.can_access_purchase_rejection,
            can_access_purchase_return: role.can_access_purchase_return,
            can_access_material_stock: role.can_access_material_stock,
            can_access_material_stock_log: role.can_access_material_stock_log,
            can_access_product_stock: role.can_access_product_stock,
            can_access_product_stock_log: role.can_access_product_stock_log,
            can_access_pattern_flow: role.can_access_pattern_flow,
        });
        setRoleErrors({});
        setRoleViewMode('edit');
    };

    const cancelRoleEdit = () => {
        setEditingRoleId(null);
        setRoleForm({
            name: '',
            can_access_dashboard: true,
            can_access_supplier_master: false,
            can_access_raw_material_master: false,
            can_access_customer_master: false,
            can_access_pattern_material_master: false,
            can_access_product_master: false,
            can_access_core_box_master: false,
            can_access_pattern_master: false,
            can_access_purchase_inward: false,
            can_access_purchase_rejection: false,
            can_access_purchase_return: false,
            can_access_material_stock: false,
            can_access_material_stock_log: false,
            can_access_product_stock: false,
            can_access_product_stock_log: false,
            can_access_pattern_flow: false,
        });
        setRoleErrors({});
        setRoleViewMode('list');
    };

    const handleRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleForm.name.trim()) {
            setRoleErrors({ name: 'Role name is required' });
            return;
        }
        setLoading(true);
        try {
            if (editingRoleId) {
                await api.put(`/api/accounts/roles/${editingRoleId}/`, roleForm);
                showToast('Role updated successfully', 'success');
            } else {
                await api.post('/api/accounts/roles/', roleForm);
                showToast('Role created successfully', 'success');
            }
            fetchRoles();
            cancelRoleEdit();
        } catch (err: any) {
            console.error(err);
            if (err.response?.data) {
                setRoleErrors(err.response.data);
            }
            showToast('Failed to save role', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        try {
            await api.delete(`/api/accounts/roles/${id}/`);
            showToast('Role deleted successfully', 'success');
            fetchRoles();
        } catch (err) {
            console.error(err);
            showToast('Failed to delete role', 'error');
        }
    };

    // User CRUD Actions
    const handleUserEdit = (user: CustomUser) => {
        setEditingUserId(user.id);
        setUserForm({
            username: user.username,
            email: user.email,
            password: '', // Leave blank unless updating
            role: user.role ? user.role.toString() : '',
            is_active: user.is_active,
        });
        setUserErrors({});
        setUserViewMode('edit');
    };

    const cancelUserEdit = () => {
        setEditingUserId(null);
        setUserForm({
            username: '',
            email: '',
            password: '',
            role: '',
            is_active: true,
        });
        setUserErrors({});
        setUserViewMode('list');
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!userForm.username.trim()) errors.username = 'Username is required';
        if (!editingUserId && !userForm.password) errors.password = 'Password is required';
        if (Object.keys(errors).length > 0) {
            setUserErrors(errors);
            return;
        }
        setLoading(true);
        const payload: any = {
            username: userForm.username,
            email: userForm.email,
            role: userForm.role ? parseInt(userForm.role) : null,
            is_active: userForm.is_active,
        };
        if (userForm.password) {
            payload.password = userForm.password;
        }
        try {
            if (editingUserId) {
                await api.put(`/api/accounts/users/${editingUserId}/`, payload);
                showToast('User updated successfully', 'success');
            } else {
                await api.post('/api/accounts/users/', payload);
                showToast('User created successfully', 'success');
            }
            fetchUsers();
            cancelUserEdit();
        } catch (err: any) {
            console.error(err);
            if (err.response?.data) {
                setUserErrors(err.response.data);
            }
            showToast('Failed to save user', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUserDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/api/accounts/users/${id}/`);
            showToast('User deleted successfully', 'success');
            fetchUsers();
        } catch (err) {
            console.error(err);
            showToast('Failed to delete user', 'error');
        }
    };

    // Save Permissions
    const handlePermissionsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPermissionUserId) {
            showToast('Please select a user first', 'error');
            return;
        }
        setLoading(true);
        try {
            await api.patch(`/api/accounts/users/${selectedPermissionUserId}/`, {
                show_customer_to_all_departments: permissionsForm.show_customer_to_all_departments,
                show_supplier_to_all_departments: permissionsForm.show_supplier_to_all_departments,
            });
            showToast('User permissions updated successfully', 'success');
            fetchUsers();
        } catch (err) {
            console.error(err);
            showToast('Failed to update user permissions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isAllMastersChecked = roleForm.can_access_supplier_master &&
        roleForm.can_access_raw_material_master &&
        roleForm.can_access_customer_master &&
        roleForm.can_access_pattern_material_master &&
        roleForm.can_access_product_master &&
        roleForm.can_access_core_box_master &&
        roleForm.can_access_pattern_master;

    const toggleAllMasters = (checked: boolean) => {
        setRoleForm({
            ...roleForm,
            can_access_supplier_master: checked,
            can_access_raw_material_master: checked,
            can_access_customer_master: checked,
            can_access_pattern_material_master: checked,
            can_access_product_master: checked,
            can_access_core_box_master: checked,
            can_access_pattern_master: checked,
        });
    };

    const isAllPurchaseChecked = roleForm.can_access_purchase_inward &&
        roleForm.can_access_purchase_rejection &&
        roleForm.can_access_purchase_return;

    const toggleAllPurchase = (checked: boolean) => {
        setRoleForm({
            ...roleForm,
            can_access_purchase_inward: checked,
            can_access_purchase_rejection: checked,
            can_access_purchase_return: checked,
        });
    };

    const isAllInventoryChecked = roleForm.can_access_material_stock &&
        roleForm.can_access_material_stock_log &&
        roleForm.can_access_product_stock &&
        roleForm.can_access_product_stock_log;

    const toggleAllInventory = (checked: boolean) => {
        setRoleForm({
            ...roleForm,
            can_access_material_stock: checked,
            can_access_material_stock_log: checked,
            can_access_product_stock: checked,
            can_access_product_stock_log: checked,
        });
    };

    return (
        <div className="inventory-master-page">
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '2.2rem', margin: 0, background: 'var(--gradient-molten)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>User Access Controls</h1>
                    <p style={{ color: '#ccc', fontSize: '1.1rem', marginTop: '0.5rem' }}>Configure user accounts, menu accessibility, and visibility permissions.</p>
                </div>
                {activeTab === 'roles' && roleViewMode === 'list' && (
                    <button className="btn-primary" onClick={() => { cancelRoleEdit(); setRoleViewMode('create'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', fontSize: '0.9rem', padding: '0 16px', margin: 0, width: 'auto' }}>
                        <Plus size={16} /> New Role
                    </button>
                )}
                {activeTab === 'users' && userViewMode === 'list' && (
                    <button className="btn-primary" onClick={() => { cancelUserEdit(); setUserViewMode('create'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', fontSize: '0.9rem', padding: '0 16px', margin: 0, width: 'auto' }}>
                        <Plus size={16} /> New User
                    </button>
                )}
            </div>

            {/* Sub-tabs header */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem', paddingBottom: '10px' }}>
                <button 
                    onClick={() => setActiveTab('roles')} 
                    style={{ 
                        background: activeTab === 'roles' ? 'rgba(255,107,53,0.15)' : 'transparent',
                        color: activeTab === 'roles' ? 'var(--color-accent)' : '#aaa',
                        border: 'none', 
                        padding: '10px 20px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <Shield size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Role Master
                </button>
                <button 
                    onClick={() => setActiveTab('users')} 
                    style={{ 
                        background: activeTab === 'users' ? 'rgba(255,107,53,0.15)' : 'transparent',
                        color: activeTab === 'users' ? 'var(--color-accent)' : '#aaa',
                        border: 'none', 
                        padding: '10px 20px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    User Access
                </button>
                <button 
                    onClick={() => setActiveTab('permissions')} 
                    style={{ 
                        background: activeTab === 'permissions' ? 'rgba(255,107,53,0.15)' : 'transparent',
                        color: activeTab === 'permissions' ? 'var(--color-accent)' : '#aaa',
                        border: 'none', 
                        padding: '10px 20px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <Settings size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    User Access Permission
                </button>
            </div>

            {/* TAB 1: ROLE MASTER */}
            {activeTab === 'roles' && (
                <>
                    {roleViewMode === 'list' && (
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, color: 'var(--color-molten-yellow)', fontSize: '1.25rem' }}>Configure Access Roles</h3>
                                </div>
                                
                                {/* Search Bar */}
                                <div className="search-bar-container" style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="text" 
                                        className="glass-input" 
                                        placeholder="Search roles..." 
                                        value={roleSearch}
                                        onChange={e => setRoleSearch(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleRoleSearch(); }}
                                        style={{ margin: 0, flex: 1 }}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleRoleSearch} 
                                        className="btn-primary" 
                                        style={{ margin: 0, padding: '0 1.5rem', width: 'auto', minHeight: 'auto', height: '42px' }}
                                    >
                                        Search
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleRoleClearSearch} 
                                        className="btn-secondary" 
                                        style={{ margin: 0, padding: '0 1.5rem', width: 'auto', minHeight: 'auto', height: '42px' }}
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="desktop-only-view">
                                    <div className="data-table-wrapper" style={{ position: 'relative' }}>
                                        {/* Left and Right Scroll Chevron Buttons */}
                                        <button 
                                            type="button"
                                            className="scroll-arrow left" 
                                            onClick={() => scrollRoleTable('left')} 
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
                                            className="scroll-arrow right" 
                                            onClick={() => scrollRoleTable('right')} 
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

                                        <div className="data-table-container" ref={roleTableContainerRef}>
                                            <table className="glass-table">
                                                <thead>
                                                    <tr>
                                                        <th>Role Name</th>
                                                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {roles.length === 0 ? (
                                                        <tr><td colSpan={2} style={{ textAlign: 'center', padding: '2rem' }}>No roles defined yet.</td></tr>
                                                    ) : roles.map(role => {
                                                        return (
                                                            <tr key={role.id}>
                                                                <td style={{ fontWeight: '700', color: 'var(--color-molten-yellow)' }}>{role.name}</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                        <button className="action-icon-btn edit-btn" onClick={() => handleRoleEdit(role)} title="Edit Role">
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button className="action-icon-btn delete-btn" onClick={() => handleRoleDelete(role.id)} title="Delete Role">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="pagination-controls">
                                        <button disabled={rolePage === 1} onClick={() => setRolePage(rolePage - 1)} className="page-btn">
                                            &larr; Previous
                                        </button>
                                        <span className="page-info">Page {rolePage} of {roleTotalPages || 1}</span>
                                        <button disabled={rolePage >= roleTotalPages} onClick={() => setRolePage(rolePage + 1)} className="page-btn">
                                            Next &rarr;
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile View */}
                                <div className="mobile-only-view">
                                    <div className="mobile-card-list" style={{ padding: '1rem' }}>
                                        {roles.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No roles defined yet.</div>
                                        ) : roles.map(role => (
                                            <div className="mobile-card" key={role.id}>
                                                <div className="mobile-card-header">
                                                    <h3>{role.name}</h3>
                                                </div>
                                                <div className="mobile-card-body">
                                                    <p><strong>Role Name</strong> <span style={{ color: 'var(--color-molten-yellow)' }}>{role.name}</span></p>
                                                </div>
                                                <div className="mobile-card-actions">
                                                    <button className="action-icon-btn edit-btn" onClick={() => handleRoleEdit(role)} title="Edit Role">
                                                        <Edit2 size={16} /> Edit
                                                    </button>
                                                    <button className="action-icon-btn delete-btn" onClick={() => handleRoleDelete(role.id)} title="Delete Role">
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="pagination-controls">
                                        <button disabled={rolePage === 1} onClick={() => setRolePage(rolePage - 1)} className="page-btn">
                                            &larr; Previous
                                        </button>
                                        <span className="page-info">Page {rolePage} of {roleTotalPages || 1}</span>
                                        <button disabled={rolePage >= roleTotalPages} onClick={() => setRolePage(rolePage + 1)} className="page-btn">
                                            Next &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(roleViewMode === 'create' || roleViewMode === 'edit') && (
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <div className="form-panel" style={{ width: '100%', maxWidth: '600px' }}>
                                <h3>{editingRoleId ? 'Edit Role Master' : 'Create Role Master'}</h3>
                                <form onSubmit={handleRoleSubmit}>
                                    <div className="input-group">
                                        <label>Role Name <span className="required-asterisk">*</span></label>
                                        <input 
                                            className="glass-input" 
                                            placeholder="e.g. Purchase Manager" 
                                            value={roleForm.name} 
                                            onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                            required
                                        />
                                        {roleErrors.name && <span className="error-text">{roleErrors.name}</span>}
                                    </div>

                                    <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h4 style={{ margin: '0 0 16px 0', color: 'var(--color-accent)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>Accessible Menus and Sub-Menus</h4>
                                        
                                        {/* Dashboard Category */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-molten-yellow)', fontSize: '0.95rem', fontWeight: 600 }}>General</h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer', margin: 0 }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={roleForm.can_access_dashboard} 
                                                        onChange={e => setRoleForm({ ...roleForm, can_access_dashboard: e.target.checked })} 
                                                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                                                    />
                                                    <span>Dashboard</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Masters Category */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isAllMastersChecked} 
                                                    onChange={e => toggleAllMasters(e.target.checked)} 
                                                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-molten-yellow)' }}
                                                />
                                                <span style={{ color: 'var(--color-molten-yellow)', fontSize: '0.95rem', fontWeight: 600 }}>Masters (Select All)</span>
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', paddingLeft: '26px' }}>
                                                {[
                                                    { key: 'can_access_supplier_master', label: 'Supplier Master' },
                                                    { key: 'can_access_raw_material_master', label: 'Raw Material Master' },
                                                    { key: 'can_access_customer_master', label: 'Customer Master' },
                                                    { key: 'can_access_pattern_material_master', label: 'Pattern Material Master' },
                                                    { key: 'can_access_product_master', label: 'Product Master' },
                                                    { key: 'can_access_core_box_master', label: 'Core Box Master' },
                                                    { key: 'can_access_pattern_master', label: 'Pattern Master' },
                                                ].map(menu => (
                                                    <label key={menu.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer', margin: 0 }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={(roleForm as any)[menu.key]} 
                                                            onChange={e => setRoleForm({ ...roleForm, [menu.key]: e.target.checked })} 
                                                            style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                                                        />
                                                        <span>{menu.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Purchase Category */}
                                        <div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isAllPurchaseChecked} 
                                                    onChange={e => toggleAllPurchase(e.target.checked)} 
                                                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-molten-yellow)' }}
                                                />
                                                <span style={{ color: 'var(--color-molten-yellow)', fontSize: '0.95rem', fontWeight: 600 }}>Purchase (Select All)</span>
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', paddingLeft: '26px' }}>
                                                {[
                                                    { key: 'can_access_purchase_inward', label: 'Purchase Inward' },
                                                    { key: 'can_access_purchase_rejection', label: 'Purchase Rejection' },
                                                    { key: 'can_access_purchase_return', label: 'Purchase Return' },
                                                ].map(menu => (
                                                    <label key={menu.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer', margin: 0 }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={(roleForm as any)[menu.key]} 
                                                            onChange={e => setRoleForm({ ...roleForm, [menu.key]: e.target.checked })} 
                                                            style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                                                        />
                                                        <span>{menu.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Inventory Category */}
                                        <div style={{ marginTop: '20px' }}>
                                             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                                                 <input 
                                                     type="checkbox" 
                                                     checked={isAllInventoryChecked} 
                                                     onChange={e => toggleAllInventory(e.target.checked)} 
                                                     style={{ width: '16px', height: '16px', accentColor: 'var(--color-molten-yellow)' }}
                                                 />
                                                 <span style={{ color: 'var(--color-molten-yellow)', fontSize: '0.95rem', fontWeight: 600 }}>Inventory (Select All)</span>
                                             </label>
                                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', paddingLeft: '26px' }}>
                                                 {[
                                                     { key: 'can_access_material_stock', label: 'Material Stock' },
                                                     { key: 'can_access_material_stock_log', label: 'Material Stock Log' },
                                                     { key: 'can_access_product_stock', label: 'Product Stock' },
                                                     { key: 'can_access_product_stock_log', label: 'Product Stock Log' },
                                                 ].map(menu => (
                                                     <label key={menu.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer', margin: 0 }}>
                                                         <input 
                                                             type="checkbox" 
                                                             checked={(roleForm as any)[menu.key]} 
                                                             onChange={e => setRoleForm({ ...roleForm, [menu.key]: e.target.checked })} 
                                                             style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                                                         />
                                                         <span>{menu.label}</span>
                                                     </label>
                                                 ))}
                                             </div>
                                        </div>

                                        {/* Pattern System Category */}
                                        <div style={{ marginTop: '20px' }}>
                                             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                                                 <input 
                                                     type="checkbox" 
                                                     checked={roleForm.can_access_pattern_flow} 
                                                     onChange={e => setRoleForm({ ...roleForm, can_access_pattern_flow: e.target.checked })} 
                                                     style={{ width: '16px', height: '16px', accentColor: 'var(--color-molten-yellow)' }}
                                                 />
                                                 <span style={{ color: 'var(--color-molten-yellow)', fontSize: '0.95rem', fontWeight: 600 }}>Pattern System (Select All)</span>
                                             </label>
                                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', paddingLeft: '26px' }}>
                                                 {[
                                                     { key: 'can_access_pattern_flow', label: 'Pattern Flow / Tracking' },
                                                 ].map(menu => (
                                                     <label key={menu.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer', margin: 0 }}>
                                                         <input 
                                                             type="checkbox" 
                                                             checked={(roleForm as any)[menu.key]} 
                                                             onChange={e => setRoleForm({ ...roleForm, [menu.key]: e.target.checked })} 
                                                             style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                                                         />
                                                         <span>{menu.label}</span>
                                                     </label>
                                                 ))}
                                             </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                                        <button type="submit" className="btn-primary" disabled={loading} style={{ margin: 0, flex: 1 }}>
                                            {loading ? 'Saving...' : 'Save Role'}
                                        </button>
                                        <button type="button" className="btn-secondary" onClick={cancelRoleEdit} style={{ margin: 0, flex: 1 }}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* TAB 2: USER ACCESS (USERS LIST) */}
            {activeTab === 'users' && (
                <>
                    {userViewMode === 'list' && (
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, color: 'var(--color-molten-yellow)', fontSize: '1.25rem' }}>User Credentials and Mappings</h3>
                                </div>
                                
                                {/* Search Bar */}
                                <div className="search-bar-container" style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="text" 
                                        className="glass-input" 
                                        placeholder="Search users..." 
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleUserSearch(); }}
                                        style={{ margin: 0, flex: 1 }}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleUserSearch} 
                                        className="btn-primary" 
                                        style={{ margin: 0, padding: '0 1.5rem', width: 'auto', minHeight: 'auto', height: '42px' }}
                                    >
                                        Search
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleUserClearSearch} 
                                        className="btn-secondary" 
                                        style={{ margin: 0, padding: '0 1.5rem', width: 'auto', minHeight: 'auto', height: '42px' }}
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="desktop-only-view">
                                    <div className="data-table-wrapper" style={{ position: 'relative' }}>
                                        {/* Left and Right Scroll Chevron Buttons */}
                                        <button 
                                            type="button"
                                            className="scroll-arrow left" 
                                            onClick={() => scrollUserTable('left')} 
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
                                            className="scroll-arrow right" 
                                            onClick={() => scrollUserTable('right')} 
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

                                        <div className="data-table-container" ref={userTableContainerRef}>
                                            <table className="glass-table">
                                                <thead>
                                                    <tr>
                                                        <th>Username</th>
                                                        <th>Email</th>
                                                        <th>Role Mapped</th>
                                                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {users.length === 0 ? (
                                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No user credentials created yet.</td></tr>
                                                    ) : users.map(user => (
                                                        <tr key={user.id}>
                                                            <td style={{ fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ 
                                                                    display: 'inline-block', 
                                                                    width: '8px', 
                                                                    height: '8px', 
                                                                    borderRadius: '50%', 
                                                                    background: user.is_active ? '#22c55e' : '#ef4444',
                                                                    boxShadow: `0 0 8px ${user.is_active ? '#22c55e' : '#ef4444'}` 
                                                                }} />
                                                                {user.username}
                                                            </td>
                                                            <td>{user.email || '-'}</td>
                                                            <td>
                                                                {user.is_superuser ? (
                                                                    <span style={{ color: 'var(--color-molten-yellow)', fontWeight: 600 }}>Superuser Admin</span>
                                                                ) : (
                                                                    user.role_name || <span style={{ color: '#888' }}>Unassigned</span>
                                                                )}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button className="action-icon-btn edit-btn" onClick={() => handleUserEdit(user)} title="Edit User">
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button className="action-icon-btn delete-btn" onClick={() => handleUserDelete(user.id)} title="Delete User">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="pagination-controls">
                                        <button disabled={userPage === 1} onClick={() => setUserPage(userPage - 1)} className="page-btn">
                                            &larr; Previous
                                        </button>
                                        <span className="page-info">Page {userPage} of {userTotalPages || 1}</span>
                                        <button disabled={userPage >= userTotalPages} onClick={() => setUserPage(userPage + 1)} className="page-btn">
                                            Next &rarr;
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile View */}
                                <div className="mobile-only-view">
                                    <div className="mobile-card-list" style={{ padding: '1rem' }}>
                                        {users.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No user credentials created yet.</div>
                                        ) : users.map(user => (
                                            <div className="mobile-card" key={user.id}>
                                                <div className="mobile-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ 
                                                            display: 'inline-block', 
                                                            width: '8px', 
                                                            height: '8px', 
                                                            borderRadius: '50%', 
                                                            background: user.is_active ? '#22c55e' : '#ef4444',
                                                            boxShadow: `0 0 8px ${user.is_active ? '#22c55e' : '#ef4444'}` 
                                                        }} />
                                                        {user.username}
                                                    </h3>
                                                </div>
                                                <div className="mobile-card-body">
                                                    <p><strong>Email</strong> <span>{user.email || '-'}</span></p>
                                                    <p><strong>Role Mapped</strong> <span>{user.is_superuser ? 'Superuser Admin' : (user.role_name || 'Unassigned')}</span></p>
                                                </div>
                                                <div className="mobile-card-actions">
                                                    <button className="action-icon-btn edit-btn" onClick={() => handleUserEdit(user)} title="Edit User">
                                                        <Edit2 size={16} /> Edit
                                                    </button>
                                                    <button className="action-icon-btn delete-btn" onClick={() => handleUserDelete(user.id)} title="Delete User">
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="pagination-controls">
                                        <button disabled={userPage === 1} onClick={() => setUserPage(userPage - 1)} className="page-btn">
                                            &larr; Previous
                                        </button>
                                        <span className="page-info">Page {userPage} of {userTotalPages || 1}</span>
                                        <button disabled={userPage >= userTotalPages} onClick={() => setUserPage(userPage + 1)} className="page-btn">
                                            Next &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(userViewMode === 'create' || userViewMode === 'edit') && (
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <div className="form-panel" style={{ width: '100%', maxWidth: '600px' }}>
                                <h3>{editingUserId ? 'Edit User Credentials' : 'Create User Credentials'}</h3>
                                <form onSubmit={handleUserSubmit}>
                                    <div className="input-group">
                                        <label>Username <span className="required-asterisk">*</span></label>
                                        <input 
                                            className="glass-input" 
                                            placeholder="e.g. store_user" 
                                            value={userForm.username} 
                                            onChange={e => setUserForm({ ...userForm, username: e.target.value.toLowerCase() })}
                                            required
                                            disabled={!!editingUserId}
                                        />
                                        {userErrors.username && <span className="error-text">{userErrors.username}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label>Email Address</label>
                                        <input 
                                            type="email"
                                            className="glass-input" 
                                            placeholder="e.g. user@foundry.com" 
                                            value={userForm.email} 
                                            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                        />
                                        {userErrors.email && <span className="error-text">{userErrors.email}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label>Password {!editingUserId && <span className="required-asterisk">*</span>}</label>
                                        <input 
                                            type="password"
                                            className="glass-input" 
                                            placeholder={editingUserId ? 'Leave blank to keep current password' : 'Enter login password'} 
                                            value={userForm.password} 
                                            onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                            required={!editingUserId}
                                        />
                                        {userErrors.password && <span className="error-text">{userErrors.password}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label>Select Role Master <span className="required-asterisk">*</span></label>
                                        <select 
                                            className="glass-input"
                                            value={userForm.role}
                                            onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Mapped Role --</option>
                                            {roles.map(role => (
                                                <option key={role.id} value={role.id}>{role.name}</option>
                                            ))}
                                        </select>
                                        {userErrors.role && <span className="error-text">{userErrors.role}</span>}
                                    </div>

                                    <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                                        <input 
                                            type="checkbox" 
                                            id="user-active" 
                                            checked={userForm.is_active} 
                                            onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })} 
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} 
                                        />
                                        <label htmlFor="user-active" style={{ margin: 0, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' }}>Active Account</label>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                                        <button type="submit" className="btn-primary" disabled={loading} style={{ margin: 0, flex: 1 }}>
                                            {loading ? 'Saving...' : 'Save User'}
                                        </button>
                                        <button type="button" className="btn-secondary" onClick={cancelUserEdit} style={{ margin: 0, flex: 1 }}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* TAB 3: USER ACCESS PERMISSION */}
            {activeTab === 'permissions' && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div className="form-panel" style={{ width: '100%', maxWidth: '600px' }}>
                        <h3>Configure User Visibility Permissions</h3>
                        <form onSubmit={handlePermissionsSubmit}>
                            {/* User Selection */}
                            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Select User <span className="required-asterisk">*</span></label>
                                <SearchableSelect 
                                    options={users.map(u => ({ value: u.id, label: u.username }))}
                                    value={selectedPermissionUserId}
                                    onChange={val => {
                                        setSelectedPermissionUserId(val);
                                        const selectedUser = users.find(u => u.id.toString() === val.toString());
                                        if (selectedUser) {
                                            setPermissionsForm({
                                                show_customer_to_all_departments: selectedUser.show_customer_to_all_departments,
                                                show_supplier_to_all_departments: selectedUser.show_supplier_to_all_departments,
                                            });
                                        }
                                    }}
                                    placeholder="-- Select User --"
                                />
                            </div>

                            {selectedPermissionUserId ? (
                                <>
                                    {/* Toggle 1: Show Customer Name */}
                                    <div 
                                        onClick={() => setPermissionsForm({ 
                                            ...permissionsForm, 
                                            show_customer_to_all_departments: !permissionsForm.show_customer_to_all_departments 
                                        })}
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            padding: '15px 20px', 
                                            borderRadius: '8px', 
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            marginBottom: '1.5rem',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Show Customer name to all departments</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#aaa' }}>If disabled, customer names will be hidden (***) across the application for this user.</p>
                                        </div>
                                        <div style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
                                            <span style={{
                                                position: 'absolute',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                backgroundColor: permissionsForm.show_customer_to_all_departments ? 'var(--color-accent)' : '#333',
                                                transition: '0.4s',
                                                borderRadius: '34px',
                                                boxShadow: permissionsForm.show_customer_to_all_departments ? '0 0 8px rgba(255,107,53,0.4)' : 'none'
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    content: '""',
                                                    height: '18px', width: '18px',
                                                    left: permissionsForm.show_customer_to_all_departments ? '26px' : '4px',
                                                    bottom: '4px',
                                                    backgroundColor: 'white',
                                                    transition: '0.4s',
                                                    borderRadius: '50%'
                                                }} />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Toggle 2: Show Supplier Name */}
                                    <div 
                                        onClick={() => setPermissionsForm({ 
                                            ...permissionsForm, 
                                            show_supplier_to_all_departments: !permissionsForm.show_supplier_to_all_departments 
                                        })}
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            padding: '15px 20px', 
                                            borderRadius: '8px', 
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            marginBottom: '1.5rem',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Show Supplier name to all departments</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#aaa' }}>If disabled, supplier names will be hidden (***) across the application for this user.</p>
                                        </div>
                                        <div style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
                                            <span style={{
                                                position: 'absolute',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                backgroundColor: permissionsForm.show_supplier_to_all_departments ? 'var(--color-accent)' : '#333',
                                                transition: '0.4s',
                                                borderRadius: '34px',
                                                boxShadow: permissionsForm.show_supplier_to_all_departments ? '0 0 8px rgba(255,107,53,0.4)' : 'none'
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    content: '""',
                                                    height: '18px', width: '18px',
                                                    left: permissionsForm.show_supplier_to_all_departments ? '26px' : '4px',
                                                    bottom: '4px',
                                                    backgroundColor: 'white',
                                                    transition: '0.4s',
                                                    borderRadius: '50%'
                                                }} />
                                            </span>
                                        </div>
                                    </div>

                                    <button type="submit" className="btn-primary" disabled={loading} style={{ margin: '1rem 0 0 0', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Save size={18} /> {loading ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#888', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    Please select a user above to view and configure their visibility permissions.
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserAccessTab;
