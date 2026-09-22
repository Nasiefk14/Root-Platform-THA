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

