ALTER TABLE notification_booking ADD COLUMN reception_customer_id UUID;
ALTER TABLE notification_event ADD COLUMN occurred_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notification_delivery ADD COLUMN reception_authorization_id UUID;
