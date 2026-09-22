# How to throw each error

Run `npm start` from the project root after each change. Undo the change before testing the next one.

Checks run in this order. An earlier throw means you never reach a later one:

1. `validateRecords` — `files/billing-collections.json`
2. `checkForDuplicates` — `data/sent.json`
3. `verifyBillingFile` — mutate `csv` in `src/index.ts` after `createBillingFile`
4. SFTP — `src/config.ts` / docker

Current sample header:

```
runId: RUN-20260918-001
createdAt: 2026-09-18T15:33:00+02:00
createdBy: nasief.khan
actionDate: 2026-09-19
```

---

## 1. `validateRecords` — edit `files/billing-collections.json`

| What to change | Expected error |
|---|---|
| `header.runId` → `""` | `runId, createdBy, and actionDate are required` |
| `header.createdBy` → `""` | `runId, createdBy, and actionDate are required` |
| First body row `actionDate` → `"2026/09/19"` or `"21-09-2026"` | `actionDate Must Be YYYY-MM-DD` |
| After building `run` in `index.ts`, set `run.collections = []` | `Billing Run Has No Collections` |
| First body row `collectionId` → `""` | `collectionId is required` |
| Two body rows with the same `collectionId` (e.g. both `COL-0001`) | `duplicate collectionId: COL-0001` |
| `accountNumber` → `"408123456A"` | `COL-0001: accountNumber must be digits only` |
| `branchCode` → `"25065"` (5 digits) | `COL-0001: branchCode must be 6 digits` |
| `branchCode` → `"25065A"` | `COL-0001: branchCode must be digits only` |
| `accountType` → `4` | `COL-0001: accountType must be 1, 2 or 3` |
| `amountInCents` → `0` or `-1` or `12.5` | `COL-0001: amountCents must be an integer greater than 0` |
| `references` → `""` | `COL-0001: reference is required` |
| `references` → `"INV-1001, monthly"` | `COL-0001: reference must not contain a comma` |

Do **not** empty `body` in the JSON to test “no collections”. `index.ts` reads `body[0].actionDate` first and will crash with a TypeError instead.

---

## 2. `checkForDuplicates` — edit `data/sent.json`

Create `data/sent.json` if it is missing. These checks only run after validation passes.

**Same run id** — put the current `runId` in the ledger, then start without changing the JSON:

```json
[
  {
    "runId": "RUN-20260918-001",
    "sentAt": "2026-09-21T13:00:00.000Z",
    "count": 1,
    "totalCents": 150000,
    "collectionIds": ["COL-0001"]
  }
]
```

Expected:

```
run RUN-20260918-001 already sent at 2026-09-21T13:00:00.000Z — refusing to send twice
```

**Same collection, new run** — change `files/billing-collections.json` `header.runId` to `RUN-20260921-001`, keep `COL-0001` in the body, and use this ledger:

```json
[
  {
    "runId": "RUN-OLD-001",
    "sentAt": "2026-09-21T13:00:00.000Z",
    "count": 1,
    "totalCents": 150000,
    "collectionIds": ["COL-0001"]
  }
]
```

Expected:

```
COL-0001 was already sent in a previous run
```

If `data/sent.json` is missing or `[]`, neither of these throws.

---

## 3. `verifyBillingFile` — mutate `csv` in `src/index.ts`

Do **not** change the JSON for these. Create writes a matching CSV; you must break the string after create.

Replace this:

```ts
const csv = createBillingFile(run);
verifyBillingFile(csv, run);
```

with:

```ts
const csv = createBillingFile(run);
const lines = csv.split("\n");

// put ONE break below, then run npm start

verifyBillingFile(lines.join("\n"), run);
```

Healthy header / first body / trailer look like:

```
H,RUN-20260918-001,2026-09-18T15:33:00+02:00,nasief.khan
B,COL-0001,2026-09-19,4081234567,250655,1,150000,INV-1001 monthly premium
T,10,443149,<hash>
```

Checks run in order. An extra comma will hit “must have N fields” before a field-mismatch error.

### File shape

| What to put | Expected error |
|---|---|
| Insert `""` as `lines[1]` (blank line after header) | `Invalid billing file - File must not contain blank lines` |
| `lines.length = 1` e.g. `verifyBillingFile(lines[0], run)` | `Invalid billing file - File must have a header and a trailer` |
| `lines.splice(1, 1)` (drop first `B` row) | `Invalid billing file - Body has 9 rows but run has 10 collections` |

