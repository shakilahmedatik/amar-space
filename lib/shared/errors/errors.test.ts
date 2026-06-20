import { describe, expect, it } from "vitest";
import {
	AppError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "./index";

describe("AppError", () => {
	it("creates an error with statusCode, code, and message", () => {
		const error = new AppError(500, "INTERNAL_ERROR", "Something went wrong");

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error.statusCode).toBe(500);
		expect(error.code).toBe("INTERNAL_ERROR");
		expect(error.message).toBe("Something went wrong");
		expect(error.name).toBe("AppError");
		expect(error.details).toBeUndefined();
	});

	it("creates an error with field-level details", () => {
		const details = [
			{ field: "email", message: "Invalid email", rule: "format" },
		];
		const error = new AppError(
			400,
			"VALIDATION_ERROR",
			"Validation failed",
			details,
		);

		expect(error.details).toEqual(details);
	});

	it("toResponse produces correct ApiErrorResponse structure", () => {
		const error = new AppError(500, "INTERNAL_ERROR", "Something went wrong");
		const response = error.toResponse("req-123");

		expect(response).toEqual({
			requestId: "req-123",
			statusCode: 500,
			error: "Internal Server Error",
			message: "Something went wrong",
		});
	});

	it("toResponse includes errors array when details are present", () => {
		const details = [{ field: "name", message: "Required", rule: "required" }];
		const error = new AppError(
			400,
			"VALIDATION_ERROR",
			"Validation failed",
			details,
		);
		const response = error.toResponse("req-456");

		expect(response).toEqual({
			requestId: "req-456",
			statusCode: 400,
			error: "Bad Request",
			message: "Validation failed",
			errors: details,
		});
	});

	it("toResponse omits errors field when details are empty", () => {
		const error = new AppError(
			400,
			"VALIDATION_ERROR",
			"Validation failed",
			[],
		);
		const response = error.toResponse("req-789");

		expect(response.errors).toBeUndefined();
	});
});

describe("ValidationError", () => {
	it("creates a 400 error with field-level errors", () => {
		const errors = [
			{ field: "email", message: "ইমেইল আবশ্যক", rule: "required" },
			{ field: "password", message: "পাসওয়ার্ড খুব ছোট", rule: "minLength" },
		];
		const error = new ValidationError(errors);

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(ValidationError);
		expect(error.statusCode).toBe(400);
		expect(error.code).toBe("VALIDATION_ERROR");
		expect(error.message).toBe("Validation failed");
		expect(error.name).toBe("ValidationError");
		expect(error.details).toEqual(errors);
	});

	it("caps errors at 50 entries", () => {
		const errors = Array.from({ length: 60 }, (_, i) => ({
			field: `field_${i}`,
			message: `Error ${i}`,
			rule: "required",
		}));
		const error = new ValidationError(errors);

		expect(error.details).toHaveLength(50);
	});

	it("toResponse includes errors array", () => {
		const errors = [
			{ field: "phone", message: "Invalid phone", rule: "pattern" },
		];
		const error = new ValidationError(errors);
		const response = error.toResponse("req-val-1");

		expect(response.statusCode).toBe(400);
		expect(response.error).toBe("Bad Request");
		expect(response.errors).toEqual(errors);
	});
});

describe("NotFoundError", () => {
	it("creates a 404 error with entity type in message", () => {
		const error = new NotFoundError("Building", "bld-123");

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(NotFoundError);
		expect(error.statusCode).toBe(404);
		expect(error.code).toBe("NOT_FOUND");
		expect(error.message).toBe("Building not found");
		expect(error.name).toBe("NotFoundError");
	});

	it("does not expose entity ID in message", () => {
		const error = new NotFoundError("Flat", "flat-secret-id");

		expect(error.message).not.toContain("flat-secret-id");
	});

	it("toResponse produces correct structure", () => {
		const error = new NotFoundError("Renter", "renter-456");
		const response = error.toResponse("req-nf-1");

		expect(response).toEqual({
			requestId: "req-nf-1",
			statusCode: 404,
			error: "Not Found",
			message: "Renter not found",
		});
	});
});

describe("ForbiddenError", () => {
	it("creates a 403 error with generic message", () => {
		const error = new ForbiddenError();

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(ForbiddenError);
		expect(error.statusCode).toBe(403);
		expect(error.code).toBe("FORBIDDEN");
		expect(error.message).toBe("Insufficient permissions");
		expect(error.name).toBe("ForbiddenError");
	});

	it("does not reveal required permissions", () => {
		const error = new ForbiddenError();
		const response = error.toResponse("req-fb-1");

		expect(response.message).toBe("Insufficient permissions");
		expect(response.message).not.toContain("owner");
		expect(response.message).not.toContain("manager");
		expect(response.message).not.toContain("admin");
	});
});

describe("ConflictError", () => {
	it("creates a 409 error with custom message", () => {
		const error = new ConflictError("Building name already exists");

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(ConflictError);
		expect(error.statusCode).toBe(409);
		expect(error.code).toBe("CONFLICT");
		expect(error.message).toBe("Building name already exists");
		expect(error.name).toBe("ConflictError");
	});

	it("toResponse produces correct structure", () => {
		const error = new ConflictError("Email already registered");
		const response = error.toResponse("req-cf-1");

		expect(response).toEqual({
			requestId: "req-cf-1",
			statusCode: 409,
			error: "Conflict",
			message: "Email already registered",
		});
	});
});

describe("RateLimitError", () => {
	it("creates a 429 error with default retryAfter", () => {
		const error = new RateLimitError();

		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(RateLimitError);
		expect(error.statusCode).toBe(429);
		expect(error.code).toBe("RATE_LIMITED");
		expect(error.message).toBe("Too many attempts, please try again later");
		expect(error.name).toBe("RateLimitError");
		expect(error.retryAfter).toBe(60);
	});

	it("accepts custom retryAfter value", () => {
		const error = new RateLimitError(30);

		expect(error.retryAfter).toBe(30);
	});

	it("toResponse produces correct structure", () => {
		const error = new RateLimitError(120);
		const response = error.toResponse("req-rl-1");

		expect(response).toEqual({
			requestId: "req-rl-1",
			statusCode: 429,
			error: "Too Many Requests",
			message: "Too many attempts, please try again later",
		});
	});
});
