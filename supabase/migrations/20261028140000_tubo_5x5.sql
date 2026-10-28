-- Porta de correr 1 folha precisa do perfil TUBO 5X5.
-- Catálogos já gravados (inclusive Forte Vidros) não recebem linhas novas do seed.

update public.catalog as c
set
  payload = jsonb_set(
    c.payload,
    '{aluminios}',
    coalesce(c.payload->'aluminios', '[]'::jsonb) || jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id',
          (
            select coalesce(max((item->>'id')::int), 0) + 1
            from jsonb_array_elements(coalesce(c.payload->'aluminios', '[]'::jsonb)) as item
          ),
          'codigo', 'TUBO 5X5',
          'descricao', 'TUBO 5 X 5 CM',
          'valorBarra', 210,
          'metragemBarra', 6,
          'valorMetro', 35.00,
          'ativo', true,
          'exemplo',
          case
            when c.payload#>>'{config,exemplo}' = 'true' then to_jsonb(true)
            else null
          end
        )
      )
    )
  ),
  updated_at = now()
where not exists (
  select 1
  from jsonb_array_elements(coalesce(c.payload->'aluminios', '[]'::jsonb)) as item
  where item->>'codigo' = 'TUBO 5X5'
);
