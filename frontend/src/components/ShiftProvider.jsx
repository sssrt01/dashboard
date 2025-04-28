import React, {useEffect, useState} from 'react';
import ShiftContext from '../services/ShiftContext';

const ShiftProvider = ({ children }) => {
  const [shift, setShift] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [reload, setReload] = useState(false);

  useEffect(() => {
    // const socket = new WebSocket('ws://10.10.10.95:8000/ws/shifts/');
    const socket = new WebSocket('ws://localhost:8000/ws/shifts/');

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message) {
        if (message.type === 'shift_init') {
          const { shift: shiftData, task: taskData } = message.data;
          setShift(shiftData);
          setActiveTask(taskData);
        }
        else if (message.type === 'task_update') {
          setActiveTask((prevTask) => {
            if (!prevTask) {
              return message.data;
            }
            return { ...prevTask, ...message.data };
          });
        }
        else if (message.type === 'shift_update') {
          if (message.event === 'completed') {
            setShift(null);
            setActiveTask(null);
            setReload(true);
          } else {
            setShift((prevShift) => ({
              ...prevShift,
              ...message.data,
            }));
          }
        }
      }
    };

    return () => {
      // socket.close();
    };
  }, []);

  useEffect(() => {
    if (reload) {
      const timer = setTimeout(() => {
        setReload(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [reload]);

  return (
    <ShiftContext.Provider value={{
      shift,
      activeTask,
      setShift,
      setActiveTask,
      reload}}>
      {children}
    </ShiftContext.Provider>
  );
};

export default ShiftProvider;
