

👋 Хаюшки!

Это первая статья из цикла по запуску различных баз данных (и не только) в Docker!

Сегодня у нас в гостях — MS SQL Server 🎉

  
Статья, где объясняется, что такое эти ваши Докеры, Бобры и прочие дабл ю эс эли:

[[1_1 Dbeaver Docker WSL Ubuntu]]

  
🔷 Что такое MS SQL?

MS SQL Server (Microsoft SQL Server) — это система управления реляционными базами данных (СУБД), разработанная корпорацией Microsoft.


🧩 Основные особенности:

🗃 Реляционная СУБД

Хранит данные в таблицах с чёткой структурой: строки и столбцы.

Поддерживает связи между таблицами: первичные и внешние ключи.


🧑‍💻 Язык запросов — T-SQL (Transact-SQL)

Расширение стандартного SQL с множеством дополнительных возможностей:

  

⚙️ Хранимые процедуры (CREATE PROCEDURE)

  

🧮 Пользовательские функции (CREATE FUNCTION)

  

🔁 Триггеры (CREATE TRIGGER)

  

🔢 Оконные функции (ROW_NUMBER() OVER(), RANK(), LAG(), LEAD())

  

📦 Работа с большими объёмами данных

Позволяет обрабатывать терабайты информации:

  

🧱 Индексы

  

🔀 Партиционирование

  

🧮 Columnstore-индексы (для аналитики)

  

🔐 Безопасность данных

🛡 Шифрование данных (TDE, Always Encrypted)

  

🧑‍⚖️ Ролевая модель доступа (GRANT, DENY)

  

🚀 Установка MS SQL Server в Docker

Уже не терпится развернуть это детище мелкомягких!

Работаю через WSL и Ubuntu, запускаю свою убунту:

![[Служебное. Вложения/MSSQL_guide_1.png]]
```
wsl -d Ubuntu-22.04
```

 
 Качаем образ MS SQL:
```
docker pull mcr.microsoft.com/mssql/server:latest
```

⚠️ Я использую тег latest — этого достаточно для учебных целей.

В продакшене версию лучше согласовывать с командой или использовать фиксированный тег.

Проверим, что образ появился:
```
docker image ls
```
![[Служебное. Вложения/MSSQL_guide_2.png]]
2. Запускаем контейнер:
```

docker run -e "ACCEPT_EULA=Y" \

  -e "MSSQL_SA_PASSWORD=YourNew@Pass123" \

  -p 1433:1433 \

  --name sql_server_container \

  -d mcr.microsoft.com/mssql/server:latest
```

Пояснения к параметрам:


ACCEPT_EULA=Y — приём условий лицензии

MSSQL_SA_PASSWORD — пароль для пользователя sa
  
Минимум 8 символов: строчные, заглавные, цифры и спецсимволы

-p 1433:1433 — проброс порта SQL Server

Проверим, что контейнер работает:
![[Служебное. Вложения/MSSQL_guide_3.png]]
```
docker ps
```
🖥 Подключение в DBeaver

Открываем DBeaver → Database → New Connection → SQL Server

  ![[Служебное. Вложения/MSSQL_guide_4.png]]

Параметры подключения:

  

Host: localhost

  

Port: 1433

  

Database: master

  

Authentication: SQL Server Authentication

  

Username: sa

  

Password: YourNew@Pass123

  

Driver Properties:

  

ssl → false

  

encrypt → false

  

Driver Properties обычно уже выставлены по умолчанию, но лучше проверить.

  

Нажимаем Test Connection → должно появиться "Connected".
![[Служебное. Вложения/MSSQL_guide_5.png]]
  

Если DBeaver предложит установить драйверы — ставим.

  

🚫 Возможная ошибка:

The TCP/IP connection to the host localhost, port 1433 has failed. Error: "Connection refused: getsockopt. Verify the connection properties. Make sure that an instance of SQL Server is running on the host and accepting TCP/IP connections at the port. Make sure that TCP connections to the port are not blocked by a firewall

  

Обычно проблема в:


1. Неправильно указанном пароле (пароль не прошёл валидацию по правилам создания пароля, см. выше)

2. Контейнер не запущен

  

Решение - останавливаем работающий контейнер, удаляем
```
docker stop sql_server_container
```
```
docker rm sql_server_container
```

И запускаем снова по инструкции выше.

  

🧠 Полезные команды Docker

```
docker stop sql_server_container
```
Остановить контейнер
```
docker start sql_server_container
```
 Запустить контейнер
```
docker rm sql_server_container
```
Удалить контейнер
```
docker restart sql_server_container 
```
Перезапустить контейнер (полезно, если возникли проблемы)

  

⚠️ Если вы закрываете терминал или перезагружаете систему, контейнер не стартует сам — его нужно запустить вручную.

Бобрик хранит ваши SQL-скрипты, чтобы не потерять наработки между сессиями.

MS SQL сохранит ваши таблицы, даже если контейнер остановится, главное его не удалять.

  

🎉 Готово!
![[Служебное. Вложения/MSSQL_guide_6.png]]

Теперь вы можете работать с MS SQL и писать SQL/T-SQL-запросы.



