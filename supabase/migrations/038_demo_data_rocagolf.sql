-- ============================================================
-- SOLO DEMO — Datos de ejemplo para Roca Golf.
-- Aplicada a kldgbgxycmvywvvftuvi via MCP. Depende de 037.
-- ============================================================
DO $$
DECLARE
  v_cid  uuid := 'd1990519-76e8-4312-be36-3a931c90972b';
  v_admin uuid; v_own1 uuid; v_own2 uuid; v_ten1 uuid;
  v_pmay uuid; v_pjun uuid;
  v_sup1 uuid; v_sup2 uuid;
  v_unit_own1 uuid; v_unit_ten1 uuid;
BEGIN
  SELECT id INTO v_admin FROM public.profiles WHERE email='admin.rocagolf@demo.consorciotrust.app';
  SELECT id INTO v_own1  FROM public.profiles WHERE email='propietario1@demo.consorciotrust.app';
  SELECT id INTO v_own2  FROM public.profiles WHERE email='propietario2@demo.consorciotrust.app';
  SELECT id INTO v_ten1  FROM public.profiles WHERE email='inquilino1@demo.consorciotrust.app';
  SELECT unit_id INTO v_unit_own1 FROM public.profiles WHERE id=v_own1;
  SELECT unit_id INTO v_unit_ten1 FROM public.profiles WHERE id=v_ten1;

  -- EXPENSAS: 2 periodos (mayo al dia, junio con deudores 2B y 3C)
  INSERT INTO public.expense_periods(consortium_id, period, total_amount, due_date, created_by)
    VALUES (v_cid,'2026-05',300000,'2026-05-10',v_admin) RETURNING id INTO v_pmay;
  INSERT INTO public.expense_periods(consortium_id, period, total_amount, due_date, created_by)
    VALUES (v_cid,'2026-06',320000,'2026-06-10',v_admin) RETURNING id INTO v_pjun;
  INSERT INTO public.expense_period_items(period_id, unit_id, user_id, amount, status, paid_at) VALUES
   (v_pmay,'1A',v_own1,100000,'paid', now()-interval '25 days'),
   (v_pmay,'2B',v_ten1,100000,'paid', now()-interval '23 days'),
   (v_pmay,'3C',v_own1,100000,'paid', now()-interval '24 days'),
   (v_pjun,'1A',v_own1,106667,'paid', now()-interval '2 days'),
   (v_pjun,'2B',v_ten1,106667,'pending', NULL),
   (v_pjun,'3C',v_own1,106667,'pending', NULL);

  -- RECLAMOS (open / pending / closed)
  INSERT INTO public.claims(consortium_id,user_id,title,description,status,priority,created_at,admin_note,responded_by,updated_at) VALUES
   (v_cid,v_ten1,'Pérdida de agua en baño','Hay una filtración debajo del lavatorio en la unidad 2B.','open','high', now()-interval '2 days', NULL, NULL, now()-interval '2 days'),
   (v_cid,v_own1,'Ruido en el ascensor','El ascensor hace un ruido fuerte al frenar en planta baja.','pending','medium', now()-interval '6 days','Se contactó al service, visita programada.', v_admin, now()-interval '1 day'),
   (v_cid,v_own2,'Luz quemada en cochera','Falta iluminación en la cochera del nivel -1.','closed','low', now()-interval '15 days','Se reemplazó el artefacto. Resuelto.', v_admin, now()-interval '10 days');

  -- COMUNICADOS (uno fijado/importante)
  INSERT INTO public.announcements(consortium_id,title,content,is_important,pinned,category,created_at) VALUES
   (v_cid,'Corte de agua programado','El martes de 9 a 13h se realizará mantenimiento de tanques. Habrá corte de agua.', true, true, 'mantenimiento', now()-interval '1 day'),
   (v_cid,'Asamblea ordinaria','Convocamos a asamblea el 30/06 a las 20h en el SUM. Temario en cartelera.', true, false, 'asamblea', now()-interval '3 days'),
   (v_cid,'Bienvenida a la nueva administración','Les damos la bienvenida. Ante cualquier duda, escriban por la app.', false, false, 'general', now()-interval '8 days');

  -- AMENITIES + RESERVAS
  INSERT INTO public.amenities(consortium_id,name,capacity,requires_approval) VALUES
   (v_cid,'SUM',40,true),(v_cid,'Parrilla',12,false);
  INSERT INTO public.reservations(user_id,consortium_id,unit_id,amenity_id,amenity_name,date,time_slot,status,created_at) VALUES
   (v_own1,v_cid,v_unit_own1,1,'SUM','2026-06-22','20:00 - 23:00','approved', now()-interval '2 days'),
   (v_ten1,v_cid,v_unit_ten1,2,'Parrilla','2026-06-20','13:00 - 16:00','pending', now()-interval '1 day');

  -- MULTAS (status validos: active/paid/cancelled/waived)
  INSERT INTO public.fines(consortium_id,unit_id,user_id,amount,reason,fine_date,period,status,applied_by,notes,created_at) VALUES
   (v_cid,'2B',v_ten1,15000,'Ruidos molestos fuera de horario','2026-06-05','2026-06','active', v_admin,'Vecinos reportaron ruido después de las 23h.', now()-interval '5 days'),
   (v_cid,'1A',v_own1, 8000,'Mascota sin correa en áreas comunes','2026-05-18','2026-05','paid', v_admin,'Multa abonada.', now()-interval '20 days');

  -- PROVEEDORES + ORDENES DE PAGO
  INSERT INTO public.suppliers(consortium_id,name,cuit,category,phone,email,active) VALUES
   (v_cid,'Limpieza Brilla SA','30-12345678-9','Limpieza','+54 11 4444-5555','contacto@brilla.com', true) RETURNING id INTO v_sup1;
  INSERT INTO public.suppliers(consortium_id,name,cuit,category,phone,email,active) VALUES
   (v_cid,'Ascensores Veloz','30-98765432-1','Ascensores','+54 11 4777-8888','soporte@veloz.com', true) RETURNING id INTO v_sup2;
  INSERT INTO public.payment_orders(consortium_id,supplier_id,description,amount,invoice_number,status,due_date,created_by,created_at) VALUES
   (v_cid,v_sup1,'Limpieza mensual - junio',85000,'A-0001-0042','pending','2026-06-15', v_admin, now()-interval '3 days');
  INSERT INTO public.payment_orders(consortium_id,supplier_id,description,amount,invoice_number,status,due_date,paid_at,paid_by,created_by,created_at) VALUES
   (v_cid,v_sup2,'Service trimestral de ascensor',120000,'B-0002-0107','paid','2026-05-30', now()-interval '18 days', v_admin, v_admin, now()-interval '20 days');
END $$;
