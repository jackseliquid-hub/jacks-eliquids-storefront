export type UserRole = 'head_chef' | 'sous_chef' | 'customer';

export function isKitchenStaff(role: UserRole | null): boolean {
  return role === 'head_chef' || role === 'sous_chef';
}

export function canEdit(role: UserRole | null): boolean {
  return role === 'head_chef';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  head_chef: '👨‍🍳 Head Chef',
  sous_chef:  '🧑‍🍳 Sous Chef',
  customer:   '👤 Customer',
};
