-- Rivendel · añade la categoría Pescado a los hogares que no la tienen
-- y la coloca después de Carne.
update categories set sort = sort + 1 where sort >= 4 and sort < 99 and name <> 'Pescado';
insert into categories (household_id, name, sort, color)
select h.id, 'Pescado', 4, 'sea' from households h
where not exists (select 1 from categories c where c.household_id = h.id and lower(c.name) = 'pescado');
