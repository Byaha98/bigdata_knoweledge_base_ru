

Создал репозиторий по полигону, но сам гайд по созданию своего репозитория под полигон (мало ли, вдруг кто захочет) чуть позже будет (есть особенности в работе из WSL и винде). Напомню, что в последний раз мы разворачивали Airflow+DBT

Т.е. кто не хочет следовать моим гайдам тютелька в тютельку теперь можно будет просто клонировать репозиторий

https://github.com/Byaha98/bigdata_poligon

  

Ну вот и гайд по созданию своего репозитория для полигона инженерии и аналитики данных😘
  

Честно, скажу, он немного извращенский. Т.к. локальный репозиторий будет в WSL убунте👉
  

Прошлые статьи в рамках домашнего полигона дата инженерии и аналитики:
  

Как поставить WSL, docker и убунту в него и Dbeaver для работы с БД 

[[1_1 Dbeaver Docker WSL Ubuntu]]

Как развернуть у себя Clickhouse локально: 

[[1_2 Локальное поднятие Clickhouse]]

Как подготовить VS code и WSL к работе на полигоне

[[1_3 Подготовка WSL и VS code к полигону]]

Большой гайд по развертыванию Airflow+DBT

[[1_4 Разворачиваем Airflow 3.0.3 и DBT]]



![[Служебное. Вложения/poligon_github_1.png]]

Отлично! Идем регаемся или входим в github. Собсна жмем "Create repository"


Делаем название, description. Readme и gitignore - на ваше усмотрение. Можно не прожимать галочку и потом сделать самим.
![[Служебное. Вложения/poligon_github_2.png]]

Создав репозиторий, мы увидим два способа создания репозитория и два способа подключения к нему. Нас интересует SSH и создание репозитория с нуля (не пуш существующего).
![[Служебное. Вложения/poligon_github_3.png]]

Для этого идем в VS code, в главном меню в recent находим наш воркспейс в Ubuntu и заходим в него.

  ![[Служебное. Вложения/poligon_github_4.png]]

Открываем папочку poligon в терминале. По классике заходим в наш пользователь и обновляем гит хорошенечко до последней версии. где надо жмем  enter или вводим yes

  ![[Служебное. Вложения/poligon_github_5.png]]
```
su konstantin
```
```
sudo add-apt-repository ppa:git-core/ppa
```
```
sudo apt update
```
```
sudo apt install git
```
```
git --version
```
 ![[Служебное. Вложения/poligon_github_6.png]] ![[Служебное. Вложения/poligon_github_7.png]]
![[Служебное. Вложения/poligon_github_8.png]]
Последняя команда даст нам удостовериться в установленном гите

  
Итак, далее будем собственно следовать гайду гитхаба.

  
Но сначала проставим себе имя и почту для гита, чтобы он не ругался и понимал, кто мы (я забыл это сделать, поэтому была ошибка с коммитом на скрине, но я все поправил этой командой)

  
![[Служебное. Вложения/poligon_github_9.png]]
```
git config --global user.name "Your Name" 
```
```
git config --global user.email "yourmail@gmail.com"
```
  

Теперь создадим наш репозиторий и сделаем первый коммит, заполнив файл readme (если его нет, создайте)

  
```
echo "# ваш репо" >> README.md
```
```
git init
```
```
git add README.md
```
```
git commit -m "first commit"
```
  
  ![[Служебное. Вложения/poligon_github_10.png]]

Настроим main

```
git branch -M main
```
  

Отлично! Теперь надо по ssh соединиться с гитхабом. Для этого надо создать приватный и публичный ключи для нашего репозитория через ssh агент линуха.


Генерация ключа:

```
ssh-keygen -t ed25519 -C "konstantin.nikitinsky.gi@gmail.com"
```

Определяем имя файла для ключа:

```
/home/konstantin/.ssh/id_ed25519_poligon
```
  

Теперь надо достать публичный ключ, чтобы его вставить в github
```
cat ~/.ssh/id_ed25519_poligon.pub
```
cat покажет нам содержимое файла - берем его и копируем, идем в гитхаб. 
![[Служебное. Вложения/poligon_github_11.png]]

