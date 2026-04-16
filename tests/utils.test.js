import { describe, it, expect } from 'vitest';
import { toQS, today, fmtDate, badge, pdot } from '../utils.js';

// ── toQS ──────────────────────────────────────────────────────────────────────

describe('toQS', () => {
  describe('scalar values', () => {
    it('serializes a number', () => {
      expect(toQS({ maxRecords: 50 })).toBe('maxRecords=50');
    });

    it('serializes a string', () => {
      expect(toQS({ offset: 'abc123' })).toBe('offset=abc123');
    });

    it('encodes special characters in values', () => {
      // curly braces and = must be percent-encoded
      const result = toQS({ filterByFormula: "OR({Status}='Active')" });
      expect(result).toBe("filterByFormula=OR(%7BStatus%7D%3D'Active')");
    });

    it('serializes multiple scalars joined with &', () => {
      const result = toQS({ maxRecords: 10, offset: 'x' });
      expect(result).toBe('maxRecords=10&offset=x');
    });
  });

  describe('null / undefined / empty-string filtering', () => {
    it('skips null values', () => {
      expect(toQS({ a: null, b: 'keep' })).toBe('b=keep');
    });

    it('skips undefined values', () => {
      expect(toQS({ a: undefined, b: 'keep' })).toBe('b=keep');
    });

    it('skips empty-string values (e.g. filterByFormula: "")', () => {
      expect(toQS({ filterByFormula: '', maxRecords: 50 })).toBe('maxRecords=50');
    });

    it('returns empty string when every value is skipped', () => {
      expect(toQS({ a: null, b: undefined, c: '' })).toBe('');
    });

    it('returns empty string for an empty params object', () => {
      expect(toQS({})).toBe('');
    });
  });

  describe('plain array values', () => {
    it('serializes strings using [] bracket notation', () => {
      const result = toQS({ fields: ['Title', 'Date'] });
      expect(result).toBe('fields%5B%5D=Title&fields%5B%5D=Date');
    });

    it('produces no output for an empty array', () => {
      // Empty array → forEach never fires → key is omitted (correct for Airtable)
      expect(toQS({ fields: [] })).toBe('');
    });
  });

  describe('array-of-objects values (sort params)', () => {
    it('serializes a single sort object with indexed bracket notation', () => {
      const result = toQS({ sort: [{ field: 'Date', direction: 'desc' }] });
      expect(result).toBe('sort%5B0%5D%5Bfield%5D=Date&sort%5B0%5D%5Bdirection%5D=desc');
    });

    it('serializes multiple sort objects with distinct indices', () => {
      const result = toQS({
        sort: [
          { field: 'Severity', direction: 'asc' },
          { field: 'Date', direction: 'desc' },
        ],
      });
      expect(result).toContain('sort%5B0%5D%5Bfield%5D=Severity');
      expect(result).toContain('sort%5B0%5D%5Bdirection%5D=asc');
      expect(result).toContain('sort%5B1%5D%5Bfield%5D=Date');
      expect(result).toContain('sort%5B1%5D%5Bdirection%5D=desc');
    });
  });
});

// ── today ─────────────────────────────────────────────────────────────────────

describe('today', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the current UTC date', () => {
    const expected = new Date().toISOString().split('T')[0];
    expect(today()).toBe(expected);
  });
});

// ── fmtDate ───────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  it('returns "—" for null', () => {
    expect(fmtDate(null)).toBe('\u2014');
  });

  it('returns "—" for undefined', () => {
    expect(fmtDate(undefined)).toBe('\u2014');
  });

  it('returns "—" for empty string', () => {
    expect(fmtDate('')).toBe('\u2014');
  });

  it('formats a mid-year date in US locale style', () => {
    expect(fmtDate('2024-07-04')).toBe('Jul 4, 2024');
  });

  it('formats a date with a single-digit day', () => {
    expect(fmtDate('2024-01-05')).toBe('Jan 5, 2024');
  });

  it('formats a date at year boundary', () => {
    expect(fmtDate('2023-12-31')).toBe('Dec 31, 2023');
  });
});

// ── badge ─────────────────────────────────────────────────────────────────────

describe('badge', () => {
  const knownMappings = [
    ['Active', 'bo'],
    ['Open', 'bo'],
    ['Draft', 'bgr'],
    ['Submitted', 'bb'],
    ['Under Review', 'by'],
    ['Approved', 'bg'],
    ['Executed', 'bg'],
    ['Resolved', 'bg'],
    ['Mitigated', 'bg'],
    ['Closed', 'bg'],
    ['Answered', 'bg'],
    ['Denied', 'br'],
    ['Rejected', 'br'],
    ['Revise & Resubmit', 'br'],
    ['Critical', 'br'],
    ['High', 'by'],
    ['Medium', 'bo'],
    ['Low', 'bg'],
    ['On Hold', 'by'],
    ['Punch List', 'bo'],
    ['Closeout', 'bb'],
    ['Completed', 'bg'],
    ['Pre-Construction', 'bgr'],
    ['Accepted', 'bg'],
    ['Approved as Noted', 'by'],
  ];

  it.each(knownMappings)('badge("%s") uses CSS class "%s"', (status, cls) => {
    expect(badge(status)).toBe(`<span class="badge ${cls}">${status}</span>`);
  });

  it('falls back to "bb" for an unrecognised status', () => {
    expect(badge('Pending Inspection')).toBe(
      '<span class="badge bb">Pending Inspection</span>'
    );
  });

  it('falls back to "bb" for an empty string', () => {
    expect(badge('')).toBe('<span class="badge bb"></span>');
  });
});

// ── pdot ──────────────────────────────────────────────────────────────────────

describe('pdot', () => {
  it('maps Critical → "dr"', () => {
    expect(pdot('Critical')).toBe('<div class="dot dr"></div>');
  });

  it('maps High → "dr"', () => {
    expect(pdot('High')).toBe('<div class="dot dr"></div>');
  });

  it('maps Medium → "dy"', () => {
    expect(pdot('Medium')).toBe('<div class="dot dy"></div>');
  });

  it('maps Low → "dg"', () => {
    expect(pdot('Low')).toBe('<div class="dot dg"></div>');
  });

  it('falls back to "dgr" for an unknown priority', () => {
    expect(pdot('Unknown')).toBe('<div class="dot dgr"></div>');
  });

  it('falls back to "dgr" for undefined', () => {
    expect(pdot(undefined)).toBe('<div class="dot dgr"></div>');
  });

  it('falls back to "dgr" for empty string', () => {
    expect(pdot('')).toBe('<div class="dot dgr"></div>');
  });
});
