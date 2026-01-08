В прошлой части статей по полигону я сделал изолированный запуск Clickhouse

[[8 часть Изоляция работы с Clickhouse]]

Теперь можно быстро одной командой докера в папке с docker compose поднять кликхауз:

```
docker-compose up -d clickhouse-server
```

Уникальные функции Clickhouse ч1

Посмотреть функции и ddl таблиц можно по ссылке:
https://github.com/Byaha98/bigdata_poligon

Идем в Clickhouse, чтобы создавать тестовые таблицы и скрипты к ним!

Все DDL и SELECT из статьи я размещу в папке ==clickhouse_sql== внутри полигона.

Сначала хотел бы показать на простых примерах работу с JSON в Clickhouse. Мы можем парсить JSON с сырого слоя в DWH, если у нас в компании немного данных и юзеров. Тогда одного инстанса кликхауз хватит за глаза. Либо при скоростных пайплайнах, когда нужно быстро посчитать агрегаты и расчеты под дашборды из сервисов (например, приложения по продуктовой/маркетинговой аналитике)

json_table_ddl - создаем нашу табличку под жисон функции. Cаму таблицу я поместил в новую папку в основании полигона. DDL скрипт называется ==json_table_ddl==. Чтобы быть поближе к аналитике, представим, как будто у нас приходят данные по веб/продуктовой/маркетинговой аналитике (типа как в приложении Amplitude) в виде жисонов.

Итак, вот собственно и сам скрипт создания и накопления таблицы:


```
-- Таблица с JSON-логами веб-события (типа как в Amplitude)

CREATE TABLE web_analytics (

event_id UInt64,

timestamp DateTime,

user_id UInt32,

session_data String, -- JSON с данными о сессии

event_properties String, -- JSON с параметрами события

user_profile String -- JSON с профилем пользователя

) ENGINE = MergeTree()

ORDER BY (timestamp);

  

-- Вставляем тестовые JSON-данные

INSERT INTO web_analytics FORMAT Values

(

1,

'2025-01-04 10:00:00',

101,

'{"session_id":"s_001","source":"organic","campaign":"","device":"desktop","os":"Windows","browser":"Chrome"}',

'{"event_name":"page_view","page":"/products","category":"electronics","load_time_ms":245,"user_action":"scroll"}',

'{"name":"Alice","country":"US","age":28,"premium":true,"ltv":1250.50,"tags":["vip","high_value","loyal"]}'

),

(

2,

'2025-01-04 10:05:00',

101,

'{"session_id":"s_001","source":"organic","campaign":"","device":"desktop","os":"Windows","browser":"Chrome"}',

'{"event_name":"product_click","product_id":"SKU_789","price":899.99,"currency":"USD","position_on_page":3,"click_time_ms":145}',

'{"name":"Alice","country":"US","age":28,"premium":true,"ltv":1250.50,"tags":["vip","high_value","loyal"]}'

),

(

3,

'2025-01-04 10:10:00',

101,

'{"session_id":"s_001","source":"organic","campaign":"","device":"desktop","os":"Windows","browser":"Chrome"}',

'{"event_name":"add_to_cart","product_id":"SKU_789","quantity":1,"price":899.99,"discount":null,"estimated_shipping":19.99}',

'{"name":"Alice","country":"US","age":28,"premium":true,"ltv":1250.50,"tags":["vip","high_value","loyal"]}'

),

(

4,

'2025-01-04 10:15:00',

101,

'{"session_id":"s_001","source":"organic","campaign":"","device":"desktop","os":"Windows","browser":"Chrome"}',

'{"event_name":"checkout","cart_value":899.99,"items_count":1,"coupon_code":"SAVE20","discount_amount":180.00,"final_price":719.99,"payment_method":"credit_card"}',

'{"name":"Alice","country":"US","age":28,"premium":true,"ltv":1250.50,"tags":["vip","high_value","loyal"]}'

),

(

5,

'2025-01-04 10:20:00',

102,

'{"session_id":"s_002","source":"paid_search","campaign":"winter_sale","device":"mobile","os":"iOS","browser":"Safari"}',

'{"event_name":"page_view","page":"/sale","category":"clothing","load_time_ms":512,"user_action":"view"}',

'{"name":"Bob","country":"UK","age":35,"premium":false,"ltv":245.30,"tags":["new_user","price_sensitive"]}'

),

(

6,

'2025-01-04 10:25:00',

102,

'{"session_id":"s_002","source":"paid_search","campaign":"winter_sale","device":"mobile","os":"iOS","browser":"Safari"}',

'{"event_name":"product_view","product_id":"SKU_456","price":49.99,"category":"clothing","reviews_count":234,"rating":4.5}',

'{"name":"Bob","country":"UK","age":35,"premium":false,"ltv":245.30,"tags":["new_user","price_sensitive"]}'

),

(

7,

'2025-01-04 10:30:00',

102,

'{"session_id":"s_002","source":"paid_search","campaign":"winter_sale","device":"mobile","os":"iOS","browser":"Safari"}',

'{"event_name":"page_view","page":"/checkout","load_time_ms":450,"steps_completed":1,"total_steps":3,"error":null}',

'{"name":"Bob","country":"UK","age":35,"premium":false,"ltv":245.30,"tags":["new_user","price_sensitive"]}'

),

(

8,

'2025-01-04 10:35:00',

103,

'{"session_id":"s_003","source":"direct","campaign":"","device":"desktop","os":"Mac","browser":"Firefox"}',

'{"event_name":"search","query":"winter jackets","results_count":42,"filters":{"color":"black","size":"M"},"sort_by":"price_asc"}',

'{"name":"Carol","country":"CA","age":42,"premium":true,"ltv":3500.75,"tags":["vip","long_term","high_engagement"]}'

);
```
В DDL поля JSON помечены как `String`. Он просто хранит текст JSON как есть; парсинг делается уже в запросах функциями `JSONExtract*`, `JSON_VALUE`, `JSON_QUERY` и т.п.

