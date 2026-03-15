import argon2 from "argon2";

/**
 * Hashes a plain text password using the Argon2id algorithm.
 *
 * @param password The plain text password
 * @returns The hashed password string
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await argon2.hash(password, { type: argon2.argon2id });
  } catch (error) {
    throw new Error("Password hashing failed");
  }
};

/**
 * Compares a plain text password with an Argon2 hashed password.
 *
 * @param password The plain text password
 * @param hash The hashed password from the database
 * @returns boolean indicating if the password is correct
 */
export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
};
