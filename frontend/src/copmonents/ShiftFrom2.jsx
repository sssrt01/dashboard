import { Form, Input, Button, Select, Space, message, Typography } from "antd";
import React, { useEffect, useState } from "react";
import apiClient from "../services/api.jsx";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";

const { Text } = Typography;

const TaskItem = ({ name, remove, form, index, updateTotalPercentage }) => {
    const [products, setProducts] = useState([]);
    const [packings, setPackings] = useState([]);
    const [percentage, setPercentage] = useState(0);
    const [times, setTimes] = useState(0);
    const [taskType, setTaskType] = useState("TASK");

    useEffect(() => {
        apiClient
            .get("products/")
            .then((response) => setProducts(response.data))
            .catch(() => message.error("Помилка завантаження продуктів."));
    }, []);

    const fetchPackings = (productId) => {
        apiClient
            .get(`products/${productId}/packings/`)
            .then((response) => setPackings(response.data))
            .catch(() => message.error("Помилка завантаження упаковки."));
    };

    const fetchPercentage = (target, packingId) => {
        if (!target || !packingId) return;
        apiClient
            .get(`calculate-percentage/?target=${target}&packing_id=${packingId}`)
            .then((response) => {
                const percentageValue = parseFloat(response.data.percentage.toFixed(1));
                setPercentage(percentageValue);
                setTimes(Math.round(response.data.time_in_minute));
                form.setFieldsValue({ tasks: { [name]: { percentage: percentageValue } } });
                updateTotalPercentage();
            })
            .catch(() => message.error("Помилка розрахунку відсотка."));
    };

    return (
        <Space style={{ display: "flex", marginBottom: 8 }} align="baseline">
            <Form.Item name={[name, "type"]} initialValue="TASK">
                <Select
                    style={{ width: 120 }}
                    onChange={(value) => {
                        setTaskType(value);
                        form.setFieldsValue({ tasks: { [name]: { product: undefined, packing: undefined, target: undefined, remaining_time: undefined, percentage: 0 } } });
                        setPercentage(0);
                        updateTotalPercentage();
                    }}
                >
                    <Select.Option value="TASK">Завдання</Select.Option>
                    <Select.Option value="BREAK">Перерва</Select.Option>
                </Select>
            </Form.Item>

            {taskType === "TASK" ? (
                <>
                    <Form.Item name={[name, "product"]} rules={[{ required: true, message: "Оберіть продукт." }]}>
                        <Select
                            placeholder="Оберіть продукт"
                            onChange={(value) => {
                                fetchPackings(value);
                                form.setFieldsValue({ tasks: { [name]: { packing: undefined, target: undefined, percentage: 0 } } });
                                setPercentage(0);
                                updateTotalPercentage();
                            }}
                            style={{ width: 150 }}
                        >
                            {products.map((product) => (
                                <Select.Option key={product.id} value={product.id}>
                                    {product.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name={[name, "packing"]} rules={[{ required: true, message: "Оберіть упаковку." }]}>
                        <Select
                            placeholder="Оберіть упаковку"
                            onChange={(value) => {
                                fetchPercentage(form.getFieldValue(["tasks", name, "target"]), value);
                                form.setFieldsValue({ tasks: { [name]: { target: undefined, percentage: 0 } } });
                                setPercentage(0);
                                updateTotalPercentage();
                            }}
                            style={{ width: 150 }}
                            disabled={!form.getFieldValue(["tasks", name, "product"])}
                        >
                            {packings.map((pack) => (
                                <Select.Option key={pack.id} value={pack.id}>
                                    {pack.value} л
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name={[name, "target"]} rules={[{ required: true, message: "Вкажіть ціль." }]}>
                        <Input
                            type="number"
                            placeholder="Ціль"
                            style={{ width: 100 }}
                            onChange={(e) => {
                                fetchPercentage(e.target.value, form.getFieldValue(["tasks", name, "packing"]));
                            }}
                            disabled={!form.getFieldValue(["tasks", name, "packing"])}
                        />
                    </Form.Item>

                    <div>
                        <Space direction="vertical" style={{ display: "flex", justifyContent: "center" }}>
                            <Text className="text-muted">{percentage ? `${percentage}%` : "0%"}</Text>
                            <Text className="text-muted">{times ? `≈${Math.floor(times / 60)} год. ${times % 60} хв.` : "≈0 хв."}</Text>
                        </Space>
                    </div>
                </>
            ) : (
                <Form.Item
                    name={[name, "remaining_time"]}
                    rules={[{ required: true, message: "Вкажіть тривалість (хвилини)." }]}
                >
                    <Input type="number" placeholder="Хвилини" style={{ width: 100 }} onChange={updateTotalPercentage} />
                </Form.Item>
            )}

            <MinusCircleOutlined onClick={() => { remove(name); updateTotalPercentage(); }} style={{ color: "red" }} />
        </Space>
    );
};

const NewShiftForm = () => {
    const [form] = Form.useForm();
    const [totalPercentage, setTotalPercentage] = useState(0);

    const updateTotalPercentage = () => {
        const tasks = form.getFieldValue("tasks") || [];

        let total = 0;
        tasks.forEach((task) => {
            if (task?.type === "TASK") {
                total += parseFloat(task?.percentage) || 0;
            } else if (task?.type === "BREAK" && task?.remaining_time) {
                total += (task.remaining_time / 480) * 100;
            }
        });

        setTotalPercentage(total.toFixed(1));
    };

    const createShift = async (values) => {
        try {
            const tasksWithOrder = values.tasks.map((task, index) => ({
                ...task,
                order: index,
            }));

            await apiClient.post("shifts/", { ...values, tasks: tasksWithOrder });
            message.success("Зміну створено успішно!");
        } catch (error) {
            message.error("Помилка створення зміни.");
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={createShift}
            style={{
                maxWidth: 800,
                margin: "0 auto",
                padding: "20px",
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
        >
            <Form.Item label="Назва зміни" name="name" rules={[{ required: true, message: "Будь ласка, введіть назву зміни." }]}>
                <Input placeholder="Введіть назву зміни" />
            </Form.Item>

            <Form.List name="tasks">
                {(fields, { add, remove }) => (
                    <>
                        {fields.map(({ key, name, ...restField }) => (
                            <TaskItem key={key} name={name} remove={remove} form={form} index={key} updateTotalPercentage={updateTotalPercentage} />
                        ))}
                        <Form.Item>
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                Додати завдання
                            </Button>
                        </Form.Item>
                    </>
                )}
            </Form.List>

            <Text strong>Загальне завантаження: {totalPercentage}%</Text>

            <Form.Item>
                <Button type="primary" htmlType="submit">
                    Створити зміну
                </Button>
            </Form.Item>
        </Form>
    );
};

export default NewShiftForm;
