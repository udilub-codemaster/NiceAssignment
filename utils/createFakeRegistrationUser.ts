import type { RegistrationUser } from '@pages/RegisterPage';

export function createFakeRegistrationUser(): RegistrationUser {
  // ParaBank may enforce max lengths on username/password.
  // Keep credentials short to avoid truncation/mismatch on re-login.
  // Use a random numeric suffix to avoid duplicates between fast retries.
  const suffixNum = Math.floor(Math.random() * 1_000_000); // 0..999999
  const suffix = String(suffixNum).padStart(6, '0'); // always 6 digits

  return {
    username: `udi${suffix}`,
    password: `Pw${suffix}`,
    firstName: 'Test',
    lastName: `User${suffixNum % 1000}`,
    address: '1431 Main St',
    city: 'Pasadena',
    state: 'CA',
    zipCode: '91556',
    phoneNumber: '5552000' + suffix.slice(-4),
    ssn: '622-11-' + suffix.slice(-4),
  };
}

