-- SOLO DEMO — resumen de gastos de Roca Golf (Dashboard "Destino de tus Fondos").
DO $$
DECLARE
  v_cid uuid := 'd1990519-76e8-4312-be36-3a931c90972b';
  v_sum uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.expenses_summary WHERE consortium_id=v_cid AND period='2026-06-01') THEN
    INSERT INTO public.expenses_summary(id, consortium_id, period, total_amount, status, due_date)
      VALUES (v_sum, v_cid, '2026-06-01', 320000, 'open', '2026-06-10');
    INSERT INTO public.expense_items(summary_id, category, description, amount) VALUES
      (v_sum,'Limpieza','Servicio de limpieza mensual y mantenimiento de SUM', 95000),
      (v_sum,'Mantenimiento','Service de ascensor, bombas y luminarias', 140000),
      (v_sum,'Seguridad','Vigilancia y monitoreo 24h', 85000);
  END IF;
END $$;
