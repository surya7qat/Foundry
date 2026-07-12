import React, { useState, useEffect, useRef } from 'react';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number;
    onChange: (val: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onSearchChange?: (term: string) => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    required = false,
    disabled = false,
    className = 'glass-input',
    style = {},
    onSearchChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    
    const selectedOption = options.find(opt => opt.value.toString() === value?.toString());
    
    useEffect(() => {
        if (selectedOption) {
            setSearch(selectedOption.label);
        } else {
            setSearch('');
        }
    }, [value, selectedOption]);
    
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                // Reset search input to selected option label if not selecting
                setSearch(selectedOption ? selectedOption.label : '');
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [selectedOption]);
    
    const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );
    
    return (
        <div ref={containerRef} className="searchable-select-container" style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                className={className}
                value={search}
                onChange={(e) => {
                    const term = e.target.value;
                    setSearch(term);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    setIsOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmedSearch = search.trim();
                        if (trimmedSearch === '') {
                            return;
                        }
                        if (onSearchChange) {
                            onSearchChange(trimmedSearch);
                        }
                    }
                }}
                placeholder={placeholder}
                required={required && !value}
                disabled={disabled}
                style={{ 
                    ...style, 
                    width: '100%', 
                    cursor: 'pointer', 
                    paddingRight: '22px', 
                    paddingLeft: '8px', 
                    fontSize: '0.85rem',
                    textOverflow: 'ellipsis'
                }}
            />
            <span style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#888',
                fontSize: '0.65rem'
            }}>
                ▼
            </span>
            {isOpen && !disabled && (
                <div className="searchable-select-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    background: '#1a1a1e',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    zIndex: 1000,
                    marginTop: '4px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
                }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '8px 12px', color: '#666', fontSize: '0.85rem' }}>No results found</div>
                    ) : (
                        filtered.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value.toString());
                                    setSearch(opt.label);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    color: '#eee',
                                    fontSize: '0.85rem',
                                    background: opt.value.toString() === value?.toString() ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = opt.value.toString() === value?.toString() ? 'rgba(255, 107, 53, 0.15)' : 'transparent'}
                            >
                                {opt.label}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
