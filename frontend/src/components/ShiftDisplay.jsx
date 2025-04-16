import { useContext, useEffect } from "react";
import  ShiftContext  from "../services/ShiftContext.jsx";
import NewShiftForm from "./shifts/form/NewShiftForm.jsx";
import ShiftManagement from "./ShiftControl.jsx";

const AdminPage = () => {
  const { shift, reload } = useContext(ShiftContext);

  useEffect(() => {
    if (reload) {
      window.location.reload();
    }
  }, [reload]);

  if (!shift) {
    return (
      <>
        <NewShiftForm/>
      </>
    );
  }
  return <ShiftManagement />;
};

export default AdminPage;
