'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';
import { bulkUpdateOrderStatuses, bulkDeleteOrders } from './actions';

export default function OrdersTable({ initialOrders }: { initialOrders: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(initialOrders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      if (bulkAction === 'delete') {
        const confirmed = window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} orders?`);
        if (confirmed) {
          await bulkDeleteOrders(selectedIds);
          setSelectedIds([]);
        }
      } else {
        // Assume the bulk action is a status update (pending, processing, shipped, cancelled)
        await bulkUpdateOrderStatuses(selectedIds, bulkAction);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during bulk operation.');
    } finally {
      setIsProcessing(false);
      setBulkAction('');
    }
  };

  if (!initialOrders || initialOrders.length === 0) {
    return <p>No orders currently in the system.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Bulk Action Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <select 
          value={bulkAction} 
          onChange={(e) => setBulkAction(e.target.value)}
          className={styles.input}
          style={{ width: 'auto', padding: '8px', margin: 0 }}
          disabled={selectedIds.length === 0 || isProcessing}
        >
          <option value="">Bulk Actions</option>
          <option value="pending">Mark as Pending</option>
          <option value="processing">Mark as Processing</option>
          <option value="shipped">Mark as Shipped</option>
          <option value="cancelled">Mark as Cancelled</option>
          <option value="delete">Delete Orders</option>
        </select>
        
        <button 
          onClick={handleBulkAction}
          className={styles.saveBtn}
          style={{ padding: '8px 16px', margin: 0, opacity: selectedIds.length === 0 || isProcessing || !bulkAction ? 0.5 : 1 }}
          disabled={selectedIds.length === 0 || isProcessing || !bulkAction}
        >
          {isProcessing ? 'Processing...' : 'Apply'}
        </button>
        
        {selectedIds.length > 0 && (
          <span style={{ fontSize: '0.9rem', color: '#6b7280', marginLeft: 'auto' }}>
            {selectedIds.length} order{selectedIds.length > 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* Orders Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                checked={selectedIds.length === initialOrders.length && initialOrders.length > 0}
                onChange={(e) => toggleAll(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </th>
            <th>Date</th>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {initialOrders.map(order => {
            const d = new Date(order.created_at);
            const shortId = order.order_number ? order.order_number.toString() : order.id.substring(0, 8).toUpperCase();
            
            const statusColor = 
              order.status === 'pending' ? '#ca8a04' :
              order.status === 'processing' ? '#0d9488' :
              order.status === 'shipped' ? '#2563eb' :
              order.status === 'cancelled' ? '#ef4444' :
              '#111';

            const name = order.shipping_address 
              ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}`
              : 'Guest';

            return (
              <tr key={order.id} style={{ backgroundColor: selectedIds.includes(order.id) ? '#f0fdfa' : 'transparent' }}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(order.id)}
                    onChange={(e) => toggleOne(order.id, e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </td>
                <td>{d.toLocaleDateString()} {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td><strong style={{ color: 'var(--deep-teal)' }}>#{shortId}</strong></td>
                <td>{name}</td>
                <td>£{order.total.toFixed(2)}</td>
                <td>
                  <span style={{ 
                    color: statusColor, 
                    fontWeight: 600, 
                    textTransform: 'uppercase',
                    fontSize: '0.8rem',
                    backgroundColor: `${statusColor}15`,
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/orders/${order.id}`} className={styles.editBtn}>
                    View Details
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
