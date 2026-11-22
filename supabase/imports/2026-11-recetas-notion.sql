-- Rivendel · importación de recetas desde Notion (44 recetas)
-- Se puede ejecutar más de una vez: no duplica recetas ni productos.
do $$
declare h uuid;
begin
  select id into h from households order by created_at limit 1;
  if h is null then raise exception 'No hay hogar'; end if;

  -- Productos que faltan en el catálogo
  insert into products(household_id, name, category_id, is_staple)
  select h, v.name, (select id from categories c where c.household_id = h and c.name = v.cat), v.staple
  from (values
    ('Alitas de pollo', 'Carne', false),
    ('Aceite', 'Despensa', true),
    ('Pimentón', 'Despensa', true),
    ('Ajo en polvo', 'Despensa', true),
    ('Cebolla en polvo', 'Despensa', true),
    ('Pimienta', 'Despensa', true),
    ('Tomillo', 'Despensa', true),
    ('Sal', 'Despensa', true),
    ('Arroz basmati', 'Despensa', false),
    ('Cúrcuma', 'Despensa', true),
    ('Comino', 'Despensa', true),
    ('Canela', 'Despensa', true),
    ('Caldo de verduras', 'Despensa', false),
    ('Bacalao', 'Pescado', false),
    ('Cebolla', 'Fruta y verdura', false),
    ('Pimiento rojo', 'Fruta y verdura', false),
    ('Ajo', 'Fruta y verdura', false),
    ('Tomate triturado', 'Despensa', false),
    ('Pimiento choricero', 'Despensa', false),
    ('Laurel', 'Despensa', true),
    ('Frutos rojos', 'Fruta y verdura', false),
    ('Leche', 'Lácteos', false),
    ('Plátanos', 'Fruta y verdura', false),
    ('Yogur', 'Lácteos', false),
    ('Boniato', 'Fruta y verdura', false),
    ('Carne picada de pavo', 'Carne', false),
    ('Carpaccio de ternera', 'Carne', false),
    ('Rúcula', 'Fruta y verdura', false),
    ('Parmesano', 'Lácteos', false),
    ('Limón', 'Fruta y verdura', false),
    ('Judías blancas cocidas', 'Despensa', false),
    ('Orégano', 'Despensa', true),
    ('Zanahoria', 'Fruta y verdura', false),
    ('Lentejas rojas', 'Despensa', false),
    ('Copos de avena', 'Despensa', false),
    ('Queso batido 0%', 'Lácteos', false),
    ('Huevos', 'Lácteos', false),
    ('Chocolate negro', 'Despensa', false),
    ('Quinoa inflada', 'Despensa', false),
    ('Frutos secos', 'Despensa', false),
    ('Sardinas en lata', 'Pescado', false),
    ('Tomate', 'Fruta y verdura', false),
    ('Cebolla morada', 'Fruta y verdura', false),
    ('Perejil', 'Fruta y verdura', false),
    ('Vinagre', 'Despensa', true),
    ('Garbanzos cocidos', 'Despensa', false),
    ('Salmón ahumado', 'Pescado', false),
    ('Espinacas', 'Fruta y verdura', false),
    ('Manzana', 'Fruta y verdura', false),
    ('Nueces', 'Despensa', false),
    ('Patata', 'Fruta y verdura', false),
    ('Mejillones en escabeche', 'Pescado', false),
    ('Bonito en conserva', 'Pescado', false),
    ('Tomates cherry', 'Fruta y verdura', false),
    ('Ensaladas', 'Fruta y verdura', false),
    ('Pepino', 'Fruta y verdura', false),
    ('Pollo', 'Carne', false),
    ('Pimiento verde', 'Fruta y verdura', false),
    ('Tortillas de garbanzos', 'Panadería', false),
    ('Lima', 'Fruta y verdura', false),
    ('Aguacate', 'Fruta y verdura', false),
    ('Pechuga de pavo', 'Carne', false),
    ('Cacao puro', 'Despensa', false),
    ('Edulcorante', 'Despensa', true),
    ('Arándanos', 'Fruta y verdura', false),
    ('Levadura química', 'Despensa', true),
    ('Gambas', 'Pescado', false),
    ('Guisantes', 'Fruta y verdura', false),
    ('Salsa de soja', 'Despensa', false),
    ('Aceite de sésamo', 'Despensa', false),
    ('Jamón serrano', 'Carne', false),
    ('Calabacín', 'Fruta y verdura', false),
    ('Fiambre de pavo', 'Carne', false),
    ('Queso', 'Lácteos', false),
    ('Champiñones', 'Fruta y verdura', false),
    ('Granola', 'Despensa', false),
    ('Miel', 'Despensa', false),
    ('Pasta de lentejas', 'Despensa', false),
    ('Guindilla', 'Despensa', true),
    ('Queso feta', 'Lácteos', false),
    ('Jalapeños', 'Despensa', false),
    ('Cilantro', 'Fruta y verdura', false),
    ('Atún en lata', 'Pescado', false),
    ('Tomate frito', 'Despensa', false),
    ('Mozzarella rallada', 'Lácteos', false),
    ('Salmón', 'Pescado', false),
    ('Edamame', 'Despensa', false),
    ('Semillas de sésamo', 'Despensa', false),
    ('Mostaza Dijon', 'Despensa', false),
    ('Romero', 'Despensa', true),
    ('Caldo de pollo', 'Despensa', false),
    ('Maicena', 'Despensa', true),
    ('Solomillo de ternera', 'Carne', false),
    ('Setas', 'Fruta y verdura', false),
    ('Pan', 'Panadería', false),
    ('Pimientos asados', 'Despensa', false),
    ('Queso fresco', 'Lácteos', false),
    ('Tortillas de espinacas', 'Panadería', false),
    ('Queso cottage', 'Lácteos', false)
  ) as v(name, cat, staple)
  where not exists (select 1 from products p where p.household_id = h and lower(p.name) = lower(v.name));

  -- Recetas
  create temp table _imp(id uuid, name text, body text, tags text[]) on commit drop;
  insert into _imp values
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9', 'Alitas de pollo al horno con especias', 'Importada de Notion.

1. Precalienta el horno a 200 °C y prepara una bandeja con papel de horno o una rejilla.
2. En un bol, mezcla el aceite con el pimentón, el ajo en polvo, la cebolla en polvo, el tomillo, sal, pimienta y cayena. Añade las alitas y remueve para cubrirlas.
3. Dispón las alitas en una sola capa.
4. Hornea 35-40 minutos, dándoles la vuelta a mitad.
5. Opcional: glasea en los últimos 10 minutos con 2 cucharadas de soja, 1 de miel y un poco de limón.', array['comida','cena']::text[]),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387', 'Arroz basmati especiado', '⏱ 30 min · Importada de Notion.

