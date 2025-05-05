import React, {useCallback, useEffect, useState} from 'react';
import ShiftContext from '../services/ShiftContext';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL;
const RELOAD_DELAY = 1000;

const MESSAGE_TYPES = {
  SHIFT_INIT: 'shift_init',
  TASK_UPDATE: 'task_update',
  SHIFT_UPDATE: 'shift_update'
};

const ShiftProvider = ({ children }) => {
  const [shiftData, setShiftData] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [shouldReload, setShouldReload] = useState(false);

  const handleShiftInit = useCallback((data) => {
    const {shift, tasks} = data;
    setShiftData(shift);
    // Находим активную задачу из списка задач
    const activeTaskIndex = parseInt(shift.active_task) || 0;
    if (tasks && tasks.length > 0) {
      setCurrentTask(tasks[activeTaskIndex]);
    }
  }, []);


  const handleTaskUpdate = useCallback((data) => {
    setCurrentTask(prevTask => ({
      ...prevTask,
      ready_value: data.ready_value,
      time_spent: data.time_spent,
      remaining_time: data.remaining_time,
      started_at: data.started_at,
      finished_at: data.finished_at,
      norm_in_minute: parseFloat(data.norm_in_minute) || 0
    }));
  }, []);


  const handleShiftUpdate = useCallback((data, event) => {
    if (event === 'completed') {
      setShiftData(null);
      setCurrentTask(null);
      setShouldReload(true);
    } else {
      setShiftData((prevShift) => ({
        ...prevShift,
        ...data,
      }));
    }
  }, []);

  const handleWebSocketMessage = useCallback((event) => {
    const message = JSON.parse(event.data);
    if (!message) return;

    switch (message.type) {
      case MESSAGE_TYPES.SHIFT_INIT:
        handleShiftInit(message.data);
        break;
      case MESSAGE_TYPES.TASK_UPDATE:
        handleTaskUpdate(message.data);
        break;
      case MESSAGE_TYPES.SHIFT_UPDATE:
        handleShiftUpdate(message.data, message.event);
        break;
      default:
        console.warn('Неизвестный тип сообщения:', message.type);
    }
  }, [handleShiftInit, handleTaskUpdate, handleShiftUpdate]);

  useEffect(() => {
    const socket = new WebSocket(WEBSOCKET_URL);
    socket.onmessage = handleWebSocketMessage;

    return () => {
      socket.close();
    };
  }, [handleWebSocketMessage]);

  useEffect(() => {
    if (shouldReload) {
      const timer = setTimeout(() => {
        setShouldReload(false);
      }, RELOAD_DELAY);
      return () => clearTimeout(timer);
    }
  }, [shouldReload]);

  return (
      <ShiftContext.Provider
          value={{
            shift: shiftData,
            activeTask: currentTask,
            setShift: setShiftData,
            setActiveTask: setCurrentTask,
            reload: shouldReload
          }}
      >
      {children}
    </ShiftContext.Provider>
  );
};

export default ShiftProvider;