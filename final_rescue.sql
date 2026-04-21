UPDATE users
SET
  is_active = true,
  failed_login_attempts = 0,
  locked_until = NULL,
  role = 'admin',
  login_locked = false,
  is_two_factor_enabled = false,
  password_hash = '$argon2id$v=19$m=19456,t=2,p=1$BdrnHIP2j8L+weScYa0JYg$CxfF6czvoR/elsmrx8PltD1qNOiJPj5HRnrDbd61Aas'
WHERE email = 'jarassanchezl@gmail.com';

SELECT email, role, is_active, failed_login_attempts, is_two_factor_enabled FROM users WHERE email = 'jarassanchezl@gmail.com';