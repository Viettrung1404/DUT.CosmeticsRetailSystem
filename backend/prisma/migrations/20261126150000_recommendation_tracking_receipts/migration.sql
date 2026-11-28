CREATE TABLE recommendation_tracking_batches (
  batch_id VARCHAR(64) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rec_tracking_batch_created ON recommendation_tracking_batches (created_at);
