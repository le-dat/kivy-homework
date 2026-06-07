# AI Log - Kivy Seller Verification Platform

## 1. Delegated Tasks

| Delegated Task | AI Handles | Reason & Control |
| :--- | :--- | :--- |
| **Boilerplate & DTOs** | Generates DTO classes for Swagger (`@ApiProperty`, `@ApiResponse`), Prisma schemas. | Repetitive task. Developer reviews data types to match the database design. |
| **UI Components** | Scaffolds Dashboard UI with Tailwind/CSS (Admin Panel, Seller Panel, Review Drawer). | Speeds up CSS work. Developer refines UX, responsiveness, and dynamic interactions. |
| **Mock Service** | Generates skeleton Mock Service structure (running on Hono API) to simulate the authentication service. | Saves time on scaffolding the basic HTTP server. Developer writes the delay and rate limit simulation logic themselves. |

---

## 2. AI Mistakes & Fixes

Summary of self-inflicted or misconfigured errors and how they were actually fixed:

| AI Mistake | Error Type | How It Was Detected | Fix | Lesson |
| :--- | :--- | :--- | :--- | :--- |
| **Race Condition** | Logic Code | Test with simultaneous calls to both webhook and admin approval. | Used Row Locking (`SELECT FOR UPDATE`) inside the transaction. | Always lock the row when transitioning to the final state of a State Machine. |
| **Migration Stuck on Render** | Ops Config | Deploy to Render froze hard (timeout) when running migration. | Changed the deploy command to: `DATABASE_URL=$DIRECT_URL prisma migrate deploy`. | Prisma 7 removed `directUrl`. To migrate through PgBouncer, override `DATABASE_URL` with the direct port. |
| **Build dist/ directory off by one level** | TS Compilation | Render reported `MODULE_NOT_FOUND` because it couldn't find `dist/main.js`. | Added `prisma.config.ts` and `prisma/seed.ts` to the `exclude` list of `tsconfig.build.json`. | Files `.ts` outside `src/` cause `tsc` to misinterpret `rootDir`, pushing the build output to `dist/src/main.js`. |

---

### Detailed Error & Fix

<details>
<summary><b>1. Race Condition on State Transition</b></summary>

#### Why did it happen?
The old `transition` function only checked the state in RAM and then `update` the DB directly. If 2 requests fired at the same time, the final state would be overwritten, breaking the invariant logic.

#### Broken Code (AI wrote):
```typescript
async transition(verificationId: string, nextStatus: VerificationStatus) {
  const current = await this.prisma.verification.findUnique({ where: { id: verificationId } });
  if (!this.canTransition(current.status, nextStatus)) {
    throw new BadRequestException("Invalid transition");
  }
  return this.prisma.verification.update({
    where: { id: verificationId },
    data: { status: nextStatus }
  });
}
```

#### Fixed Code (Developer rewrote):
```typescript
async transition(
  verificationId: string,
  nextStatus: VerificationStatus,
  actor: StateActor,
  reason: string,
) {
  return this.prisma.$transaction(async (tx) => {
    // Lock the row with SELECT FOR UPDATE to prevent Race Condition
    const rows = await tx.$queryRaw<any[]>`
      SELECT id, seller_id, status, reason
      FROM verifications
      WHERE id = ${verificationId}
      FOR UPDATE
    `;
    const row = rows[0];

    if (!row) throw new NotFoundException("Verification not found");
    if (!this.canTransition(row.status, nextStatus)) {
      throw new BadRequestException(`Cannot transition from ${row.status} to ${nextStatus}`);
    }

    return tx.verification.update({
      where: { id: verificationId },
      data: { status: nextStatus, reason, actor }
    });
  });
}
```
</details>

<details>
<summary><b>2. Migration Process Hangs Due to PgBouncer Port (Prisma 7)</b></summary>

#### Why did it happen?
When deploying to Render, migration runs through the pooler port `6543` (Transaction Mode) of Supabase by default. This port does not support Advisory Locks, so Prisma Migrate freezes indefinitely. From Prisma 7, `directUrl` in the schema was removed, so static configuration is no longer possible.

#### Broken Command (AI wrote):
```json
"db:deploy": "prisma migrate deploy"
```

#### Fix:
Force the deploy command to run through the direct port `5432` by overriding the environment variable at runtime:
```json
"db:deploy": "DATABASE_URL=$DIRECT_URL prisma migrate deploy"
```
</details>

<details>
<summary><b>3. Build Output Goes to dist/src/main Instead of dist/main Due to tsconfig rootDir</b></summary>

#### Why did it happen?
When adding the configuration file `prisma.config.ts` at the backend root, the TypeScript compiler (`tsc`) automatically expanded the project's `rootDir` from `src/` to the entire parent directory. As a result, the build output was pushed to `dist/src/main.js` instead of `dist/main.js`, causing Render to fail to locate the entry point.

#### Broken Config (AI wrote):
```json
"exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
```

#### Fix:
Exclude configuration and seed files that are outside `src/` in `tsconfig.build.json` to keep `rootDir` as `src/`:
```json
"exclude": ["node_modules", "test", "dist", "**/*spec.ts", "prisma.config.ts", "prisma/seed.ts"]
```
</details>

---

## 3. Developer-Manual Verifications

| Verification Content | How It Was Done | Actual Result |
| :--- | :--- | :--- |
| **Rate Limiter & Worker** | Wrote a script to send 120 concurrent verification requests to the system within 1 minute. | System stored exactly 120 records in `PENDING` state. BullMQ Worker dispatched to Mock Service at a stable ~80 requests/minute (did not exceed the 100/minute limit). |
| **State Machine Immutability** | Accessed the database via Prisma Studio, intentionally tried to use the API to move a record from `VERIFIED` back to `PROCESSING`. | System threw `BadRequestException`, preserved the `VERIFIED` terminal state, ensuring State Machine integrity. |
| **Webhook Latency & State Overwrite Prevention** | Used Postman to send 2 consecutive status update requests for the same record: Request 1 reported `VERIFIED`, Request 2 (simulated late-arriving webhook) reported `REJECTED`. | Database successfully blocked Request 2 thanks to the UPDATE statement with `status NOT IN (terminal_states)` check. Record stayed `VERIFIED` and returned HTTP 400. |