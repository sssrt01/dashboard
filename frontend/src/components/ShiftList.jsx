import React, { useEffect, useState } from "react";
import { List, Card, Typography, Spin, Alert, Collapse } from "antd";
import apiClient from "../services/api.jsx";


const { Title, Text } = Typography;
const { Panel } = Collapse;

const ShiftsList = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Месяцы начинаются с 0
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "Не завершено";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.abs(end - start);

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} год ${minutes} хв`;
  };

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const response = await apiClient.get("last-ten-shifts/");
        setShifts(response.data || []);
      } catch (error) {
        setError("Не вдалося завантажити дані про зміни.");
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, []);

  if (loading) {
    return <Spin size="large" style={{ display: "block", margin: "50px auto" }} />;
  }

  if (error) {
    return <Alert message="Помилка" description={error} type="error" showIcon closable />;
  }

  return (
    <Card title="Останні 10 змін">
      <List
        itemLayout="horizontal"
        dataSource={shifts}
        renderItem={(shift) => (
          <List.Item>
            <List.Item.Meta
              description={
                <Collapse defaultActiveKey={[]}>
                  <Panel
                    header={
                      <>
                        <Text strong>{shift.name}</Text> | <Text strong>Продукт:</Text>{" "}
                        {shift.product} | <Text strong>Пакування:</Text> {shift.packing} л |{" "}
                        <Text strong>Час початку:</Text> {formatDate(shift.start_time)}
                      </>
                    }
                    key="1"
                  >
                    <p>
                      <Text strong>Готове значення:</Text> {shift.ready_value}
                    </p>
                    <p>
                      <Text strong>Ціль:</Text> {shift.target_value}
                    </p>
                    <p>
                      <Text strong>Тривалість:</Text>{" "}
                      {calculateDuration(shift.start_time, shift.end_time)}
                    </p>
                  </Panel>
                </Collapse>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ShiftsList;
