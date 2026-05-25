import crypto from 'crypto';

// The encryption key must be a 32 character string (256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const IV_LENGTH = 16; 

export function encrypt(text: string): string | null {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.substring(0, 32)),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Return IV and encrypted data separated by a colon
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Failed to encrypt data:', error);
    return null;
  }
}

export function decrypt(text: string): string | null {
  if (!text) return null;
  
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() as string, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.substring(0, 32)),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    return null;
  }
}