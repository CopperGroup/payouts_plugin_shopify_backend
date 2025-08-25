import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a given text using AES-256-GCM.
 * @param {string} text - The plaintext to encrypt.
 * @returns {string} - A string containing the IV, auth tag, and encrypted text.
 */
export const encrypt = (text: string): string => {
  const key = Buffer.from(config.ENCRYPTION_SECRET, 'utf8');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts a given hash using AES-256-GCM.
 * @param {string} hash - The encrypted string (iv:authTag:encryptedText).
 * @returns {string} - The original decrypted text.
 */
export const decrypt = (hash: string): string => {
  try {
    const [ivHex, authTagHex, encryptedText] = hash.split(':');
    
    const key = Buffer.from(config.ENCRYPTION_SECRET, 'utf8');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data.");
  }
};