-- Saneamiento Total Admin V24 (Corrected Schema)
UPDATE users 
SET 
  is_active = true,
  is_email_verified = true,
  failed_login_attempts = 0,
  locked_until = NULL,
  role = 'admin',
  two_factor_code = NULL,
  two_factor_expires = NULL,
  password_hash = '$argon2id$v=19$m=19456,t=2,p=1$BdrnHIP2j8L+weScYa0JYg$CxfF6czvoR/elsmrx8PltD1qNOiJPj5HRnrDbd61Aas'
WHERE email = 'jarassanchezl@gmail.com';

-- Confirmación
SELECT email, role, is_active, failed_login_attempts FROM users WHERE email = 'jarassanchezl@gmail.com';
