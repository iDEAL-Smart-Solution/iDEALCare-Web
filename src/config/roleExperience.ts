export type TenantAppRole = 'owner' | 'admin' | 'nurse' | 'staff' | 'patient' | 'guardian'

export interface RoleNavigationItem {
  label: string
  path?: string
  icon: string
  placeholder?: boolean
}

export interface RoleExperience {
  entryPoint: string
  navigation: readonly RoleNavigationItem[]
}

const tenantManagementNavigation: readonly RoleNavigationItem[] = [
  { label: 'Dashboard', path: '/app/tenant/dashboard', icon: '▦' },
  { label: 'Patients', path: '/app/patients', icon: '👥' },
  { label: 'Care staff', path: '/app/staff', icon: '♙' },
  { label: 'Schedule', icon: '◯', placeholder: true },
  { label: 'Billing', path: '/app/billing', icon: '◯' },
]

const clinicalTeamNavigation: readonly RoleNavigationItem[] = [
  { label: 'Dashboard', path: '/app/team/dashboard', icon: '▦' },
]

const guardianManagementNavigation: readonly RoleNavigationItem[] = [
  { label: 'Guardians', path: '/app/guardians', icon: '♧' },
  ...tenantManagementNavigation,
]

export const roleExperiences: Record<TenantAppRole, RoleExperience> = {
  owner: { entryPoint: '/app/tenant/dashboard', navigation: guardianManagementNavigation },
  admin: { entryPoint: '/app/tenant/dashboard', navigation: guardianManagementNavigation },
  nurse: { entryPoint: '/app/team/dashboard', navigation: clinicalTeamNavigation },
  staff: { entryPoint: '/app/team/dashboard', navigation: clinicalTeamNavigation },
  patient: {
    entryPoint: '/app/patient/dashboard',
    navigation: [
      { label: 'Guardian access', path: '/app/patient/guardians', icon: '♧' },
      { label: 'Dashboard', path: '/app/patient/dashboard', icon: '▦' },
      { label: 'Bills & Payments', path: '/app/bills', icon: '💳' },
    ],
  },
  guardian: {
    entryPoint: '/app/guardian/dashboard',
    navigation: [
      { label: 'Dashboard', path: '/app/guardian/dashboard', icon: '▦' },
    ],
  },
}

export function getRoleExperience(role?: string | null): RoleExperience | undefined {
  if (!role) return undefined
  return roleExperiences[role.toLowerCase() as TenantAppRole]
}

export function getRoleEntryPoint(role?: string | null): string {
  return getRoleExperience(role)?.entryPoint ?? '/login'
}