Такой подход:

- беспроблемно принимает любой JSON, даже с «плавающей» схемой;
    
- даёт возможность позже выделить нужные поля в отдельные столбцы

Сделаю еще маленькую ремарку по DDL таблицы. В Clickhouse один из самых популярных движков таблиц - это MergeTree и он требует `ORDER BY` . Он задаёт и сортировку, и первичный ключ (если не указан первичный ключ).

При небольшом количестве данных можно сильно не запариваться над индексом. Теория ниже тоже скорее вам пригодится в боевых условиях с большими данными, либо на собесах;)
## Что делает MergeTree

- Данные пишутся батчами: каждый `INSERT` создаёт отдельные parts (части таблицы) на диске. Поэтому лучше в реальных боевых условиях запихивать данные пачками, а не точечно (если данных много). Буквально цитируя документацию клика:
  ```
  Рекомендуем вставлять данные пакетами как минимум по 1 000 строк, а в идеале — от 10 000 до 100 000 строк. Более редкие, но более крупные вставки снижают количество записываемых кусков (parts), минимизируют нагрузку на слияния и уменьшают общее потребление ресурсов системы.
  ```

- Внутри каждой части строки **отсортированы по ключу из `ORDER BY`**, а для этого ключа строится разреженный первичный индекс(индекс, который хранит **не каждую** строку, а «маячки» на группы строк (блоки/гранулы)) по гранулам (обычно блоки по несколько тысяч строк).
    
- Фоновые подкапотные потоки кликхауза периодически **мерджат** части: объединяют и пересортировывают их, сохраняя общий порядок по ключу сортировки.
    

## Зачем нужен ORDER BY

- `ORDER BY (timestamp, user_id)` задаёт **ключ сортировки**: все данные в каждой части будут физически лежать в этом порядке.
    
- На основе этого ключа строится **первичный индекс** (если явно не указан `PRIMARY KEY` — он совпадает с `ORDER BY`).
    
- При запросах с фильтрами по `timestamp` и/или `user_id` движок может по индексу быстро найти нужные гранулы и **пропустить чтение огромных кусков данных**, вместо скана всей таблицы.


Итак мы сделали жисон таблицу и теперь можем поковырять наши JSON!

## **JSONExtractString** — Простое извлечение строк

Проверенные временем функции по извлечению данных из JSON:

```
-- Извлекаем основные параметры из JSON

SELECT

event_id,

timestamp,

user_id,

JSONExtractString(event_properties, 'event_name') AS event_name,

JSONExtractString(event_properties, 'product_id') AS product_id,

JSONExtractString(user_profile, 'country') AS user_country,

JSONExtractString(session_data, 'source') AS traffic_source

FROM web_analytics

ORDER BY event_id;
```

![[poligon_clickhouse_functions_1.png]]

Мы смогли распарсить информацию из JSON и посмотреть информацию по событиям юзеров, источникам их прихода, продуктам, географии.

SKU - это **уникальный код товарной позиции** (Stock Keeping Unit), по сути «артикул» конкретного варианта товара: сочетание модели, цвета, размера, упаковки и т.п

