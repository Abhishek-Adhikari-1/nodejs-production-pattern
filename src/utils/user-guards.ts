import { User, AccountStatus, Role } from "@prisma/client";
import { AppError } from "./app-error";
import { HTTP_STATUS } from "./http-status";

/**
 * Asserts the user has `APPROVED` status.
 * Use this anywhere you need to ensure the user is fully approved.
 *
 * @throws AppError with contextual message based on the actual status
 */
export function assertApprovedUser(user: User): void {
  if (user.status === "APPROVED") return;

  const messageMap: Record<AccountStatus, string> = {
    PENDING:
      "Your account is pending approval. Please verify your email to continue.",
    REJECTED:
      "Your account has been rejected. Please contact support for assistance.",
    SUSPENDED:
      "Your account has been suspended. Please contact support for assistance.",
    DELETED: "This account has been deleted.",
    APPROVED: "",
  };

  throw new AppError(
    messageMap[user.status] || "Your account is not in a valid state.",
    HTTP_STATUS.FORBIDDEN,
  );
}

/**
 * Asserts the user's status is one of the allowed statuses.
 * More flexible version — pass in whichever statuses are acceptable.
 *
 * @example assertUserStatus(user, ["APPROVED", "PENDING"]);
 */
export function assertUserStatus(
  user: User,
  allowedStatuses: AccountStatus[],
): void {
  if (allowedStatuses.includes(user.status)) return;

  throw new AppError(
    `Your account status (${user.status}) does not permit this action.`,
    HTTP_STATUS.FORBIDDEN,
  );
}

/**
 * Asserts the user has verified their email address.
 *
 * @throws AppError if email is not verified
 */
export function assertEmailVerified(user: User): void {
  if (user.email_verified) return;

  throw new AppError(
    "Please verify your email address before continuing.",
    HTTP_STATUS.FORBIDDEN,
  );
}

/**
 * Asserts the user has one of the allowed roles.
 *
 * @example assertUserRole(user, ["ADMIN", "MODERATOR"]);
 */
export function assertUserRole(user: User, allowedRoles: Role[]): void {
  if (allowedRoles.includes(user.role)) return;

  throw new AppError(
    "You do not have permission to perform this action.",
    HTTP_STATUS.FORBIDDEN,
  );
}

/**
 * Asserts the user is an ADMIN.
 */
export function assertAdmin(user: User): void {
  assertUserRole(user, ["ADMIN"]);
}

/**
 * Asserts the user has NOT been soft-deleted.
 *
 * @throws AppError if `deleted_at` is set
 */
export function assertNotDeleted(user: User): void {
  if (!user.deleted_at) return;

  throw new AppError("This account has been deleted.", HTTP_STATUS.FORBIDDEN);
}

export interface ValidUserOptions {
  /** Required statuses. Defaults to `["APPROVED"]` */
  allowedStatuses?: AccountStatus[];
  /** Required roles. Skip role check if omitted. */
  allowedRoles?: Role[];
  /** Require email to be verified? Defaults to `true`. */
  requireEmailVerified?: boolean;
  /** Check soft-delete flag? Defaults to `false`. */
  requireDeleted?: boolean;
}

/**
 * All-in-one assertion: status + email + role + soft-delete.
 * Call with defaults and it checks everything you'd typically need:
 *
 * ```ts
 * assertValidUser(user);                                // APPROVED, email verified, not deleted
 * assertValidUser(user, { allowedRoles: ["ADMIN"] });   // + must be ADMIN
 * assertValidUser(user, { allowedStatuses: ["APPROVED", "PENDING"] }); // relax status check
 * ```
 */
export function assertValidUser(
  user: User,
  options: ValidUserOptions = {},
): void {
  const {
    allowedStatuses = ["APPROVED"],
    allowedRoles,
    requireEmailVerified = true,
    requireDeleted = false,
  } = options;

  if (requireDeleted) assertNotDeleted(user);
  if (requireEmailVerified) assertEmailVerified(user);
  assertUserStatus(user, allowedStatuses);
  if (allowedRoles) assertUserRole(user, allowedRoles);
}

export const isApproved = (user: User): boolean => user.status === "APPROVED";

export const isEmailVerified = (user: User): boolean => user.email_verified;

export const isDeleted = (user: User): boolean => user.deleted_at !== null;

export const hasRole = (user: User, roles: Role[]): boolean =>
  roles.includes(user.role);
