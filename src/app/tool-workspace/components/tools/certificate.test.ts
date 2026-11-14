import { describe, expect, it } from 'vitest';
import { inspectPem } from './certificate';

// Self-signed test certificates generated with OpenSSL (no private keys are stored here).
const RSA_PEM = `-----BEGIN CERTIFICATE-----
MIIDJDCCAgygAwIBAgIJAMeYHY84v3UFMA0GCSqGSIb3DQEBCwUAMDQxGzAZBgNV
BAMMEnRlc3QuZGx0b29scy5sb2NhbDEVMBMGA1UECgwMRExUb29scyBUZXN0MB4X
DTI2MTExNDE0MTM0NloXDTI2MTIxNDE0MTM0NlowNDEbMBkGA1UEAwwSdGVzdC5k
bHRvb2xzLmxvY2FsMRUwEwYDVQQKDAxETFRvb2xzIFRlc3QwggEiMA0GCSqGSIb3
DQEBAQUAA4IBDwAwggEKAoIBAQDCY4vTGM2BPtD4tk1LGvkakgy0+PI2REZOuKlM
f5VebktvuxLcj248/N4jJAKvvP6UxyajRA6eCpHo1licbylMLbaGG6JX5P9AsX/p
rwmhpLJgtUD8Q2FgmYvdzXlp+i6wneA3D4qb+PlYOEmv9Q8IJLGAkgUAKH0B5Pe7
Q9zuCfjt9iA9JNW7fSlZ8Y9kNSdO+wlvL/F31UFqmjBeYeoGji0tJDSsXhq76nnm
DuoYfHy8S47n5uXbEVQeQ9h5SWHROEG390408LuMmu/TQ53/HOV07fV49zoNq0HI
HFiLnZRMkYBfdsEun9Ed4AQ2fYGEBSbd3W4K3Z3ATJFRfkwJAgMBAAGjOTA3MDUG
A1UdEQQuMCyCEnRlc3QuZGx0b29scy5sb2NhbIIWd3d3LnRlc3QuZGx0b29scy5s
b2NhbDANBgkqhkiG9w0BAQsFAAOCAQEADQC6ON0XZJaRXtbNTN9lSMq/T44s+wAb
bX/EwhXHfmjih7q5kh8E+oOvoroZzTpWENSJrcJ75wkNwtAdB3EXLxarXq3LxH3g
IhqjHQf0YY7I59w01Ja/2HE2MFBe+S5ElY92upJSSOIt4MShC8SRcW9+3hQDxAsd
EROn5K2qMQOAISjRi8pNUATGCVeqsEvTX0nCzIouWNnuA8beoNP2M/DL6RMeXJlk
Lzms8P9NoWNoboOz3vD0WX5tqxFz8Fly2HweoRXRoT9lP5jyBqsVOHSgaQSfgROu
5YxdQwTGVhQv8aPlKTT0rnjyDDBGmBWXSInTPfZkvKj3bR6YPrWwrA==
-----END CERTIFICATE-----`;
const EC_PEM = `-----BEGIN CERTIFICATE-----
MIIBKjCB0gIJAOQEXueg+i9TMAoGCCqGSM49BAMCMB4xHDAaBgNVBAMME25hbWVk
LmRsdG9vbHMubG9jYWwwHhcNMjYxMTE0MTQyOTM2WhcNMjYxMjE0MTQyOTM2WjAe
MRwwGgYDVQQDDBNuYW1lZC5kbHRvb2xzLmxvY2FsMFkwEwYHKoZIzj0CAQYIKoZI
zj0DAQcDQgAExkDJPE2mX3Q5OSjsMA+YAafjaAhi4T8g8OdqciWYBt5f2YEHHNrc
lKJ9VmxCyixdfL4njksfVR7XxA4Iswxw7TAKBggqhkjOPQQDAgNHADBEAiAFC1eA
EFlnqF/iT7dZ6/DtoJacsM875tRZtgryUBTpogIgUfpLPx3FhxU8L6y7feNb9SKe
LC0uXC7pfKZkX0m0cWo=
-----END CERTIFICATE-----`;

const row = (rows: Array<[string, string]>, label: string) => rows.find(([name]) => name === label)?.[1];

describe('inspectPem', () => {
  it('reads an RSA certificate with subject alternative names', () => {
    const rows = inspectPem(RSA_PEM);
    expect(row(rows, 'Subject')).toBe('CN=test.dltools.local, O=DLTools Test');
    expect(row(rows, 'Signature algorithm')).toBe('SHA-256 with RSA (1.2.840.113549.1.1.11)');
    expect(row(rows, 'Public key algorithm')).toBe('RSA (1.2.840.113549.1.1.1)');
    expect(row(rows, 'Public key size')).toBe('2048 bits');
    expect(row(rows, 'Subject alternative names')).toBe('DNS: test.dltools.local\nDNS: www.test.dltools.local');
  });

  it('reads an EC P-256 certificate', () => {
    const rows = inspectPem(EC_PEM);
    expect(row(rows, 'Subject')).toBe('CN=named.dltools.local');
    expect(row(rows, 'Signature algorithm')).toBe('ECDSA with SHA-256 (1.2.840.10045.4.3.2)');
    expect(row(rows, 'Public key size')).toBe('256 bits (P-256)');
  });

  it('rejects input that is not a certificate', () => {
    expect(() => inspectPem('hello')).toThrow('Paste a PEM-encoded X.509 certificate.');
    expect(() => inspectPem('-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----')).toThrow();
  });
});