## **JSONExtract с типизацией** — Извлечение разных типов данных

```
-- Извлекаем разные типы: String, Int, Float, UInt8 (для Boolean)
SELECT
    event_id,
    JSONExtractString(event_properties, 'event_name') AS event_name,
    JSONExtract(event_properties, 'price', 'Float64') AS product_price,
    JSONExtract(event_properties, 'quantity', 'UInt32') AS quantity,
    JSONExtract(event_properties, 'discount_amount', 'Nullable(Float64)') AS discount,
    JSONExtract(user_profile, 'age', 'UInt32') AS user_age,
    JSONExtract(user_profile, 'premium', 'UInt8') AS is_premium  -- 1 = true, 0 = false
FROM web_analytics
WHERE JSONExtractString(event_properties, 'event_name') IN ('add_to_cart', 'checkout');
```
![[poligon_clickhouse_functions_2.png]]

В связке с фильтром по `event_name` запрос фактически формирует выборку «покупательских» событий: кто оформлял заказы, что, по какой цене и с какой скидкой, и был ли пользователь премиальным.

Для продуктовой аналитики событие `checkout` обычно означает:

- Пользователь перешёл из корзины к оформлению заказа (начало воронки оплаты);
    
- По нему считают конверсию из «добавил в корзину» в «начал оформлять» и анализируют дроп‑офф (где люди уходят).

Что касается работы с JSON, то тут мы уже конкретно парсим и приводим к нужным типам данных наши новые колонки, полученные из прибывших JSON.

## **JSONExtractKeysAndValuesRaw** — Парсинг всех ключ-значений

Извлекаем все ключ-значения из профиля пользователя в формате кортежей:

```
SELECT
    event_id,
    user_id,
    JSONExtractKeysAndValuesRaw(user_profile) AS all_user_attributes
FROM web_analytics
LIMIT 3;
```

![[poligon_clickhouse_functions_3.png]]
##  **Вложенные JSON + глубокое извлечение**

Здесь мы извлекаем вложенные объекты (например, filters внутри event_properties). Жисоны внутри жисонов! Я и такое встречал, правда мне надо было в постгресе с этим работать:
```
-- Извлекаем вложенные объекты (например, filters внутри event_properties)
SELECT
    event_id,
    JSONExtractString(event_properties, 'event_name') AS event_name,
    -- Извлекаем вложенный объект 'filters' как сырую строку
    JSONExtractRaw(event_properties, 'filters') AS filters_raw,
    -- Далее парсим его из RAW
    JSONExtractString(
        JSONExtractRaw(event_properties, 'filters'),
        'color'
    ) AS color_filter
FROM web_analytics
WHERE JSONExtractString(event_properties, 'event_name') = 'search';
```

![[poligon_clickhouse_functions_4.png]]

В запросе смотрим цвета товаров, которые искал юзер.

##  **JSON_EXISTS — Проверка наличия ключа**

Проверяем, есть ли определённые поля в JSON

`$.product_id` здесь не регулярное выражение, а **JSONPath‑выражение**: путь к полю `product_id` в JSON‑объекте.​

- `$` — корень JSON‑документа (весь жысон целиком).​
- `.product_id` — ключ `product_id` на первом уровне внутри этого объекта.

В более сложной вложенности (2 уровень) было бы так например:

`$.product.price` — поле `price` внутри объекта `product`
```
-- Проверяем, есть ли определённые поля в JSON (используя JSONPath синтаксис)
SELECT
    event_id,
    JSONExtractString(event_properties, 'event_name') AS event_name,
    JSON_EXISTS(event_properties, '$.product_id') AS has_product_id,
    JSON_EXISTS(event_properties, '$.discount_amount') AS has_discount,
    JSON_EXISTS(event_properties, '$.error') AS has_error,
    JSON_EXISTS(user_profile, '$.premium') AS has_premium_flag
FROM web_analytics;

```
Из запроса на скрине видно, что мы нашли поле error у event_id 7 (возможное свидетельство ошибок, или остаточный аппендикс в работе сервиса - повод сообщить разрабам!). Ну, или, например, убедились, что во всех JSON есть пометка о премиум статусе и т.д.

![[poligon_clickhouse_functions_5.png]]


Я показал базовую работу с JSON в Clickhouse. Сейчас пока отвлечемся от жисонов и попробуем Еще другие прикольные функции кликхауза со сложными типами данных, но не жисонами!

