# ИСПРАВЛЕНИЕ DRAG & DROP ДЛЯ ЗАДАЧ

## 🐛 ПРОБЛЕМА

Drag & drop для перестановки задач не работал. При попытке перетащить задачу ничего не происходило, порядок не сохранялся.

## 🔍 АНАЛИЗ ПРОБЛЕМ

Было выявлено несколько критических проблем:

### 1. **КОНФЛИКТ МАРШРУТОВ В BACKEND** (Критическая проблема)

**Проблема**: Маршрут `/api/tasks/reorder` был определён ПОСЛЕ `/api/tasks/{task_id}`, из-за чего FastAPI интерпретировал "reorder" как значение параметра `task_id`.

**Симптомы**:
- Запросы к `/api/tasks/reorder` возвращали 404 "Задача не найдена"
- Backend пытался найти задачу с id="reorder"

**Решение**: Переместили endpoint `/tasks/reorder` ПЕРЕД `/tasks/{task_id}` в server.py

```python
# ДО (неправильно):
@api_router.put("/tasks/{task_id}", ...)
@api_router.put("/tasks/reorder", ...)  # ❌ Никогда не вызывается!

# ПОСЛЕ (правильно):
@api_router.put("/tasks/reorder", ...)  # ✅ Обрабатывается первым
@api_router.put("/tasks/{task_id}", ...)
```

### 2. **НЕПРАВИЛЬНЫЙ ФОРМАТ ЗАПРОСА**

**Проблема**: Backend ожидал структурированный объект с Pydantic моделью, но получал сырой массив.

**Решение**:
- Создали модели `TaskReorderItem` и `TaskReorderRequest` в models.py
- Изменили API frontend для отправки `{tasks: [...]}` вместо просто `[...]`

### 3. **ОТСУТСТВИЕ АТРИБУТОВ В REORDER.ITEM**

**Проблема**: Reorder.Item не имел критических атрибутов для правильной работы.

**Решение**: Добавили:
```jsx
<Reorder.Item
  value={task}
  id={task.id}              // ← Добавлено
  dragListener={false}
  dragControls={dragControls}
  layout="position"          // ← Добавлено для плавной анимации
>
```

### 4. **СОРТИРОВКА ЗАДАЧ НЕ УЧИТЫВАЛА ORDER**

**Проблема**: При отображении задачи сортировались только по приоритету, игнорируя поле `order`.

**Решение**: Обновили `getTasksForSelectedDate()`:
```javascript
allTasks.sort((a, b) => {
  // Сначала по order (если установлен)
  const orderA = a.order !== undefined ? a.order : 999999;
  const orderB = b.order !== undefined ? b.order : 999999;
  
  if (orderA !== orderB) {
    return orderA - orderB;  // ✅ Приоритет order
  }
  
  // Потом по приоритету
  return priorityB - priorityA;
});
```

## ✅ ВНЕСЁННЫЕ ИЗМЕНЕНИЯ

### Backend (/app/backend/)

#### models.py
```python
class TaskReorderItem(BaseModel):
    """Элемент для изменения порядка задач"""
    id: str
    order: int

class TaskReorderRequest(BaseModel):
    """Запрос на изменение порядка задач"""
    tasks: List[TaskReorderItem]
```

#### server.py
1. Добавлены импорты: `TaskReorderItem`, `TaskReorderRequest`
2. Переместили endpoint `/tasks/reorder` ПЕРЕД `/tasks/{task_id}`
3. Обновили функцию с детальным логированием:
```python
@api_router.put("/tasks/reorder", response_model=SuccessResponse)
async def reorder_tasks(request: TaskReorderRequest):
    logger.info(f"🔄 Reordering {len(request.tasks)} tasks...")
    
    updated_count = 0
    for task_order in request.tasks:
        result = await db.tasks.update_one(
            {"id": task_order.id},
            {"$set": {"order": task_order.order, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            updated_count += 1
    
    return SuccessResponse(success=True, message=f"Обновлен порядок {updated_count} задач")
```

### Frontend (/app/frontend/)

#### TasksSection.jsx

**1. Улучшена функция handleReorderTasks:**
```javascript
const handleReorderTasks = async (newOrder) => {
  // Немедленно обновляем UI
  const reorderedTaskIds = newOrder.map(t => t.id);
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  const updatedTasks = [
    ...newOrder.map((task, index) => ({ ...task, order: index })),
    ...tasks.filter(t => !reorderedTaskIds.includes(t.id))
  ];
  
  setTasks(updatedTasks);
  
  // Сохраняем на сервер
  const taskOrders = newOrder.map((task, index) => ({
    id: task.id,
    order: index
  }));
  
  await tasksAPI.reorderTasks(taskOrders);
};
```

**2. Обновлён компонент TodayTaskItem:**
```jsx
<Reorder.Item
  value={task}
  id={task.id}              // Добавлено для идентификации
  dragListener={false}
  dragControls={dragControls}
  layout="position"          // Добавлено для плавной анимации
>
```

