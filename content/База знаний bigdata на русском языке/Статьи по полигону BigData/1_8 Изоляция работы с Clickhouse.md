Прежде, чем начать работать с продвинутыми функциями Clickhouse, я хотел бы его обновить и изолировать его работу в рамках Docker, заодно поставить версию посвежее и сделать задел для обновлений версий на будущее. В этой статье проведу ряд нехитрых действий для этого.

В docker-compose обновил секцию Сlickhouse, чтобы можно было собирать и запускать Сlickhouse отдельно. Также новые версии клика могут блокировать стандартного юзера, если его никак не менять. Я нашел. способ скипать такую блокировку, т.к. у нас все локально и травоядно:

![[Служебное. Вложения/poligon_clickhouse_isolation_1.png]]
```
  clickhouse-server:

    image: clickhouse/clickhouse-server:25.4.3

    container_name: clickhouse-server

    network_mode: host

    environment:

      CLICKHOUSE_SKIP_USER_SETUP: 1

    cap_add:

      - SYS_NICE

      - NET_ADMIN

      - IPC_LOCK

    volumes:

      - clickhouse-data:/var/lib/clickhouse

      - clickhouse-logs:/var/log/clickhouse-server

    restart: always
```

Итак, сделав отдельную настройку Clickhouse, можно пересобрать и перезапустить его.

Откроем терминал в папке airflow_dbt. Я работаю на скринах через Colima на маке, но, например, в WSL команды будут как docker compose без дефиса. Сначала пока остановим и удалим старый контейнер clickhouse, если он запущен:
```
docker compose down clickhouse-server
```
![[Служебное. Вложения/poligon_clickhouse_isolation_2.png]]
Затем можно сделать pull новых изменений, которые я запушил в полигон:
https://github.com/Byaha98/bigdata_poligon

И запустить Clickhouse даже без команды build, т.к. я тут же подписал версию образа прямо в компознике!

```
docker compose up clickhouse-server
```
![[Служебное. Вложения/poligon_clickhouse_isolation_3.png]]
Образ сам подтянется и контейнер запустится!

На скрине видно, что проверка и блокировка дефолтного юзера была отключена, что и нужно было для локальной работы в новом клике.

Теперь с новым Сlickhouse и его изолированными сборкой/запуском работа на полигоне инженерии/аналитики данных стала чуточку удобнее! 