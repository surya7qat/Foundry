import React, { useState, useEffect, useRef } from 'react';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableMultiSelectProps {
    options: Option[];
    selectedValues: (string | number)[];
    onChange: (vals: (string | number)[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
    options,
    selectedValues,
    onChange,
    placeholder = 'Type to search and select...',
    disabled = false,
    className = 'glass-input',
    style = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const selectedOptions = options.filter(opt => 
        selectedValues.some(val => val.toString() === opt.value.toString())
    );

    const filtered = options.filter(opt =>
        !selectedValues.some(val => val.toString() === opt.value.toString()) &&
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (optValue: string | number) => {
        onChange([...selectedValues, optValue]);
        setSearch('');
        setIsOpen(false);
    };

    const handleRemove = (optValue: string | number) => {
        onChange(selectedValues.filter(val => val.toString() !== optValue.toString()));
    };

    return (
        <div ref={containerRef} className="searchable-multiselect-container" style={{ position: 'relative', width: '100%' }}>
            {/* Selected Chips Area */}
            {selectedOptions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {selectedOptions.map(opt => (
                        <div 
                            key={opt.value} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                background: 'rgba(255, 107, 53, 0.15)', 
                                border: '1px solid rgba(255, 107, 53, 0.3)', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.8rem', 
                                color: '#eee',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                            }}
                        >
                            <span>{opt.label}</span>
                            <button 
                                type="button" 
                                onClick={() => handleRemove(opt.value)} 
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: '#ff6b35', 
                                    cursor: 'pointer', 
                                    fontWeight: 'bold', 
                                    padding: 0, 
                                    marginLeft: '2px', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '0.9rem',
                                    lineHeight: 1
                                }}
                                title="Remove"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Element */}
            <div style={{ position: 'relative', width: '100%' }}>
                <input
                    type="text"
                    className={className}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
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
            </div>

            {/* Dropdown Options List */}
            {isOpen && !disabled && (
                <div className="searchable-multiselect-dropdown" style={{
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
                                onClick={() => handleSelect(opt.value)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    color: '#eee',
                                    fontSize: '0.85rem',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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

export default SearchableMultiSelect;
