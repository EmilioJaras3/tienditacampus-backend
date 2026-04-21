import * as Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),

  BACKEND_PORT: Joi.number().default(3001),
  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().default("http://localhost:4200"),

  DATABASE_URL: Joi.string().optional(),
  POSTGRES_HOST: Joi.string().optional(),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_DB: Joi.string().optional(),
  POSTGRES_USER: Joi.string().optional(),
  POSTGRES_PASSWORD: Joi.string().optional(),
  POSTGRES_SSL: Joi.boolean().default(true),
  POSTGRES_SYNCHRONIZE: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  JWT_EXPIRATION: Joi.string().default("7d"),

  ARGON2_MEMORY_COST: Joi.number().default(65536),
  ARGON2_TIME_COST: Joi.number().default(3),
  ARGON2_PARALLELISM: Joi.number().default(4),

  DEFAULT_ADMIN_EMAIL: Joi.string().allow("").optional(),
  DEFAULT_ADMIN_PASSWORD: Joi.string().allow("").optional(),

  MAX_FAILED_LOGIN_ATTEMPTS: Joi.number().default(5),
  LOCKOUT_DURATION_MINUTES: Joi.number().default(15),

  GCP_PROJECT_ID: Joi.string().optional(),
  BIGQUERY_DATASET: Joi.string().optional(),
  BIGQUERY_TABLE: Joi.string().optional(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_REDIRECT_URI: Joi.string().optional(),

  SMTP_HOST: Joi.string().allow("").optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow("").optional(),
  SMTP_PASS: Joi.string().allow("").optional(),
  SMTP_FROM: Joi.string().allow("").optional(),
});