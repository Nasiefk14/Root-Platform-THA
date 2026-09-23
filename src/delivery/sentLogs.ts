import * as fs from "fs";
import * as path from "path";
import type { BillingRun, SentRecord } from "../types.ts";

const sentPath: string = path.join(import.meta.dirname, "..", "..", "data", "sent.json");

/**
 * Loads all previously sent billing records from the sent.json file.
 * If the file does not exist or is empty, returns an empty array.
 *
 * @returns {SentRecord[]} An array of SentRecord objects representing previously sent runs.
 */
const loadSent = (): SentRecord[] => {
    if (!fs.existsSync(sentPath)) {
        return [];
    }
    const raw = fs.readFileSync(sentPath, "utf8");
    if (!raw.trim()) {
        return [];
    }
    return JSON.parse(raw) as SentRecord[];
};

/**
 * Writes the full sent-log array to sent.json, creating the data folder if needed.
 *
 * @param records - Every sent run to persist, including older ones plus any new row.
 * @returns {void} Nothing. Overwrites sent.json with the given list.
 */
const saveSent = (records: SentRecord[]): void => {
    const dir: string = path.dirname(sentPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(sentPath, JSON.stringify(records, null, 2), "utf8");
};

/**
 * Refuses to continue if this run, or any of its collections, was already delivered.
 * Throws if `run.runId` is already in the sent log, or if any `collectionId` appears
 * in a previous send.
 *
 * @param run - The billing run about to be sent.
 * @returns {void} Nothing. Throws if this would be a duplicate send.
 */
export const checkForDuplicates = (run: BillingRun): void => {
    const records: SentRecord[] = loadSent();

    const sameRun: SentRecord | undefined = records.find((record) => record.runId === run.runId);
    if (sameRun) {
        throw new Error(
            `run ${run.runId} already sent at ${sameRun.sentAt} — refusing to send twice`
        );
    }

    const sentIds: Set<string> = new Set<string>();
    for (const record of records) {
        for (const id of record.collectionIds) {
            sentIds.add(id);
        }
    }
    for (const collection of run.collections) {
        if (sentIds.has(collection.collectionId)) {
            throw new Error(
                `${collection.collectionId} was already sent in a previous run`
            );
        }
    }
};

/**
 * Appends this run to the sent log after a successful SFTP delivery.
 * Stores runId, sent time, collection count, total cents, and every collectionId.
 *
 * @param run - The billing run that was just delivered.
 * @returns {void} Nothing. Writes the updated list to sent.json.
 */
export const recordSent = (run: BillingRun): void => {
    const records: SentRecord[] = loadSent();

    let totalCents: number = 0;
    for (const collection of run.collections) {
        totalCents += collection.amountInCents;
    }

    records.push({
        runId: run.runId,
        sentAt: new Date().toISOString(),
        count: run.collections.length,
        totalCents,
        collectionIds: run.collections.map((collection) => collection.collectionId),
    });

    saveSent(records);
};
