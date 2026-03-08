

Ну наконец-то гайд по Airflow+DBT!💪

  

Прошлые статьи в рамках домашнего полигона дата инженерии и аналитики:

  

Как поставить WSL, docker и убунту в него и Dbeaver для работы с БД 
[[1_1 Dbeaver Docker WSL Ubuntu]]
Как развернуть у себя Clickhouse локально: 
[[1_2 Локальное поднятие Clickhouse]]
Как подготовить VS code и WSL к работе на полигоне
[[1_3 Подготовка WSL и VS code к полигону]]

  

Итак, Airflow с DBT внутри будем поднимать через Docker compose. Шо это такое?


docker-compose — это инструмент для запуска нескольких контейнеров сразу, с помощью одного YAML-файла (docker-compose.yml).


Вместо того чтобы запускать каждый контейнер по отдельности и вручную прописывать кучу команд, ты описываешь, что и как нужно запустить, в одном конфиге.

  

Пример:

Хочешь развернуть Airflow? Он состоит из нескольких частей:

  

1. web-интерфейс (UI),

  

2. scheduler (планировщик),

  

3. база данных

  

Это как минимум😓

  

С docker-compose ты просто пишешь, как всё это должно работать вместе — и запускаешь одной командой.🦋

  

Заходим в наш Workspace в Vs Code из прошлого гайда и создаем папку для докер композа (изначально я назвал ее docker_folder, но лучше наверное airflow_dbt назвать или как-то так) 

  

В случае переименования папки, но при этом вы ранее запускали из старой папки контейнеры, почистите контейнеры и сети от старой папки: 

```
docker compose -p docker_folder  down --volumes
```

Открываем папку poligon из терминала:
  
```
su konstantin
```
  
Тут понятно, что это ваш юзер будет,  у меня в данном случае konstantin

Делаем нашу папку:


```
mkdir docker_folder
```
  

Далее вводим группу команд (каждую по очереди) для рекурсивного доступа нашего юзера ко всему потенциальному содержимому папки:

```
sudo chown -R konstantin:konstantin /home/konstantin/poligon/docker_folder
```
```
sudo apt install acl
```
```
chmod g+s /home/konstantin/poligon/docker_folder
```
```
sudo setfacl -R -m u:konstantin:rwx,g:konstantin:rwx /home/konstantin/poligon/docker_folder
```
```
sudo setfacl -R -d -m u:konstantin:rwx,g:konstantin:rwx /home/konstantin/poligon/docker_folder
```
![[Служебное. Вложения/poligon_airflow_dbt_1.png]]
Эти команды делают следующее:


1. Рекурсивно назначают вас (konstantin в моем случае) владельцем всех файлов и папок.

2. Устанавливают поддержку расширенных прав (ACL), чтобы можно было гибко задавать разрешения.

3. Включают setgid, чтобы новые файлы унаследовали нужную группу.

4. С помощью ACL дают тебе и твоей группе постоянный полный доступ к текущим и любым будущим файлам в папке.

  

Далее в папке:


В ней создаем файл с нехитрым названием Dockerfile(без расширения .)


Заполняем файл следующим содержимым:

```
# Используем официальный образ Apache Airflow версии 3.0.3 НОВЕЙШИЙ ДЫАААА

FROM apache/airflow:3.0.3

#1000-Это наш пользователь с хостовой машины, который будет запускать Airflow и DBT

#Если вы не знаете свой UID, то введите в терминале команду id и посмотрите на значение UID

USER root

# Установка Python и системных зависимостей

RUN apt-get update && apt-get install -y git

  

# Задаём доступы для юзеров airflow и default (UID 1000) для /opt/dbt и /opt/airflow

RUN mkdir -p /opt/dbt /opt/airflow/logs \

    && chown -R 1000:1000 /opt/dbt /opt/airflow \

    && chown -R airflow /opt/dbt /opt/airflow

USER 1000

#установка редактора кода для Airflow DAGs

# Установка DBT и ClickHouse-зависимостей

RUN pip install --no-cache-dir \

    airflow-code-editor==8.0.1 \

    black isort fs-s3fs \

    dbt-core==1.10.4 \

    dbt-clickhouse==1.9.2 \

    airflow-clickhouse-plugin==1.5.0

  

# Копируем шаблон profiles.yml Об этом файле позже в гайде

COPY dbt/profiles.yml /opt/dbt/profiles.yml  

```
      

Жмем ctrl+S для сохранения

Еще надо создать файл .env В нем будут храниться переменные окружения контейнеров.

.env — это обычный текстовый файл, в котором вы храните переменные окружения (environment variables) для контейнеров.

