'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';
import RoleDropdown from './RoleDropdown';
import type { UserRole } from '@/lib/roles';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  created_at: string;
  billing_address?: { phone?: string };
}

interface Stats {
  count: number;
  total: number;
  lastOrder: string | null;
}

interface Props {
  customers: Customer[];
  statsMap: Record<string, Stats>;
  isHeadChef: boolean;
}

export default function CustomersTable({ customers, statsMap, isHeadChef }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  }, [customers, query]);

  return (
    <>
      {/* Search bar */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="🔍 Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={styles.input}
          style={{ maxWidth: 360, margin: 0 }}
        />
        {query && (
          <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
            {filtered.length} of {customers.length} customers
          </span>
        )}
      </div>

      <div className={styles.dataContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Registered</th>
              <th>Last Order</th>
              <th style={{ textAlign: 'center' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Total Spend</th>
              <th style={{ textAlign: 'right' }}>AOV</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(customer => {
              const stats = statsMap[customer.id] || { count: 0, total: 0, lastOrder: null };
              const aov = stats.count > 0 ? stats.total / stats.count : 0;
              const phone = customer.phone || customer.billing_address?.phone || null;
              const role = (customer.role || 'customer') as UserRole;

              return (
                <tr key={customer.id}>
                  <td>
                    <Link href={`/admin/customers/${customer.id}`} style={{ color: 'var(--deep-teal)', fontWeight: 600, textDecoration: 'none' }}>
                      {customer.first_name} {customer.last_name}
                    </Link>
                  </td>
                  <td style={{ color: '#4b5563', fontSize: '0.9rem' }}>{customer.email}</td>
                  <td style={{ color: '#4b5563', fontSize: '0.9rem' }}>{phone || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td>
                    <RoleDropdown customerId={customer.id} currentRole={role} canEdit={isHeadChef} />
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    {new Date(customer.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    {stats.lastOrder ? new Date(stats.lastOrder).toLocaleDateString('en-GB') : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {stats.count > 0 ? (
                      <Link href={`/admin/customers/${customer.id}`} style={{
                        display: 'inline-block', backgroundColor: '#0f766e', color: '#fff',
                        borderRadius: '9999px', padding: '2px 12px', fontWeight: 700,
                        fontSize: '0.85rem', textDecoration: 'none', minWidth: '32px', textAlign: 'center'
                      }}>
                        {stats.count}
                      </Link>
                    ) : <span style={{ color: '#d1d5db' }}>0</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {stats.total > 0 ? `£${stats.total.toFixed(2)}` : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', color: '#6b7280' }}>
                    {aov > 0 ? `£${aov.toFixed(2)}` : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td>
                    <Link href={`/admin/customers/${customer.id}`} className={styles.editBtn}>View</Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                  No customers match &quot;{query}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
