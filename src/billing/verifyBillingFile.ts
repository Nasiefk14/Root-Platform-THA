import type { BillingRun, Collection } from "../types.ts";

export const verifyBillingFile = (csv: string, billingRun: BillingRun): void => {
    const lines = csv.split(/\r?\n/);
    if (lines[lines.length - 1] === "") {
        lines.pop();
    }

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].length === 0) {
            throw new Error("Invalid billing file - File must not contain blank lines");
        }
    }
    if (lines.length < 2) {
        throw new Error("Invalid billing file - File must have a header and a trailer");
    }

    const header: string = lines[0];
    const trailer: string = lines[lines.length - 1];
    const body: string[] = lines.slice(1, -1);

    const expectedCount: number = billingRun.collections.length;
    if (body.length !== expectedCount) {
        throw new Error(`Invalid billing file - Body has ${body.length} rows but run has ${expectedCount} collections`);
    }

    const headerFields = header.split(",");
    if (headerFields.length !== 4) {
        throw new Error(`Invalid billing file - Header must have 4 fields, got: ${header}`);
    }
    if (headerFields[0] !== "H") {
        throw new Error("Invalid billing file - Header record type must be 'H'");
    }
    if (headerFields[1] !== billingRun.runId) {
        throw new Error(`Invalid billing file - Header run_id ${headerFields[1]} does not match ${billingRun.runId}`);
    }
    if (headerFields[2] !== billingRun.createdAt) {
        throw new Error(`Invalid billing file - Header created_at ${headerFields[2]} does not match ${billingRun.createdAt}`);
    }
    if (headerFields[3] !== billingRun.createdBy) {
        throw new Error(`Invalid billing file - Header created_by ${headerFields[3]} does not match ${billingRun.createdBy}`);
    }

    let expectedTotal: number = 0;
    let expectedHash: number = 0;

    for (let i = 0; i < body.length; i++) {
        const collection: Collection = billingRun.collections[i];
        const fields: string[] = body[i].split(",");

        if (fields.length !== 8) {
            throw new Error(`Invalid billing file - Body row ${i + 1} must have 8 fields, got: ${body[i]}`);
        }
        if (fields[0] !== "B") {
            throw new Error(`Invalid billing file - Body row ${i + 1} record type must be 'B'`);
        }
        if (fields[1] !== collection.collectionId) {
            throw new Error(`Invalid billing file - Body row ${i + 1} collection_id ${fields[1]} does not match ${collection.collectionId}`);
        }
        if (fields[2] !== collection.actionDate) {
            throw new Error(`Invalid billing file - Body row ${i + 1} action_date ${fields[2]} does not match ${collection.actionDate}`);
        }
        if (fields[3] !== collection.accountNumber) {
            throw new Error(`Invalid billing file - Body row ${i + 1} account_number ${fields[3]} does not match ${collection.accountNumber}`);
        }
        if (fields[4] !== collection.branchCode) {
            throw new Error(`Invalid billing file - Body row ${i + 1} branch_code ${fields[4]} does not match ${collection.branchCode}`);
        }
        if (Number(fields[5]) !== collection.accountType) {
            throw new Error(`Invalid billing file - Body row ${i + 1} account_type ${fields[5]} does not match ${collection.accountType}`);
        }
        if (Number(fields[6]) !== collection.amountInCents) {
            throw new Error(`Invalid billing file - Body row ${i + 1} amount_in_cents ${fields[6]} does not match ${collection.amountInCents}`);
        }
        if (fields[7] !== collection.reference) {
            throw new Error(`Invalid billing file - Body row ${i + 1} references ${fields[7]} does not match ${collection.reference}`);
        }

        expectedTotal += collection.amountInCents;
        expectedHash += Number(collection.accountNumber);
    }

    const trailerFields = trailer.split(",");
    if (trailerFields.length !== 4) {
        throw new Error(`Invalid billing file - Trailer must have 4 fields, got: ${trailer}`);
    }
    if (trailerFields[0] !== "T") {
        throw new Error("Invalid billing file - Trailer record type must be 'T'");
    }

    const trailerCount: number = Number(trailerFields[1]);
    const trailerTotal: number = Number(trailerFields[2]);
    const trailerHash: number = Number(trailerFields[3]);

    if (trailerCount !== expectedCount) {
        throw new Error(`Invalid billing file - Trailer count ${trailerCount} does not match ${expectedCount}`);
    }
    if (trailerTotal !== expectedTotal) {
        throw new Error(`Invalid billing file - Trailer total ${trailerTotal} does not match ${expectedTotal}`);
    }
    if (trailerHash !== expectedHash) {
        throw new Error(`Invalid billing file - Trailer hash ${trailerHash} does not match ${expectedHash}`);
    }
};
