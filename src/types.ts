export type Collection = {
    collectionId: string;
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
    actionDate: string;
    collections: Collection[];
};

export type BillingCollectionRow = {
    collectionId: string;
    actionDate: string;
    accountNumber: string;
    branchCode: string;
    accountType: 1 | 2 | 3;
    amountInCents: number;
    references: string;
};

export type BillingCollectionsFile = {
    header: { runId: string; createdAt: string; createdBy: string };
    body: BillingCollectionRow[];
};

export type SentRecord = {
    runId: string;
    sentAt: string;
    count: number;
    totalCents: number;
    collectionIds: string[];
};
