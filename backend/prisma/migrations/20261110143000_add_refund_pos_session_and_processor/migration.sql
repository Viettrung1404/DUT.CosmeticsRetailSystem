-- Hoàn tiền mặt tại quầy ghi vào ca POS để đối soát két; lưu người hoàn tiền thay cho nhật ký thao tác
ALTER TABLE "refunds" ADD COLUMN "pos_session_id" UUID,
ADD COLUMN "processed_by" UUID;

CREATE INDEX "refunds_pos_session_id_status_idx" ON "refunds"("pos_session_id", "status");

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
