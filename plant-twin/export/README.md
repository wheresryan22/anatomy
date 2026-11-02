# Цех ЭПК в Unreal Engine 5: прогулка от первого лица

## Файлы

| Файл | Что это |
|---|---|
| `epk-plant.glb` | Вся сцена цеха: 22,5 МБ, около 705 тыс. треугольников, 937 мешей, 31 материал. Единицы метры, ось Y вверх. Unreal сам переводит в сантиметры и Z вверх. |
| `equipment.csv` | Реестр 105 единиц оборудования: тег, название, модель, участок, описание, паспорт, координаты. Для подсказок в игре через DataTable. |
| `equipment.json` | То же в JSON. |

Скачать сцену одной командой:

```
curl -L -o ~/Downloads/epk-plant.glb https://raw.githubusercontent.com/patrushevea-gif/anatomy/claude/pensive-johnson-4bwgnz/plant-twin/export/epk-plant.glb
```

## Как устроена сцена

```
EPK_Plant
├─ Building          пол, стальной каркас, стены, кровля и фермы, светильники, доки, разметка
├─ Services          аспирация, сжатый воздух, захоложенная вода, пневмотранспорт, кабельный лоток
├─ Zone_100_Raw_Store … Zone_910_Outdoor     участки
│  └─ EX-411, MX-302, CB-421 …               станок = узел с тегом
│     ├─ EX-411_Body_…                       неподвижный корпус
│     └─ EX-411_Pivot_…                      подвижные части со своей осью
```

Подвижные части, которые можно анимировать: люлька смесителя CMR-1000 с контейнером, охлаждающие валки, лопасти вентиляторов ленты CCB-1000 и чиллеров, звенья робота-паллетайзера, мачта и каретка погрузчиков, стол паллетообмотчика.

Материалы общие, перекрашиваются в одном месте: `M_Equipment_Body`, `M_Equipment_Frame`, `M_Stainless`, `M_Rubber`, `M_Glass`, `M_Powder_Melt`, `M_Steel_Structure`, `M_Wall_Panel`, `M_Roof_Panel`, `M_Concrete_Floor`, `M_Floor_Paint`, `M_Luminaire`, `M_Ground`, `M_Concrete_Apron`, лампы сигнальных колонн `M_Lamp_*`.

## Шаги в Unreal Engine 5

1. **Движок.** Epic Games Launcher → Unreal Engine → «Библиотека» → «+» у версий движка → последняя 5.x → «Установить». На Mac для сборки игры в приложение понадобится ещё Xcode из App Store, для работы в редакторе он не нужен.
2. **Проект.** В окне выбора проекта: Games → First Person → Blueprint. Target Platform: Desktop. Quality Preset: Maximum, а на слабом компьютере Scalable. Starter Content выключить. Имя `EPKTwin` → Create.
3. **Уровень.** File → New Level → Basic: небо, солнце и пол уже есть. Удалите в Outliner актёр `Floor`. Сохраните уровень как `Maps/EPK_Plant`.
4. **Импорт.** File → Import Into Level… → выберите `epk-plant.glb` → папка `/Game/EPK` → Import. В Outliner появится `EPK_Plant` со всеми участками и станками на своих местах.
   Если файл .glb не принимается: Edit → Plugins → найдите «glTF», включите импортёр glTF и перезапустите редактор.
5. **Столкновения**, чтобы не проходить сквозь станки и стоять на полу. Content Browser → папка `EPK` → фильтр Static Mesh → выделить все (Ctrl+A / Cmd+A) → ПКМ → Asset Actions → Bulk Edit via Property Matrix → справа Collision → Collision Complexity → `Use Complex Collision As Simple` → Save All.
6. **Точка старта.** Кнопка «+» (Quick Add) → Basic → Player Start. Поставьте его в главный проход цеха и поднимите над полом примерно на 1 м. Чтобы быстро найти место, наберите в поиске Outliner тег, например `FD-411`, и дважды щёлкните: камера перелетит к станции загрузки линии 1.
7. **Свет внутри.** Кровля непрозрачная, поэтому внутри темно. Есть два пути:
   - быстрый: скрыть актёр `Roof` (глаз в Outliner), фермы останутся, а солнце осветит цех;
   - реалистичный: оставить кровлю, открыть материал `M_Luminaire` и усилить Emissive Color в 20–50 раз, добавить несколько Rect Light под фермами. Затем добавить Post Process Volume с Infinite Extent и выставить Exposure Min = Max ≈ 1.
8. **Скорость шага.** Откройте `BP_FirstPersonCharacter` → Character Movement → Max Walk Speed: 600 → 250 см/с.
9. **Игра.** Кнопка Play (Alt+P). WASD — ходьба, мышь — обзор, пробел — прыжок, Esc — выход.
10. **Сборка в приложение.** Platforms → Windows или Mac → Package Project.

## Что дальше

- **Анимация.** Добавить на узлы `…_Pivot_…` компонент Rotating Movement: вентиляторы, валки, лента. Люльку смесителя поворачивать через Timeline на 180°.
- **Подсказки по взгляду.** Импортировать `equipment.csv` как DataTable. Трассировать луч от камеры, имя актёра даёт тег, по тегу показывать виджет с названием, моделью и паспортом.
- **Связь с моделью процесса.** Передавать состояние двойника (статусы, производительность, положение контейнеров и погрузчиков) из веб-модели в Unreal через WebSocket.

## Как пересобрать экспорт

```
npm install
npm run build
PLAYWRIGHT=<путь к пакету playwright> CHROME_PATH=<путь к Chromium> npm run export:unreal
```

Экспорт снимает сцену с работающего двойника в браузере без окна, поэтому совпадает с веб-версией один в один.
