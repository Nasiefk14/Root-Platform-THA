import * as fs from "fs";
import * as path from "path";
import type { BillingRun } from "./types.ts";

export type SentRecord = {
    runId: string;
    sentAt: string;
    count: number;
    totalCents: number;
    collectionIds: string[];
};

const sentPath = path.join(import.meta.dirname, "..", "data", "sent.json");

function loadSent(): SentRecord[] {
    if (!fs.existsSync(sentPath)) {
        return [];
    }
    const raw = fs.readFileSync(sentPath, "utf8");
    if (!raw.trim()) {
        return [];
    }
    return JSON.parse(raw) as SentRecord[];
}

function saveSent(records: SentRecord[]): void {
    const dir = path.dirname(sentPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(sentPath, JSON.stringify(records, null, 2), "utf8");
}

export function assertNotAlreadySent(run: BillingRun): void {
    const records = loadSent();

    const sameRun = records.find((record) => record.runId === run.runId);
    if (sameRun) {
        throw new Error(
            `run ${run.runId} already sent at ${sameRun.sentAt} — refusing to send twice`
        );
    }

    const sentIds = new Set<string>();
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
}

export function recordSent(run: BillingRun): void {
    const records = loadSent();

    let totalCents = 0;
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
}