

Грубые ошибки в Airflow или как вебхуки положили airflow-scheduler🥲 и как я это исправил и освободил DAG'и из pool-рабства😎


Уххх, эту статью я еще обещал при создании канала, погнали😓

  

Давайте сначала введем понятийный аппарат для статьи:

  

Основные концепции Airflow

  

Декоратор @dag и декоратор@task

Декораторы в Airflow — это элегантный способ превращения Python функций в DAG'и и задачи:

  

@dag — превращает Python функцию в DAG (Directed Acyclic Graph)

  

декоратор@task — превращает Python функцию в задачу Airflow

  

Декораторы упрощают передачу данных между задачами и определение зависимостей.

  

Pools в Airflow

Pools (пулы) — это механизм ограничения параллелизма выполнения задач:

  

1. Контролируют количество одновременно выполняющихся задач
2. Содержат slots (слоты) — единицы ресурсов для выполнения задач

  

По умолчанию все задачи попадают в default_pool с 128 слотами, но можно ввести новые со своими ограничениями.

Т.е. можно разделять критичные и некритичные задачи по разным пулам🧠

  

Scheduler и парсинг папки DAGs

Airflow Scheduler — компонент, который:

1. Каждые 30 секунд по умолчанию парсит все DAG файлы

2. Сканирует папку DAGs на новые файлы каждые 5 минут

3. Проверяет, какие задачи готовы к выполнению

  
Выполняет весь код, не входящий в декораторы каждый парсинг (очень важный момент, запомните его!👁)


Итак, был один проект у меня с сильном "зажатыми" DAG Airflow. Были там DAGи с очень ограниченным количеством задач, с очень строгими pools для работ DAGов. 


Были слухи и легенды по поводу того, что валился Airflow scheduler когда злые DAGи "раскрепощались"💪, поэтому они были заперты древними печатями.

  
Как-то раз, я решил проверить, а что же может так сильно валить весь Airflow. Пошустрил по DAGам и понял, что там есть важная проблема!
 

Были вызовы вебхуков (к Data Ingestion инструменту Airbyte) в функции вне "тела " самого DAG! То есть буквально вне таких декораторов как @dag и декоратор@task, вне дага вообще!


Что это значит? Что при каждом парсинге папки dags scheduler (планировщиком Airflow) происходили вызовы этих вебхуков! Не при запуске DAGов! Очень больно😳...

  
Поэтому никогда так не делайте. Все загрузки файлов, обращения к внешним сервисам по API, вебхукам и т.д. делайте внутри DAG airflow в его tasks (задачах)!

  
Естественно, когда я это понял,  то запихнул вебхук в даг и в отдельную задачу. Удалось расширить строгие pools и в целом "раскрепостить" 💪 DAGs. Проект стал дышать свободнее и работать быстрее. Пайплайны перегрузки данных ускорились

  

Давайте покажу примеры в коде как неправильно вызывать вебхуки и как правильно для наглядности, это просто слепки кода, не для запуска.

  

То же самое относится и к API запросам, подгрузкам файлов 

  

Неправильный подход ❌
```
from airbyte_airflow_provider_your.hook import AirbyteHook

from airbyte_api.models import ConnectionsListRequest

from airflow.decorators import dag, task

from datetime import datetime

  

# ❌ ПЛОХО: hook и list_connections вызываются вне задачи!

hook = AirbyteHook(airbyte_conn_id="airbyte_default")

result = hook.list_connections(ConnectionsListRequest(workspace_id="ws-001"))

connections = [

    {

        "connection_id": conn.connection_id,

        "source_id": conn.source_id,

        "prefix": conn.prefix,

        "name": conn.name,

    }

    for conn in result

]

  

@dag(

    dag_id='bad_airbyte_hook_dag',

    start_date=datetime(2024, 1, 1),

    schedule='@daily'

)

def bad_airbyte_hook_dag():

    @task

    def print_connections():

        # connections уже "получены" при импорте модуля, а не в задаче!

        for c in connections:

            print(c)

  

    print_connections()

  

bad_airbyte_hook_dag()
```

Правильный подход ✅
  
```
from airbyte_airflow_provider_your.hook import AirbyteHook

from airbyte_api.models import ConnectionsListRequest

from airflow.decorators import dag, task

from datetime import datetime

  

@dag(

    dag_id='good_airbyte_hook_dag',

    start_date=datetime(2024, 1, 1),

    schedule='@daily'

)

def good_airbyte_hook_dag():

    @task

    def get_connections(airbyte_conn_id: str, workspace_id: str):

        # Всё инициализируется и вызывается только в задаче!

        hook = AirbyteHook(airbyte_conn_id=airbyte_conn_id)

        result = hook.list_connections(ConnectionsListRequest(workspace_id=workspace_id))

        connections = [

            {

                "connection_id": conn.connection_id,

                "source_id": getattr(conn, "source_id", None),

                "prefix": getattr(conn, "prefix", ""),

                "name": getattr(conn, "name", ""),

            }

            for conn in result

        ]

        return connections

  

    @task

    def print_connections(connections):

        for c in connections:

            print(c)

  

    all_connections = get_connections(

        airbyte_conn_id="airbyte_default",

        workspace_id="ws-001"

    )

  

    print_connections(all_connections)

  

good_airbyte_hook_dag()

```