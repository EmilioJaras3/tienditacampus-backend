/**
 * TienditaCampus - Configuración Centralizada
 *
 * Todas las variables de entorno se leen aquí y se exponen
 * como un objeto tipado a través de ConfigService.
 */
export const configuration = () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.BACKEND_PORT ?? '3001', 10),

    database: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
        name: process.env.POSTGRES_DB || 'tienditacampus',
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        expiration: process.env.JWT_EXPIRATION || '7d',
    },

    argon2: {
        memoryCost: parseInt(process.env.ARGON2_MEMORY_COST ?? '65536', 10),
        timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '3', 10),
        parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '4', 10),
    },

    security: {
        maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? '5', 10),
        lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES ?? '15', 10),
    },
});
