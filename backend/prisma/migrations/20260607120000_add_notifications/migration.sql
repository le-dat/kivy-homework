-- CreateNotificationTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateNotificationIndexes
CREATE INDEX "notifications_seller_id_idx" ON "notifications"("seller_id");
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX "notifications_seller_id_is_read_created_at_idx" ON "notifications"("seller_id", "is_read", "created_at");

-- AddNotificationSellerIdFK
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_seller_id_fkey" 
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE Cascade;

-- CreateVerificationsStatusUpdatedAtIndex
CREATE INDEX "verifications_status_updated_at_idx" ON "verifications"("status", "updated_at");
