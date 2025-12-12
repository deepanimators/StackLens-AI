import crypto from 'crypto';

/**
 * Encryption utility for secure credential storage
 * Uses AES-256-GCM for authenticated encryption
 */

// Get encryption key from environment or generate a secure one
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : crypto.randomBytes(32); // 256-bit key

if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY not set in environment. Using temporary key.');
    console.warn('⚠️  Generate a key with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

/**
 * Encrypt a string value
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all hex encoded)
 */
export function encrypt(text: string): string {
    if (!text) {
        throw new Error('Cannot encrypt empty text');
    }

    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * @param encryptedText - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
    if (!encryptedText) {
        throw new Error('Cannot decrypt empty text');
    }

    // Split the encrypted text into components
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encryptedData] = parts;

    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generate a new encryption key (for setup/rotation)
 * @returns 256-bit encryption key as hex string
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a value (one-way, for verification)
 * @param value - Value to hash
 * @returns SHA-256 hash as hex string
 */
export function hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}
