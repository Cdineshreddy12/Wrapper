import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeTextArea,
  sanitizeFormData
} from '../../utils/sanitization';

describe('Sanitization Utils', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should remove javascript protocol', () => {
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeString(longString)).toHaveLength(1000);
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeEmail('test@example.com<script>')).toBe('test@example.com');
    });

    it('should limit length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      expect(sanitizeEmail(longEmail)).toHaveLength(254);
    });
  });

  describe('sanitizePhone', () => {
    it('should keep valid phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    });

    it('should remove invalid characters', () => {
      expect(sanitizePhone('+1-555-123-4567<script>')).toBe('+1-555-123-4567');
    });

    it('should limit length', () => {
      const longPhone = '+1'.repeat(20);
      expect(sanitizePhone(longPhone)).toHaveLength(20);
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and return valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should reject non-HTTP protocols', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBe('');
    });

    it('should handle invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBe('');
    });
  });

  describe('sanitizeFormData', () => {
    it('should sanitize all string fields', () => {
      const data = {
        name: '  John Doe  ',
        email: 'JOHN@EXAMPLE.COM',
        phone: '+1-555-123-4567<script>',
        website: 'https://example.com',
        description: '  Hello world  <script>alert("xss")</script>'
      };

      const sanitized = sanitizeFormData(data);

      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.phone).toBe('+1-555-123-4567');
      expect(sanitized.website).toBe('https://example.com/');
      expect(sanitized.description).toBe('Hello world  alert("xss")/script');
    });

    it('should handle nested objects', () => {
      const data = {
        personalDetails: {
          firstName: '  John  ',
          email: 'JOHN@EXAMPLE.COM'
        }
      };

      const sanitized = sanitizeFormData(data);

      expect(sanitized.personalDetails.firstName).toBe('John');
      expect(sanitized.personalDetails.email).toBe('john@example.com');
    });

    it('should handle arrays', () => {
      const data = {
        team: [
          { name: '  John  ', email: 'JOHN@EXAMPLE.COM' },
          { name: '  Jane  ', email: 'JANE@EXAMPLE.COM' }
        ]
      };

      const sanitized = sanitizeFormData(data);

      expect(sanitized.team[0].name).toBe('John');
      expect(sanitized.team[0].email).toBe('john@example.com');
      expect(sanitized.team[1].name).toBe('Jane');
      expect(sanitized.team[1].email).toBe('jane@example.com');
    });
  });
});
