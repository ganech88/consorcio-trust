-- SOLO DEMO — poblar módulos restantes de Roca Golf (votaciones, tablón, calendario,
-- egresos/finanzas, paquetería, accesos). Aplicada a kldgbgxycmvywvvftuvi via MCP.
DO $$
DECLARE
  v_cid uuid := 'd1990519-76e8-4312-be36-3a931c90972b';
  v_admin uuid; v_own1 uuid; v_own2 uuid; v_ten1 uuid; v_poll uuid;
BEGIN
  SELECT id INTO v_admin FROM public.profiles WHERE email='admin.rocagolf@demo.consorciotrust.app';
  SELECT id INTO v_own1  FROM public.profiles WHERE email='propietario1@demo.consorciotrust.app';
  SELECT id INTO v_own2  FROM public.profiles WHERE email='propietario2@demo.consorciotrust.app';
  SELECT id INTO v_ten1  FROM public.profiles WHERE email='inquilino1@demo.consorciotrust.app';

  IF NOT EXISTS (SELECT 1 FROM public.polls WHERE consortium_id=v_cid) THEN
    INSERT INTO public.polls(title, description, options, ends_at, consortium_id, created_by)
      VALUES ('¿Aprobamos el recambio del portero eléctrico?',
              'Presupuesto de $450.000, financiado en 3 cuotas con el fondo de reserva.',
              '["Sí, aprobar","No","Abstención"]'::jsonb,
              now() + interval '7 days', v_cid, v_admin)
      RETURNING id INTO v_poll;
    INSERT INTO public.poll_votes(poll_id, user_id, option_index) VALUES
      (v_poll, v_own1, 0), (v_poll, v_own2, 0), (v_poll, v_ten1, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.board_posts WHERE consortium_id=v_cid) THEN
    INSERT INTO public.board_posts(consortium_id, user_id, title, body, category, created_at) VALUES
      (v_cid, v_own1, 'Vendo bicicleta rodado 26', 'Casi nueva, poco uso. Consultar por interno 1A.', 'Venta', now()-interval '2 days'),
      (v_cid, v_ten1, 'Busco cochera para alquilar', 'Necesito cochera en el edificio. Escribir al 2B.', 'Búsqueda', now()-interval '1 day');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.events WHERE consortium_id=v_cid) THEN
    INSERT INTO public.events(title, description, type, start_date, end_date, all_day, consortium_id, created_by) VALUES
      ('Asamblea ordinaria', 'Tratamiento de presupuesto anual y portero eléctrico.', 'reunion', '2026-06-30 20:00:00-03', '2026-06-30 22:00:00-03', false, v_cid, v_admin),
      ('Corte de agua programado', 'Mantenimiento de tanques, 9 a 13h.', 'corte', '2026-06-23 09:00:00-03', '2026-06-23 13:00:00-03', false, v_cid, v_admin);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.expenses_log WHERE consortium_id=v_cid) THEN
    INSERT INTO public.expenses_log(description, category, amount, date, provider, consortium_id, created_by) VALUES
      ('Limpieza mensual junio', 'Limpieza', 85000, '2026-06-03', 'Limpieza Brilla SA', v_cid, v_admin),
      ('Service trimestral ascensor', 'Mantenimiento', 120000, '2026-05-30', 'Ascensores Veloz', v_cid, v_admin),
      ('Reposición luminarias LED', 'Mantenimiento', 32000, '2026-06-08', 'Electricidad del Sur', v_cid, v_admin),
      ('Honorarios administración', 'Administración', 95000, '2026-06-01', 'Administración Roca', v_cid, v_admin);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.packages WHERE consortium_id=v_cid) THEN
    INSERT INTO public.packages(consortium_id, unit_user_id, logged_by, carrier, description, status, logged_at) VALUES
      (v_cid, v_ten1, v_admin, 'Correo Argentino', 'Sobre / encomienda', 'pending', now()-interval '6 hours'),
      (v_cid, v_own1, v_admin, 'Andreani', 'Caja mediana', 'collected', now()-interval '3 days');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.visitors WHERE consortium_id=v_cid) THEN
    INSERT INTO public.visitors(unit_id, user_id, name, doc_number, authorized_date, status, consortium_id) VALUES
      ('2B', v_ten1, 'Pedro Gómez', '28.555.111', current_date, 'active', v_cid);
  END IF;
END $$;
