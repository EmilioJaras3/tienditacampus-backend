-- Crear tabla de códigos 2FA
CREATE TABLE IF NOT EXISTS two_factor_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar 2FA para el administrador
-- En el código actual, parece que el login usa el campo 'is_two_factor_enabled' si existe
-- O simplemente lo dispara si el rol es admin. Voy a verificar la entidad User de nuevo.
