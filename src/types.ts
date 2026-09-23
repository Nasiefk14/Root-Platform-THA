export type Collection = {
    collectionId: string;
    actionDate: string;
    accountNumber: string;
    branchCode: string;
    accountType: 1 | 2 | 3;
    amountInCents: number;
    reference: string;
};

export type BillingRun = {
    runId: string;
    createdAt: string;
    createdBy: string;
    collections: Collection[];
};

export type BillingCollectionsFile = {
    header: { runId: string; createdAt: string; createdBy: string };
    body: Collection[];
};

export type SentRecord = {
    runId: string;
    sentAt: string;
    count: number;
    totalCents: number;
    collectionIds: string[];
};
