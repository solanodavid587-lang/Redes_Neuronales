import { describe, expect, it } from 'vitest';
import { errorMessage } from './api';

describe('errorMessage', () => {
  it('preserves useful API error messages', () => {
    expect(errorMessage(new Error('No fue posible conectar con la API.'))).toBe(
      'No fue posible conectar con la API.',
    );
  });

  it('provides a fallback for non-error values', () => {
    expect(errorMessage(null)).toBe('Ocurrió un error inesperado.');
  });
});
