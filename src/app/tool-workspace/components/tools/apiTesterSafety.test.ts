import { describe, expect, it } from 'vitest';
import { findCredentialHeaders, isInsecureRemoteUrl } from './ApiTesterPanel';

describe('API tester safety checks', () => {
  it('finds credential headers case-insensitively', () => {
    expect(findCredentialHeaders('{"Authorization":"Bearer x","Accept":"*/*","x-api-key":"k"}')).toEqual(['Authorization', 'x-api-key']);
    expect(findCredentialHeaders('{"Accept":"application/json"}')).toEqual([]);
    expect(findCredentialHeaders('not json')).toEqual([]);
    expect(findCredentialHeaders('[]')).toEqual([]);
  });

  it('flags plain HTTP to remote hosts only', () => {
    expect(isInsecureRemoteUrl('http://api.example.com/x')).toBe(true);
    expect(isInsecureRemoteUrl('https://api.example.com/x')).toBe(false);
    expect(isInsecureRemoteUrl('http://localhost:3000')).toBe(false);
    expect(isInsecureRemoteUrl('http://127.0.0.1')).toBe(false);
    expect(isInsecureRemoteUrl('')).toBe(false);
  });
});
