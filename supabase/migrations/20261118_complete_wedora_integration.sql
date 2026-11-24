-- Wedora Supabase integration migration
-- Additive changes required by the existing application. Review before running.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight TEXT,
  ADD COLUMN IF NOT EXISTS min_order INTEGER;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_location TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS courier_name TEXT;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS bank_details TEXT,
  ADD COLUMN IF NOT EXISTS default_advance_percent NUMERIC(5, 2) NOT NULL DEFAULT 50;

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  expense_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference_number TEXT,
  vendor TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_order ON public.expenses(order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

CREATE SEQUENCE IF NOT EXISTS public.expense_number_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.payment_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.assign_expense_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.expense_number IS NULL OR BTRIM(NEW.expense_number) = '' THEN
    NEW.expense_number := 'EXP-' || NEXTVAL('public.expense_number_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_expense_number ON public.expenses;
CREATE TRIGGER trg_assign_expense_number
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.assign_expense_number();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

GRANT USAGE, SELECT ON SEQUENCE public.expense_number_seq, public.payment_number_seq TO authenticated;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS helper must not inherit an unsafe caller-controlled search path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_employee()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'employee')
  );
$$;

-- Profiles are created for new Auth users as employees. Only an admin may
-- promote accounts or change their active status; uninvited sign-ups stay
-- without a profile and receive no access to business tables.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.invited_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, role, status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    'employee',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_active_employee() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_employee() TO authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "New users can create their employee profile" ON public.profiles;
CREATE POLICY "Users can view own profile and admins can view all"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can create customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated staff can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated staff can update customers" ON public.customers;
CREATE POLICY "Authenticated staff can view customers"
  ON public.customers FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Authenticated staff can create customers"
  ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_active_employee());
CREATE POLICY "Authenticated staff can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());
CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Staff can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated staff can view products" ON public.products;
CREATE POLICY "Authenticated staff can view products"
  ON public.products FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;
CREATE POLICY "Authenticated staff can view orders"
  ON public.orders FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Authenticated staff can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated staff can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Authenticated staff can view order items"
  ON public.order_items FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated staff can record payments" ON public.payments;
CREATE POLICY "Authenticated staff can view payments"
  ON public.payments FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Authenticated staff can record payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee() AND (recorded_by IS NULL OR recorded_by = auth.uid()));
CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Staff can append status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Authenticated staff can view status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Authenticated staff can append status history" ON public.order_status_history;
CREATE POLICY "Authenticated staff can view status history"
  ON public.order_status_history FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Authenticated staff can append status history"
  ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee() AND (changed_by IS NULL OR changed_by = auth.uid()));

DROP POLICY IF EXISTS "Staff can view delivery history" ON public.delivery_history;
DROP POLICY IF EXISTS "Staff can append delivery history" ON public.delivery_history;
DROP POLICY IF EXISTS "Authenticated staff can view delivery history" ON public.delivery_history;
DROP POLICY IF EXISTS "Authenticated staff can append delivery history" ON public.delivery_history;
CREATE POLICY "Authenticated staff can view delivery history"
  ON public.delivery_history FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Authenticated staff can append delivery history"
  ON public.delivery_history FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee() AND (updated_by IS NULL OR updated_by = auth.uid()));

DROP POLICY IF EXISTS "Staff can view settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.business_settings;
DROP POLICY IF EXISTS "Authenticated staff can view settings" ON public.business_settings;
CREATE POLICY "Authenticated staff can view settings"
  ON public.business_settings FOR SELECT TO authenticated USING (public.is_active_employee());
CREATE POLICY "Admins can update settings"
  ON public.business_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
CREATE POLICY "Admins can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.guard_order_financial_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin()
    AND COALESCE(current_setting('app.allow_order_payment_update', TRUE), 'false') <> 'true'
    AND ROW(
    NEW.order_number, NEW.customer_id, NEW.order_date, NEW.subtotal,
    NEW.additional_charges, NEW.discount, NEW.total_amount, NEW.total_paid,
    NEW.balance_due, NEW.payment_status, NEW.created_by
  ) IS DISTINCT FROM ROW(
    OLD.order_number, OLD.customer_id, OLD.order_date, OLD.subtotal,
    OLD.additional_charges, OLD.discount, OLD.total_amount, OLD.total_paid,
    OLD.balance_due, OLD.payment_status, OLD.created_by
  ) THEN
    RAISE EXCEPTION 'Only administrators can change order financials or ownership';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_financial_updates ON public.orders;
CREATE TRIGGER trg_guard_order_financial_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_financial_updates();

