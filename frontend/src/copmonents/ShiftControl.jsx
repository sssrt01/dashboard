import React, { useContext, useState } from "react";
import { ShiftContext } from "./ShiftProvider.jsx";
import { Alert, Button, Card, Typography } from "antd";
import formatTime from "../FormatTime.jsx";
import apiClient from "../services/api.jsx";
import AppContext from "antd/es/app/context.js";

const { Title, Text } = Typography;

const ShiftControl = () => {
    const { shift, setShift } = useContext(ShiftContext);
    const {tasks, setTasks} = useContext(AppContext);
    const [errorMessage, setErrorMessage] = useState(null);
    console.log(tasks)

    const handlePauseUnpause = async () => {
        try {
            const response = await apiClient.patch(
                `shift/${shift.id}/toggle_pause/`
            );
            setShift(response.data.shift);
        } catch (error) {
            setErrorMessage(error.response?.data?.error || "Помилка паузи/відновлення зміни.");
        }
    };

    const handleEndShift = async () => {
        try {
            await apiClient.patch(`shift/${shift.id}/finish/`);
            setShift(null);
        } catch (error) {
            setErrorMessage(error.response?.data?.error || "Помилка завершення зміни.");
        }
    };

    return (
        <Card title="Активна зміна" style={{ maxWidth: 1200, margin: "0 auto" }}>
            {errorMessage && (
                <Alert
                    message="Помилка"
                    description={errorMessage}
                    type="error"
                    closable
                    onClose={() => setErrorMessage(null)}
                />
            )}
            <Title level={5}>Інформація про зміну</Title>
            <p>
                <Text strong>ID:</Text> {shift.id}
            </p>
            <p>
                <Text strong>Назва:</Text> {shift.name}
            </p>
            <p>
                <Text strong>Продукт:</Text> {shift.product}
            </p>
            <p>
                <Text strong>Упаковка:</Text> {shift.packing}
            </p>
            <p>
                <Text strong>Готове значення:</Text> {shift.ready_value}
            </p>
            <p>
                <Text strong>Цільове значення:</Text> {shift.target_value}
            </p>
            <p>
                <Text strong>Час, що залишився:</Text> {formatTime(shift.remaining_time)}
            </p>
            <div style={{ marginTop: 20 }}>
                <Button
                    type="primary"
                    onClick={handlePauseUnpause}
                    style={{ marginRight: 10 }}
                >
                    {shift.is_paused === '0' ? 'Пауза' : 'Відновити'}
                </Button>
                <Button danger onClick={handleEndShift}>
                    Завершити зміну
                </Button>
            </div>
        </Card>
    );
};

export default ShiftControl;
