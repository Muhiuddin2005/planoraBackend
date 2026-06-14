import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'super_access_secret_123!',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_refresh_secret_123!',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    JWT_SECRET: process.env.JWT_SECRET || 'super_access_secret_123!',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    EMAIL_USER: process.env.EMAIL_USER || process.env.SMTP_USER,
    EMAIL_PASS: process.env.EMAIL_PASS || process.env.SMTP_PASS,
};
