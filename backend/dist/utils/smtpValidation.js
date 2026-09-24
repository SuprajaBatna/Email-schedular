"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSmtpConfig = validateSmtpConfig;
/**
 * Startup validation for SMTP Ethereal configuration.
 * Validates presence of ETHEREAL_USER and ETHEREAL_PASS without logging passwords or secrets.
 */
function validateSmtpConfig() {
    const user = process.env.ETHEREAL_USER;
    const pass = process.env.ETHEREAL_PASS;
    const sender1 = process.env.ETHEREAL_SENDER_1;
    const sender2 = process.env.ETHEREAL_SENDER_2;
    const isProd = process.env.NODE_ENV === 'production';
    if (!user || !pass) {
        if (isProd) {
            console.error('[SMTP Validation Error] Missing required production environment variables: ETHEREAL_USER / ETHEREAL_PASS.');
            return false;
        }
        else {
            console.warn('[SMTP Validation Warning] Local environment missing ETHEREAL_USER / ETHEREAL_PASS. Ethereal test accounts will be used if configured.');
            return true;
        }
    }
    console.log(`[SMTP Validation Success] Configured SMTP User: ${user} | Senders: ${sender1 || user}, ${sender2 || user}`);
    return true;
}
