В данной статье разберем алертинг через телеграм по Data QA

Прошлые статьи в рамках домашнего полигона дата инженерии и аналитики:
  
Как поставить WSL, docker и убунту в него и Dbeaver для работы с БД 

[[1 Часть Dbeaver Docker WSL Ubuntu]]

Как развернуть у себя Clickhouse локально: 

[[2 Часть Локальное поднятие Clickhouse]]

Как подготовить VS code и WSL к работе на полигоне

[[3 Часть Подготовка WSL и VS code к полигону]]

Большой гайд по развертыванию Airflow+DBT

[[4 часть Разворачиваем Airflow 3.0.3 и DBT]]

Как сделать свой репозиторий под полигон

[[5 часть Свой репозиторий github под полигон]]


Я сделал несколько нововведений в репозиторий полигона, чтобы можно было получить clickhouse-airflow-dbt сразу из коробки из коробки в докере на любой ОС. Подробнее - в 6 части статей полигона: [[6 часть Все из коробки и настройка ресурсов]]

Чтобы посмотреть изменения, можно склонировать(или сделать pull, если клонировали) изменения из репозитория https://github.com/Byaha98/bigdata_poligon/tree/main. Для полноценного алертинга надо будет создать своего бота и соединить его с Airflow (покажу в гайде далее)

Итак, первое, что нужно сделать - это создать тг бота, который будет нам алертить

![[poligon_telegram_1.png]]

Надо найти батю всех ботов и создать бота -
@BotFather

Тут же будут и настройки.

![[poligon_telegram_2.png]]


Чтобы создать бота вводим /newbot.

Предложат назвать его. Я назову Barsik.

Предложат назвать никнейм с суффиксом_bot, я назову Barsik_alert_bot.

Наконец нам выдадут токен для доступа к нашему боту по апи, никому его не показывайте и храните у себя.
![[poligon_telegram_3.png]]

Далее зайдите в ЛС к своему боту и напишите что-нибудь.
![[poligon_telegram_4.png]]
Нам теперь нужно найти id чата нашего общения с ботом, чтобы он нам присылал алертинг, для этого надо будет зайти в нашего бота через токен.

Получим свой chat_id: напишем что‑нибудь боту, затем откроем  в браузере

```
https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/getUpdates 
```
и посмотрим id чата.

Если не видно ничего, можно написать боту в лс повторно и обновить страничку в браузере (на скрине я еще раз написал “hi”)

![[poligon_telegram_5.png]]
Готово! id моего с ботом чата - 967738053

Мы знаем id чата, мы знаем токен бота и этого хватит для алертинга.

В прошлых гайдах у нас была первая dbt модель, которую мы запускали
по пути:
bigdata_poligon/airflow_dbt/dbt/poligon/models/example/my_first_dbt_model.sql

Вот ее код:

  
```
/*

Welcome to your first dbt model!

Did you know that you can also configure models directly within SQL files?

This will override configurations stated in dbt_project.yml

  

Try changing "table" to "view" below

*/

  
  

{{ config(materialized='table') }}

  

with source_data as (

  

    select 1 as id

    union all

    select null as id

  

)

  

select *

from source_data 

/*

Uncomment the line below to remove records with null `id` values

*/

  

-- where id is not null
```


Как видим, у нас тут две строчки: одна с цифрой 1, вторая со значением null

dbt-core «из коробки» даёт 4 стандартных generic‑теста:

| Тест              | Назначение                                                                           |
| ----------------- | ------------------------------------------------------------------------------------ |
| `not_null`        | Колонка не содержит NULL​                                                            |
| `unique`          | Значения в колонке уникальны                                                         |
| `accepted_values` | Значения входят в заданный список​                                                   |
| `relationships`   | FK‑связь FK (foreign key) связь: значения в колонке есть в другой таблице/колонке. ​ |
Давайте сделаем два стандартных теста - один accepted values должен принимать значение “1” и пройти, а второй not_null должен провалиться и дать нам наш желанный алертинг.

В полигоне уже есть файл schema.yml, в котором есть описание dbt моделей (и нашей модели), также можно индивидуально создавать ямлики под каждую модель или описывать тесты в dbt_project.yml - вариантов много.

Пойдем по пути наименьшего сопротивления :)

в schema yaml пропишем необходимые тесты:


![[poligon_telegram_6.png]]

```
version: 2

  

models:

  - name: my_first_dbt_model

    description: "A starter dbt model"

    columns:

      - name: id

        description: "The primary key for this table"

        data_tests:

          - not_null

          - accepted_values:

              values: [1]

  

  - name: my_second_dbt_model

    description: "A starter dbt model"

    columns:

      - name: id

        description: "The primary key for this table"

        data_tests:

          - unique

          - not_null
```
Итак, как видно, мы добавили нужные тесты к my_first_dbt_model

