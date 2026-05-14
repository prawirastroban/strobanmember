
CREATE OR REPLACE FUNCTION public.get_review_booking_info(_token text)
RETURNS TABLE(
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
    EXISTS (
      SELECT 1 FROM public.booking_reviews r
      WHERE r.booking_id = b.id
        AND r.submitted_via = 'customer_form'
    ) AS already_submitted
  FROM public.bookings b
  WHERE b.review_submission_token = _token
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_customer_review(
  _token text,
  _rating integer,
  _review_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking record;
  _existing record;
  _clean_text text;
BEGIN
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_rating');
  END IF;

  SELECT id, user_id, service_name, branch
  INTO _booking
  FROM public.bookings
  WHERE review_submission_token = _token
  LIMIT 1;

  IF _booking.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  _clean_text := NULLIF(trim(_review_text), '');

  SELECT id, submitted_via INTO _existing
  FROM public.booking_reviews
  WHERE booking_id = _booking.id
  LIMIT 1;

  IF _existing.id IS NOT NULL THEN
    IF _existing.submitted_via = 'customer_form' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
    END IF;
    -- Admin draft exists → upgrade with customer's own input
    UPDATE public.booking_reviews
    SET rating = _rating,
        review_text = _clean_text,
        service_quality = CASE WHEN _rating >= 4 THEN 'puas' WHEN _rating = 3 THEN 'biasa' ELSE 'kecewa' END,
        submitted_via = 'customer_form',
        submitted_at = now(),
        follow_up_status = 'pending_admin_review',
        updated_at = now()
    WHERE id = _existing.id;
  ELSE
    INSERT INTO public.booking_reviews (
      booking_id, user_id, rating, review_text,
      service_quality, would_recommend, follow_up_status,
      submitted_via, submitted_at
    ) VALUES (
      _booking.id, _booking.user_id, _rating, _clean_text,
      CASE WHEN _rating >= 4 THEN 'puas' WHEN _rating = 3 THEN 'biasa' ELSE 'kecewa' END,
      'belum_yakin',
      'pending_admin_review',
      'customer_form',
      now()
    );
  END IF;

  -- Mirror to activity_logs so the public_reviews view (used on homepage Testimonials) picks it up
  INSERT INTO public.activity_logs (type, description, user_id, metadata)
  VALUES (
    'review',
    'Customer submitted review',
    _booking.user_id,
    jsonb_build_object(
      'rating', _rating,
      'review', COALESCE(_clean_text, ''),
      'service_name', COALESCE(_booking.service_name, ''),
      'branch', COALESCE(_booking.branch, ''),
      'booking_id', _booking.id
    )
  );

  RETURN jsonb_build_object('ok', true, 'booking_id', _booking.id);
END;
$$;
