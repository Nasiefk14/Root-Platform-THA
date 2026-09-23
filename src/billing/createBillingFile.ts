import type { BillingRun } from "../types.ts";

/**
 * Generates a billing file in a specific delimited text format from a given BillingRun object.
 * The file includes a header, a body line for each collection, and a trailer with totals.
 *
 * @param billingRun - The BillingRun object containing all necessary billing details and collections.
 * @returns A string formatted as the billing file, ready for export or saving.
 */
export const createBillingFile = (billingRun: BillingRun): string => {
    const lines: string[] = [];

    lines.push(`H,${billingRun.runId},${billingRun.createdAt},${billingRun.createdBy}`);

    let totalCents = 0;
    let hashTotal = 0;

    for (const collection of billingRun.collections) {
        lines.push(
            `B,${collection.collectionId},${collection.actionDate},${collection.accountNumber},${collection.branchCode},${collection.accountType},${collection.amountInCents},${collection.reference}`,
        );
        totalCents += collection.amountInCents;
        hashTotal += Number(collection.accountNumber);
    }

    lines.push(`T,${billingRun.collections.length},${totalCents},${hashTotal}`);

    return lines.join("\n");
};
