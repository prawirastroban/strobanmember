
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_submission_token text UNIQUE;

ALTER TABLE public.booking_reviews
  ADD COLUMN IF NOT EXISTS submitted_via text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

INSERT INTO public.app_settings (key, value)
VALUES (
  'review_reminder_template',
  jsonb_build_object(
    'message',
    E'Halo {name} 👋\n\nTerima kasih sudah menggunakan layanan *{service}* di *Sahabat Stroban Service*.\n\nMohon luangkan waktu sebentar untuk memberi rating & tanggapan Anda di link berikut:\n{link}\n\nTanggapan Anda sangat berarti bagi kami 🙏',
    'include_link', true
  )
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_review_booking_info(_token text)
RETURNS TABLE (
  booking_id uuid,
  customer_name text,
  service_name text,
  branch text,
  already_submitted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.customer_name,
    b.service_name,
    b.branch,
    EXISTS (SELECT 1 FROM public.booking_reviews r WHERE r.booking_id = b.id) AS already_submitted
  FROM public.bookings b
  WHERE b.review_submission_token = _token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_review_booking_info(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_customer_review(
  _token text,
  _rating int,
  _review_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking record;
  _existing uuid;
BEGIN
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_rating');
  END IF;

  SELECT id, user_id, review_submission_token
  INTO _booking
  FROM public.bookings
  WHERE review_submission_token = _token
  LIMIT 1;

  IF _booking.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT id INTO _existing FROM public.booking_reviews WHERE booking_id = _booking.id LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  INSERT INTO public.booking_reviews (
    booking_id, user_id, rating, review_text,
    service_quality, would_recommend, follow_up_status,
    submitted_via, submitted_at
  ) VALUES (
    _booking.id, _booking.user_id, _rating, NULLIF(trim(_review_text), ''),
    CASE WHEN _rating >= 4 THEN 'puas' WHEN _rating = 3 THEN 'biasa' ELSE 'kecewa' END,
    'belum_yakin',
    'pending_admin_review',
    'customer_form',
    now()
  );

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_customer_review(text, int, text) TO anon, authenticated;
