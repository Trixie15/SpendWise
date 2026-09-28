# SpendWise Security Documentation

This document maps each security criterion to how SpendWise implements it and where to find it in the code.

---

## 1. Input Validation (15 pts)
*Validates and rejects invalid or malicious inputs.*

| Protection | How | Where |
|---|---|---|
| Server-side validation on every endpoint | express-validator rules for types, lengths, formats and allowed values | `server/routes/*.js` |
| Strong password policy | Minimum 8 characters with uppercase, lowercase, number and special character (max 128) | `server/utils/passwordPolicy.js` |
| NoSQL injection blocked | Strips `$` operators and dotted keys from body/params; query values must be plain strings | `server/middleware/sanitize.js` |
| XSS / HTML injection rejected | Names, notes, categories and icons containing `<` or `>` are rejected | `server/utils/validators.js` (`noHtml`) |
| Prototype pollution blocked | `__proto__`, `constructor`, `prototype` keys removed | `server/middleware/sanitize.js` |
| Range checks | Amounts 0.01 to 1,000,000,000; dates between 2000 and 1 year ahead; valid IDs, months, currencies and colors only | `server/routes/transactionRoutes.js`, `budgetRoutes.js`, `categoryRoutes.js` |
| Payload size limit | Request bodies over 10 KB rejected | `server/server.js` |
| Spreadsheet formula injection | Exported CSV cells starting with `=`, `+`, `-` or `@` are neutralized so they can't run as Excel formulas | `client/src/components/DataPrivacySettings.jsx` (`csvCell`) |
| Regex injection in search | User search text is escaped before querying | `server/controllers/transactionController.js` |
| Client-side validation | Live password checklist, name format, confirm password, max lengths (for user experience; the server always re-checks) | `client/src/pages/Register.jsx`, `components/PasswordChecklist.jsx` |

**Demo:** Register with `password123` → rejected. Add a transaction with note `<script>alert(1)</script>` → rejected. Amount `-50` → rejected.

---

## 2. Authentication & MFA (15 pts)
*Verifies user identity and implements MFA when needed.*

| Protection | How | Where |
|---|---|---|
| Password authentication | bcrypt hash comparison | `server/controllers/authController.js` |
| JWT session tokens | Signed with a secret of at least 32 characters, expire after 1 hour | `server/utils/generateToken.js` |
| **Multi-factor authentication, two methods** | Users choose **Email code** (easiest) or **Authenticator app** (most secure, works offline). The trade-off between convenience and security is left to the user | `server/controllers/mfaController.js`, `client/src/components/MfaSettings.jsx` |
| Email OTP | 6-digit code from a cryptographically secure generator, stored only as an HMAC-SHA256 hash, expires in 5 minutes, single use, invalid after 5 wrong tries, 60-second resend cooldown, sent over TLS | `server/utils/emailOtp.js`, `server/utils/email.js` |
| Email verified before enabling | Email 2FA only turns on after the user enters a code sent to their address, proving they own it | `mfaController.js` (`emailSetup`, `emailEnable`) |
| Authenticator app (TOTP) | QR setup; secret encrypted with AES-256-GCM; 30-second codes | `mfaController.js`, `server/utils/mfa.js` |
| Two-step login | Correct password returns a 5-minute MFA-only token that cannot access data; it must be exchanged with a valid code | `authController.js` (`login`, `verifyMfaLogin`), `middleware/auth.js` |
| Backup codes | 8 one-time recovery codes, stored hashed, each usable once | `server/utils/mfa.js` |
| Disabling MFA requires re-verification | Password and a current code | `mfaController.js` (`disable`) |
| No user enumeration on login | Same error and same timing whether the email exists or not | `authController.js` (`DUMMY_HASH`) |

**Demo:** Settings → Two-factor → Use email → enter the code from your inbox → log out → log in → a code arrives by email and is required. Repeat with the authenticator app option.

---

## 3. Authorization & Access Control (15 pts)
*Restricts functions and data based on user roles.*

| Protection | How | Where |
|---|---|---|
| Roles | `user` (default) and `admin` | `server/models/User.js` |
| Role-based middleware | `authorize('admin')` on all admin routes → 403 for regular users | `server/middleware/auth.js`, `routes/adminRoutes.js` |
| Data ownership | Every query is filtered by the logged-in user's ID, so users can never read or change another user's records, even with a valid ID | all controllers (`{ user: req.user._id }`) |
| No privilege escalation at sign-up | `role` in the register request is ignored; admins are created only via a server script | `authController.js`, `scripts/makeAdmin.js` |
| Admin safeguards | Admins can't change their own role or status | `adminController.js` |
| Least privilege for admins | Admins see account info only, never transactions, budgets or amounts | `adminController.js` (`ADMIN_VISIBLE_FIELDS`) |
| Frontend route guards | Protected routes need login; `/admin` needs admin role; Admin link hidden for users | `client/src/components/ProtectedRoute.jsx`, `AdminRoute.jsx`, `Layout.jsx` |

**Demo:** Log in as a regular user and open `/admin` → redirected. Call `GET /api/admin/users` with a user token in Postman → 403.

---

## 4. Error Handling (15 pts)
*Handles errors without crashes or exposing sensitive information.*

