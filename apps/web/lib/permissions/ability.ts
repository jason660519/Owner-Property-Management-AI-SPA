'use client';

import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';

export type AppAbility = Ability;
export const AppAbility = Ability as AbilityClass<AppAbility>;

/**
 * Defines the CASL ability based on a list of role names.
 * This maps "Abstract Roles" (e.g., 'landlord') to "Concrete Permissions" (e.g., 'manage', 'Property').
 */
export function defineRulesFor(roles: string[]) {
    const { can, cannot, build } = new AbilityBuilder(AppAbility);

    if (roles.includes('super_admin')) {
        can('manage', 'all'); // Super Admin can do everything
    }

    if (roles.includes('landlord')) {
        can('read', 'Property', { owner_id: 'user_id' }); // Placeholder logic
        can('create', 'Property');
        can('update', 'Property');
        can('delete', 'Property');
        can('read', 'Contract');
    }

    if (roles.includes('tenant')) {
        can('read', 'Contract'); // Can only read own contracts
        can('create', 'MaintenanceRequest');
    }

    if (roles.includes('vendor')) {
        can('read', 'WorkOrder');
        can('update', 'WorkOrder', { status: 'assigned' });
    }

    return build();
}
