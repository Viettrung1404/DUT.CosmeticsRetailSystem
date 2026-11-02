-- Keep the existing promotion reservation lifecycle for the explicit unpaid state.
CREATE OR REPLACE FUNCTION sprint5_order_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status='CANCELLED' AND OLD.status NOT IN ('PENDING_PAYMENT','PENDING','CONFIRMED','PROCESSING') THEN
      RAISE EXCEPTION 'PROMOTION_CANCEL_AFTER_FULFILLMENT_FORBIDDEN';
    END IF;
    PERFORM sprint5_transition_promotions(NEW.id,NEW.status);
  END IF;
  RETURN NEW;
END $$;

-- Existing unpaid SePay orders can resume; historical paid/confirmed orders stay intact.
WITH changed AS (
  UPDATE orders o SET status='PENDING_PAYMENT',updated_at=clock_timestamp()
  WHERE o.status='PENDING'
    AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.payment_method='SEPAY')
    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.status='COMPLETED')
  RETURNING id
)
INSERT INTO order_status_history(id,order_id,status,note)
SELECT gen_random_uuid(),id,'PENDING_PAYMENT','Tách trạng thái chờ thanh toán SePay' FROM changed;

-- A successful empty transaction lookup is not evidence that money was received.
UPDATE payments p SET verification_pending=false,updated_at=clock_timestamp()
WHERE p.payment_method='SEPAY' AND p.status='PAYABLE' AND p.first_paid_received_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM payment_charges c WHERE c.payment_id=p.id);
