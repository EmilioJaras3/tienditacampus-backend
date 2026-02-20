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

    // Database — requeridas
    POSTGRES_HOST: Joi.string().required(),
    POSTGRES_PORT: Joi.number().default(5432),
    POSTGRES_DB: Joi.string().required(),
    POSTGRES_USER: Joi.string().required(),
    POSTGRES_PASSWORD: Joi.string().required(),

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

    // Security
    MAX_FAILED_LOGIN_ATTEMPTS: Joi.number().default(5),
    LOCKOUT_DURATION_MINUTES: Joi.number().default(15),
});
