# Security Specification & Security TDD for Wafalme FM

## 1. Data Invariants & Zero-Trust Governance

1. **Staff Role Invariant**: No unauthenticated client can read or modify staff documents. Users cannot elevate their own role (`role: 'Super Admin'`). Only an authenticated Super Admin or Admin can assign or mutate staff roles. The bootstrapped admin `makajoseph97@gmail.com` has root authority.
2. **Client-Campaign Decoupling**: A client can possess unlimited independent campaigns. Every campaign must reference a valid `clientId` and contain non-negative financial totals in TZS.
3. **Immutability of Historical Records**:
   - `auditLogs`: Append-only, cannot be updated or deleted by any user, including admins.
   - `broadcastLogs`: Once written and verified, cannot be deleted or forged by presenters from unassigned slots.
   - `payments`: Financial records cannot have their receipt number or verified amount modified after clearance without audit tracking.
4. **ID Poisoning Protection**: All document IDs and path variables must adhere to `^[a-zA-Z0-9_\-]+$` and be strictly under 128 characters.
5. **System Settings Safety**: Publicly read-only for authenticated staff; mutations restricted strictly to Super Admin and Admin.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Privilege Escalation)**: Non-admin staff attempting to write `role: "Super Admin"` to their own `/staff/{uid}` document.
   - *Expected Result*: `PERMISSION_DENIED`
2. **Payload 2 (Shadow Field Injection)**: Creating a client document containing a ghost administrative field `_isAdminOverride: true`.
   - *Expected Result*: `PERMISSION_DENIED` (rejected by strict key validation)
3. **Payload 3 (ID Poisoning Attack)**: Writing to `/campaigns/` using a 2KB buffer string ID containing special characters `../../evil_root`.
   - *Expected Result*: `PERMISSION_DENIED` (fails `isValidId` gate)
4. **Payload 4 (Unauthenticated Blanket Read)**: An unauthenticated crawler attempting `collection('clients').getDocs()`.
   - *Expected Result*: `PERMISSION_DENIED`
5. **Payload 5 (Audit Log Tampering)**: An admin user attempting `updateDoc(doc(db, 'auditLogs', 'log_1'), { action: 'DELETED_EVIDENCE' })`.
   - *Expected Result*: `PERMISSION_DENIED` (Audit logs are strictly write-once, no updates)
6. **Payload 6 (Audit Log Deletion)**: An operator attempting `deleteDoc(doc(db, 'auditLogs', 'log_1'))`.
   - *Expected Result*: `PERMISSION_DENIED`
7. **Payload 7 (Denial of Wallet Payload)**: Injecting a 2MB base64 string into `companyName` on `/clients/{clientId}`.
   - *Expected Result*: `PERMISSION_DENIED` (fails `companyName.size() <= 120`)
8. **Payload 8 (Negative Payment Injection)**: Attempting to insert a payment record with `amountTZS: -50000000`.
   - *Expected Result*: `PERMISSION_DENIED` (requires `amountTZS > 0`)
9. **Payload 9 (Unauthenticated Broadcast Log Forgery)**: Anonymous request attempting to post a confirmed broadcast log to mark campaign spots as aired.
   - *Expected Result*: `PERMISSION_DENIED`
10. **Payload 10 (System Settings Vandalism)**: A Presenter / Operator user attempting to modify `vatRatePercentage` or `currency` in `/systemSettings/stationConfig`.
    - *Expected Result*: `PERMISSION_DENIED` (requires Admin or Super Admin)
11. **Payload 11 (Campaign Client Spoofing)**: Attempting to update a campaign's `clientId` to redirect advertising credits to another account.
    - *Expected Result*: `PERMISSION_DENIED` (clientId is immutable on update)
12. **Payload 12 (Email Spoofing)**: Request attempting administrative bypass with header email `makajoseph97@gmail.com` when `email_verified == false`.
    - *Expected Result*: `PERMISSION_DENIED` (requires `request.auth.token.email_verified == true`)