Я бахну таблицу с 3 колонками. Опять же попробуем симулировать что-то близкое к маркетинговой или продуктовой аналитике: события, юзеры, время событий:

```

-- Создаём таблицу с нативным движком для примеров

CREATE TABLE events (

    user_id UInt32,

    event String,

    event_timestamp DateTime

) ENGINE = MergeTree()

ORDER BY (event_timestamp);

  

-- Вставляем тестовые данные с различными типами событий

INSERT INTO events VALUES

(1, 'click', '2025-01-04 10:00:00'),

(1, 'view', '2025-01-04 10:01:00'),

(1, 'add_to_cart', '2025-01-04 10:02:00'),

(1, 'checkout', '2025-01-04 10:03:00'),

(2, 'click', '2025-01-04 10:05:00'),

(2, 'view', '2025-01-04 10:06:00'),

(2, 'click', '2025-01-04 10:07:00'),

(3, 'click', '2025-01-04 10:10:00'),

(3, 'add_to_cart', '2025-01-04 10:11:00'),

(3, 'checkout', '2025-01-04 10:12:00'),

(1, 'purchase', '2025-01-04 10:04:00'),

(2, 'purchase', '2025-01-04 10:08:00');
```

Таблицу ==events== я положил рядом с JSONовой таблицей в папке ==clickhouse_sql== 

## **groupArray** — Агрегирование всех значений в массив

Собираем все события пользователя и их таймстампы в массивы с помощью groupArray.


```
SELECT
    user_id,
    groupArray(event) AS event_sequence,
    groupArray(event_timestamp) AS timestamps
FROM events
GROUP BY user_id
ORDER BY user_id;
```
![[poligon_clickhouse_functions_6.png]]
Мы смогли сгруппировать у каждого юзера набор событий, который он совершал у нас в продукте. Это может быть полезно в аналитике и статистических моделях. И кликхауз здесь как раз и дает такую возможность. 

Далее уже можно будет в следующих трансформациях сортировать по timestamps события у каждого юзера. У нас так получилось только благодаря везению с исходными данными.

## **ARRAY JOIN** — "Развёртывание" массивов в отдельные строки

Простой пример:

  

```

SELECT [1, 2, 3] AS nums ARRAY JOIN nums AS num;

```

  

```

Результат:

num

1 

2 

3

```

Вернемся к events:

Обратная операция к groupArray: превращаем массивы обратно в строки. Берем прошлый запрос и разворачиваем все обратно. Здесь уже сделал код и для того, чтобы расставить ровно события по их времени внутри "сессий" юзера.

```
SELECT
    user_id,
    event,
    event_index
FROM (
    SELECT
        user_id,
        groupArray(event) AS events,
        arrayEnumerate(groupArray(event)) AS indices
    FROM events
    GROUP BY user_id
)
ARRAY JOIN events AS event, indices AS event_index
ORDER BY user_id, event_index;

-- Результат: каждое событие в отдельной строке с его индексом

```
То есть в результирующую колонку event протягиваем "колбасой" элементы массива events, а в evnet_indexes протягиваем индексы из функции **arrayEnumerate**.


`arrayEnumerate`: Эта функция добавляет каждому элементу массива его индекс (позицию) и возвращает массив пар (индекс, значение). Это полезно для анализа последовательности элементов или отслеживания их порядка.
![[poligon_clickhouse_functions_7.png]]

Запрос развернул нам массивы и пронумеровал события в рамках активности каждого юзера (проведя и сортировку по времени во вложенном запросе, которой не было в прошлый раз)
## **arrayMap с lambda-функциями** — Преобразование элементов массива

В ClickHouse есть три разных сущности: **Map‑тип**, **лямбда‑функции** и **arrayMap** как функция высшего порядка над массивами.

- **`Map(K, V)`** — отдельный тип данных: ассоциативный массив «ключ → значение», например `Map(String, Float64)` для `{"color": "red", "price": 10.5}`.
    
- Хранится как два параллельных массива (`keys`, `values`) внутри колонки и используется, когда у строки может быть разное число пар ключ‑значение (теги, атрибуты и т.п.).
## Лямбда‑функция

- Лямбда в ClickHouse — это **анонимная функция**, записывается в виде `x -> выражение`, например `x -> x * 2`По сути как и в том же Python, например​
    
- Используется в функциях высшего порядка (arrayMap, arrayFilter и т.д.), которые применяют её к элементам массива `Array`​
    
Примеры лямбд:

