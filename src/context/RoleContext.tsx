'use client';

import { createContext, useContext } from 'react';
import type { UserRole } from '@/lib/roles';

const RoleContext = createContext<UserRole>('customer');

export function RoleProvider({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): UserRole {
  return useContext(RoleContext);
}
