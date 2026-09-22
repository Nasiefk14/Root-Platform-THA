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

    const run: BillingRun = {
        runId: parsedBillingData.header.runId,
        createdAt: parsedBillingData.header.createdAt,
        createdBy: parsedBillingData.header.createdBy,
        actionDate: parsedBillingData.body[0].actionDate,
        collections: parsedBillingData.body.map((row) => ({
            collectionId: row.collectionId,
            accountNumber: row.accountNumber,
            branchCode: row.branchCode,
            accountType: row.accountType,
            amountInCents: row.amountInCents,
            reference: row.references,
        })),
    };

    validateRecords(run);
    checkForDuplicates(run);

    const csv = createBillingFile(run);
    verifyBillingFile(csv, run);

    const outputDir = path.join(import.meta.dirname, "..", "output");
    mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${run.runId}.csv`);
    writeFileSync(outputPath, csv, "utf8");

    const remotePath = await deliverToSftp(csv, run.runId);
    console.log(`delivered to ${remotePath}`);
    recordSent(run);

    let totalCents = 0;
    for (const collection of run.collections) {
        totalCents += collection.amountInCents;
    }

    console.log(`wrote ${outputPath}`);
    console.log(`count=${run.collections.length} totalCents=${totalCents}`);
}

main();