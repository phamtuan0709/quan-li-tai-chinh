-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategoryPattern_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "transactionTime" DATETIME NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "debitAccount" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "transactionFee" REAL NOT NULL DEFAULT 0,
    "beneficiaryName" TEXT,
    "beneficiaryAccount" TEXT,
    "beneficiaryBank" TEXT,
    "remark" TEXT,
    "channel" TEXT,
    "category" TEXT,
    "isUserLabeled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE INDEX "CategoryPattern_categoryId_idx" ON "CategoryPattern"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryPattern_keyword_idx" ON "CategoryPattern"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPattern_categoryId_keyword_key" ON "CategoryPattern"("categoryId", "keyword");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_referenceNumber_key" ON "Transaction"("referenceNumber");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_transactionTime_idx" ON "Transaction"("transactionTime");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
