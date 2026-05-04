alter table if exists public.consultas_odontologicas
add column if not exists codigo_consulta text;

update public.consultas_odontologicas
set codigo_consulta = concat(
  'NEC-',
  case when tipo_consulta = 'ORTODONCIA' then 'O' else 'G' end,
  '-',
  to_char(coalesce(fecha, created_at, now()), 'YYMMDD'),
  '-',
  upper(right(replace(id::text, '-', ''), 4))
)
where codigo_consulta is null;

create unique index if not exists consultas_odontologicas_codigo_consulta_idx
on public.consultas_odontologicas (codigo_consulta);