В Github жмем  settings, находим поле настройки ключей ssh и gpg. Жмакаем туда. Жмем New SSH key, Даем название, в содержимое кладем то, что копировали после команды cat (публичный ключ) .Жмем кнопку добавления SSH ключа. Потребуется github mobile - подтвердите. Если нет, то нет

  ![[Служебное. Вложения/poligon_github_12.png]]
![[Служебное. Вложения/poligon_github_13.png]]
![[Служебное. Вложения/poligon_github_14.png]]


Далее вводим команды из инструкции по ssh:

```
git remote add origin https://github.com/Byaha98/bigdata_poligon.git
```
Нечаянно сделали не тот remote и он already exists? Удалите
```
git remote remove origin
```
```
git remote add origin git@github.com:Byaha98/bigdata_poligon.git
```
Проверяем
```
git remote -v
```
Должно появиться
```
origin  git@github.com:Byaha98/bigdata_poligon.git (fetch)
```
```
origin  git@github.com:Byaha98/bigdata_poligon.git (push)
```
  
![[Служебное. Вложения/poligon_github_15.png]]
Далее можем закоммитить наши изменения для пуша. Даже енвы добавить (там везде локалхосты, нет ничего чувствительного, но в боевой обстановке так делать нельзя!)


Так же я поправил и .gitignore файл и закоммитил (создайте, если нет, он без разрешения, ниже его содержимое):

  
```
target/

dbt_packages/

logs/

airflow_dbt/dags/__pycache__

airflow_dbt/dbt/logs
```
  

Если при коммите есть опять ошибка с профилем или почтой, гит вас не узнает, то убедитесь что вводите от своего юзера прямо в папке репо:

  
```
git config user.name "Your Name" 
```
```
git config  user.email "yourmail@gmail.com"
```
  

Если интерфейс VS code не доверяет репозиторию, прожимаем синюю кнопку manage

![[Служебное. Вложения/poligon_github_16.png]]
![[Служебное. Вложения/poligon_github_17.png]]
  
Теперь проверим, что можем достучаться до гитхаба:
``` 
ssh -T git@github.com
``` 

Если есть ошибки по типу permission denied, то надо настроить доступы к папке с ssh ключами и запустить ssh агента

  
``` 
sudo chown -R konstantin:konstantin ~/.ssh
``` 
``` 
chmod 700 ~/.ssh
``` 
``` 
eval "$(ssh-agent -s)"
``` 
``` 
ssh-add ~/.ssh/id_ed25519_poligon ssh -T git@github.com
``` 
  

Должны получить типа такого:
``` 
Hi Byaha98! You've successfully authenticated, but GitHub does not provide shell access.
``` 
  
![[Служебное. Вложения/poligon_github_18.png]]
Ну а теперь гвоздь программы! VS code внутри VS code!💪

  
Вводим команды:
```
echo 'export PATH=$PATH:/mnt/c/Users/konst/AppData/Local/Programs/Microsoft\ VS\ Code/bin' >> ~/.bashrc
```
```
source ~/.bashrc
```
```
code .
```
  
![[Служебное. Вложения/poligon_github_19.png]]
Таким образом, у нас появится линуксовый VS code в котором мы сможем сделать push!

Можем сделать пуш либо в интерфейсе vs code либо командой 

```
git push origin main
```
  

Из линуксового VS code пуши будут проходить в гитхаб, т.к. мы построили репозиторий на линуксовой папке.

  
Давайте теперь перенесем все экстенщены в WSL. Перейдем в раздел extensions и увидим local и ubuntu экстеншены. Будет кнопка `Install Local Extensions in WSL`. Ее прожимаем для установки экстеншенов в WSL.


Помните, что при перезапуске VS code надо будет и запускать ssh агента для связи с гитхабом

  
```
su konstantin
```
```
eval "$(ssh-agent -s)"
```
```
ssh-add ~/.ssh/id_ed25519_poligon
```
```
ssh -T git@github.com
```
  
  ![[Служебное. Вложения/poligon_github_20.png]]
![[Служебное. Вложения/poligon_github_21.png]]
Ну собсна и все!🐸

  

Ссылка на мой полигон: 

https://github.com/Byaha98/bigdata_poligon

