import React, { createContext, useState, useEffect } from 'react';

export const ShiftContext = createContext();

const ShiftProvider = ({ children }) => {
  // Храним данные смены (shift) и задания (tasks) отдельно.
  const [shift, setShift] = useState(null); // данные смены
  const [tasks, setTasks] = useState({});   // данные заданий в виде объекта: { taskId: { ...data } }
  const [reload, setReload] = useState(false); // флаг для перезагрузки (например, если смена завершена)

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws/shifts/');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data)
      if (data) {
        // Обработка инициализации смены и списка заданий
        if (data.type === 'shift_init') {
          const { shift: shiftData, tasks: tasksArray } = data.data;
          setShift(shiftData);

          // Преобразуем массив заданий в объект, где ключ – task.id.
          if (Array.isArray(tasksArray)) {
            const tasksDict = {};
            tasksArray.forEach((task) => {
              // Предполагается, что в tasksArray приходят объекты с данными задания.
              // Если приходит только идентификатор, нужно будет дополнительно получать данные задания.
              tasksDict[task.id] = task;
            });
            setTasks(tasksDict);
          }
        }
        // Обработка обновлений задания
        else if (data.type === 'task_update') {
          const { task_id, data: taskData } = data;
          setTasks((prevTasks) => ({
            ...prevTasks,
            [task_id]: {
              ...prevTasks[task_id],
              ...taskData,
            },
          }));
          console.log(tasks)

        }
        // Обработка обновлений смены (например, завершение смены)
        else if (data.type === 'shift_update') {
          if (data.event === 'completed') {
            // Если смена завершена, очищаем данные смены и сигнализируем о перезагрузке
            setShift(null);
            setReload(true);
          } else {
            setShift((prevShift) => ({
              ...prevShift,
              ...data.data,
            }));
          }
        }
      }
    };

    return () => {
      socket.close();
    };
  }, []);
  // Сбрасываем флаг reload через секунду
  useEffect(() => {
    if (reload) {
      const timer = setTimeout(() => {
        setReload(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [reload]);

  return (
    <ShiftContext.Provider value={{ shift, tasks, reload }}>
      {children}
    </ShiftContext.Provider>
  );
};

export default ShiftProvider;
