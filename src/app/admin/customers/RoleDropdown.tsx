'use client';

import { useState, useTransition } from 'react';
import { updateCustomerRole } from './actions';
import { ROLE_LABELS } from '@/lib/roles';
import type { UserRole } from '@/lib/roles';

const ROLES: UserRole[] = ['head_chef', 'sous_chef', 'customer'];

export default function RoleDropdown({
  customerId,
  currentRole,
  canEdit,
}: {
  customerId: string;
  currentRole: UserRole;
  canEdit: boolean;
}) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  if (!canEdit) {
    return (
      <span style={{
        fontSize: '0.8rem', padding: '3px 10px', borderRadius: '9999px',
        background: role === 'head_chef' ? '#fef9c3' : role === 'sous_chef' ? '#ede9fe' : '#f3f4f6',
        color: role === 'head_chef' ? '#713f12' : role === 'sous_chef' ? '#5b21b6' : '#374151',
        fontWeight: 600,
      }}>
        {ROLE_LABELS[role]}
      </span>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as UserRole;
    setRole(newRole);
    setSaved(false);
    startTransition(async () => {
      const res = await updateCustomerRole(customerId, newRole);
      if (res.success) setSaved(true);
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <select
        value={role}
        onChange={handleChange}
        disabled={isPending}
        style={{
          fontSize: '0.82rem', padding: '4px 8px', borderRadius: '6px',
          border: '1px solid #e5e7eb', cursor: 'pointer',
          background: role === 'head_chef' ? '#fef9c3' : role === 'sous_chef' ? '#ede9fe' : '#f3f4f6',
          color: role === 'head_chef' ? '#713f12' : role === 'sous_chef' ? '#5b21b6' : '#374151',
          fontWeight: 600,
        }}
      >
        {ROLES.map(r => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
      {isPending && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Saving...</span>}
      {saved && !isPending && <span style={{ fontSize: '0.75rem', color: '#059669' }}>✓ Saved</span>}
    </div>
  );
}