Он используется в docker-compose.yml, чтобы не прописывать конфиденциальные или часто меняющиеся данные напрямую в yaml-файле.

  

Создаем .env в этой же папке и наполняем следующим содержимым:

Проверьте, чтобы пароль кликхауза точно был пустым и без пробелов!

```

# =========================

# 🔗 ClickHouse Connection

# =========================

  

CLICKHOUSE_HOST=host.docker.internal

CLICKHOUSE_PORT=8123

CLICKHOUSE_USERNAME=default

CLICKHOUSE_PASSWORD=

CLICKHOUSE_DATABASE=default

CLICKHOUSE_RAW_DATA_SCHEMA=default

# Хост ClickHouse (используется из Docker контейнера; host.docker.internal — alias на локальную машину)

# HTTP-порт ClickHouse (стандарт: 8123)

# Пользователь ClickHouse

# Пароль (в данном случае пустой, что подходит для default)

# База данных по умолчанию

# Схема для "сырых" данных (RAW-фаза ELT/ETL процесса)

# ========================

# ✈️ Airflow (Docker-Compose)

# ========================

  

AIRFLOW_UID=1000  # UID пользователя внутри контейнера, совпадающий с текущим пользователем на хосте (например, `id -u`), чтобы не было проблем с правами 

  

# =====================

# 🛠 dbt (Data Build Tool)

# =====================

  

DBT_PROFILES_DIR=/opt/dbt  # Каталог, где dbt ищет profiles.yml (файл с настройками подключения к DWH).

# Переменная переопределяет дефолт (~/.dbt/) и фиксирует путь внутри контейнера
```

Далее создаем папку dbt (можно просто в VS code все создавать теперь) и создаем в ней файл profiles.yml. Наполняем его следующим содержимым:

```
poligon:

  target: dev

  outputs:

    dev:

      type: clickhouse

      driver: http

      host: "{{ env_var('CLICKHOUSE_HOST') }}"

      port: "{{ env_var('CLICKHOUSE_PORT') | as_number }}"  #| as_number — преобразует строку "8123" в число 8123

      user: "{{ env_var('CLICKHOUSE_USERNAME') }}"

      password: "{{ env_var('CLICKHOUSE_PASSWORD') }}"

      database: "{{ env_var('CLICKHOUSE_DATABASE') }}"

      schema: "{{ env_var('CLICKHOUSE_RAW_DATA_SCHEMA') }}"

      secure: false  # Если ClickHouse настроен на SSL, то нужно указать true, иначе false

  

#env_var(...) — функция dbt для загрузки переменных окружения из .env
```
  ![[Служебное. Вложения/poligon_airflow_dbt_2.png]]

Всё, что находится внутри {{ ... }}, обрабатывается через шаблонизатор Jinja2 — это тот же шаблонизатор, который используется внутри SQL-моделей DBT (в models/.sql), макросах и т.д. Мы его уже установили в прошлом гайде и впервые увидели воочию! Крутая хрень, скажу я вам!😎


Теперь создаем файл рядом и называем его docker-compose.yml для airflow. Это конфигурация нашего композика в формате ямл:


Я уже подготовил его, но он довольно большой, приложу под постом, бахаем его в docker_folder.
https://github.com/Byaha98/bigdata_knoweledge_base_ru/blob/main/%D0%91%D0%B0%D0%B7%D0%B0%20%D0%B7%D0%BD%D0%B0%D0%BD%D0%B8%D0%B9%20bigdata%20%D0%BD%D0%B0%20%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%BE%D0%BC%20%D1%8F%D0%B7%D1%8B%D0%BA%D0%B5/%D0%A1%D1%82%D0%B0%D1%82%D1%8C%D0%B8%20%D0%BF%D0%BE%20%D0%BF%D0%BE%D0%BB%D0%B8%D0%B3%D0%BE%D0%BD%D1%83%20BigData/airflow_dbt_compose/docker-compose.yml
  
  

Теперь все готово для запуска контейнеров. Нам нужен для этого старый добрый терминал. Жмем правой кнопкой мыши на папку docker_folder и бахаем "Open in Integrated Terminal".
![[Служебное. Вложения/poligon_airflow_dbt_3.png]]

Зайдем в нашего пользователя:

```
su пользовательнейм
```
  

Пора запустить наш композик!

Осторожно! Наш образ Airflow весит несколько гигабайт, особенно с Python + зависимостями. Освободите место на диске, если мало.

Бахаем:
  
```
docker compose build
```
  

Ждем, пока все построится. Может занимать от 2 до 30+ минут, в зависимости от вашего инета и компика. У меня около 20 минут заняло.

