import React, { useContext, useEffect } from "react";
import { ShiftContext } from "./ShiftProvider";
import ShiftForm from "./ShiftForm.jsx";
import ShiftControl from "./ShiftControl.jsx";
import ShiftList from "./ShiftList.jsx";
import NewShiftForm from "./ShiftFrom2.jsx";

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
  return <ShiftControl />;
};

export default AdminPage;
