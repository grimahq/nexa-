# Security Specification

## Data Invariants
1. **Users**: Every user document must have a valid role ('admin', 'manager', 'requestor').
2. **Admins**: A user can only perform administrative actions (write to settings, manage users) if they have a document in the `admins` collection matching their `uid`.
3. **Immutability**: `id`, `email`, and `createdAt` fields are immutable once created.
4. **Ownership**: Users can only read their own private data (not applicable yet as most data is shared within the store).
5. **System Settings**: Only admins can modify the global store settings.

## The "Dirty Dozen" Payloads
1. **Self-Promotion**: Non-admin user trying to update their own `role` to 'admin'.
2. **Settings Hijack**: Non-admin trying to update `settings/store`.
3. **Orphaned User**: Creating a user without a valid role.
4. **Email Spoofing**: Creating/Updating a user with an email different from `auth.token.email`.
5. **ID Poisoning**: Document IDs with malicious characters.
6. **Immortal Change**: Trying to change `createdAt` on an existing item.
7. **Negative Price**: Creating an item with `sellingPrice < 0`.
8. **Excessive String**: Sending 1MB string for `item.name`.
9. **Relational Break**: Creating an item without a valid SKU.
10. **Admin Lockout**: Trying to delete the last admin (Rules can't count docs, but we can prevent self-deletion).
11. **Shadow Update**: Adding `isVerified: true` to a user profile update.
12. **Unauthenticated Write**: Trying to create a sale while not signed in.

## Test Runner (Conceptual)
All the above payloads will be tested using `PERMISSION_DENIED` logic in `firestore.rules`.