Если будете в будущем делать новые build с незначительными изменениями в файлах, за счет кэширования слоев Docker будет это делать в разы быстрее. У меня это видно на скринах, т.к. я не с первого раза настроил все)))

  

Главное - дождаться заветных строк:

  
```
[+] Building 5/5

 ✔️ airflow-apiserver      Built                                                                                                0.0s 

 ✔️ airflow-init           Built                                                                                                0.0s 

 ✔️ airflow-dag-processor  Built                                                                                                0.0s 

 ✔️ airflow-scheduler      Built                                                                                                0.0s 

 ✔️ airflow-triggerer      Built                                                                                                0.0s
```
  
![[Служебное. Вложения/poligon_airflow_dbt_4.png]]


После того, как сделали build, запускаем сначала init:

  
```
docker compose up airflow-init
```

Ждем надписи  окончания развертывания:

```
airflow-init-1 exited with code 0
```

![[Служебное. Вложения/poligon_airflow_dbt_5.png]]
Бахаем докер пс

```
docker ps
```
  

Видим, что поднялся только постгрес. Но так и должно быть, поднимаем все остальные контейнеры через команду:

```
docker compose up -d
```

  
Флаг -d в команде docker compose up -d означает "detached mode" — запуск контейнеров в фоновом режиме.

Будут строки типа:

```

[+] Running 6/6

 ✔️ Container docker_folder-postgres-1               Healthy                                                                    1.3s 

 ✔️ Container docker_folder-airflow-scheduler-1      Started                                                                   24.9s 

 ✔️ Container docker_folder-airflow-dag-processor-1  Started                                                                   25.0s 

 ✔️ Container docker_folder-airflow-apiserver-1      Started                                                                   24.8s 

 ✔️ Container docker_folder-airflow-triggerer-1      Started                                                                   24.8s 

 ✔️ Container docker_folder-airflow-init-1           Exited                                                                    24.0s 
```
  

Можем проверить наши контейнеры через команду

  
```
docker ps
```
  
![[Служебное. Вложения/poligon_airflow_dbt_6.png]]
Как зайти в локально поднятый airflow?


Можем вбить браузере


http://localhost:8080/


Или VS code сам предложит нам зайти на сайт только что созданного Airflow. Подождите минут пять, пусть сервак поднимется

  
Логин и пароль для Airflow это airflow и airflow

  

Контейнерами, сделанными через композ, лучше и управлять через композ:

  
```
docker compose up -d 
```
Поднимает сервисы и запускает в фоне
```
docker compose restart  
```
Перезапускает всё (например, после правок)
```
docker compose stop
```
Останавливает, но не удаляет
```
docker compose start
```
Запускает остановленные контейнеры

```
docker compose down  
```
Полностью останавливает и удаляет

  
Теперь можем вернуться в наш VS Code. Так как у нас прокинут volume между папкой dags у нас в docker_folder и контейнером, все даги, которые мы сделаем в папке dags у себя, попадут тут же в контейнер. Сила томов Docker!😉

  
Теперь надо зайти в терминал контейнера (в учебных целях, все будем делать в scheduler, но в боевых условиях лучше отдельный worker-контейнер)

  
Идем в терминал нашей docker_folder и вводим команду на заход в терминал контейнера. Чтобы найти имя контейнера для запуска, делаем docker ps и смотрим name нужного нам scheduler контейнера:

  
```
docker exec  -it docker_folder-airflow-scheduler-1  /bin/bash 
```

У нас будет пользователь default. Переходим в папку dbt через следующие команды:

  
```
cd .. && cd dbt
```

  

Все готово к созданию DBT проекта! Давайте сделаем это! Вводим:

  
```
dbt init poligon
```

  

poligon - имя контейнера, profiles dir помечает, где у нас конфиг файла profiles. (Мы его прокинули в opt/dbt из docker_folder/dbt).

```
The profile poligon already exists in /opt/dbt/profiles.yml. Continue and overwrite it? [y/N]:
```
   - пишем y, бахаем enter

  
У нас спросят, какую БД юзать, естественно жмем цифру 1 - clickhouse!
```
Which database would you like to use?

[1] clickhouse
```
![[Служебное. Вложения/poligon_airflow_dbt_7.png]]
![[Служебное. Вложения/poligon_airflow_dbt_8.png]]
Будет предупреждение типа `12:00:06  No sample profile found for clickhouse.` Тут ничего страшного
  
Все! DBT проект создан, можно нажимать exit и идти в браузер в UI Airflow!

Можно ввести команду exit для выхода из контейнера, также можно увидеть, что DBT проект смонтировался и на хост!



Давайте также поднимем Clickhouse! Увы, кликхауз из прошлого гайда придеться убить... ⚰️

