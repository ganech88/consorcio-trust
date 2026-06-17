-- SOLO DEMO — expensas (tabla `expenses`) para Roca Golf, usadas por la vista Expensas.
DO $$
DECLARE v_cid uuid := 'd1990519-76e8-4312-be36-3a931c90972b'; v_admin uuid; v_own1 uuid;
        v_exp_jun uuid; v_exp_may uuid;
BEGIN
  SELECT id INTO v_admin FROM public.profiles WHERE email='admin.rocagolf@demo.consorciotrust.app';
  SELECT id INTO v_own1  FROM public.profiles WHERE email='propietario1@demo.consorciotrust.app';

  IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE consortium_id=v_cid AND period='2026-06') THEN
    INSERT INTO public.expenses(consortium_id, title, description, amount, period, due_date, status, created_by)
      VALUES (v_cid,'Expensas ordinarias - Junio 2026','Gastos comunes del mes (limpieza, mantenimiento, seguridad)', 320000, '2026-06', '2026-06-10', 'pending', v_admin)
      RETURNING id INTO v_exp_jun;
    INSERT INTO public.expenses(consortium_id, title, description, amount, period, due_date, status, created_by)
      VALUES (v_cid,'Expensas ordinarias - Mayo 2026','Gastos comunes del mes', 300000, '2026-05', '2026-05-10', 'paid', v_admin)
      RETURNING id INTO v_exp_may;

    INSERT INTO public.expense_payments(expense_id, user_id, amount, paid_at, status, notes)
      VALUES (v_exp_may, v_own1, 300000, now()-interval '20 days', 'approved', 'Pago por transferencia');
  END IF;
END $$;
