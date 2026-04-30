-- BBAS Seed Data
-- Authorities (4) — Development Authorities of Bangladesh
-- NOTE: test users are NOT created here; they must be created via Supabase Auth.

insert into public.authorities (code, name_en, name_bn, jurisdiction_en, jurisdiction_bn)
values
  (
    'RAJUK',
    'Rajdhani Unnayan Kartripakkha',
    'রাজধানী উন্নয়ন কর্তৃপক্ষ',
    'Greater Dhaka Metropolitan Area, including Dhaka, Narayanganj, Gazipur, and parts of Munshiganj',
    'বৃহত্তর ঢাকা মহানগর এলাকা — ঢাকা, নারায়ণগঞ্জ, গাজীপুর এবং মুন্সিগঞ্জের অংশবিশেষ সহ'
  ),
  (
    'CDA',
    'Chattogram Development Authority',
    'চট্টগ্রাম উন্নয়ন কর্তৃপক্ষ',
    'Chattogram Metropolitan Area and surrounding areas',
    'চট্টগ্রাম মহানগর এলাকা এবং আশেপাশের এলাকা'
  ),
  (
    'KDA',
    'Khulna Development Authority',
    'খুলনা উন্নয়ন কর্তৃপক্ষ',
    'Khulna Metropolitan Area and surrounding municipalities',
    'খুলনা মহানগর এলাকা এবং সংলগ্ন পৌরসভা'
  ),
  (
    'RDA',
    'Rajshahi Development Authority',
    'রাজশাহী উন্নয়ন কর্তৃপক্ষ',
    'Rajshahi Metropolitan Area and surrounding upazilas',
    'রাজশাহী মহানগর এলাকা এবং সংলগ্ন উপজেলা'
  )
on conflict (code) do update set
  name_en = excluded.name_en,
  name_bn = excluded.name_bn,
  jurisdiction_en = excluded.jurisdiction_en,
  jurisdiction_bn = excluded.jurisdiction_bn;