```
docker rm clickhouse-server (или ваше название)
```

  

Теперь надо будет запустить его с несколько иными параметрами запуска. Не бойтесь! это никак не повлияет на connection в Dbeaver из прошлого гайда! Все останется!🧠


```
docker run -d \

  --name clickhouse-server \

  --network=host \

  --cap-add=SYS_NICE \

  --cap-add=NET_ADMIN \

  --cap-add=IPC_LOCK \

  -v clickhouse-data:/var/lib/clickhouse \

  -v clickhouse-logs:/var/log/clickhouse-server \

  clickhouse/clickhouse-server:24.3.6
```
  

Давайте напишем DAG, который  запустит нашу первую DBT модель! Она уже есть в проекте!

Для этого в папке dags создадим файл dbt_dag.py в VS code


Код для dbt_dag.py:

```

from airflow.decorators import dag, task  # импортируем декораторы TaskFlow API  

from airflow.operators.bash import BashOperator  # для выполнения bash-команд  

from datetime import datetime  # для указания времени

  

# 🎯 Определяем DAG с помощью декоратора @dag

@dag(

    dag_id='dbt_run_my_first_model',  # уникальный идентификатор DAG

    schedule=None,                    # запуск только вручную, без расписания

    catchup=False,                    # не выполнять старые даты при старте

)

def dbt_dag():

    # 🔧 Оператор для запуска DBT через Bash

    run_dbt_model = BashOperator(

        task_id="run_dbt_model_bash",  # имя задачи

        bash_command="cd /opt/dbt/poligon && echo '== DBT debug ==' && dbt debug && echo '== DBT run ==' && dbt run --select my_first_dbt_model",  # команда для выполнения

        do_xcom_push=True,  # сохраняем вывод команды в XCom (результаты)

    )

            #cd /opt/dbt/poligon              # переходим в рабочую директорию dbt

            #echo "== DBT debug =="         # выводим информацию

            #dbt debug                      # проверяем конфигурацию dbt

            #echo "== DBT run =="           # запускаем модель

            #dbt run --select models/example/my_first_dbt_model.sql - путь к модели, --select позволяет выбрать конкретную модель

  

# ✨ Создание экземпляра DAG: Airflow находит его по переменной dag

dag = dbt_dag()
```
  

Когда сохраним файл DAG, надо будет подождать около 5 минут, прежде чем Airflow его распарсит и выведет в интерфейс. Параметры парсинга можно настраивать, но лучше слишком часто не делать.

  

🧩 Что здесь и как обычно устроен DAG

@dag-декоратор

— превращает функцию dbt_dag() в DAG-объект. Автоматически регистрируется, если присвоена глобальной переменной (dag = ...) 

  
Аргументы schedule=None, catchup=False

— означает запуск только вручную и пропуск "отстающих" запусков 

  
BashOperator

— один из стандартных операторов: выполняет shell-команду. Здесь запускается dbt debug/run 


do_xcom_push=True

— сохраняет вывод команды в XCom, чтобы передать другим таскам — типичная практика интеграции bash + TaskFlow. XCom - это такая хрень, которая передает данные между задачами DAG и эти данные можно даже в спецразделе одноименном увидеть в UI Airflow. Довольно удобно

  
Зависимости

— в данном примере одна задача, поэтому всё просто. Можно использовать >>, << или TaskFlow вызовы для построения DAG 

  

🧠 Типичная структура DAG в Airflow

1. Определение DAG — через декоратор @dag(...) или контекст with DAG(...).


2. Определение задач — таски либо через декораторы @task, либо через Operators (например, BashOperator, PythonOperator).


3. Глобальный экземпляр DAG — переменная в пространстве имен, чтобы Airflow её обнаружил

  

Кстати! Мы можем видеть и редактировать код DAGов не только в VS code! Мы же еще и code editor поставили! Его можно найти в разделе Plugins. Откроем его и увидим  файл нашего DAG с хоста!😎

![[Служебное. Вложения/poligon_airflow_dbt_9.png]]
Далее заходим в раздел dags и делаем trigger нашего dag! На unpause оставляем галочку. Ждем пока все успешно запустится!
![[Служебное. Вложения/poligon_airflow_dbt_10.png]]
![[Служебное. Вложения/poligon_airflow_dbt_11.png]]

![[Служебное. Вложения/poligon_airflow_dbt_12.png]]
Заходим в Clickhouse и видим табличку от нашей первой DBT модели!
![[Служебное. Вложения/poligon_airflow_dbt_13.png]]
  
Мега гооооооооооооол всем, кто справился!🕸🍷🐻