CREATE OR REPLACE FUNCTION public.recalculate_order_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target_order_id UUID;
  v_total_amount NUMERIC(10, 2);
  v_total_paid NUMERIC(10, 2);
  v_payment_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_order_id := OLD.order_id;
  ELSE
    target_order_id := NEW.order_id;
  END IF;

  SELECT o.total_amount INTO v_total_amount
  FROM public.orders o
  WHERE o.id = target_order_id;
  SELECT COALESCE(SUM(p.amount), 0) INTO v_total_paid
  FROM public.payments p
  WHERE p.order_id = target_order_id;

  IF v_total_paid >= v_total_amount AND v_total_amount > 0 THEN
    v_payment_status := 'Paid';
  ELSIF v_total_paid > 0 THEN
    v_payment_status := 'Partially Paid';
  ELSE
    v_payment_status := 'Unpaid';
  END IF;

  PERFORM set_config('app.allow_order_payment_update', 'true', TRUE);
  UPDATE public.orders
  SET total_paid = v_total_paid,
      balance_due = GREATEST(0, v_total_amount - v_total_paid),
      payment_status = v_payment_status,
      updated_at = NOW()
  WHERE id = target_order_id;
  PERFORM set_config('app.allow_order_payment_update', 'false', TRUE);

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_bundle(
  p_order JSONB,
  p_items JSONB,
  p_initial_payment JSONB DEFAULT NULL,
  p_status_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  created_order public.orders;
  item JSONB;
  item_subtotal NUMERIC(10, 2);
  order_subtotal NUMERIC(10, 2);
  order_charges NUMERIC(10, 2);
  order_discount NUMERIC(10, 2);
  order_total NUMERIC(10, 2);
  initial_amount NUMERIC(10, 2);
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'An active Wedora account is required to create orders';
  END IF;

  SELECT COALESCE(SUM((value ->> 'quantity')::INTEGER * (value ->> 'unit_price')::NUMERIC), 0)
  INTO order_subtotal
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB));
  order_charges := GREATEST(0, COALESCE((p_order ->> 'additional_charges')::NUMERIC, 0));
  order_discount := GREATEST(0, COALESCE((p_order ->> 'discount')::NUMERIC, 0));
  order_total := GREATEST(0, order_subtotal + order_charges - order_discount);
  initial_amount := GREATEST(0, COALESCE((p_initial_payment ->> 'amount')::NUMERIC, 0));
  IF initial_amount > order_total THEN
    RAISE EXCEPTION 'Advance payment cannot exceed the order total';
  END IF;

  INSERT INTO public.orders (
    order_number, customer_id, order_date, delivery_date, delivery_location,
    status, payment_status, subtotal, additional_charges, discount,
    total_amount, total_paid, balance_due, notes, created_by
  )
  VALUES (
    p_order ->> 'order_number',
    (p_order ->> 'customer_id')::UUID,
    COALESCE((p_order ->> 'order_date')::DATE, CURRENT_DATE),
    (p_order ->> 'delivery_date')::DATE,
    NULLIF(p_order ->> 'delivery_location', ''),
    COALESCE(p_order ->> 'status', 'New'),
    COALESCE(p_order ->> 'payment_status', 'Unpaid'),
    order_subtotal,
    order_charges,
    order_discount,
    order_total,
    0,
    order_total,
    NULLIF(p_order ->> 'notes', ''),
    auth.uid()
  )
  RETURNING * INTO created_order;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB))
  LOOP
    item_subtotal := (item ->> 'quantity')::INTEGER * (item ->> 'unit_price')::NUMERIC;
    INSERT INTO public.order_items (
      order_id, product_id, product_name, size, quantity, unit_price, subtotal,
      customization_details, special_instructions, image_url
    )
    VALUES (
      created_order.id,
      NULLIF(item ->> 'product_id', '')::UUID,
      item ->> 'product_name',
      COALESCE(NULLIF(item ->> 'size', ''), 'Standard'),
      (item ->> 'quantity')::INTEGER,
      (item ->> 'unit_price')::NUMERIC,
      item_subtotal,
      NULLIF(item ->> 'customization_details', ''),
      NULLIF(item ->> 'special_instructions', ''),
      NULLIF(item ->> 'image_url', '')
    );
  END LOOP;

  IF p_initial_payment IS NOT NULL AND COALESCE((p_initial_payment ->> 'amount')::NUMERIC, 0) > 0 THEN
    INSERT INTO public.payments (
      payment_number, order_id, amount, payment_method, payment_reference, notes, recorded_by
    )
    VALUES (
      'PAY-' || TO_CHAR(CLOCK_TIMESTAMP(), 'YYYYMMDDHH24MISSMS') || '-' || NEXTVAL('public.payment_number_seq'),
      created_order.id,
      (p_initial_payment ->> 'amount')::NUMERIC,
      COALESCE(p_initial_payment ->> 'payment_method', 'Cash'),
      NULLIF(p_initial_payment ->> 'payment_reference', ''),
      NULLIF(p_initial_payment ->> 'notes', ''),
      auth.uid()
    );
  END IF;

  INSERT INTO public.order_status_history (
    order_id, previous_status, new_status, notes, changed_by
  )
  VALUES (
    created_order.id, NULL, created_order.status, p_status_notes,
    auth.uid()
  );

  SELECT * INTO created_order FROM public.orders WHERE id = created_order.id;
  RETURN TO_JSONB(created_order);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_bundle(JSONB, JSONB, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_bundle(JSONB, JSONB, JSONB, TEXT) TO authenticated;
