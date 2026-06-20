import { randomInt } from "node:crypto";

/**
 * Generates a cryptographically secure temporary password.
 *
 * Guarantees:
 * - Minimum length of 12 characters (enforced even if a smaller length is passed)
 * - At least one uppercase letter, one lowercase letter, one digit, and one special character
 * - Uses Fisher-Yates shuffle with cryptographic randomness to avoid positional bias
 *
 * @param length - Desired password length (default 16, minimum 12)
 * @returns A random password string meeting all character requirements
 */
export function generateTemporaryPassword(length = 16): string {
	const effectiveLength = Math.max(length, 12);

	const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const lowercase = "abcdefghijklmnopqrstuvwxyz";
	const numbers = "0123456789";
	const special = "!@#$%^&*";
	const allChars = uppercase + lowercase + numbers + special;

	// Ensure at least one of each required character type
	const required = [
		uppercase[randomInt(0, uppercase.length)] ?? "A",
		lowercase[randomInt(0, lowercase.length)] ?? "a",
		numbers[randomInt(0, numbers.length)] ?? "0",
		special[randomInt(0, special.length)] ?? "!",
	];

	// Fill remaining positions with random chars from the full pool
	const remaining: string[] = [];
	for (let i = 0; i < effectiveLength - 4; i++) {
		remaining.push(allChars[randomInt(0, allChars.length)] ?? "A");
	}

	// Shuffle all characters together using Fisher-Yates with cryptographic randomness
	const password = [...required, ...remaining];
	for (let i = password.length - 1; i > 0; i--) {
		const j = randomInt(0, i + 1);
		[password[i], password[j]] = [password[j] ?? "", password[i] ?? ""];
	}

	return password.join("");
}