- `x -> x * 2` — умножить элемент на 2.
- `(name, age) -> concat(name, ' ', toString(age))` — функция от двух аргументов.

## arrayMap

`arrayMap` Позволяет применить заданное выражение или функцию к каждому элементу массива. Это полезно для преобразования данных в массиве по определенному правилу.

**Синтаксис**: `arrayMap(x -> expression, array)`

`x`: Переменная, представляющая текущий элемент массива.

`expression`: Выражение или функция, применяемая к каждому элементу массива.

`array`: Исходный массив, элементы которого будут преобразованы или, что чаще всего и бывает - имя столбика с массивами.

Пример:
```
-- Умножить все числа на 2 
SELECT arrayMap(x -> x * 2, [1, 2, 3]) AS res; 
--  Результатом будет массив [2, 4, 6]`
```

##  Как работает arrayMap с двумя массивами

Общий вид:


`arrayMap((a, b) -> выражение, arr1, arr2)`

- Берёт `arr1` и `arr2` **параллельно**, по одной паре элементов с одинаковым индексом:
    
    - шаг 1: `(arr1[1], arr2[1])`
        
    - шаг 2: `(arr1[2], arr2[2])`
        
    - и т.д.
        
- На каждой паре вызывает, например, лямбду `(a, b) -> ...` и результат записывает в новый массив.

​
Теперь, узнав основы, посмотрим пример сложнее с таблицей events. Разметим не только индексы событий у каждого юзера, но и посмотрим разницу по времени между событиями у одного юзера (у нас игрушечный пример, везде разница должна быть 60 сек)
![[poligon_clickhouse_functions_8.png]]
```
-- arrayMap с lambda-функциями - Преобразование элементов массива, с двумя массивами

WITH user_events AS (

    SELECT

        user_id,

        groupArray(event) AS events,

        groupArray(toUnixTimestamp(event_timestamp)) AS timestamps

    FROM (

        SELECT

            user_id,

            event,

            event_timestamp

        FROM events

        ORDER BY user_id, event_timestamp

    )

    GROUP BY user_id

)

  

SELECT

    user_id,

    events AS original_events,

    arrayEnumerate(events) AS event_positions, -- индексы 1,2,3,...

    arrayMap(

        (ts, i) -> if(i = 1, 0, ts - timestamps[i-1]),

        timestamps,

        arrayEnumerate(timestamps)

    ) AS time_deltas

FROM user_events;
```
В нашем случае:
```
arrayMap(
    (ts, i) -> ...,
    timestamps,                  -- первый массив
    arrayEnumerate(timestamps)   -- второй массив
)
```

Значит:

- на первом шаге: `ts = timestamps[1]`, `i = 1`
    
- на втором: `ts = timestamps[2]`, `i = 2`
    
- на третьем: `ts = timestamps[3]`, `i = 3`

`if(i = 1, 0, ts - timestamps[i-1])` -  Если это первый элемент массива в серии событий, то логично, что разница с прошлым будет 0. В остальных случаях считаем разницу по времени `ts - timestamps[i-1]` с прошлым элементом.

`toUnixTimestamp(event_timestamp)` превращает обе даты во **время в секундах**, и разность двух чисел даёт число в секундах.

Да, тот же результат по дельтам времени можно посчитать оконной функцией `lag` без arrayMap, но мне хотелось показать работу именно этих Clickhouse функций:)

##  **Лямбды к словарям с фильтрацией (arrayFilter)** — Выбор только конверсионных событий

Давайте попробуем еще поиграться с мапами и условиями/фильтрами:

```
-- Из всех событий выбираем только конверсионные (checkout, purchase)

WITH user_events AS (

SELECT

user_id,

groupArray(event) AS events,

groupArray(event_timestamp) AS timestamps

FROM events

GROUP BY user_id

)

SELECT

user_id,

events AS all_events,

-- Фильтруем только события покупок

arrayFilter(x -> (x = 'checkout' OR x = 'purchase'), events) AS conversion_events,

-- Подсчитываем количество конверсионных событий

length(arrayFilter(x -> (x = 'checkout' OR x = 'purchase'), events)) AS conversion_count

FROM user_events

ORDER BY user_id;
```
На скрине выполненного запроса видно, что в conversion_events мы четко отфильтровали и оставили в массиве только нужные нам значения конверсионных событий. 

Более того, подсчитав длину массивов с конверсионными событиями можно тут же и посчитать их количество. Удобно!

![[poligon_clickhouse_functions_9.png]]


**Давайте теперь поробуем совместить работу с JSON и сложными типами данных! Для этого я сделал таблицу user_journey**
```
-- Таблица user_journey с JSON структурой для хранения событий пользователя