1. Enjuaga el arroz bajo agua fría hasta que salga clara.
2. Calienta el aceite y sofríe las especias 30 segundos.
3. Añade el arroz escurrido y rehógalo 1 minuto.
4. Añade el agua o caldo y sal. Lleva a ebullición.
5. Baja al mínimo, tapa y cocina 12 minutos.
6. Reposa 5 minutos tapado.', array['desayuno']::text[]),
    ('5110a83d-c2de-4728-93f9-c2be6976200c', 'Bacalao a la riojana', '⏱ 20 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Pocha a fuego lento la cebolla en juliana y el ajo laminado 15 min.
2. Añade el pimiento rojo en tiras y cocina 10 min.
3. Incorpora el tomate, la carne de choricero y el laurel; 10-15 min hasta que espese. Tritura si la quieres fina.
4. Pon los lomos de bacalao sobre la salsa (piel arriba), tapa y cocina 6-8 min a fuego suave.
5. Sirve con la salsa por encima.', array['comida','cena']::text[]),
    ('478029c6-f9d6-418c-9a91-7441cf30d927', 'Batido de frutos rojos congelados', '⏱ 5 min · Importada de Notion.

1. Pon los frutos rojos congelados en la batidora.
2. Añade la leche o bebida vegetal y, si quieres, proteína o medio plátano.
3. Tritura 30-45 segundos hasta que quede cremoso.
4. Si queda espeso, añade más leche.', array['desayuno','rapida']::text[]),
    ('fb3169db-9e67-468c-af98-536660f05631', 'Batido de plátano', '⏱ 5 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Pela y trocea los plátanos (si están congelados, mejor textura).
2. Tritura todo en la batidora hasta que quede cremoso.
3. Sirve al momento.', array['desayuno','rapida']::text[]),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e', 'Boniato relleno de picadillo de pavo', '⏱ 50 min · Importada de Notion.

1. Precalienta el horno a 200 °C. Pincha el boniato y hornéalo 40-45 minutos.
2. Pica cebolla, ajo y pimiento y sofríelos 4-5 minutos.
3. Añade el pavo y dóralo.
4. Incorpora tomate, pimentón, comino, sal y pimienta; 8-10 minutos a fuego bajo.
5. Abre el boniato por la mitad y rellénalo. Opcional: queso rallado y gratinar 3-4 minutos.', array['comida','cena']::text[]),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce', 'Carpaccio de ternera con rúcula', '⏱ 5 min · Importada de Notion.

1. Saca el carpaccio de la nevera 5 minutos antes.
2. Extiende las lonchas en un plato.
3. Pon la rúcula encima y reparte el parmesano.
4. Aliña con aceite, zumo de limón, sal en escamas y pimienta.
5. Sirve al momento.', array['cena','rapida']::text[]),
    ('6f5c3477-db59-48e9-885c-1f082653e516', 'Crema de tomate y judías blancas', '⏱ 15 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Sofríe la cebolla y el ajo picados en aceite 5 min.
2. Añade el tomate y el orégano; cocina 5 min.
3. Agrega las judías escurridas y el caldo; hierve 10 min.
4. Tritura hasta que quede fina, ajusta sal y pimienta y sirve con un hilo de aceite.', array['comida','cena','rapida']::text[]),
    ('a8978503-e613-4880-a57f-1d61b3a91179', 'Crema de zanahoria y lentejas rojas', '⏱ 20 min · Importada de Notion.

1. Pela y trocea las zanahorias; pica cebolla y ajo.
2. Sofríe cebolla y ajo 3-4 minutos.
3. Añade comino y cúrcuma 30 segundos.
4. Incorpora zanahorias y lentejas enjuagadas.
5. Cubre con el caldo y cuece 15-18 minutos.
6. Tritura hasta que quede fina y ajusta de sal.', array['comida','cena','batch']::text[]),
    ('6d2a1afe-69d5-4f72-9cd9-2d84122efca8', 'Crepes de queso 0% y avena', '⏱ 15 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Tritura avena, queso batido, huevos, leche y sal hasta tener una masa líquida.
2. Deja reposar 5-10 min.
3. Unta una sartén antiadherente con unas gotas de aceite a fuego medio.
4. Vierte un cazo de masa, extiéndela y cocina 1-2 min por lado.
5. Rellena al gusto (fruta y crema de cacahuete, o salado con pavo y queso).', array['desayuno','rapida']::text[]),
    ('4ad1ec2e-20d6-4f87-93df-51250096e7ff', 'Crocante de chocolate negro y quinoa inflada', '⏱ 35 min · Importada de Notion.

1. Funde el chocolate al baño maría o en el microondas a intervalos de 30 segundos.
2. Mezcla con la quinoa inflada y los frutos secos troceados.
3. Extiende sobre papel de horno en una capa de unos 5 mm.
4. Espolvorea sal en escamas.
5. Enfría 25-30 minutos en la nevera y rompe en trozos.', array['desayuno']::text[]),
    ('b57cb05b-0cab-4313-8a28-62522d994c33', 'Ensalada de alubias y sardinillas', '⏱ 10 min · Importada de Notion.

1. Escurre y enjuaga las alubias.
2. Corta el tomate en dados y la cebolla en juliana fina.
3. Mezcla alubias, tomate y cebolla.
4. Añade las sardinillas escurridas por encima.
5. Aliña con aceite, vinagre, sal y pimienta y espolvorea perejil.', array['comida','cena','rapida']::text[]),
    ('422704ec-b644-4fab-8999-dd469a11c447', 'Ensalada de garbanzos, salmón, espinacas, manzana y nueces', '⏱ 10 min · Importada de Notion.

1. Escurre y enjuaga los garbanzos.
2. Corta el salmón ahumado en tiras.
3. Pela la manzana, córtala en dados y rocíala con limón.
4. Mezcla espinacas, garbanzos, manzana y nueces troceadas.
5. Aliña con aceite, limón, sal y pimienta.
6. Pon el salmón por encima y sirve.', array['comida','cena','rapida']::text[]),
    ('63269958-3155-419f-84d6-d73aec8ba038', 'Ensalada de patata, bonito y mejillones en escabeche', '⏱ 10 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Cuece las patatas con piel 20-25 min (o al microondas) y el huevo 10 min. Enfría.
2. Pela y trocea las patatas; pica la cebolla y corta los cherry.
3. Mezcla patata, cebolla, cherry, bonito desmigado y huevo picado.
4. Añade los mejillones y aliña con parte de su escabeche, aceite y sal.', array['comida','cena','rapida']::text[]),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694', 'Ensalada Sardinesar', '⏱ 10 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Lava y corta la ensalada, el tomate, el pepino, el pimiento y la cebolla.
2. Coloca las verduras en una fuente y pon las sardinas escurridas por encima.
3. Aliña con aceite, vinagre y sal al momento de servir.', array['comida','cena','rapida']::text[]),
    ('7adb94f0-e235-4fd5-85fe-51a4055139a2', 'Ensalada verde', '⏱ 5 min · Importada de Notion.

1. Lava y seca las hojas.
2. Corta el pepino en rodajas finas y los cherry por la mitad.
3. Junta todo en un bol.
4. Aliña con aceite, vinagre, sal y pimienta.
Opcional: aguacate, sésamo o cebolla roja.', array['desayuno','rapida']::text[]),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e', 'Fajitas de pollo con tortillas de garbanzos', '⏱ 30 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Corta el pollo, los pimientos y la cebolla en tiras.
2. Saltea el pollo en aceite a fuego fuerte 4-5 min con comino, pimentón y sal; reserva.
3. En la misma sartén saltea las verduras 5-6 min.
4. Junta pollo y verduras y riega con zumo de lima.
5. Calienta las tortillas de garbanzos, rellena y añade aguacate en láminas.', array['comida','cena']::text[]),
    ('a4affaff-fb68-4439-99ac-af4711309205', 'Fiambre de pavo casero', '⏱ 100 min · Importada de Notion.

1. Mezcla las especias con la sal.
2. Unta la pechuga con aceite y cúbrela con las especias. Deja macerar 1 hora en la nevera.
3. Envuélvela en papel vegetal tipo papillote.
4. Hornea a 185 °C, calor arriba y abajo, 40 minutos.
5. Deja enfriar antes de cortar. Aguanta 7 días en la nevera; se puede congelar en raciones.', array['desayuno','batch']::text[]),
    ('007638e4-4c8b-4123-b953-f688fa7919d5', 'Gachas horneadas con chocolate y arándanos', '⏱ 25 min · Importada de Notion.

1. Precalienta el horno a 180 °C.
2. Mezcla avena, cacao, levadura, sal y edulcorante.
3. Añade el huevo y la leche y mezcla bien.
4. Incorpora la mitad de los arándanos.
5. Vierte en un molde individual y pon el resto de arándanos encima.
6. Hornea 20-22 minutos y deja templar antes de desmoldar.', array['desayuno']::text[]),
    ('ebc73fe6-a80a-48b2-a496-517844f31dcc', 'Galletas de 3 ingredientes', '⏱ 25 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Precalienta el horno a 180 °C.
2. Aplasta los plátanos con un tenedor hasta hacer puré.
3. Mezcla con la avena y el chocolate picado.
4. Forma bolitas, aplánalas sobre papel de horno.
5. Hornea 15-18 min hasta que doren. Deja enfriar.', array['desayuno']::text[]),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0', 'Gambas salteadas con arroz tres delicias', '⏱ 30 min · Importada de Notion.

1. Cuece el arroz con antelación y déjalo enfriar.
2. Saltea la zanahoria en daditos 2-3 minutos.
3. Añade las gambas hasta que estén rosadas y reserva.
4. Saltea el arroz frío a fuego muy alto 2 minutos.
5. Haz un hueco, casca el huevo y revuélvelo con el arroz.
6. Reincorpora gambas, zanahoria y guisantes.
7. Añade soja y aceite de sésamo, 1 minuto más y sirve.', array['comida','cena']::text[]),
    ('62927bf8-8ee0-4482-9040-42f741c802e5', 'Guisantes con jamón y huevo', '⏱ 20 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Cuece los guisantes 4-5 min en agua con sal y escurre.
2. Sofríe la cebolla y el ajo picados en aceite 4 min.
3. Añade el jamón 1 min y luego los guisantes; saltea 2-3 min.
4. Haz huecos y casca los huevos encima; tapa y cocina hasta que cuaje la clara (3-4 min).', array['comida','cena']::text[]),
    ('0ff0977e-f3f3-411e-8e35-5da190f37daa', 'Huevos revueltos con taquitos de jamón ibérico', '⏱ 10 min · Importada de Notion.

1. Bate los huevos con sal y pimienta.
2. Calienta la sartén a fuego medio-bajo con un poco de aceite.
3. Vierte los huevos y remueve sin parar para que queden cremosos.
4. Antes de que cuajen del todo, añade el jamón.
5. Retira cuando aún estén jugosos y sirve.', array['cena','rapida']::text[]),
    ('8e839a5e-9be6-4994-9a40-ea21b404baee', 'Lasaña de huevo y calabacín', 'Importada de Notion.

', array['comida','cena','batch']::text[]),
    ('9c491212-bf30-43cf-aad9-54e105bf3cce', 'Mug cake de chocolate', '⏱ 5 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. En una taza grande aplasta el plátano.
2. Añade el huevo, la leche, la avena (mejor molida), el cacao y la levadura; mezcla sin grumos.
3. Microondas a máxima potencia 1:30-2 min.
4. Deja reposar 1 min antes de comer.', array['desayuno','rapida']::text[]),
    ('7eff40ad-a4b2-415a-ae5d-c808480cd130', 'Parfait de queso batido y frutos rojos', '⏱ 5 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. En un vaso alterna capas de queso batido, frutos rojos y granola.
2. Termina con frutos rojos y un hilo de miel.
3. Sirve al momento para que la granola quede crujiente.', array['desayuno','rapida']::text[]),
    ('e1657292-8b34-415d-a930-ad1f55516500', 'Pasta de legumbres con boloñesa de pavo express', '⏱ 30 min · Importada de Notion.

1. Cuece la pasta según el envase y escurre.
2. Pica cebolla y ajo y sofríe 3 minutos.
3. Añade el pavo y cocina hasta que esté dorado y suelto (4-5 min).
4. Incorpora tomate, orégano, sal y pimienta; 8-10 minutos a fuego medio-bajo.
5. Mezcla con la pasta y sirve.', array['comida','cena']::text[]),
    ('6562161e-6a0b-477c-97d8-989db57c3abd', 'Pasta de legumbres con salsa de bacalao', '⏱ 10 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Cuece la pasta según el envase.
2. Mientras, sofríe ajo laminado, cebolla picada y guindilla en aceite 3 min.
3. Añade el tomate y cocina 3-4 min.
4. Incorpora las migas de bacalao y cocina 2-3 min a fuego suave.
5. Mezcla con la pasta escurrida y termina con perejil.', array['comida','cena','rapida']::text[]),
    ('549a0614-d94d-4769-9fca-9163dd4981d3', 'Patatas cocidas al microondas', '⏱ 7 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Lava bien las patatas y pínchalas varias veces con un tenedor.
2. Ponlas en un plato apto, tapadas con film perforado o tapa de microondas.
3. Microondas a máxima potencia 6-8 min, girándolas a mitad. Comprueba con un cuchillo.
4. Abre, aliña con aceite, sal y pimentón.', array['desayuno','rapida']::text[]),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413', 'Pavo a la plancha con hash de boniato y feta', '⏱ 20 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Pela el boniato y córtalo en dados pequeños.
2. Saltéalo en aceite con la cebolla picada, tapado, 10-12 min a fuego medio, removiendo, hasta que esté tierno y dorado. Sazona con pimentón, sal y pimienta.
3. Mientras, haz el pavo a la plancha 3-4 min por lado.
4. Sirve el hash con el feta desmigado y perejil, y el pavo al lado.', array['comida','cena']::text[]),
    ('7faba66b-160a-47f9-beb2-4dc892a71eef', 'Pico de gallo', '⏱ 10 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Pica en dados pequeños el tomate (sin semillas) y la cebolla.
2. Pica fino el jalapeño (sin semillas si no quieres picante) y el cilantro.
3. Mezcla todo con el zumo de lima y sal.
4. Deja reposar 10 min en la nevera antes de servir.', array['desayuno','rapida']::text[]),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb', 'Pizza proteica de base de atún', '⏱ 20 min · Importada de Notion.

1. Precalienta el horno a 200 °C.
2. Escurre muy bien el atún (clave para que la base quede compacta).
3. Mezcla el atún con los huevos, orégano, sal y pimienta.
4. Extiende la mezcla sobre papel de horno en un círculo de ~1 cm.
5. Hornea la base 10 min hasta que esté firme.
6. Añade tomate, queso y toppings (champiñones, pimiento, aceitunas, cebolla...).
7. Hornea 5-7 min más hasta que el queso se funda.
8. Reposa 2 min y sirve.', array['comida','cena']::text[]),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da', 'Poke bowl de restos de salmón y verduras', '⏱ 10 min · Importada de Notion.

1. Usa arroz basmati cocido y frío (ideal del día anterior).
2. Desmenuza el salmón en trozos medianos.
3. Pon el arroz de base en un bol.
4. Coloca encima salmón, pepino en rodajas, zanahoria rallada y edamame por secciones.
5. Mezcla soja y aceite de sésamo y viértelo por encima.
6. Espolvorea sésamo y sirve frío.
Opcional: aguacate, alga nori, sriracha.', array['comida','cena','rapida']::text[]),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4', 'Pollo a la miel y mostaza con batata', '⏱ 20 min · Importada de Notion.

1. Pela y trocea las batatas; hiérvelas 15-20 min hasta que estén tiernas. Escurre y machaca con un chorrito de aceite, sal y pimienta.
2. Mezcla mostaza, miel, aceite, tomillo, sal y pimienta y unta el pollo.
3. Cocina el pollo en sartén a fuego medio 6-8 min por lado.
4. Sirve el pollo sobre el puré de batata. Acompaña con ensalada verde.', array['comida','cena']::text[]),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36', 'Pollo con salsa rápida de limón y romero', '⏱ 15 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Filetea las pechugas, salpimienta y dóralas en aceite 3-4 min por lado. Reserva.
2. En la misma sartén sofríe el ajo picado y el romero 30 s.
3. Añade el zumo y la ralladura del limón y el caldo; deja hervir 2 min.
4. Espesa con la maicena disuelta en agua fría.
5. Devuelve el pollo y cocina 2-3 min bañándolo con la salsa.', array['comida','cena','rapida']::text[]),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae', 'Pote ligero de garbanzos con tomate y espinacas', '⏱ 10 min · Importada de Notion.

1. Escurre y enjuaga los garbanzos.
2. Sofríe el ajo laminado en aceite 1-2 min.
3. Añade el pimentón (y comino opcional) y remueve rápido.
4. Incorpora el tomate, salpimienta y cocina 3-4 min.
5. Añade los garbanzos y cocina 2-3 min.
6. Agrega las espinacas y deja que se marchiten 1 min. Sirve.', array['comida','cena','rapida']::text[]),
    ('7fd4fbc7-5ec1-4695-94b5-bcff28dc1f76', 'Salmón con costra de nuez y mostaza', '⏱ 15 min · Importada de Notion.

1. Precalienta el horno a 200 °C.
2. Salpimienta el salmón.
3. Unta la parte superior con mostaza.
4. Presiona las nueces picadas sobre la mostaza.
5. Pon el salmón en una bandeja con un chorrito de aceite.
6. Hornea 12-15 min.
7. Sirve con ensalada verde o arroz basmati.', array['comida','cena','rapida']::text[]),
    ('235ff00c-05ec-4548-886b-0b136b123ced', 'Salsa boloñesa de pavo express', '⏱ 20 min · Importada de Notion.

1. Pica fina la cebolla, el ajo y la zanahoria.
2. Sofríe cebolla y ajo 3-4 min.
3. Añade la zanahoria y cocina 2 min.
4. Incorpora el pavo y dóralo sin grumos 4-5 min.
5. Opcional: chorrito de vino blanco, 1 min.
6. Añade tomate, orégano, pimentón, sal y pimienta.
7. Cocina 12-15 min a fuego medio-bajo hasta que espese.
8. Úsala para pasta, boniatos rellenos u otros platos.', array['desayuno','batch']::text[]),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea', 'Solomillo de ternera con setas y judías blancas', '⏱ 30 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Saca la carne de la nevera 15 min antes y salpimienta.
2. Sofríe cebolla y ajo picados 4 min; añade las setas troceadas y saltea a fuego fuerte 5-6 min con el tomillo.
3. Incorpora las judías escurridas y calienta 2-3 min; ajusta sal y añade perejil.
4. Marca el solomillo en sartén muy caliente 2-3 min por lado (al gusto) y deja reposar 2 min.
5. Sirve sobre las setas y judías.', array['comida','cena']::text[]),
    ('b445caf6-f51b-429b-b388-46dd4156efa7', 'Tortilla de setas, cebolla y jamón', '⏱ 30 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Pocha la cebolla en juliana a fuego lento 10-12 min.
2. Añade las setas troceadas y saltea 5 min; incorpora el jamón 1 min.
3. Bate los huevos con sal y mezcla con el salteado templado.
4. Cuaja en sartén con un poco de aceite a fuego medio-bajo 3-4 min, da la vuelta con un plato y 2 min más.', array['comida','cena']::text[]),
    ('049b2af0-ad7e-4bd2-91a0-a835e965df2c', 'Tostada de aguacate, bonito y tomates cherry', '⏱ 7 min · Importada de Notion.

1. Tuesta el pan.
2. Aplasta el aguacate con zumo de limón, sal y pimienta.
3. Escurre y desmiga el bonito.
4. Corta los cherry por la mitad.
5. Unta el aguacate, pon el bonito y termina con los cherry.
6. Sal en escamas y sirve.', array['cena','rapida']::text[]),
    ('00fbd194-58ec-4dc9-bc69-73e1506b9c13', 'Tostada de jamón y huevos revueltos', '⏱ 10 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Tuesta el pan y úntalo con tomate rallado y un hilo de aceite.
2. Bate los huevos con sal y cuájalos a fuego suave removiendo, sin que se sequen.
3. Pon el revuelto sobre las tostadas y el jamón por encima.', array['cena','rapida']::text[]),
    ('b8e00d8f-0df7-4fcd-b638-f9c695588009', 'Tostada de pimientos asados, queso y bonito', '⏱ 7 min · Ingredientes y pasos completados desde internet (versión estándar): revísalos la primera vez.

1. Tuesta el pan.
2. Pon el queso fresco en lonchas o desmigado.
3. Añade los pimientos asados en tiras y el bonito escurrido.
4. Termina con un hilo de aceite y una pizca de sal.', array['cena','rapida']::text[]),
    ('5990c73f-35eb-47d0-8841-4f9638a5286d', 'Wrap de espinacas y huevo con queso cottage', '⏱ 10 min · Importada de Notion.

1. Bate los huevos con sal y pimienta.
2. Haz un revuelto cremoso o tortilla fina en sartén con un poco de aceite.
3. Calienta la tortilla de espinacas 20 s.
4. Extiende el cottage sobre la tortilla.
5. Pon el huevo encima (y opcionales: cherry, rúcula).
6. Enrolla, corta en diagonal y sirve.', array['cena','rapida']::text[]);
  delete from _imp i where exists (select 1 from recipes r where r.household_id = h and lower(r.name) = lower(i.name));
  insert into recipes(id, household_id, name, body, tags, favorite, created_by)
  select id, h, name, body, tags, false, 'Adri' from _imp;

  -- Ingredientes (solo de las recetas recién creadas)
  insert into recipe_ingredients(id, household_id, recipe_id, product_id, qty, unit, raw, sort)
  select gen_random_uuid(), h, v.rid, (select id from products p where p.household_id = h and lower(p.name) = lower(v.prod) limit 1), v.qty, v.unit, v.raw, v.sort
  from (values
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Alitas de pollo', 1::numeric, 'kg', '1 kg de alitas de pollo', 0),
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Aceite', 2::numeric, 'cda', '2 cucharadas de aceite de oliva', 1),
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Pimentón', 1::numeric, 'cdta', '1 cucharadita de pimentón dulce o ahumado', 2),
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Ajo en polvo', 0.5::numeric, 'cdta', '1/2 cucharadita de ajo en polvo', 3),
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Cebolla en polvo', 0.5::numeric, 'cdta', '1/2 cucharadita de cebolla en polvo', 4),
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Pimienta', 0.25::numeric, 'cdta', '1/4 cucharadita de pimienta cayena', 5),
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Tomillo', 0.5::numeric, 'cdta', '1/2 cucharadita de tomillo seco', 6),
    ('697d06fa-7dc9-49c1-b69b-f629be186fb9'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 7),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387'::uuid, 'Arroz basmati', 80::numeric, 'g', '80 g de arroz basmati', 0),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387'::uuid, 'Cúrcuma', 0.5::numeric, 'cdta', '1/2 cucharadita de cúrcuma', 1),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387'::uuid, 'Comino', 0.5::numeric, 'cdta', '1/2 cucharadita de comino molido', 2),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387'::uuid, 'Canela', 0.25::numeric, 'cdta', '1/4 cucharadita de canela', 3),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387'::uuid, 'Aceite', 1::numeric, 'cda', '1 cucharada de aceite de oliva virgen extra', 4),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387'::uuid, 'Sal', null::numeric, null, 'Sal al gusto', 5),
    ('3a23550f-bd6d-47c8-a41b-a7642e07a387'::uuid, 'Caldo de verduras', 200::numeric, 'ml', '200 ml de caldo de verduras', 6),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Bacalao', 4::numeric, null, '4 lomos de bacalao desalado', 0),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Cebolla', 2::numeric, null, '2 cebollas', 1),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Pimiento rojo', 2::numeric, null, '2 pimientos rojos', 2),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Ajo', 4::numeric, 'diente', '4 dientes de ajo', 3),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Tomate triturado', 400::numeric, 'g', '400 g de tomate triturado', 4),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Pimiento choricero', 1::numeric, 'cda', '1 cucharada de carne de pimiento choricero', 5),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Laurel', 1::numeric, null, '1 hoja de laurel', 6),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 7),
    ('5110a83d-c2de-4728-93f9-c2be6976200c'::uuid, 'Sal', null::numeric, null, 'Sal', 8),
    ('478029c6-f9d6-418c-9a91-7441cf30d927'::uuid, 'Frutos rojos', 150::numeric, 'g', '150 g de frutos rojos congelados', 0),
    ('478029c6-f9d6-418c-9a91-7441cf30d927'::uuid, 'Leche', 200::numeric, 'ml', '200 ml de leche', 1),
    ('478029c6-f9d6-418c-9a91-7441cf30d927'::uuid, 'Plátanos', 0.5::numeric, null, '1/2 plátano', 2),
    ('fb3169db-9e67-468c-af98-536660f05631'::uuid, 'Plátanos', 2::numeric, null, '2 plátanos', 0),
    ('fb3169db-9e67-468c-af98-536660f05631'::uuid, 'Leche', 400::numeric, 'ml', '400 ml de leche', 1),
    ('fb3169db-9e67-468c-af98-536660f05631'::uuid, 'Yogur', 1::numeric, null, '1 yogur natural', 2),
    ('fb3169db-9e67-468c-af98-536660f05631'::uuid, 'Canela', 1::numeric, 'cdta', '1 cucharadita de canela', 3),
    ('fb3169db-9e67-468c-af98-536660f05631'::uuid, null, 4::numeric, null, '4 cubitos de hielo', 4),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Boniato', 1::numeric, null, '1 boniato grande', 0),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Carne picada de pavo', 200::numeric, 'g', '200 g de carne picada de pavo', 1),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 2),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Pimiento rojo', 0.5::numeric, null, '1/2 pimiento rojo', 3),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Ajo', 1::numeric, 'diente', '1 diente de ajo', 4),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Tomate triturado', 100::numeric, 'g', '100 g de tomate triturado', 5),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Pimentón', 1::numeric, 'cdta', '1 cucharadita de pimentón dulce', 6),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Comino', 0.5::numeric, 'cdta', '1/2 cucharadita de comino', 7),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva', 8),
    ('bb36c879-0bd5-4f9b-9a6b-6448a6e6243e'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 9),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce'::uuid, 'Carpaccio de ternera', 150::numeric, 'g', '150 g de carpaccio de ternera', 0),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce'::uuid, 'Rúcula', 40::numeric, 'g', '40 g de rúcula', 1),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce'::uuid, 'Parmesano', 20::numeric, 'g', '20 g de parmesano en lascas', 2),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 3),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce'::uuid, 'Limón', 0.5::numeric, null, '1/2 limón', 4),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce'::uuid, 'Sal', null::numeric, null, 'Sal en escamas', 5),
    ('c9890dd4-8cf3-47ab-b8e2-d2a882529bce'::uuid, 'Pimienta', null::numeric, null, 'Pimienta negra', 6),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Tomate triturado', 400::numeric, 'g', '400 g de tomate triturado', 0),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Judías blancas cocidas', 400::numeric, 'g', '400 g de judías blancas cocidas', 1),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Cebolla', 1::numeric, null, '1 cebolla', 2),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 3),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Caldo de verduras', 500::numeric, 'ml', '500 ml de caldo de verduras', 4),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Orégano', 1::numeric, 'cdta', '1 cucharadita de orégano', 5),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 6),
    ('6f5c3477-db59-48e9-885c-1f082653e516'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta', 7),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Zanahoria', 2::numeric, null, '2 zanahorias', 0),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Lentejas rojas', 60::numeric, 'g', '60 g de lentejas rojas', 1),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 2),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Ajo', 1::numeric, 'diente', '1 diente de ajo', 3),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Caldo de verduras', 400::numeric, 'ml', '400 ml de caldo de verduras', 4),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Comino', 0.5::numeric, 'cdta', '1/2 cucharadita de comino molido', 5),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Cúrcuma', 0.5::numeric, 'cdta', '1/2 cucharadita de cúrcuma', 6),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 7),
    ('a8978503-e613-4880-a57f-1d61b3a91179'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 8),
    ('6d2a1afe-69d5-4f72-9cd9-2d84122efca8'::uuid, 'Copos de avena', 40::numeric, 'g', '40 g de copos de avena', 0),
    ('6d2a1afe-69d5-4f72-9cd9-2d84122efca8'::uuid, 'Queso batido 0%', 150::numeric, 'g', '150 g de queso batido 0%', 1),
    ('6d2a1afe-69d5-4f72-9cd9-2d84122efca8'::uuid, 'Huevos', 2::numeric, null, '2 huevos', 2),
    ('6d2a1afe-69d5-4f72-9cd9-2d84122efca8'::uuid, 'Leche', 50::numeric, 'ml', '50 ml de leche', 3),
    ('6d2a1afe-69d5-4f72-9cd9-2d84122efca8'::uuid, 'Sal', 1::numeric, 'pizca', '1 pizca de sal', 4),
    ('6d2a1afe-69d5-4f72-9cd9-2d84122efca8'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 5),
    ('4ad1ec2e-20d6-4f87-93df-51250096e7ff'::uuid, 'Chocolate negro', 100::numeric, 'g', '100 g de chocolate negro 85%', 0),
    ('4ad1ec2e-20d6-4f87-93df-51250096e7ff'::uuid, 'Quinoa inflada', 40::numeric, 'g', '40 g de quinoa inflada', 1),
    ('4ad1ec2e-20d6-4f87-93df-51250096e7ff'::uuid, 'Frutos secos', 20::numeric, 'g', '20 g de frutos secos', 2),
    ('4ad1ec2e-20d6-4f87-93df-51250096e7ff'::uuid, 'Sal', null::numeric, null, 'Sal en escamas', 3),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Judías blancas cocidas', 200::numeric, 'g', '200 g de alubias blancas cocidas', 0),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Sardinas en lata', 1::numeric, 'lata', '1 lata de sardinillas en aceite', 1),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Tomate', 1::numeric, null, '1 tomate', 2),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Cebolla morada', 0.25::numeric, null, '1/4 de cebolla roja', 3),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Perejil', null::numeric, null, 'Perejil fresco', 4),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 5),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Vinagre', null::numeric, null, 'Vinagre de jerez', 6),
    ('b57cb05b-0cab-4313-8a28-62522d994c33'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 7),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Garbanzos cocidos', 200::numeric, 'g', '200 g de garbanzos cocidos', 0),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Salmón ahumado', 100::numeric, 'g', '100 g de salmón ahumado', 1),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Espinacas', 60::numeric, 'g', '60 g de espinacas', 2),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Manzana', 0.5::numeric, null, '1/2 manzana', 3),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Nueces', 30::numeric, 'g', '30 g de nueces', 4),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 5),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Limón', 0.5::numeric, null, '1/2 limón', 6),
    ('422704ec-b644-4fab-8999-dd469a11c447'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 7),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Patata', 4::numeric, null, '4 patatas', 0),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Mejillones en escabeche', 1::numeric, 'lata', '1 lata de mejillones en escabeche', 1),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Bonito en conserva', 1::numeric, 'lata', '1 lata de bonito en conserva', 2),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Cebolla morada', 0.5::numeric, null, '1/2 cebolla morada', 3),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Tomates cherry', 8::numeric, null, '8 tomates cherry', 4),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Huevos', 1::numeric, null, '1 huevo', 5),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 6),
    ('63269958-3155-419f-84d6-d73aec8ba038'::uuid, 'Sal', null::numeric, null, 'Sal', 7),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Sardinas en lata', 2::numeric, 'lata', '2 latas de sardinas en aceite', 0),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Ensaladas', 1::numeric, 'paquete', '1 bolsa de ensalada', 1),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Tomate', 2::numeric, null, '2 tomates', 2),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Pepino', 0.5::numeric, null, '1/2 pepino', 3),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Pimiento rojo', 0.5::numeric, null, '1/2 pimiento rojo', 4),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Cebolla morada', 0.5::numeric, null, '1/2 cebolla morada', 5),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 6),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Vinagre', null::numeric, null, 'Vinagre', 7),
    ('466bdd3f-5e6e-41ed-baea-78c99f747694'::uuid, 'Sal', null::numeric, null, 'Sal', 8),
    ('7adb94f0-e235-4fd5-85fe-51a4055139a2'::uuid, 'Ensaladas', 60::numeric, 'g', '60 g de hojas verdes variadas', 0),
    ('7adb94f0-e235-4fd5-85fe-51a4055139a2'::uuid, 'Pepino', 0.5::numeric, null, '1/2 pepino', 1),
    ('7adb94f0-e235-4fd5-85fe-51a4055139a2'::uuid, 'Tomates cherry', 8::numeric, null, '8 tomates cherry', 2),
    ('7adb94f0-e235-4fd5-85fe-51a4055139a2'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 3),
    ('7adb94f0-e235-4fd5-85fe-51a4055139a2'::uuid, 'Vinagre', null::numeric, null, 'Vinagre de manzana', 4),
    ('7adb94f0-e235-4fd5-85fe-51a4055139a2'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 5),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Pollo', 2::numeric, null, '2 pechugas de pollo', 0),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Pimiento rojo', 1::numeric, null, '1 pimiento rojo', 1),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Pimiento verde', 1::numeric, null, '1 pimiento verde', 2),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Cebolla', 1::numeric, null, '1 cebolla', 3),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Tortillas de garbanzos', 1::numeric, 'paquete', '1 paquete de tortillas de garbanzos', 4),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Comino', 1::numeric, 'cdta', '1 cucharadita de comino', 5),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Pimentón', 1::numeric, 'cdta', '1 cucharadita de pimentón', 6),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Lima', 1::numeric, null, '1 lima', 7),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Aguacate', 1::numeric, null, '1 aguacate', 8),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 9),
    ('2bc964e9-7528-4473-80ed-a8b7d2d2764e'::uuid, 'Sal', null::numeric, null, 'Sal', 10),
    ('a4affaff-fb68-4439-99ac-af4711309205'::uuid, 'Pechuga de pavo', 1::numeric, 'kg', '1 kg de pechuga de pavo', 0),
    ('a4affaff-fb68-4439-99ac-af4711309205'::uuid, 'Orégano', null::numeric, null, 'Orégano', 1),
    ('a4affaff-fb68-4439-99ac-af4711309205'::uuid, 'Tomillo', null::numeric, null, 'Tomillo', 2),
    ('a4affaff-fb68-4439-99ac-af4711309205'::uuid, 'Pimentón', null::numeric, null, 'Pimentón', 3),
    ('a4affaff-fb68-4439-99ac-af4711309205'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta', 4),
    ('a4affaff-fb68-4439-99ac-af4711309205'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva', 5),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Copos de avena', 60::numeric, 'g', '60 g de copos de avena', 0),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Huevos', 1::numeric, null, '1 huevo', 1),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Leche', 150::numeric, 'ml', '150 ml de leche', 2),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Cacao puro', 1::numeric, 'cda', '1 cucharada de cacao puro en polvo', 3),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Edulcorante', 1::numeric, 'cdta', '1 cucharadita de edulcorante', 4),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Arándanos', 50::numeric, 'g', '50 g de arándanos', 5),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Levadura química', 0.5::numeric, 'cdta', '1/2 cucharadita de levadura química', 6),
    ('007638e4-4c8b-4123-b953-f688fa7919d5'::uuid, 'Sal', null::numeric, null, 'Sal', 7),
    ('ebc73fe6-a80a-48b2-a496-517844f31dcc'::uuid, 'Plátanos', 2::numeric, null, '2 plátanos maduros', 0),
    ('ebc73fe6-a80a-48b2-a496-517844f31dcc'::uuid, 'Copos de avena', 100::numeric, 'g', '100 g de copos de avena', 1),
    ('ebc73fe6-a80a-48b2-a496-517844f31dcc'::uuid, 'Chocolate negro', 30::numeric, 'g', '30 g de chocolate negro', 2),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Gambas', 150::numeric, 'g', '150 g de gambas peladas', 0),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Arroz basmati', 80::numeric, 'g', '80 g de arroz basmati', 1),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Guisantes', 60::numeric, 'g', '60 g de guisantes', 2),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Zanahoria', 1::numeric, null, '1 zanahoria', 3),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Huevos', 1::numeric, null, '1 huevo', 4),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Salsa de soja', 2::numeric, 'cda', '2 cucharadas de salsa de soja', 5),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Aceite de sésamo', 1::numeric, 'cdta', '1 cucharadita de aceite de sésamo', 6),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 7),
    ('412350a0-4bfb-4ee1-9026-0c7928a94bc0'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 8),
    ('62927bf8-8ee0-4482-9040-42f741c802e5'::uuid, 'Guisantes', 400::numeric, 'g', '400 g de guisantes congelados', 0),
    ('62927bf8-8ee0-4482-9040-42f741c802e5'::uuid, 'Jamón serrano', 100::numeric, 'g', '100 g de taquitos de jamón serrano', 1),
    ('62927bf8-8ee0-4482-9040-42f741c802e5'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 2),
    ('62927bf8-8ee0-4482-9040-42f741c802e5'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 3),
    ('62927bf8-8ee0-4482-9040-42f741c802e5'::uuid, 'Huevos', 2::numeric, null, '2 huevos', 4),
    ('62927bf8-8ee0-4482-9040-42f741c802e5'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 5),
    ('62927bf8-8ee0-4482-9040-42f741c802e5'::uuid, 'Sal', null::numeric, null, 'Sal', 6),
    ('0ff0977e-f3f3-411e-8e35-5da190f37daa'::uuid, 'Huevos', 3::numeric, null, '3 huevos', 0),
    ('0ff0977e-f3f3-411e-8e35-5da190f37daa'::uuid, 'Jamón serrano', 50::numeric, 'g', '50 g de taquitos de jamón ibérico', 1),
    ('0ff0977e-f3f3-411e-8e35-5da190f37daa'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 2),
    ('0ff0977e-f3f3-411e-8e35-5da190f37daa'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 3),
    ('8e839a5e-9be6-4994-9a40-ea21b404baee'::uuid, 'Huevos', 3::numeric, null, '3 huevos', 0),
    ('8e839a5e-9be6-4994-9a40-ea21b404baee'::uuid, 'Calabacín', 1::numeric, null, '1 calabacín', 1),
    ('8e839a5e-9be6-4994-9a40-ea21b404baee'::uuid, 'Fiambre de pavo', null::numeric, null, 'Fiambre de pavo', 2),
    ('8e839a5e-9be6-4994-9a40-ea21b404baee'::uuid, 'Queso', null::numeric, 'ud', 'Lonchas de queso', 3),
    ('8e839a5e-9be6-4994-9a40-ea21b404baee'::uuid, 'Tomate triturado', null::numeric, null, 'Tomate natural', 4),
    ('8e839a5e-9be6-4994-9a40-ea21b404baee'::uuid, 'Champiñones', null::numeric, null, 'Champiñones', 5),
    ('9c491212-bf30-43cf-aad9-54e105bf3cce'::uuid, 'Copos de avena', 4::numeric, 'cda', '4 cucharadas de copos de avena', 0),
    ('9c491212-bf30-43cf-aad9-54e105bf3cce'::uuid, 'Huevos', 1::numeric, null, '1 huevo', 1),
    ('9c491212-bf30-43cf-aad9-54e105bf3cce'::uuid, 'Cacao puro', 1::numeric, 'cda', '1 cucharada de cacao puro', 2),
    ('9c491212-bf30-43cf-aad9-54e105bf3cce'::uuid, 'Plátanos', 1::numeric, null, '1 plátano maduro', 3),
    ('9c491212-bf30-43cf-aad9-54e105bf3cce'::uuid, 'Leche', 2::numeric, 'cda', '2 cucharadas de leche', 4),
    ('9c491212-bf30-43cf-aad9-54e105bf3cce'::uuid, 'Levadura química', 0.5::numeric, 'cdta', '1/2 cucharadita de levadura', 5),
    ('7eff40ad-a4b2-415a-ae5d-c808480cd130'::uuid, 'Queso batido 0%', 250::numeric, 'g', '250 g de queso batido 0%', 0),
    ('7eff40ad-a4b2-415a-ae5d-c808480cd130'::uuid, 'Frutos rojos', 150::numeric, 'g', '150 g de frutos rojos', 1),
    ('7eff40ad-a4b2-415a-ae5d-c808480cd130'::uuid, 'Granola', 40::numeric, 'g', '40 g de granola', 2),
    ('7eff40ad-a4b2-415a-ae5d-c808480cd130'::uuid, 'Miel', 1::numeric, 'cdta', '1 cucharadita de miel', 3),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Pasta de lentejas', 80::numeric, 'g', '80 g de pasta de lentejas', 0),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Carne picada de pavo', 300::numeric, 'g', '300 g de carne picada de pavo', 1),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Tomate triturado', 200::numeric, 'g', '200 g de tomate triturado', 2),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 3),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 4),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Orégano', 1::numeric, 'cdta', '1 cucharadita de orégano', 5),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 6),
    ('e1657292-8b34-415d-a930-ad1f55516500'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 7),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Pasta de lentejas', 160::numeric, 'g', '160 g de pasta de lentejas', 0),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Bacalao', 200::numeric, 'g', '200 g de migas de bacalao desalado', 1),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Tomate triturado', 200::numeric, 'g', '200 g de tomate triturado', 2),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 3),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 4),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Guindilla', 1::numeric, null, '1 guindilla', 5),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Perejil', null::numeric, null, 'Perejil', 6),
    ('6562161e-6a0b-477c-97d8-989db57c3abd'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 7),
    ('549a0614-d94d-4769-9fca-9163dd4981d3'::uuid, 'Patata', 3::numeric, null, '3 patatas medianas', 0),
    ('549a0614-d94d-4769-9fca-9163dd4981d3'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 1),
    ('549a0614-d94d-4769-9fca-9163dd4981d3'::uuid, 'Sal', null::numeric, null, 'Sal', 2),
    ('549a0614-d94d-4769-9fca-9163dd4981d3'::uuid, 'Pimentón', 1::numeric, 'pizca', '1 pizca de pimentón', 3),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Pechuga de pavo', 2::numeric, 'ud', '2 filetes de pechuga de pavo', 0),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Boniato', 1::numeric, null, '1 boniato grande', 1),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 2),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Queso feta', 60::numeric, 'g', '60 g de queso feta', 3),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Pimentón', 1::numeric, 'cdta', '1 cucharadita de pimentón', 4),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Perejil', null::numeric, null, 'Perejil', 5),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 6),
    ('9fd63eeb-3717-4d53-93c6-4c44a695b413'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta', 7),
    ('7faba66b-160a-47f9-beb2-4dc892a71eef'::uuid, 'Tomate', 3::numeric, null, '3 tomates', 0),
    ('7faba66b-160a-47f9-beb2-4dc892a71eef'::uuid, 'Cebolla morada', 0.5::numeric, null, '1/2 cebolla morada', 1),
    ('7faba66b-160a-47f9-beb2-4dc892a71eef'::uuid, 'Jalapeños', 1::numeric, null, '1 jalapeño', 2),
    ('7faba66b-160a-47f9-beb2-4dc892a71eef'::uuid, 'Lima', 1::numeric, null, '1 lima', 3),
    ('7faba66b-160a-47f9-beb2-4dc892a71eef'::uuid, 'Cilantro', null::numeric, null, 'Cilantro', 4),
    ('7faba66b-160a-47f9-beb2-4dc892a71eef'::uuid, 'Sal', null::numeric, null, 'Sal', 5),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb'::uuid, 'Atún en lata', 2::numeric, 'lata', '2 latas de atún al natural', 0),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb'::uuid, 'Huevos', 2::numeric, null, '2 huevos', 1),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb'::uuid, 'Orégano', 1::numeric, 'cdta', '1 cucharadita de orégano', 2),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 3),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb'::uuid, 'Tomate frito', 3::numeric, 'cda', '3 cucharadas de tomate frito', 4),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb'::uuid, 'Mozzarella rallada', 50::numeric, 'g', '50 g de mozzarella rallada', 5),
    ('8d039945-14a4-4e24-8d66-9dd2ee860bcb'::uuid, 'Champiñones', null::numeric, null, 'Champiñones al gusto', 6),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Salmón', 150::numeric, 'g', '150 g de salmón cocinado', 0),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Arroz basmati', 80::numeric, 'g', '80 g de arroz basmati', 1),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Pepino', 0.5::numeric, null, '1/2 pepino', 2),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Zanahoria', 1::numeric, null, '1 zanahoria', 3),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Edamame', 60::numeric, 'g', '60 g de edamame', 4),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Salsa de soja', 1::numeric, 'cda', '1 cucharada de salsa de soja', 5),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Aceite de sésamo', 1::numeric, 'cdta', '1 cucharadita de aceite de sésamo', 6),
    ('ef4de21e-604a-44ea-832f-ed36a909a2da'::uuid, 'Semillas de sésamo', null::numeric, null, 'Semillas de sésamo', 7),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4'::uuid, 'Pollo', 2::numeric, null, '2 pechugas de pollo', 0),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4'::uuid, 'Boniato', 2::numeric, null, '2 boniatos medianos', 1),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4'::uuid, 'Mostaza Dijon', 1::numeric, 'cda', '1 cucharada de mostaza Dijon', 2),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4'::uuid, 'Miel', 1::numeric, 'cda', '1 cucharada de miel', 3),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4'::uuid, 'Tomillo', 0.25::numeric, 'cdta', '1/4 cucharadita de tomillo seco', 4),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 5),
    ('1fcec30e-58c8-43bf-ab08-17a9ff29d1a4'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta', 6),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Pollo', 2::numeric, null, '2 pechugas de pollo', 0),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Limón', 1::numeric, null, '1 limón', 1),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 2),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Romero', 1::numeric, null, '1 ramita de romero', 3),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Caldo de pollo', 150::numeric, 'ml', '150 ml de caldo de pollo', 4),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Maicena', 1::numeric, 'cdta', '1 cucharadita de maicena', 5),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 6),
    ('611b4727-2267-4635-bfa0-e394a2bb0c36'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta', 7),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae'::uuid, 'Garbanzos cocidos', 200::numeric, 'g', '200 g de garbanzos cocidos', 0),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae'::uuid, 'Tomate triturado', 200::numeric, 'g', '200 g de tomate triturado', 1),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae'::uuid, 'Espinacas', 60::numeric, 'g', '60 g de espinacas', 2),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 3),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae'::uuid, 'Pimentón', 1::numeric, 'cdta', '1 cucharadita de pimentón', 4),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 5),
    ('e3c1c42d-cab0-4641-a61e-934647c159ae'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 6),
    ('7fd4fbc7-5ec1-4695-94b5-bcff28dc1f76'::uuid, 'Salmón', 200::numeric, 'g', '200 g de salmón', 0),
    ('7fd4fbc7-5ec1-4695-94b5-bcff28dc1f76'::uuid, 'Nueces', 40::numeric, 'g', '40 g de nueces', 1),
    ('7fd4fbc7-5ec1-4695-94b5-bcff28dc1f76'::uuid, 'Mostaza Dijon', 1::numeric, 'cda', '1 cucharada de mostaza Dijon', 2),
    ('7fd4fbc7-5ec1-4695-94b5-bcff28dc1f76'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 3),
    ('7fd4fbc7-5ec1-4695-94b5-bcff28dc1f76'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 4),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Carne picada de pavo', 300::numeric, 'g', '300 g de carne picada de pavo', 0),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Tomate triturado', 200::numeric, 'g', '200 g de tomate triturado', 1),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 2),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 3),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Zanahoria', 1::numeric, null, '1 zanahoria', 4),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Orégano', 1::numeric, 'cdta', '1 cucharadita de orégano', 5),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Pimentón', 0.5::numeric, 'cdta', '1/2 cucharadita de pimentón', 6),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 7),
    ('235ff00c-05ec-4548-886b-0b136b123ced'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 8),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Solomillo de ternera', 2::numeric, null, '2 medallones de solomillo de ternera', 0),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Setas', 250::numeric, 'g', '250 g de setas', 1),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Judías blancas cocidas', 400::numeric, 'g', '400 g de judías blancas cocidas', 2),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Ajo', 2::numeric, 'diente', '2 dientes de ajo', 3),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Cebolla', 0.5::numeric, null, '1/2 cebolla', 4),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Tomillo', 1::numeric, null, '1 ramita de tomillo', 5),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Perejil', null::numeric, null, 'Perejil', 6),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 7),
    ('4d4fbeda-b34d-492e-82c6-659417e32aea'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta', 8),
    ('b445caf6-f51b-429b-b388-46dd4156efa7'::uuid, 'Huevos', 6::numeric, null, '6 huevos', 0),
    ('b445caf6-f51b-429b-b388-46dd4156efa7'::uuid, 'Setas', 250::numeric, 'g', '250 g de setas', 1),
    ('b445caf6-f51b-429b-b388-46dd4156efa7'::uuid, 'Cebolla', 1::numeric, null, '1 cebolla', 2),
    ('b445caf6-f51b-429b-b388-46dd4156efa7'::uuid, 'Jamón serrano', 80::numeric, 'g', '80 g de taquitos de jamón serrano', 3),
    ('b445caf6-f51b-429b-b388-46dd4156efa7'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 4),
    ('b445caf6-f51b-429b-b388-46dd4156efa7'::uuid, 'Sal', null::numeric, null, 'Sal', 5),
    ('049b2af0-ad7e-4bd2-91a0-a835e965df2c'::uuid, 'Pan', 2::numeric, null, '2 rebanadas de pan integral', 0),
    ('049b2af0-ad7e-4bd2-91a0-a835e965df2c'::uuid, 'Aguacate', 0.5::numeric, null, '1/2 aguacate', 1),
    ('049b2af0-ad7e-4bd2-91a0-a835e965df2c'::uuid, 'Bonito en conserva', 80::numeric, 'g', '80 g de bonito en conserva', 2),
    ('049b2af0-ad7e-4bd2-91a0-a835e965df2c'::uuid, 'Tomates cherry', 8::numeric, null, '8 tomates cherry', 3),
    ('049b2af0-ad7e-4bd2-91a0-a835e965df2c'::uuid, 'Limón', 0.5::numeric, null, '1/2 limón', 4),
    ('049b2af0-ad7e-4bd2-91a0-a835e965df2c'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 5),
    ('00fbd194-58ec-4dc9-bc69-73e1506b9c13'::uuid, 'Pan', 2::numeric, null, '2 rebanadas de pan integral', 0),
    ('00fbd194-58ec-4dc9-bc69-73e1506b9c13'::uuid, 'Huevos', 3::numeric, null, '3 huevos', 1),
    ('00fbd194-58ec-4dc9-bc69-73e1506b9c13'::uuid, 'Jamón serrano', 50::numeric, 'g', '50 g de jamón serrano', 2),
    ('00fbd194-58ec-4dc9-bc69-73e1506b9c13'::uuid, 'Tomate', 1::numeric, null, '1 tomate', 3),
    ('00fbd194-58ec-4dc9-bc69-73e1506b9c13'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 4),
    ('00fbd194-58ec-4dc9-bc69-73e1506b9c13'::uuid, 'Sal', null::numeric, null, 'Sal', 5),
    ('b8e00d8f-0df7-4fcd-b638-f9c695588009'::uuid, 'Pan', 2::numeric, null, '2 rebanadas de pan integral', 0),
    ('b8e00d8f-0df7-4fcd-b638-f9c695588009'::uuid, 'Pimientos asados', 100::numeric, 'g', '100 g de pimientos asados', 1),
    ('b8e00d8f-0df7-4fcd-b638-f9c695588009'::uuid, 'Bonito en conserva', 1::numeric, 'lata', '1 lata de bonito en conserva', 2),
    ('b8e00d8f-0df7-4fcd-b638-f9c695588009'::uuid, 'Queso fresco', 60::numeric, 'g', '60 g de queso fresco', 3),
    ('b8e00d8f-0df7-4fcd-b638-f9c695588009'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 4),
    ('b8e00d8f-0df7-4fcd-b638-f9c695588009'::uuid, 'Sal', null::numeric, null, 'Sal', 5),
    ('5990c73f-35eb-47d0-8841-4f9638a5286d'::uuid, 'Tortillas de espinacas', 1::numeric, null, '1 tortilla de espinacas', 0),
    ('5990c73f-35eb-47d0-8841-4f9638a5286d'::uuid, 'Huevos', 2::numeric, null, '2 huevos', 1),
    ('5990c73f-35eb-47d0-8841-4f9638a5286d'::uuid, 'Queso cottage', 80::numeric, 'g', '80 g de queso cottage', 2),
    ('5990c73f-35eb-47d0-8841-4f9638a5286d'::uuid, 'Aceite', null::numeric, null, 'Aceite de oliva virgen extra', 3),
    ('5990c73f-35eb-47d0-8841-4f9638a5286d'::uuid, 'Sal', null::numeric, null, 'Sal y pimienta al gusto', 4)
  ) as v(rid, prod, qty, unit, raw, sort)
  where exists (select 1 from _imp i where i.id = v.rid);
end $$;

select count(*) as recetas from recipes;