Теперь нужно создать Airflow DAG, который будет тестировать dbt модель после ее запуска и отсылать алертинг в случае провала какого-либо теста. При этом, надо соединить Airflow с ботом.

У нас не хватает провайдера Airflow для телеграма, поэтому надо будет пересобрать Airflow с ним.

Заходим в папку airflow_dbt в Dockerfile и добавляем туда установку провайдера для телеграма:
```
RUN pip install --no-cache-dir \
    airflow-code-editor==8.0.1 \
    black isort fs-s3fs \
    dbt-core==1.10.4 \
    dbt-clickhouse==1.9.2 \
    airflow-clickhouse-plugin==1.5.0 \
    apache-airflow-providers-telegram
```     
![[poligon_telegram_7.png]]

Отлично! Теперь надо все пересобрать (на маке у меня команды пишутся как docker-compose (я установил docker в Colima), на винде в WSL как docker compose):

Бахаем:
```
docker compose down - убираем старые контейнеры
```
Теперь строим новые образы:
  
```
docker compose build
```
  
![[poligon_telegram_8.png]]
После того, как сделали build, запускаем сначала init:

  
```
docker compose up airflow-init
```

Ждем надписи  окончания развертывания:
```

airflow-init-1 exited with code 0

```
Поднимаем все остальные контейнеры через команду:

```
docker compose up -d
```

![[poligon_telegram_9.png]]

Заходим по ссылке в браузере http://localhost:8080

Заходим в раздел Admin - connections, жмем add connection.
![[poligon_telegram_10.png]]

В разделе connection type находим telegram. 

![[poligon_telegram_11.png]]
Connection ID пишем какой нам будет удобен в коде, например
tg_alerting

Затем откроются и другие поля для заполнения. В разделе standart fields в поле password вводим токен нашего бота, который нам выдал батяня всех ботов. Можно заполнить description по желанию, поле host не нужно.

![[poligon_telegram_12.png]]

Далее откроем раздел extra_fields JSON и введем id нашего чата
```
{
  "chat_id": 967738053
}
```
![[poligon_telegram_13.png]]

Для телеграм каналов алгоритм будет тот же. Единственный нюанс: в ТГ канале бота надо сделать администратором, чтобы он нормально работал и посылал алерты в канал.

Жмем save и видим, что коннекшен создался!

![[poligon_telegram_14.png]]
Теперь ничего не мешает создать Airflow DAG, где мы будем тестировать нашу DBT модель (и таблицу соответственно) и отправлять алертинг в случае провала Data QA тестов DBT. Как мы помним, тест на null точно должен провалиться.

Я сделал код DAG поближе к моим реальным рабочим задачам на моих местах работы:

1)Есть функция отправки сообщения о провале Data QA теста в телеграм через бота

2)Есть dbt run задача на my_first_dbt_model

3)Есть отдельные dbt test задачи на каждый тест. В боевых условиях все на ваш вкус и обстоятельства - можно дробить задачи вплоть до каждого теста, можно тестировать все в одной задаче. В любом случае, если терминал DBT почует провал теста, то это считает и Airflow. Удобно!

