'use client';

import { useState, useRef, useEffect } from 'react';

interface ProductOption {
  id: string;
  name: string;
  image?: string;
  category?: string;
}

interface RelatedProductsPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allProducts: ProductOption[];
  currentProductId?: string;
  maxItems?: number;
}

export default function RelatedProductsPicker({
  selectedIds,
  onChange,
  allProducts,
  currentProductId,
  maxItems = 8,
}: RelatedProductsPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products for the dropdown
  const availableProducts = allProducts.filter(p =>
    p.id !== currentProductId &&
    !selectedIds.includes(p.id) &&
    (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get full info for selected products
  const selectedProducts = selectedIds
    .map(id => allProducts.find(p => p.id === id))
    .filter(Boolean) as ProductOption[];

  function handleAdd(productId: string) {
    if (selectedIds.length >= maxItems) return;
    onChange([...selectedIds, productId]);
    setSearchTerm('');
    setShowDropdown(false);
  }

  function handleRemove(productId: string) {
    onChange(selectedIds.filter(id => id !== productId));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newIds = [...selectedIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    onChange(newIds);
  }

  function handleMoveDown(index: number) {
    if (index === selectedIds.length - 1) return;
    const newIds = [...selectedIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    onChange(newIds);
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', background: '#f5f5f7', borderBottom: '1px solid #e5e5e5', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Related Products</span>
        <span style={{ fontSize: '0.8rem', color: '#86868b', fontWeight: 400 }}>
          {selectedIds.length}/{maxItems} manual picks · remaining slots auto-filled
        </span>
      </div>

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {/* Selected products list */}
        {selectedProducts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {selectedProducts.map((product, index) => (
              <div
                key={product.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.75rem', background: '#f5f5f7',
                  borderRadius: '8px', border: '1px solid #e5e5e5',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#86868b', fontWeight: 600, minWidth: '20px' }}>
                  {index + 1}.
                </span>
                {product.image && (
                  <img
                    src={product.image}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: '4px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.name}
                  </div>
                  {product.category && (
                    <div style={{ fontSize: '0.72rem', color: '#86868b' }}>{product.category}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{
                      border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer',
                      opacity: index === 0 ? 0.3 : 1, fontSize: '0.9rem', padding: '2px 4px',
                    }}
                    title="Move up"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === selectedIds.length - 1}
                    style={{
                      border: 'none', background: 'none',
                      cursor: index === selectedIds.length - 1 ? 'default' : 'pointer',
                      opacity: index === selectedIds.length - 1 ? 0.3 : 1,
                      fontSize: '0.9rem', padding: '2px 4px',
                    }}
                    title="Move down"
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer',
                      color: '#ff3b30', fontSize: '1rem', padding: '2px 4px', fontWeight: 600,
                    }}
                    title="Remove"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search input */}
        {selectedIds.length < maxItems && (
          <div ref={wrapperRef} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search products to add…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              style={{
                width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                border: '1px solid #d2d2d7', fontSize: '0.9rem',
              }}
            />

            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: '#fff', border: '1px solid #d2d2d7', borderRadius: '0 0 8px 8px',
                maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {availableProducts.length === 0 ? (
                  <div style={{ padding: '0.75rem 1rem', color: '#86868b', fontSize: '0.85rem' }}>
                    {searchTerm ? 'No matching products' : 'Type to search products'}
                  </div>
                ) : (
                  availableProducts.slice(0, 15).map(product => (
                    <div
                      key={product.id}
                      onClick={() => handleAdd(product.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.5rem 0.75rem', cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      {product.image && (
                        <img
                          src={product.image}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: '4px', objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.name}
                        </div>
                        {product.category && (
                          <div style={{ fontSize: '0.7rem', color: '#86868b' }}>{product.category}</div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#009688', fontWeight: 500 }}>+ Add</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {selectedIds.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: '#86868b', marginTop: '0.5rem' }}>
            No manual picks — all 8 slots will be auto-filled from matching tags, category, and brand.
          </p>
        )}
      </div>
    </div>
  );
}