**3. Улучшен drag handle:**
```jsx
<div
  onPointerDown={(e) => {
    if (hapticFeedback) hapticFeedback('impact', 'light');
    dragControls.start(e);
  }}
  className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none select-none"
  style={{ touchAction: 'none' }}
>
  <GripVertical className="w-4 h-4 text-gray-400 hover:text-yellow-500 transition-colors" />
</div>
```

**4. Добавлен layoutScroll в Reorder.Group:**
```jsx
<Reorder.Group 
  axis="y" 
  values={todayTasks} 
  onReorder={handleReorderTasks}
  layoutScroll  // ← Добавлено
>
```

**5. Обновлена сортировка getTasksForSelectedDate:**
```javascript
allTasks.sort((a, b) => {
  // Сначала по order (для drag & drop)
  const orderA = a.order !== undefined ? a.order : 999999;
  const orderB = b.order !== undefined ? b.order : 999999;
  
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  
  // Потом по приоритету
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
});
```

#### api.js
```javascript
reorderTasks: async (taskOrders) => {
  const response = await api.put('/tasks/reorder', { 
    tasks: taskOrders  // ← Обёрнуто в объект
  });
  return response.data;
}
```

## ✅ ТЕСТИРОВАНИЕ

### Backend тест (/app/test_drag_and_drop.py)

Создан comprehensive тест, который:
1. ✅ Создаёт 3 тестовые задачи
2. ✅ Получает текущий порядок
3. ✅ Переворачивает список (меняет порядок)
4. ✅ Отправляет новый порядок на сервер
5. ✅ Проверяет, что порядок сохранился в БД

**Результат**: 🎉 **ВСЕ ТЕСТЫ ПРОЙДЕНЫ!**

```
🔍 Шаг 4: Проверяем корректность изменений...
  ✅ Задача 'Задача 3 - Третья': order = 0 (ожидалось: 0)
  ✅ Задача 'Задача 2 - Вторая': order = 1 (ожидалось: 1)
  ✅ Задача 'Задача 1 - Первая': order = 2 (ожидалось: 2)

🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Drag & drop работает корректно!
```

## 🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ

✅ **Drag & drop полностью работает:**
- Можно захватить задачу за иконку GripVertical (3 полоски слева)
- Перетащить её в нужную позицию
- Порядок сохраняется на сервере через PUT /api/tasks/reorder
- При перезагрузке страницы порядок сохраняется
- Плавная анимация при перетаскивании (layout="position")
- Haptic feedback при начале перетаскивания

## 📝 ВАЖНЫЕ ЗАМЕЧАНИЯ

### Порядок определения маршрутов в FastAPI

**КРИТИЧЕСКИ ВАЖНО**: В FastAPI более специфичные маршруты должны быть определены ПЕРЕД общими маршрутами с параметрами.

```python
# ✅ ПРАВИЛЬНО:
@api_router.put("/tasks/reorder")      # Специфичный маршрут первым
@api_router.put("/tasks/{task_id}")    # Общий маршрут вторым

# ❌ НЕПРАВИЛЬНО:
@api_router.put("/tasks/{task_id}")    # Перехватывает всё
@api_router.put("/tasks/reorder")      # Никогда не вызовется
```

### Framer Motion Reorder

Для корректной работы Reorder.Item необходимо:
1. `value={task}` - объект с данными
2. `id={task.id}` - уникальный идентификатор
3. `dragListener={false}` - отключаем автоматическое перетаскивание
4. `dragControls={dragControls}` - используем кастомный контроль
5. `layout="position"` - плавная анимация позиции

### Сортировка задач

Задачи теперь сортируются по двум критериям:
1. **Приоритет 1**: `order` (результат drag & drop)
2. **Приоритет 2**: `priority` (high → medium → low)

Это позволяет пользователю вручную менять порядок через drag & drop, но новые задачи автоматически сортируются по приоритету.

## 🚀 КАК ИСПОЛЬЗОВАТЬ

1. Откройте раздел "Список дел"
2. Выберите дату в селекторе
3. Наведите на задачу - слева появится иконка ⋮⋮ (три полоски)
4. Захватите задачу за эту иконку
5. Перетащите в нужную позицию
6. Отпустите - порядок сохранится автоматически
7. Haptic feedback подтвердит операцию

## 🔧 ОТЛАДКА

Если drag & drop не работает:

1. **Проверьте console.log в браузере**:
```
👆 Drag handle clicked for task: <task_id>
🚀 Drag controls started
🔄 Reorder triggered!
```

2. **Проверьте backend logs**:
```bash
tail -f /var/log/supervisor/backend.out.log | grep "Reorder"
```

Должно показать:
```
🔄 Reordering 3 tasks...
  Updating task <id> to order 0
    ✅ Task <id> updated
✅ Successfully updated 3 out of 3 tasks
```

3. **Запустите тест**:
```bash
python /app/test_drag_and_drop.py
```
