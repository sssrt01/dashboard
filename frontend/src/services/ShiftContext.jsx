import { createContext } from 'react';

const ShiftContext = createContext({
  shift: null,
  activeTask: null,
  setShift: () => {},
  setActiveTask: () => {},
});


export default ShiftContext;
