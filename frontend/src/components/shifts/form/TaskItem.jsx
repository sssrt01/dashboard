import React, {useEffect, useState} from "react";
import {Form, Input, message, Select, Space} from "antd";
import {MinusCircleOutlined} from "@ant-design/icons";
import apiClient from "../../../services/api.jsx";

const TaskItem = ({name, remove, form, updateTotalPercentage, shiftIndex}) => {
    const [products, setProducts] = useState([]);
    const [packings, setPackings] = useState([]);
    const [percentage, setPercentage] = useState(0);
    const [times, setTimes] = useState(0);
    const [taskType, setTaskType] = useState("TASK");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedPacking, setSelectedPacking] = useState(null);
    const [shiftDuration, setShiftDuration] = useState(480); // 8 часов в минутах

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

                // Обновляем значение в форме
                const taskPath = ['shifts', shiftIndex, 'tasks', name];
                form.setFieldValue([...taskPath, 'percentage'], percentageValue);

                updateTotalPercentage();
            })
            .catch(() => message.error("Помилка розрахунку відсотка."));
    };


    return (
        <Space style={{display: "flex", marginBottom: 8}} align="baseline">
            <Form.Item name={[name, "type"]} initialValue="TASK">
                <Select
                    style={{width: 120}}
                    onChange={(value) => {
                        setTaskType(value);
                        setSelectedProduct(null);
                        setSelectedPacking(null);
                        form.setFieldsValue({
                            tasks: {
                                [name]: {
                                    product: undefined,
                                    packing: undefined,
                                    target: undefined,
                                    remaining_time: undefined,
                                    percentage: 0,
                                },
                            },
                        });
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
                    <Form.Item name={[name, "product"]} rules={[{required: true, message: "Оберіть продукт."}]}>
                        <Select
                            placeholder="Оберіть продукт"
                            onChange={(value) => {
                                setSelectedProduct(value);
                                fetchPackings(value);
                                form.setFieldsValue({
                                    tasks: {
                                        [name]: {packing: undefined, target: undefined, percentage: 0},
                                    },
                                });
                                setSelectedPacking(null);
                                setPercentage(0);
                                updateTotalPercentage();
                            }}

                            style={{width: 150}}
                        >
                            {products.map((product) => (
                                <Select.Option key={product.id} value={product.id}>
                                    {product.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name={[name, "packing"]} rules={[{required: true, message: "Оберіть упаковку."}]}>
                        <Select
                            placeholder="Оберіть упаковку"
                            onChange={(value) => {
                                setSelectedPacking(value);
                                fetchPercentage(form.getFieldValue(["tasks", name, "target"]), value);
                                form.setFieldsValue({tasks: {[name]: {target: undefined, percentage: 0}}});
                                setPercentage(0);
                                updateTotalPercentage();
                            }}
                            style={{width: 150}}
                            disabled={!selectedProduct}
                        >
                            {packings.map((pack) => (
                                <Select.Option key={pack.id} value={pack.id}>
                                    {pack.value} л
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name={[name, "target"]} rules={[{required: true, message: "Вкажіть ціль."}]}>
                        <Input
                            type="number"
                            placeholder="Ціль"
                            style={{width: 100}}
                            onChange={(e) => {
                                const packing = form.getFieldValue(['shifts', shiftIndex, 'tasks', name, 'packing']);
                                fetchPercentage(e.target.value, packing);
                            }}

                            disabled={!selectedPacking}
                        />
                    </Form.Item>

                    <div>
                        <Space direction="vertical" style={{display: "flex", justifyContent: "center"}}>
                            <span>{percentage ? `${percentage}%` : "0%"}</span>
                            <span style={{
                                color: times > shiftDuration ? '#ff4d4f' : '#52c41a'
                            }}>
            {times ? `≈${Math.floor(times / 60)} год. ${times % 60} хв.` : "≈0 хв."}
        </span>
                        </Space>
                    </div>
                </>
            ) : (
                <Form.Item name={[name, "remaining_time"]}
                           rules={[{required: true, message: "Вкажіть тривалість (хвилини)."}]}>
                    <Input type="number" placeholder="Хвилини" style={{width: 100}} onChange={updateTotalPercentage}/>
                </Form.Item>
            )}

            <MinusCircleOutlined
                onClick={() => {
                    remove(name);
                    updateTotalPercentage();
                }}
                style={{color: "red"}}
            />
        </Space>
    );
};

export default TaskItem;
