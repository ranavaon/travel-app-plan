import { describe, it, expect } from 'vitest';
import { exportFileNameFromTripName, getShareBaseOrigin } from './tripUtils';

describe('exportFileNameFromTripName', () => {
  it('keeps Hebrew and word chars', () => {
    expect(exportFileNameFromTripName('טיול לרומא')).toBe('טיול לרומא');
  });

  it('strips invalid chars and keeps spaces', () => {
    expect(exportFileNameFromTripName('Trip 2025!')).toBe('Trip 2025');
  });

  it('returns "trip" for empty after trim', () => {
    expect(exportFileNameFromTripName('')).toBe('trip');
    expect(exportFileNameFromTripName('   ')).toBe('trip');
    expect(exportFileNameFromTripName('!!!')).toBe('trip');
  });
});

describe('getShareBaseOrigin', () => {
  it('uses http://host for localhost', () => {
    expect(getShareBaseOrigin('localhost', 'localhost:5173', 'https://localhost:5173')).toBe('http://localhost:5173');
  });

  it('uses http://host for 127.0.0.1', () => {
    expect(getShareBaseOrigin('127.0.0.1', '127.0.0.1:3000', 'https://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
  });

  it('uses origin for other hosts', () => {
    expect(getShareBaseOrigin('example.com', 'example.com', 'https://example.com')).toBe('https://example.com');
  });
});
