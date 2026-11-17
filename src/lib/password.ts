// A small blocklist of the most common leaked/guessable passwords. Not exhaustive - just enough to catch the
// obvious cases the character-class rules can't (e.g. "Password1").
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop",
  "letmein123", "welcome123", "admin1234", "iloveyou1", "sunshine1", "princess1", "football1", "abc12345",
  "changeme1", "trustno1", "admin@123", "admin@1234", "password@123", "qwerty@123", "welcome@123",
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}