Прилагаю код DAGа (должен лежать в папке DAGs):

  
```
  

"""

DAG: Запуск dbt run и dbt test для модели my_first_dbt_model

  

- Сначала выполняет dbt run для модели my_first_dbt_model

- Затем выполняет тест accepted_values

- Затем выполняет тест not_null

"""

  

from __future__ import annotations

  

import logging

import os

import subprocess

from datetime import datetime

  

from airflow.decorators import dag, task

from airflow.providers.telegram.hooks.telegram import TelegramHook

from airflow.hooks.base import BaseHook

  

logger = logging.getLogger(__name__)

  

# Путь к проекту dbt

DBT_PROJECT_DIR = "/opt/dbt/poligon"

  

# Connection ID для Telegram алертов

TELEGRAM_CONN_ID = "tg_alerting"

  
  

def send_telegram_alert(message: str, task_name: str, column_name: str):

"""

Отправляет алерт в Telegram при провале теста

"""

try:

# Получаем connection для извлечения chat_id

conn = BaseHook.get_connection(TELEGRAM_CONN_ID)

chat_id = conn.extra_dejson.get("chat_id")

if not chat_id:

logger.warning("chat_id not found in connection extra, skipping alert")

return

# Формируем текст сообщения без Markdown для простоты

text = (

f"🚨 Ошибка в DAG: dbt_run_my_first_model\n\n"

f"Задача: {task_name}\n"

f"Столбец: {column_name}\n"

f"Сообщение:\n{message}"

)

# Инициализируем hook с chat_id

telegram_hook = TelegramHook(telegram_conn_id=TELEGRAM_CONN_ID, chat_id=chat_id)

# Отправляем сообщение

telegram_hook.send_message({"text": text})

logger.info("✅ Алерт успешно отправлен в Telegram")

except Exception as e:

logger.error(f"❌ Ошибка отправки алерта в Telegram: {e}")

  

default_args = {

"retries": 0

}

  
  

@dag(

dag_id="dbt_run_my_first_model",

description="dbt run → accepted_values test → not_null test для модели my_first_dbt_model",

default_args=default_args,

start_date=datetime(2024, 1, 1),

schedule=None, # запуск только вручную

catchup=False,

tags=["dbt", "poligon"],

max_active_runs=1,

)

def dbt_my_first_model_runner():

"""

DAG для запуска dbt run и dbt test модели my_first_dbt_model

"""

  

# 1) Запуск dbt run для модели

@task()

def run_dbt_model():

"""

Запускает dbt run для модели my_first_dbt_model

"""

cmd = f"cd {DBT_PROJECT_DIR} && dbt run --select my_first_dbt_model"

logger.info("Запуск dbt run для модели: my_first_dbt_model")

logger.info("Команда: %s", cmd)

try:

completed = subprocess.run(

cmd,

shell=True,

check=True,

stdout=subprocess.PIPE,

stderr=subprocess.STDOUT,

text=True,

)

logger.info("dbt run output (my_first_dbt_model):\n%s", completed.stdout)

logger.info("✅ dbt run успешно выполнен для модели my_first_dbt_model")

except subprocess.CalledProcessError as e:

logger.error("❌ Ошибка dbt run для my_first_dbt_model: %s", e.stdout)

raise

  

# 2) Запуск теста accepted_values

@task()

def test_accepted_values():

"""

Запускает тест accepted_values для модели my_first_dbt_model

"""

# Запускаем только тесты типа accepted_values для модели my_first_dbt_model

# Используем синтаксис: модель,test_name:accepted_values

cmd = f"cd {DBT_PROJECT_DIR} && dbt test --select my_first_dbt_model,test_name:accepted_values"

logger.info("Запуск теста accepted_values для модели: my_first_dbt_model")

logger.info("Команда: %s", cmd)

try:

completed = subprocess.run(

cmd,

shell=True,

check=True,

stdout=subprocess.PIPE,

stderr=subprocess.STDOUT,

text=True,

)

logger.info("dbt test accepted_values output:\n%s", completed.stdout)

logger.info("✅ Тест accepted_values успешно выполнен")

except subprocess.CalledProcessError as e:

error_msg = f"Тест accepted_values провален для модели my_first_dbt_model\n\nОшибка:\n{e.stdout}"

logger.error(f"❌ Ошибка теста accepted_values: {e.stdout}")

send_telegram_alert(error_msg, "test_accepted_values", "id")

raise

  

# 3) Запуск теста not_null

@task()

def test_not_null():

"""

Запускает тест not_null для модели my_first_dbt_model

"""

# Запускаем только тесты типа not_null для модели my_first_dbt_model

# Используем синтаксис: модель,test_name:not_null

cmd = f"cd {DBT_PROJECT_DIR} && dbt test --select my_first_dbt_model,test_name:not_null"

logger.info("Запуск теста not_null для модели: my_first_dbt_model")

logger.info("Команда: %s", cmd)

try:

completed = subprocess.run(

cmd,

shell=True,

check=True,

stdout=subprocess.PIPE,

stderr=subprocess.STDOUT,

text=True,

)

logger.info("dbt test not_null output:\n%s", completed.stdout)

logger.info("✅ Тест not_null успешно выполнен")

except subprocess.CalledProcessError as e:

error_msg = f"Тест not_null провален для модели my_first_dbt_model\n\nОшибка:\n{e.stdout}"

logger.error(f"❌ Ошибка теста not_null: {e.stdout}")

send_telegram_alert(error_msg, "test_not_null", "id")

raise

  

# Зависимости: run_dbt_model -> test_accepted_values -> test_not_null

run_dbt_model() >> test_accepted_values() >> test_not_null()

  
  

# Создание экземпляра DAG

dag_instance = dbt_my_first_model_runner()

```
![[poligon_telegram_15.png]]


Запускаем наш DAG в Airflow. Видим, что запуск модели (таблички) прошел успешно, как и тест на accepted values. А вот тест на null, как и ожидалось, провалился.


![[poligon_telegram_16.png]]

В свою очередь я получил сообщение о провале Data QA теста от бота барсика:

![[poligon_telegram_17.png]]
Вот и все! В логах видна основная информация о провале Data QA теста, в том числе и выдержки из терминала! Гоооооол!