CREATE TABLE user_journey (

user_id UInt32,

events_json String -- JSON массив событий: [{"event_name": "click", "event_ts": "2025-01-04 10:00:00", "event_value": 0.5}, ...]

) ENGINE = MergeTree()

ORDER BY user_id;

  

-- Вставляем тестовые данные с JSON событиями

INSERT INTO user_journey VALUES

(1, '[{"event_name":"click","event_ts":"2025-01-04 10:00:00","event_value":0.5},{"event_name":"view","event_ts":"2025-01-04 10:01:00","event_value":1.0},{"event_name":"purchase","event_ts":"2025-01-04 10:04:00","event_value":99.99}]'),

(2, '[{"event_name":"click","event_ts":"2025-01-04 10:05:00","event_value":0.5},{"event_name":"click","event_ts":"2025-01-04 10:07:00","event_value":0.5},{"event_name":"purchase","event_ts":"2025-01-04 10:08:00","event_value":49.99}]'),

(3, '[{"event_name":"click","event_ts":"2025-01-04 10:10:00","event_value":0.5},{"event_name":"add_to_cart","event_ts":"2025-01-04 10:11:00","event_value":5.0}]');
```

В этой таблице у каждого юзера есть массив событий, их таймстампов и числовых значений. Также есть event_values - пусть это будут условные числовые метрики (в жизни это могут быть веса для статистики, время выполнения события и т.д.)

## **arrayReduce - агрегация массивов**

**Функция** `arrayReduce`: Применяет агрегатную функцию ко всем элементам массива. Это удобно для выполнения агрегирования данных после их предварительной обработки.

**Синтаксис**: `arrayReduce('aggregate_function', array)`

`aggregate_function`: Название агрегатной функции, такой как `sum`, `avg`, `min`, `max`, `uniq`, `count` и другие.

`array`: Массив, к элементам которого применяется агрегатная функция.

```
WITH user_events AS (

    SELECT

        user_id,

        toFloat32(JSONExtractString(event_json, 'event_value')) AS values

    FROM user_journey

    ARRAY JOIN JSONExtractArrayRaw(events_json) AS event_json

)

SELECT

    user_id,

    groupArray(values) AS event_values,

    -- Сумма через arrayReduce

    arrayReduce('sum', groupArray(values)) AS total_value,

    -- Среднее через arrayReduce

    arrayReduce('avg', groupArray(values)) AS avg_value,

FROM user_events

GROUP BY user_id;
```
![[poligon_clickhouse_functions_10.png]]

В запросе также есть еще один примечательный момент - Работа с массивами внутри JSON! В CTE разворачиваем JSON-массив events_json в строки (помним про вертикальную колбаску!) через ARRAY JOIN JSONExtractArrayRaw(events_json) AS event_json.


В основном запросе группируем по user_id, собираем все числовые значения событий пользователя в массив event_values. Потом считаем сумму всех значений событий пользователя (total_value) и среднее значение событий пользователя (avg_value).

Результат: по одной строке на пользователя с массивом значений его событий, суммой и средним.

## **mapFromArrays для создания словарей**


`mapFromArrays` — это функция в ClickHouse, которая создаёт **Map** (словарь, где есть ключи и значения) из двух массивов: одного массива ключей и одного массива значений.​


**Синтаксис:**

`mapFromArrays(ключи, значения)`

**Простой пример:**

`SELECT mapFromArrays(['a', 'b', 'c'], [1, 2, 3])`

**Результат:**

`{'a':1, 'b':2, 'c':3}`

Попробуем с user_journey:

```

-- Создаём словарь событие → количество для каждого пользователя

WITH event_counts AS (

    SELECT

        user_id,

        JSONExtractString(event_json, 'event_name') AS event,

        count() AS cnt

    FROM user_journey

    ARRAY JOIN JSONExtractArrayRaw(events_json) AS event_json

    GROUP BY user_id, event

)

SELECT

    user_id,

    -- Преобразуем результаты в Map (ключ: событие, значение: количество)

    mapFromArrays(

        groupArray(event),

        groupArray(cnt)

    ) AS event_map

FROM event_counts

GROUP BY user_id

ORDER BY user_id;

  

-- Результат: {click: 2, view: 1, purchase: 1} для user_id=1
```

![[poligon_clickhouse_functions_11.png]]
Из двух массивов по событиям и их счетчику получили map  с набором событий и их количеством

