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

-- Demo technicians (fictional accounts, no Clerk identity attached)
insert into users (email, full_name, phone, role) values
  ('musa.ibrahim@demo.fixright.ng', 'Musa Ibrahim', '+234 800 000 0001', 'technician'),
  ('ibrahim.sule@demo.fixright.ng', 'Ibrahim Sule', '+234 800 000 0002', 'technician'),
  ('yusuf.ahmed@demo.fixright.ng', 'Yusuf Ahmed', '+234 800 000 0003', 'technician')
on conflict (email) do nothing;

insert into technician_profiles
  (user_id, bio, years_experience, verification_status, rating, completed_jobs, latitude, longitude, service_radius_km, available)
select u.id, v.bio, v.years, 'verified'::verification_status, v.rating, v.jobs, v.lat, v.lng, 12, true
from (values
  ('musa.ibrahim@demo.fixright.ng', 'AC & refrigeration technician serving Narayi and nearby areas.', 9, 4.8, 126, 10.4649, 7.4360),
  ('ibrahim.sule@demo.fixright.ng', 'Appliance & generator technician based in Barnawa.', 7, 4.7, 94, 10.4808, 7.4231),
  ('yusuf.ahmed@demo.fixright.ng', 'Electronics technician handling TVs, laptops and phones in Kakuri.', 11, 4.9, 181, 10.4756, 7.4096)
) as v(email, bio, years, rating, jobs, lat, lng)
join users u on u.email = v.email
on conflict (user_id) do nothing;

insert into technician_service_areas (technician_id, area_name, latitude, longitude, radius_km)
select tp.id, v.area, v.lat, v.lng, 12
from (values
  ('musa.ibrahim@demo.fixright.ng', 'Narayi', 10.4649, 7.4360),
  ('ibrahim.sule@demo.fixright.ng', 'Barnawa', 10.4808, 7.4231),
  ('yusuf.ahmed@demo.fixright.ng', 'Kakuri', 10.4756, 7.4096)
) as v(email, area, lat, lng)
join users u on u.email = v.email
join technician_profiles tp on tp.user_id = u.id
where not exists (
  select 1 from technician_service_areas a where a.technician_id = tp.id and a.area_name = v.area
);

insert into technician_services (technician_id, service_id)
select tp.id, s.id
from (values
  ('musa.ibrahim@demo.fixright.ng', 'Air Conditioner'),
  ('musa.ibrahim@demo.fixright.ng', 'Refrigerator'),
  ('ibrahim.sule@demo.fixright.ng', 'Air Conditioner'),
  ('ibrahim.sule@demo.fixright.ng', 'Generator'),
  ('ibrahim.sule@demo.fixright.ng', 'Washing Machine'),
  ('yusuf.ahmed@demo.fixright.ng', 'Television'),
  ('yusuf.ahmed@demo.fixright.ng', 'Laptop'),
  ('yusuf.ahmed@demo.fixright.ng', 'Phone')
) as v(email, service)
join users u on u.email = v.email
join technician_profiles tp on tp.user_id = u.id
join services s on s.name = v.service
on conflict (technician_id, service_id) do nothing;

-- Neighbouring areas each demo technician also covers (fictional coverage).
insert into technician_service_areas (technician_id, area_name, latitude, longitude, radius_km)
select tp.id, v.area, v.lat, v.lng, 8
from (values
  ('musa.ibrahim@demo.fixright.ng', 'Sabon Tasha', 10.4420, 7.4630),
  ('musa.ibrahim@demo.fixright.ng', 'Barnawa', 10.4808, 7.4231),
  ('ibrahim.sule@demo.fixright.ng', 'Narayi', 10.4649, 7.4360),
  ('ibrahim.sule@demo.fixright.ng', 'Kakuri', 10.4756, 7.4096),
  ('yusuf.ahmed@demo.fixright.ng', 'Barnawa', 10.4808, 7.4231),
  ('yusuf.ahmed@demo.fixright.ng', 'Narayi', 10.4649, 7.4360)
) as v(email, area, lat, lng)
join users u on u.email = v.email
join technician_profiles tp on tp.user_id = u.id
where not exists (
  select 1 from technician_service_areas a where a.technician_id = tp.id and a.area_name = v.area
);
