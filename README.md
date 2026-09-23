# Billing file → SFTP

Prototype for the take-home: read collection data, build a billing file, deliver it to SFTP.

## How to run

1. **Node version**
  ```bash
   nvm use
  ```
   Uses the version in `.nvmrc` (24.14.1).
2. **Env file**
  ```bash
   cp .env.example .env
  ```
   Fill in user, password, and port. Docker Compose and the app both read `.env`, so you do not need to copy those values into `docker-compose.yml`.
3. **Start SFTP**
  Docker must be installed and running.
   This starts the SFTP container. Billing files are delivered here.
4. **Install and run** (this project uses **pnpm**)
  ```bash
   pnpm install
   npm start
  ```
   That runs the full cycle: load the JSON, validate it, write the CSV, verify the CSV, connect to SFTP, deliver the file, close the connection, then log success or the error.

**Useful commands**

```bash
docker compose logs -f sftp
docker compose down
```

---

## What happens to the data

```
JSON file                    after parse + filter              billing CSV
(header + body)              BillingRun                        (H / B / T)
─────────────                ────────────────────              ────────────
header.runId          ──►    runId                      ──►    H line
header.createdAt      ──►    createdAt                  ──►    H line
header.createdBy      ──►    createdBy                  ──►    H line
body[]                ──►    keep rows where                   one B line
                             actionDate === today              per collection
                             then map each row          ──►
                             reference stays reference
                             JSON trailer is ignored    ──►    T line is
                                                               recalculated
```

Only collections for **today** go into the run. Other action dates stay in the JSON and are not billed.

### Tiny example

Say today is `2026-09-23`. The JSON has two body rows (plus a third for tomorrow, which we drop):

```json
{
  "header": {
    "runId": "RUN-20260923-001",
    "createdAt": "2026-09-23T15:33:00+02:00",
    "createdBy": "nasief.khan"
  },
  "body": [
    {
      "collectionId": "COL-0001",
      "actionDate": "2026-09-22",
      "accountNumber": "4081234567",
      "branchCode": "250655",
      "accountType": 1,
      "amountInCents": 150000,
      "reference": "INV-1001 monthly premium"
    },
    {
      "collectionId": "COL-0002",
      "actionDate": "2026-09-23",
      "accountNumber": "62343678901",
      "branchCode": "051001",
      "accountType": 1,
      "amountInCents": 7550,
      "reference": "INV-1002 policy excess"
    }
  ]
}
```

**1. Parse** — `JSON.parse` gives the object above.

**2. Filter** — drop `COL-0001` (`2026-09-22`). Keep `COL-0002`.

**3. Map into a `BillingRun`**

```
runId:      RUN-20260923-001
createdAt:  2026-09-23T15:33:00+02:00
createdBy:  nasief.khan
collections:
  - COL-0002 | 2026-09-23 | 62343678901 | 051001 | 1 | 7550 | INV-1002 policy excess
```

**4. Create CSV** — header from the run, one `B` line per collection, trailer from count / sum of cents / sum of account numbers:

```
H,RUN-20260923-001,2026-09-23T15:33:00+02:00,nasief.khan
B,COL-0002,2026-09-23,62343678901,051001,1,7550,INV-1002 policy excess
T,1,7550,62343678901
```

That string is what we verify, write to `output/`, and upload to SFTP.

---

## Assumptions, questions, and choices



### Questions I asked myself

- What is a bank billing file? (Probably the question I asked the most.)
- What would the file contain, and how would I parse it once I had it?
- What is the best approach for this task?
- What happens when things go wrong, and how would I know?
- How do I make this close to bulletproof so it could, in theory, run over and over without hiccups?



### Assumptions

- The data comes in a JSON format, similar to an API that returns JSON.
- A bank file has a header, a body, and a trailer. That came from what I found online (FNB, if I remember correctly).
- `actionDate` is the billing date. That also came from the same FNB-style notes.



### Gaps I filled

- I included `runId`, `createdAt`, and `createdBy` so there is a reference for who, when, and what.
- The bank file is CSV. That matched prior experience with money-related files.
- Amounts are cents. Easier to sum than rands and cents.
- I added a hash. I am not fully sure of the actual purpose, but it showed up in the files I looked at.
- Validation: I went with the simple approach — check each value on each line. A bit more work up front, much less headache later.
- Do not send twice. After a successful SFTP delivery I write `data/sent.json`. The same `runId` is refused, and so is a `collectionId` that was already sent in a previous run.
- SFTP writes `runId.csv.tmp` first, then renames it to `runId.csv`, so the bank should not pick up a half-written file.

---



## AI

- Helped a lot once it understood the flow I wanted.
- I gave it the field values and it built the actual JSON file for me.
- It also showed what the CSV should look like with those same values, so I had something to base the billing file on.
- Made it much quicker to test each validation (JSON and CSV).
- Frustrated me when I asked it to review `validateRecords.ts`: it pushed a lot of regex. I did not use that — it went completely over my head.
- Useful for adding explanations to functions to make reading easier for the next person.
- Produced a full file of how to trigger errors and what you should see, faster than I would have done it myself.
- I wrote a rough README myself, then used AI to tidy the wording. The shape and the content were mine.

