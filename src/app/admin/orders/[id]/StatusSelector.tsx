'use client';

import { useTransition } from 'react';
import { updateOrderStatus } from '../actions';
import styles from '../../admin.module.css';

export default function StatusSelector({ orderId, currentStatus }: { orderId: string, currentStatus: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    startTransition(() => {
      updateOrderStatus(orderId, newStatus);
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4b5563' }}>Fulfillment Status:</label>
      <select 
        className={styles.inputSelect} 
        value={currentStatus} 
        onChange={handleChange}
        disabled={isPending}
        style={{ width: '200px' }}
      >
        <option value="pending">Pending (Awaiting Payment)</option>
        <option value="processing">Processing (Paid / Labeling)</option>
        <option value="shipped">Shipped</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="refunded">Refunded</option>
      </select>
      {isPending && <span style={{ fontSize: '0.8rem', color: '#0d9488' }}>Saving...</span>}
    </div>
  );
}
