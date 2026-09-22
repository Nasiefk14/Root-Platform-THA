import type { BillingRun } from "../types.ts";
import { isActionDateValid, isAllDigits } from "../utils/validation.ts";

export const validateRecords = (billingRun: BillingRun): void => {
    if (!billingRun.runId || !billingRun.createdBy || !billingRun.actionDate) {
        throw new Error("runId, createdBy, and actionDate are required");
    }
    if (!isActionDateValid(billingRun.actionDate)) {
        throw new Error("actionDate Must Be YYYY-MM-DD");
    }
    if (billingRun.collections.length === 0) {
        throw new Error("Billing Run Has No Collections");
    }

    const seenIds: Set<string> = new Set<string>();

    for (const col of billingRun.collections) {
        if (!col.collectionId) {
            throw new Error("collectionId is required");
        }
        if (seenIds.has(col.collectionId)) {
            throw new Error(`duplicate collectionId: ${col.collectionId}`);
        }
        seenIds.add(col.collectionId);

        const colId: string = col.collectionId;
        if (!isAllDigits(col.accountNumber)) {
            throw new Error(`${colId}: accountNumber must be digits only`);
        }
        if (col.branchCode.length !== 6) {
            throw new Error(`${colId}: branchCode must be 6 digits`);
        }
        if (!isAllDigits(col.branchCode)) {
            throw new Error(`${colId}: branchCode must be digits only`);
        }
        if (col.accountType !== 1 && col.accountType !== 2 && col.accountType !== 3) {
            throw new Error(`${colId}: accountType must be 1, 2 or 3`);
        }
        if (!Number.isInteger(col.amountInCents) || col.amountInCents <= 0) {
            throw new Error(`${colId}: amountCents must be an integer greater than 0`);
        }
        if (!col.reference) {
            throw new Error(`${colId}: reference is required`);
        }
        if (col.reference.includes(",")) {
            throw new Error(`${colId}: reference must not contain a comma`);
        }
    }
};