| Protection | How | Where |
|---|---|---|
| Central error handler | All errors return a clean `{ "message": "..." }` | `server/middleware/errorHandler.js` |
| No stack traces or internals sent | Stack traces and database errors are never returned; 500 errors show a generic message | `errorHandler.js` |
| Server-side logging | Full error details logged on the server only, without request bodies or query strings | `errorHandler.js` |
| Specific safe messages | Malformed JSON → 400, oversized → 413, bad ID → 400, expired session → 401 | `errorHandler.js` |
| No crashes from async errors | Every route wrapped with `asyncHandler`; global `unhandledRejection` / `uncaughtException` handlers | `server/utils/asyncHandler.js`, `server.js` |
| Validation errors don't echo input | Submitted values (like passwords) are never included in error responses | `server/middleware/validate.js` |
| Startup config check | Server refuses to start with missing or weak secrets, with a clear message | `server/utils/validateEnv.js` |
| Frontend error boundary | A rendering error shows a friendly page instead of a blank screen | `client/src/components/ErrorBoundary.jsx` |
| Friendly frontend messages | Network errors and timeouts translated to plain language | `client/src/api/axios.js` (`getError`) |

**Demo:** Send invalid JSON to `/api/auth/login` in Postman → `{"message":"Invalid JSON format in request body"}` with no stack trace.

---

## 5. Data Protection (15 pts)
*Protects sensitive data and securely stores passwords.*

| Protection | How | Where |
|---|---|---|
| Password hashing | bcrypt with cost factor 12; plain passwords never stored or logged | `server/models/User.js` |
| Encryption at rest | MFA secrets encrypted with AES-256-GCM | `server/utils/crypto.js` |
| Hashed recovery codes | Backup codes stored as SHA-256 hashes | `server/utils/mfa.js` |
| Sensitive fields hidden | Password, MFA secrets, token version and lockout data excluded from queries (`select: false`) and stripped from all responses | `User.js` (`toJSON`) |
| Secrets in environment variables | JWT secret, encryption key and DB connection kept in `.env`, excluded from Git | `.env.example`, `.gitignore` |
| Security headers | Helmet: hides server technology, prevents MIME sniffing and clickjacking | `server/server.js` |
| CORS restriction | Only the SpendWise frontend origin may call the API from a browser | `server/server.js` |
| Transport security | Deploy behind HTTPS (Render/Vercel provide it by default) | deployment |

**Demo:** Open the `users` collection in MongoDB Atlas → password is a `$2a$12$...` hash; `mfaSecret` is encrypted.

---

## 6. Privacy Controls (15 pts)
*Applies consent, data minimization, and purpose limitation.*

| Principle | How | Where |
|---|---|---|
| **Consent** | Registration requires ticking the Privacy Policy checkbox; the server rejects sign-ups without consent and records the date and policy version | `client/src/pages/Register.jsx`, `server/routes/authRoutes.js`, `User.js` (`consent`) |
| Transparency | Privacy Policy page explaining what is collected, why, who can see it, and user rights under RA 10173 (Data Privacy Act of 2012) | `client/src/pages/Privacy.jsx` |
| **Data minimization** | Only name, email and password required; no phone, address, birthday or bank details; notes are optional | `User.js`, `Privacy.jsx` |
| **Purpose limitation** | Admins manage accounts but cannot view financial data; logs contain no request bodies or search terms | `adminController.js`, `server.js` (morgan) |
| Right of access / portability | "Download your data" in three formats: a readable report (printable to PDF), an Excel/CSV file of transactions, and machine-readable JSON for moving to another app. Passwords and security keys are never included | `server/controllers/accountController.js`, `client/src/components/DataPrivacySettings.jsx` |
| Right to correction | Edit name and preferences in Settings | `client/src/pages/Settings.jsx` |
| Right to erasure | "Delete account" permanently removes the account and all records (requires password and typing DELETE) | `accountController.js` |

**Demo:** Register without ticking the checkbox → blocked. Settings → Download your data → Readable report. Settings → Delete account.

---

## 7. Session & Account Security (10 pts)
*Secures login, logout, sessions, and account controls.*

| Protection | How | Where |
|---|---|---|
| Account lockout | 5 failed password or MFA attempts → locked for 15 minutes | `authController.js` (`recordFailure`) |
| Rate limiting | Login/register/MFA: 10 failed attempts per 15 min per IP; whole API: 300 requests per 15 min | `server/middleware/rateLimit.js` |
| Server-side logout | Logout revokes the token on the server (token versioning), not just in the browser | `authController.js` (`logout`), `middleware/auth.js` |
| Session expiry | Tokens expire after 1 hour | `.env` (`JWT_EXPIRES_IN`) |
| Idle timeout | Automatic logout after 15 minutes of inactivity | `client/src/context/AuthContext.jsx` |
| Session ends when the tab closes | Token kept in `sessionStorage` | `client/src/api/axios.js` |
| Password change signs out other devices | Token version increases; the current session gets a fresh token | `authController.js` (`changePassword`) |
| Admin can disable accounts | Disabled users are signed out immediately and can't log in | `adminController.js`, `middleware/auth.js` |
| Re-authentication for sensitive actions | Password required to change password, disable MFA, or delete the account | `authController.js`, `mfaController.js`, `accountController.js` |

**Demo:** Enter a wrong password 5 times → "Account temporarily locked". Log out, then reuse the old token in Postman → 401.
