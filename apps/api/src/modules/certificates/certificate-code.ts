import { randomInt } from 'node:crypto';

/** No 0/O, 1/I/L or U/V look-alikes: codes are read aloud and typed from paper. */
export const CERTIFICATE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTWXYZ';

/** Public certificate codes like `AZ-CERT-7Q4K` (printed on the certificate, typed into the verify page). */
export class CertificateCodeGenerator {
  constructor(
    private readonly randomIndex: (max: number) => number = randomInt,
    private readonly length = 4,
  ) {}

  next(): string {
    let body = '';
    for (let i = 0; i < this.length; i++) body += CERTIFICATE_ALPHABET[this.randomIndex(CERTIFICATE_ALPHABET.length)];
    return `AZ-CERT-${body}`;
  }
}

/** Accepts what people type: any case, surrounding spaces. */
export const normalizeCertificateCode = (code: string) => code.trim().toUpperCase();
