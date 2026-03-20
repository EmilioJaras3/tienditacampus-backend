import * as Joi from 'joi';

/**
 * Validación de variables de entorno.
 * La aplicación NO inicia si faltan variables requeridas.
 * Esto previene errores silenciosos en producción.
 */
export const validationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),

    BACKEND_PORT: Joi.number().default(3001),
    PORT: Joi.number().default(3001),
    FRONTEND_URL: Joi.string().default('http://localhost'),

    // Database
    DATABASE_URL: Joi.string().optional(),
    POSTGRES_HOST: Joi.string().optional(),
    POSTGRES_PORT: Joi.number().default(5432),
    POSTGRES_DB: Joi.string().optional(),
    POSTGRES_USER: Joi.string().optional(),
    POSTGRES_PASSWORD: Joi.string().optional(),
    POSTGRES_SSL: Joi.boolean().default(true),
    POSTGRES_SYNCHRONIZE: Joi.boolean().default(false),

    // JWT — requerido en producción
    JWT_SECRET: Joi.string().when('NODE_ENV', {
        is: 'production',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    JWT_EXPIRATION: Joi.string().default('7d'),

    // Argon2 — opcionales con defaults seguros
    ARGON2_MEMORY_COST: Joi.number().default(65536),
    ARGON2_TIME_COST: Joi.number().default(3),
    ARGON2_PARALLELISM: Joi.number().default(4),

    // Default admin seed (optional)
    DEFAULT_ADMIN_EMAIL: Joi.string().allow('').optional(),
    DEFAULT_ADMIN_PASSWORD: Joi.string().allow('').optional(),

    // Security
    MAX_FAILED_LOGIN_ATTEMPTS: Joi.number().default(5),
    LOCKOUT_DURATION_MINUTES: Joi.number().default(15),
});
