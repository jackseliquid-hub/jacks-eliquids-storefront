'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styles from './discounts.module.css';
import { DiscountRule, DiscountRange, getDiscountRules, saveDiscountRule, deleteDiscountRule } from '@/lib/discounts';
import { getAllProducts, getCategories, getTags } from '@/lib/data';

interface SearchItem {
  id: string;
  name: string;
}

export default function DiscountsAdminPage() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Search resources
  const [products, setProducts] = useState<SearchItem[]>([]);
  const [categories, setCategories] = useState<SearchItem[]>([]);
  const [tags, setTags] = useState<SearchItem[]>([]);

  // Search UI state per rule
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedRules, allProds, allCats, allTags] = await Promise.all([
          getDiscountRules(),
          getAllProducts(),
          getCategories(),
          getTags()
        ]);
        
        setRules(fetchedRules);
        
        setProducts(allProds.map(p => ({ id: p.id, name: p.name })));
        setCategories(allCats.map(c => ({ id: c, name: c })));
        setTags(allTags.map(t => ({ id: t.name, name: t.name })));
      } catch (err) {
        console.error("Error loading discount page data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddRule = () => {
    const newRule: DiscountRule = {
      id: uuidv4(),
      name: 'New Discount Rule',
      type: 'product',
      targetValues: [],
      ranges: [
        {
          id: uuidv4(),
          min: 1,
          max: null,
          type: 'fixed',
          value: 0,
          label: 'e.g. 10+'
        }
      ],
      createdAt: Date.now()
    };
    setRules([newRule, ...rules]);
  };

  const handleRemoveRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setDeletedIds([...deletedIds, ruleId]);
      setRules(rules.filter(r => r.id !== ruleId));
    }
  };

  const updateRule = (ruleId: string, updates: Partial<DiscountRule>) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const handleAddRange = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    // Auto increment from last range
    const lastRange = rule.ranges[rule.ranges.length - 1];
    const newMin = lastRange && lastRange.max ? lastRange.max + 1 : (lastRange ? lastRange.min + 1 : 1);

    const newRange: DiscountRange = {
      id: uuidv4(),
      min: newMin,
      max: null,
      type: 'fixed',
      value: 0,
      label: ''
    };
    updateRule(ruleId, { ranges: [...rule.ranges, newRange] });
  };

  const handleRemoveRange = (ruleId: string, rangeId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    updateRule(ruleId, { ranges: rule.ranges.filter(rg => rg.id !== rangeId) });
  };

  const updateRange = (ruleId: string, rangeId: string, updates: Partial<DiscountRange>) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const newRanges = rule.ranges.map(rg => rg.id === rangeId ? { ...rg, ...updates } : rg);
    updateRule(ruleId, { ranges: newRanges });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Delete removed rules
      for (const id of deletedIds) {
        // We only attempt to delete from DB if it might exist there 
        // (if it wasn't a newly added unsaved rule)
        try { await deleteDiscountRule(id); } catch (e) {}
      }

      // Save active rules
      for (const rule of rules) {
        await saveDiscountRule(rule);
      }
      
      setDeletedIds([]);
      showToast('All changes saved successfully!');
    } catch (error) {
      console.error('Save failed', error);
      showToast('Error saving changes.');
    } finally {
      setSaving(false);
    }
  };

  const getSearchResults = (rule: DiscountRule, query: string) => {
    if (!query || query.length < 2) return [];
    
    const lowerQ = query.toLowerCase();
    let source: SearchItem[] = [];
    if (rule.type === 'product') source = products;
    if (rule.type === 'category') source = categories;
    if (rule.type === 'tag') source = tags;

    return source
      .filter(item => item.name.toLowerCase().includes(lowerQ))
      .filter(item => !rule.targetValues.includes(item.id)) // exclude already added
      .slice(0, 10); // limit to 10
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Discounts...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bulk Discount Management</h1>
          <p className={styles.subTitle}>Create dynamic tier pricing for your products across the storefront.</p>
        </div>
        <button className={styles.addButton} onClick={handleAddRule}>
          + Add New Discount Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon}>💰</span>
          <p className={styles.emptyStateText}>No active bulk discount rules found.</p>
          <button className={styles.addButton} style={{ margin: '0 auto' }} onClick={handleAddRule}>
            Create your first rule
          </button>
        </div>
      ) : (
        <div className={styles.rulesList}>
          {rules.map((rule, idx) => {
            const searchQuery = searchQueries[rule.id] || '';
            const searchResults = getSearchResults(rule, searchQuery);

            return (
              <div key={rule.id} className={styles.ruleCard}>
                <div className={styles.ruleHeader}>
                  <div className={styles.fieldGroup} style={{ maxWidth: '200px' }}>
                    <label className={styles.label}>Rule Type</label>
                    <select 
                      className={styles.select}
                      value={rule.type}
                      onChange={(e) => {
                        updateRule(rule.id, { 
                          type: e.target.value as any, 
                          targetValues: [] // clear targets when changing type
                        });
                        setSearchQueries(prev => ({...prev, [rule.id]: ''}));
                      }}
                    >
                      <option value="product">Specific Products</option>
                      <option value="category">Category</option>
                      <option value="tag">Tag</option>
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Select {rule.type}s</label>
                    <div className={styles.searchWrap}>
                      <div className={styles.tagsContainer}>
                        {rule.targetValues.map(val => {
                          let display = val;
                          if (rule.type === 'product') {
                            display = products.find(p => p.id === val)?.name || val;
                          }
                          return (
                            <span key={val} className={styles.selectedTag}>
                              {display}
                              <button 
                                className={styles.removeTagBtn}
                                onClick={() => {
                                  updateRule(rule.id, {
                                    targetValues: rule.targetValues.filter(t => t !== val)
                                  });
                                }}
                              >×</button>
                            </span>
                          );
                        })}
                      </div>
                      <input 
                        type="text" 
                        className={styles.input} 
                        placeholder={`Search & add ${rule.type}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQueries(prev => ({ ...prev, [rule.id]: e.target.value }))}
                      />
                      {searchResults.length > 0 && (
                        <div className={styles.searchResults}>
                          {searchResults.map(res => (
                            <div 
                              key={res.id} 
                              className={styles.searchResultItem}
                              onClick={() => {
                                updateRule(rule.id, {
                                  targetValues: [...rule.targetValues, res.id]
                                });
                                setSearchQueries(prev => ({...prev, [rule.id]: ''}));
                              }}
                            >
                              {res.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button className={styles.deleteRuleBtn} onClick={() => handleRemoveRule(rule.id)} title="Delete Rule">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
                
                <div className={styles.ruleBody}>
                  <table className={styles.rangesTable}>
                    <thead>
                      <tr>
                        <th style={{ width: '12%' }}>Min Qty</th>
                        <th style={{ width: '12%' }}>Max Qty</th>
                        <th style={{ width: '25%' }}>Discount Type</th>
                        <th style={{ width: '15%' }}>Value</th>
                        <th style={{ width: '25%' }}>Frontend Label</th>
                        <th style={{ width: '10%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rule.ranges.map((range) => (
                        <tr key={range.id}>
                          <td>
                            <input 
                              type="number" 
                              className={styles.input} 
                              value={range.min} 
                              onChange={(e) => updateRange(rule.id, range.id, { min: parseInt(e.target.value) || 0 })}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className={styles.input} 
                              placeholder="∞"
                              value={range.max === null ? '' : range.max} 
                              onChange={(e) => updateRange(rule.id, range.id, { 
                                max: e.target.value === '' ? null : parseInt(e.target.value) 
                              })}
                            />
                          </td>
                          <td>
                            <select 
                              className={styles.select}
                              value={range.type}
                              onChange={(e) => updateRange(rule.id, range.id, { type: e.target.value as any })}
                            >
                              <option value="percent">Percentage Discount (%)</option>
                              <option value="fixed">Fixed Price per Item (£)</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number" 
                              step="0.01"
                              className={styles.input} 
                              value={range.value} 
                              onChange={(e) => updateRange(rule.id, range.id, { value: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className={styles.input} 
                              placeholder="e.g. 10+"
                              value={range.label} 
                              onChange={(e) => updateRange(rule.id, range.id, { label: e.target.value })}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className={styles.removeRangeBtn} 
                              onClick={() => handleRemoveRange(rule.id, range.id)}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={styles.ruleFooter}>
                    <button className={styles.addRangeBtn} onClick={() => handleAddRange(rule.id)}>
                      + Add Price Tier
                    </button>
                    <button 
                      className={styles.saveRuleBtn} 
                      onClick={handleSaveAll}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Current Rule Data'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rules.length > 0 && (
        <div className={styles.footer}>
          <button 
            className={styles.saveButton} 
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? 'Saving All...' : 'Save All Rules & Changes'}
          </button>
        </div>
      )}

      {/* Basic toast display at top right */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#10b981',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          fontWeight: 600
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
