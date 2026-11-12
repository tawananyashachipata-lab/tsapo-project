-- Keep RLS helpers callable by authenticated users; remove anonymous defaults.
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role),public.is_admin(uuid),public.my_agent_id(),public.is_recipient_of(public.parcels) TO authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_price(numeric,uuid,uuid,uuid),public.track_parcel(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text,numeric,text,text,text,text),public.update_parcel_status(uuid,public.parcel_status,text),public.cancel_booking(uuid),public.verify_pickup(text,text),public.confirm_payment(uuid,text),public.set_admin_role(uuid,boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_parcel(public.parcels,text,text) FROM authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

CREATE OR REPLACE FUNCTION public.is_recipient_of(_parcel public.parcels) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND (
 (u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL AND lower(u.email)=lower(_parcel.recipient_email)) OR
 (u.phone_confirmed_at IS NOT NULL AND u.phone IS NOT NULL AND ('+'||ltrim(u.phone,'+'))=_parcel.recipient_phone)));
$$;

CREATE OR REPLACE FUNCTION public.notify_parcel(_parcel public.parcels,_title text,_body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record;
BEGIN
 INSERT INTO public.notifications(user_id,parcel_id,title,body) VALUES(_parcel.sender_id,_parcel.id,_title,_body);
 FOR r IN SELECT u.id FROM auth.users u WHERE u.id<>_parcel.sender_id AND (
 (u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL AND lower(u.email)=lower(_parcel.recipient_email)) OR
 (u.phone_confirmed_at IS NOT NULL AND u.phone IS NOT NULL AND ('+'||ltrim(u.phone,'+'))=_parcel.recipient_phone)) LOOP
 INSERT INTO public.notifications(user_id,parcel_id,title,body) VALUES(r.id,_parcel.id,_title,_body);
 END LOOP;
 FOR r IN SELECT DISTINCT a.user_id FROM public.agents a WHERE a.id IN (_parcel.origin_agent_id,_parcel.destination_agent_id) AND a.user_id IS NOT NULL AND a.user_id<>_parcel.sender_id LOOP
 INSERT INTO public.notifications(user_id,parcel_id,title,body) VALUES(r.user_id,_parcel.id,_title,_body);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.quote_price(_weight numeric,_category uuid,_from uuid,_to uuid) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; m numeric; v_price numeric;
BEGIN
 IF _weight IS NULL OR _weight<=0 OR _weight>200 OR _weight='NaN'::numeric THEN RAISE EXCEPTION 'Weight must be greater than zero and at most 200 kg'; END IF;
 IF _category IS NULL THEN RAISE EXCEPTION 'Choose a parcel category'; END IF;
 SELECT price_multiplier INTO m FROM public.parcel_categories WHERE id=_category;
 IF NOT FOUND OR m<=0 THEN RAISE EXCEPTION 'Invalid parcel category'; END IF;
 IF _from IS NULL OR _to IS NULL OR NOT EXISTS(SELECT 1 FROM public.locations WHERE id=_from AND is_active) OR NOT EXISTS(SELECT 1 FROM public.locations WHERE id=_to AND is_active) THEN RAISE EXCEPTION 'Choose active pickup and destination towns'; END IF;
 SELECT value INTO s FROM public.admin_settings WHERE key='pricing';
 v_price:=round(((s->>'base_usd')::numeric+(s->>'per_kg_usd')::numeric*_weight+CASE WHEN _from<>_to THEN (s->>'intercity_usd')::numeric ELSE 0 END)*m,2);
 IF v_price IS NULL OR v_price<0 OR v_price='NaN'::numeric THEN RAISE EXCEPTION 'Pricing is unavailable'; END IF;
 RETURN v_price;
END $$;

CREATE OR REPLACE FUNCTION public.validate_parcel_booking() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF coalesce(length(trim(NEW.sender_name)),0)<2 OR coalesce(length(trim(NEW.recipient_name)),0)<2 THEN RAISE EXCEPTION 'Enter sender and recipient names'; END IF;
 IF NEW.sender_phone IS NULL OR NEW.sender_phone !~ '^\+263[0-9]{9}$' OR NEW.recipient_phone IS NULL OR NEW.recipient_phone !~ '^\+263[0-9]{9}$' THEN RAISE EXCEPTION 'Enter valid Zimbabwean phone numbers'; END IF;
 IF NEW.image_path IS NOT NULL AND NEW.image_path<>'' AND split_part(NEW.image_path,'/',1)<>NEW.sender_id::text THEN RAISE EXCEPTION 'Parcel photo must belong to the sender'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_parcel_booking BEFORE INSERT ON public.parcels FOR EACH ROW EXECUTE FUNCTION public.validate_parcel_booking();
REVOKE EXECUTE ON FUNCTION public.validate_parcel_booking() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validate_parcel_booking() TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_booking(_parcel uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_p public.parcels;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO v_p FROM public.parcels WHERE id=_parcel FOR UPDATE;
 IF NOT FOUND OR (v_p.sender_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF v_p.status NOT IN ('booking_received','awaiting_agent') THEN RAISE EXCEPTION 'Only bookings not yet received by an agent can be cancelled'; END IF;
 UPDATE public.parcels SET status='cancelled',updated_at=now() WHERE id=_parcel RETURNING * INTO v_p;
 UPDATE public.payments SET status='failed' WHERE parcel_id=_parcel AND status='pending';
 INSERT INTO public.tracking_events(parcel_id,status,description,actor_id) VALUES(_parcel,'cancelled','Booking cancelled',auth.uid());
 PERFORM public.notify_parcel(v_p,'Booking cancelled','Parcel '||v_p.tracking_number||' was cancelled.');
 INSERT INTO public.audit_log(actor_id,action,entity,entity_id) VALUES(auth.uid(),'booking_cancelled','parcel',_parcel);
END $$;

CREATE OR REPLACE FUNCTION public.verify_pickup(_tracking text,_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_p public.parcels; v_c public.pickup_codes; v_agent uuid:=public.my_agent_id();
BEGIN
 IF auth.uid() IS NULL OR (v_agent IS NULL AND NOT public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Only agents can verify pickups'; END IF;
 IF _code IS NULL OR trim(_code) !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'Enter the six-digit pickup code'; END IF;
 SELECT * INTO v_p FROM public.parcels WHERE tracking_number=upper(trim(_tracking)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Tracking number not found'; END IF;
 IF NOT public.is_admin(auth.uid()) AND v_p.destination_agent_id IS DISTINCT FROM v_agent THEN RAISE EXCEPTION 'This parcel is not at your collection point'; END IF;
 IF v_p.status<>'ready_for_collection' THEN RAISE EXCEPTION 'Parcel is not ready for collection'; END IF;
 SELECT * INTO v_c FROM public.pickup_codes WHERE parcel_id=v_p.id FOR UPDATE;
 IF NOT FOUND OR v_c.used_at IS NOT NULL THEN RAISE EXCEPTION 'Pickup code is missing or already used'; END IF;
 IF v_c.attempts>=5 THEN RAISE EXCEPTION 'Too many wrong attempts. Contact Tsapo support.'; END IF;
 IF v_c.code<>trim(_code) THEN
 UPDATE public.pickup_codes SET attempts=attempts+1 WHERE parcel_id=v_p.id;
 INSERT INTO public.audit_log(actor_id,action,entity,entity_id) VALUES(auth.uid(),'pickup_code_failed','parcel',v_p.id);
 RETURN jsonb_build_object('ok',false,'message','Incorrect pickup code');
 END IF;
 UPDATE public.pickup_codes SET used_at=now() WHERE parcel_id=v_p.id;
 UPDATE public.parcels SET status='collected',updated_at=now() WHERE id=v_p.id RETURNING * INTO v_p;
 INSERT INTO public.tracking_events(parcel_id,status,description,actor_id,location) SELECT v_p.id,'collected','Parcel collected by recipient after code verification',auth.uid(),l.name FROM public.locations l WHERE l.id=v_p.destination_location_id;
 PERFORM public.notify_parcel(v_p,'Parcel collected','Parcel '||v_p.tracking_number||' has been collected.');
 INSERT INTO public.audit_log(actor_id,action,entity,entity_id) VALUES(auth.uid(),'parcel_collected','parcel',v_p.id);
 RETURN jsonb_build_object('ok',true,'message','Pickup verified. Hand over the parcel to '||v_p.recipient_name);
END $$;

CREATE OR REPLACE FUNCTION public.confirm_payment(_payment uuid,_reference text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pm public.payments;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO v_pm FROM public.payments WHERE id=_payment FOR UPDATE;
 IF NOT FOUND OR NOT (public.is_admin(auth.uid()) OR (v_pm.method='cash_at_agent' AND EXISTS(SELECT 1 FROM public.parcels p WHERE p.id=v_pm.parcel_id AND p.origin_agent_id=public.my_agent_id()))) THEN RAISE EXCEPTION 'Not authorised to verify payments'; END IF;
 IF v_pm.status<>'pending' THEN RAISE EXCEPTION 'Payment is no longer pending'; END IF;
 IF coalesce(trim(_reference),'')='' THEN RAISE EXCEPTION 'A payment reference or receipt number is required'; END IF;
 UPDATE public.payments SET status='confirmed',reference=trim(_reference),verified_by=auth.uid(),verified_at=now() WHERE id=_payment;
 INSERT INTO public.audit_log(actor_id,action,entity,entity_id,details) VALUES(auth.uid(),'payment_confirmed','payment',_payment,jsonb_build_object('reference',trim(_reference)));
END $$;

CREATE POLICY "parcel img shipment participants" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='parcel-images' AND EXISTS(SELECT 1 FROM public.parcels p WHERE p.image_path=storage.objects.name));
CREATE POLICY "parcel img upload image type" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'parcel-images' OR lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
