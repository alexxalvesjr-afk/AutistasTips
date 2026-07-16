import bcrypt from "bcryptjs";

// Custo 12: ~250ms por hash em hardware moderno — equilíbrio entre
// resistência a força bruta offline e latência de login.
const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
