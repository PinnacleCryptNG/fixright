-- FixRight demo seed data (fictional). Idempotent.

insert into services (name, description, category, base_service_fee) values
  ('Air Conditioner', 'Split and window AC servicing, gas top-up and fault diagnosis.', 'Cooling', 1000),
  ('Refrigerator', 'Fridges and freezers: cooling faults, compressors, thermostats.', 'Cooling', 1000),
  ('Washing Machine', 'Automatic and semi-automatic washers: drainage, drums, controls.', 'Appliances', 1000),
  ('Generator', 'Small and medium generators: starting faults, servicing, wiring.', 'Power', 1000),
  ('Television', 'LED, LCD and smart TVs: display, sound and power faults.', 'Electronics', 1000),
  ('Laptop', 'Laptops: charging, screen, keyboard and software faults.', 'Electronics', 1000),
  ('Phone', 'Phones: screens, charging ports, batteries and software.', 'Electronics', 1000),
  ('Other', 'Something else that needs fixing? Describe it and we will match you.', 'General', 1000)
on conflict (name) do nothing;

-- Retired demo technicians (replaced by the multi-city set below).
delete from users where email in ('musa.ibrahim@demo.fixright.ng','ibrahim.sule@demo.fixright.ng','yusuf.ahmed@demo.fixright.ng')
  and not exists (select 1 from technician_profiles tp join appointments a on a.technician_id = tp.id where tp.user_id = users.id);

-- Demo technicians (fictional accounts, no Clerk identity attached)
insert into users (email, full_name, phone, role) values
  ('zainab.musa@demo.fixright.ng', 'Zainab Musa', '+234 800 000 0011', 'technician'),
  ('bashir.danjuma@demo.fixright.ng', 'Bashir Danjuma', '+234 800 000 0012', 'technician'),
  ('aisha.suleiman@demo.fixright.ng', 'Aisha Suleiman', '+234 800 000 0013', 'technician'),
  ('chinedu.okafor@demo.fixright.ng', 'Chinedu Okafor', '+234 800 000 0014', 'technician'),
  ('tobi.adeyemi@demo.fixright.ng', 'Tobi Adeyemi', '+234 800 000 0015', 'technician'),
  ('ifeoma.nwosu@demo.fixright.ng', 'Ifeoma Nwosu', '+234 800 000 0016', 'technician')
on conflict (email) do nothing;

insert into technician_profiles
  (user_id, bio, years_experience, verification_status, rating, completed_jobs, available, showcase_area)
select u.id, v.bio, v.years, 'verified'::verification_status, v.rating, v.jobs, true, v.area
from (values
  ('zainab.musa@demo.fixright.ng', 'AC & refrigeration technician.', 9, 4.9, 138, 'Chikun, Kaduna'),
  ('bashir.danjuma@demo.fixright.ng', 'Generator & washing machine technician.', 8, 4.8, 112, 'Kaduna South, Kaduna'),
  ('aisha.suleiman@demo.fixright.ng', 'AC & generator technician.', 10, 4.9, 156, 'Municipal Area Council, Abuja'),
  ('chinedu.okafor@demo.fixright.ng', 'Electronics technician: laptops, phones and TVs.', 7, 4.7, 97, 'Gwarinpa, Abuja'),
  ('tobi.adeyemi@demo.fixright.ng', 'Appliance & cooling technician.', 9, 4.8, 143, 'Ikeja, Lagos'),
  ('ifeoma.nwosu@demo.fixright.ng', 'Electronics technician: laptops, phones and TVs.', 11, 4.9, 174, 'Yaba, Lagos')
) as v(email, bio, years, rating, jobs, area)
join users u on u.email = v.email
on conflict (user_id) do update set showcase_area = excluded.showcase_area;

insert into technician_services (technician_id, service_id)
select tp.id, s.id
from (values
  ('zainab.musa@demo.fixright.ng', 'Air Conditioner'),
  ('zainab.musa@demo.fixright.ng', 'Refrigerator'),
  ('bashir.danjuma@demo.fixright.ng', 'Generator'),
  ('bashir.danjuma@demo.fixright.ng', 'Washing Machine'),
  ('aisha.suleiman@demo.fixright.ng', 'Air Conditioner'),
  ('aisha.suleiman@demo.fixright.ng', 'Generator'),
  ('chinedu.okafor@demo.fixright.ng', 'Laptop'),
  ('chinedu.okafor@demo.fixright.ng', 'Phone'),
  ('chinedu.okafor@demo.fixright.ng', 'Television'),
  ('tobi.adeyemi@demo.fixright.ng', 'Refrigerator'),
  ('tobi.adeyemi@demo.fixright.ng', 'Washing Machine'),
  ('tobi.adeyemi@demo.fixright.ng', 'Air Conditioner'),
  ('ifeoma.nwosu@demo.fixright.ng', 'Laptop'),
  ('ifeoma.nwosu@demo.fixright.ng', 'Phone'),
  ('ifeoma.nwosu@demo.fixright.ng', 'Television')
) as v(email, service)
join users u on u.email = v.email
join technician_profiles tp on tp.user_id = u.id
join services s on s.name = v.service
on conflict (technician_id, service_id) do nothing;

-- Coverage matches the displayed location (Gwarinpa is in Municipal; Yaba is in Lagos Mainland).
insert into technician_service_areas (technician_id, state, lga, covers_entire_state)
select tp.id, v.state, v.lga, false
from (values
  ('zainab.musa@demo.fixright.ng', 'Kaduna', 'Chikun'),
  ('bashir.danjuma@demo.fixright.ng', 'Kaduna', 'Kaduna South'),
  ('aisha.suleiman@demo.fixright.ng', 'Federal Capital Territory', 'Municipal'),
  ('chinedu.okafor@demo.fixright.ng', 'Federal Capital Territory', 'Municipal'),
  ('tobi.adeyemi@demo.fixright.ng', 'Lagos', 'Ikeja'),
  ('ifeoma.nwosu@demo.fixright.ng', 'Lagos', 'Lagos Mainland')
) as v(email, state, lga)
join users u on u.email = v.email
join technician_profiles tp on tp.user_id = u.id
on conflict do nothing;
