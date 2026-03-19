import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorador para especificar qué roles tienen acceso a un endpoint.
 * Uso: @Roles('seller', 'admin')
 */
export const Roles = (...roles: ('admin' | 'seller' | 'buyer')[]) =>
    SetMetadata(ROLES_KEY, roles);
