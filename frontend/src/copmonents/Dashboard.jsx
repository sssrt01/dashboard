import React, { useContext, useEffect } from "react";
import { ShiftContext } from "./ShiftProvider.jsx";
import Clock from "./Clock.jsx";
import "../assets/style.css";
import formatTime from "../FormatTime.jsx";

const Dashboard = () => {
  const { shift, reload } = useContext(ShiftContext);

  useEffect(() => {
    if (!shift) {
      const intervalId = setInterval(() => {
        window.location.reload();
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, [shift]);

  useEffect(() => {
    if (reload) {
      window.location.reload();
    }
  }, [reload]);

  if (!shift) {
    return <h1>Немає активної зміни.</h1>;
  }

  const packInMinute = shift.target_value / (shift.total_time / 60);
  const remaining_time_norm = (shift.remaining_time / 60) * packInMinute;
  const need = Math.round(shift.target_value - shift.ready_value);

  return (
    <div className="container">
      <div className="row row-1" style={{maxHeight: "20%"}}>
        <div className="col-25">
          <Clock />
        </div>
        <div className="col-50 border">
          <h2>
              {shift.name} - {shift.product} ({shift.packing}л)
          </h2>
        </div>
        {shift.is_paused === "1" ? (
          <div className="col-25 yellow">
            <h2>ПЕРЕРВА</h2>
          </div>
        ) : (
          <div className="col-25"></div>
        )}
      </div>
      <div className="row row-2 border">
        <h1>{formatTime(shift.remaining_time)}</h1>
      </div>
      <div className="row row-3 " style={{maxHeight: "25%"}}>
        <div className="border" style={{display: "flex", flexDirection: "column"}}>
          <h1 style={{marginBottom: 0}}>{shift.target_value}</h1>
          <h3>(ЦІЛЬ)</h3>
        </div>
        <div style={{display: "flex", flexDirection: "column"}}>
          <h1 style={{marginBottom: 0}}>{shift.ready_value}</h1>
          <h3>(ГОТОВО)</h3>
        </div>
      {need > remaining_time_norm ? (
        <div style={{backgroundColor: "#FF5722", display: "flex", flexDirection: "column"}} className="border">
            <h1 style={{marginBottom: 0}}>{need}</h1>
            <h3>(РІЗНИЦЯ)</h3>
        </div>
          ) : (
          <div style={{backgroundColor: "#4CAF50", display: "flex", flexDirection: "column"}} className="border">
            <h1 style={{marginBottom: 0}}>{need}</h1>
            <h3>(РІЗНИЦЯ)</h3>
          </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