### Header — `lines[0] = "..."` 

| What to put in `lines[0]` | Expected error |
|---|---|
| `H,RUN-20260918-001,2026-09-18T15:33:00+02:00,nasief.khan,EXTRA` | `Header must have 4 fields, got: ...` |
| `H,RUN-20260918-001,nasief.khan` | `Header must have 4 fields, got: ...` |
| `X,RUN-20260918-001,2026-09-18T15:33:00+02:00,nasief.khan` | `Header record type must be 'H'` |
| `H,WRONG-ID,2026-09-18T15:33:00+02:00,nasief.khan` | `Header run_id WRONG-ID does not match RUN-20260918-001` |
| `H,RUN-20260918-001,WRONG-TIME,nasief.khan` | `Header created_at WRONG-TIME does not match 2026-09-18T15:33:00+02:00` |
| `H,RUN-20260918-001,2026-09-18T15:33:00+02:00,someone.else` | `Header created_by someone.else does not match nasief.khan` |

### Body — `lines[1] = "..."` (first `B` row)

| What to put in `lines[1]` | Expected error |
|---|---|
| `B,COL-0001,2026-09-19,4081234567,250655,1,150000,INV-1001 monthly premium,EXTRA` | `Body row 1 must have 8 fields, got: ...` |
| `X,COL-0001,2026-09-19,4081234567,250655,1,150000,INV-1001 monthly premium` | `Body row 1 record type must be 'B'` |
| `B,COL-9999,2026-09-19,4081234567,250655,1,150000,INV-1001 monthly premium` | `Body row 1 collection_id COL-9999 does not match COL-0001` |
| `B,COL-0001,1999-01-01,4081234567,250655,1,150000,INV-1001 monthly premium` | `Body row 1 action_date 1999-01-01 does not match 2026-09-19` |
| `B,COL-0001,2026-09-19,0000000000,250655,1,150000,INV-1001 monthly premium` | `Body row 1 account_number 0000000000 does not match 4081234567` |
| `B,COL-0001,2026-09-19,4081234567,111111,1,150000,INV-1001 monthly premium` | `Body row 1 branch_code 111111 does not match 250655` |
| `B,COL-0001,2026-09-19,4081234567,250655,2,150000,INV-1001 monthly premium` | `Body row 1 account_type 2 does not match 1` |
| `B,COL-0001,2026-09-19,4081234567,250655,1,1,INV-1001 monthly premium` | `Body row 1 amount_in_cents 1 does not match 150000` |
| `B,COL-0001,2026-09-19,4081234567,250655,1,150000,wrong-ref` | `Body row 1 references wrong-ref does not match INV-1001 monthly premium` |

If your first collection is not `COL-0001` / `150000`, copy the real `B` line from `createBillingFile` output and change only one field.

### Trailer — last line `lines[lines.length - 1] = "..."`

| What to put | Expected error |
|---|---|
| `T,10,443149,0,EXTRA` | `Trailer must have 4 fields, got: ...` |
| `X,10,443149,0` | `Trailer record type must be 'T'` |
| `T,99,443149,0` | `Trailer count 99 does not match 10` |
| `T,10,1,0` | `Trailer total 1 does not match ...` |
| `T,10,443149,0` | `Trailer hash 0 does not match ...` |

Use your real count / total if they are not `10` / `443149`. For the hash check, `0` is enough if the real hash is not `0`.

---

## 4. SFTP — `src/delivery/deliverSftp.ts`

These happen after verify. `recordSent` does not run if SFTP throws, so `sent.json` will not update.

| What to change | Expected error |
|---|---|
| Stop the SFTP docker container | `SFTP connect failed: could not connect to 127.0.0.1:2222. Is the SFTP container running?` |
| Wrong `SFTP_PASSWORD` / `sftpConfig.password` | `SFTP connect failed: authentication failed. Check username and password.` |
| `SFTP_HOST` → a hostname that does not exist | `SFTP connect failed: host ... was not found.` |
| Remote file already exists as `/incoming/RUN-20260918-001.csv` and rename cannot overwrite | `SFTP rename failed: ...` |

---

## After testing

Revert JSON, delete or restore `data/sent.json`, and remove any `lines[...]` hacks in `index.ts` so a normal run can succeed again.
