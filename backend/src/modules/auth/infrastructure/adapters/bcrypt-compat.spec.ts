import * as bcrypt from 'bcrypt';

// Synthetic hash created by bcrypt 5.1.1 in the isolated Sprint 6 fixture, before upgrade.
describe('bcrypt 6 compatibility', () => {
  it('verifies a pre-upgrade password hash and rejects a wrong password', async () => {
    const legacyHash = '$2b$10$dZr24yi7qQseIHU0XYYQO.zvbKARHYvyZwJP8wG7Qej6xPDudR4Gq';
    await expect(bcrypt.compare('StrongPassword@123', legacyHash)).resolves.toBe(true);
    await expect(bcrypt.compare('wrong-password', legacyHash)).resolves.toBe(false);
  });
});
