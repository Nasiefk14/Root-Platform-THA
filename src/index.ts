import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BillingCollectionsFile, BillingRun } from "./types.ts";
import { createBillingFile } from "./billing/createBillingFile.ts";
import { verifyBillingFile } from "./billing/verifyBillingFile.ts";
import { validateRecords } from "./billing/validateRecords.ts";
import { checkForDuplicates, recordSent } from "./delivery/sentLogs.ts";
import { deliverToSftp } from "./delivery/deliverSftp.ts";

async function main(): Promise<void> {
    const billingCollectionsFilePath: string = path.join(
        import.meta.dirname,
        "..",
        "files",
        "billing-collections.json"
    );

    const readFileData: string = readFileSync(billingCollectionsFilePath, "utf8");
    const parsedBillingData: BillingCollectionsFile = JSON.parse(readFileData) as BillingCollectionsFile;

    const todaysDte = new Date().toISOString().split("T")[0];
    const todaysDateRows = parsedBillingData.body.filter((row) => row.actionDate === todaysDte);

    const run: BillingRun = {
        runId: parsedBillingData.header.runId,
        createdAt: parsedBillingData.header.createdAt,
        createdBy: parsedBillingData.header.createdBy,
        collections: todaysDateRows.map((row) => ({
            collectionId: row.collectionId,
            accountNumber: row.accountNumber,
            branchCode: row.branchCode,
            accountType: row.accountType,
            amountInCents: row.amountInCents,
            reference: row.reference,
            actionDate: row.actionDate,
        })),

    };

    validateRecords(run);
    checkForDuplicates(run);

    const csv: string = createBillingFile(run);
    verifyBillingFile(csv, run);

    const outputDir: string = path.join(import.meta.dirname, "..", "output");
    mkdirSync(outputDir, { recursive: true });

    const outputPath: string = path.join(outputDir, `${run.runId}.csv`);
    writeFileSync(outputPath, csv, "utf8");

    const remotePath: string = await deliverToSftp(csv, run.runId);
    console.log(`delivered to ${remotePath}`);
    recordSent(run);

    let totalCents: number = 0;
    for (const collection of run.collections) {
        totalCents += collection.amountInCents;
    }

    console.log(`wrote ${outputPath}`);
    console.log(`count=${run.collections.length} totalCents=${totalCents}`);
}

main();