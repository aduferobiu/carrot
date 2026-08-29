// Prints an ADMIN_PASSWORD_HASH value for a chosen admin password.
// Run from apps/web with: npx tsx src/server/scripts/hashAdminPassword.ts "your-password"
import { hashPassword } from "../adminAuth";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npx tsx src/server/scripts/hashAdminPassword.ts "your-password"');
  process.exit(1);
}

console.log(hashPassword(password));
