-- CreateTable
CREATE TABLE "TodoAudio" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TodoAudio_todoId_key" ON "TodoAudio"("todoId");

-- AddForeignKey
ALTER TABLE "TodoAudio" ADD CONSTRAINT "TodoAudio_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
