alter table public.pacientes
add column if not exists tipo_sangre_rh text;

comment on column public.pacientes.tipo_sangre_rh is 'Grupo sanguineo y factor RH del paciente. Valores sugeridos: O+, O-, A+, A-, B+, B-, AB+, AB-.';