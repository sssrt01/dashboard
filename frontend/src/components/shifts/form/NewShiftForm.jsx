import React, {useEffect, useState} from "react";
import {Button, Checkbox, Col, DatePicker, Divider, Form, message, Row, Select, Space, Typography} from "antd";
import {ClockCircleOutlined, MinusCircleOutlined, PlusOutlined, UserOutlined} from "@ant-design/icons";
import styled from "styled-components";
import TaskItem from "./TaskItem";
import ShiftProgress from "./ShiftProgress";
import apiClient from "../../../services/api.jsx";
import dayjs from "dayjs";
import locale from 'antd/es/date-picker/locale/uk_UA';

const {Title, Text} = Typography;
const {Option} = Select;

const StyledCard = styled.div`
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    margin: 24px auto;
    max-width: 1000px;
    background: #fff;

    .ant-card-head {
        border-bottom: 2px solid #f0f0f0;
    }
`;

const NewShiftForm = () => {
    const [form] = Form.useForm();
    const [masters, setMasters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [shiftsPercentages, setShiftsPercentages] = useState({});

    useEffect(() => {
        fetchMasters();
    }, []);

    const fetchMasters = async () => {
        try {
            const response = await apiClient.get("masters/");
            setMasters(response.data);
        } catch (error) {
            message.error("Помилка завантаження списку майстрів");
        }
    };

    const updateTotalPercentage = (shiftIndex) => {
        const values = form.getFieldsValue();
        let total = 0;

        const tasks = values.shifts?.[shiftIndex]?.tasks || [];
        tasks.forEach(task => {
            if (task?.percentage) {
                total += parseFloat(task.percentage);
            }
        });

        setShiftsPercentages(prev => ({
            ...prev,
            [shiftIndex]: total
        }));
    };

    const createShifts = async (values) => {
        try {
            setLoading(true);
            const shifts = values.shifts || [];

            for (const shift of shifts) {
                const tasksWithOrder = (shift.tasks || []).map((task, index) => ({
                    ...task,
                    order: index,
                }));

                const start_time = shift.start_now
                    ? new Date().toISOString()
                    : dayjs(shift.planned_start_time).toISOString();

                await apiClient.post("shifts/", {
                    master: shift.master,
                    tasks: tasksWithOrder,
                    planned_start_time: start_time,
                });
            }

            message.success("Зміни створено успішно!");
            window.location.reload();
        } catch (error) {
            message.error("Помилка створення змін.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{padding: "16px"}}>
            <Space align="center" style={{marginBottom: "24px"}}>
                <ClockCircleOutlined style={{fontSize: 24, color: "#1890ff"}}/>
                <Title level={4} style={{margin: 0}}>
                    Створення нових змін
                </Title>
            </Space>

            <Form form={form} layout="vertical" onFinish={createShifts}>
                <Form.List name="shifts">
                    {(fields, {add, remove}) => (
                        <>
                            {fields.map(({key, name}) => (
                                <div
                                    key={key}
                                    style={{
                                        border: "1px solid #f0f0f0",
                                        borderRadius: 8,
                                        padding: 16,
                                        marginBottom: 24,
                                        background: "#fafafa",
                                    }}
                                >
                                    <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 16}}>
                                        <Button
                                            type="text"
                                            danger
                                            icon={<MinusCircleOutlined/>}
                                            onClick={() => {
                                                remove(name);
                                                setShiftsPercentages(prev => {
                                                    const newPercentages = {...prev};
                                                    delete newPercentages[name];
                                                    return newPercentages;
                                                });
                                            }}
                                        >
                                            Видалити зміну
                                        </Button>
                                    </div>

                                    <Row gutter={24}>
                                        <Col span={24}>
                                            <Form.Item
                                                name={[name, "master"]}
                                                label="Майстер зміни"
                                                rules={[{required: true, message: "Оберіть майстра"}]}
                                            >
                                                <Select placeholder="Оберіть майстра" size="large"
                                                        suffixIcon={<UserOutlined/>}>
                                                    {masters.map((master) => (
                                                        <Option key={master.id} value={master.id}>
                                                            {master.name}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                name={[name, "start_now"]}
                                                valuePropName="checked"
                                            >
                                                <Checkbox onChange={(e) => {
                                                    form.setFieldsValue({
                                                        shifts: {
                                                            [name]: {
                                                                planned_start_time: e.target.checked ? null : form.getFieldValue(['shifts', name, 'planned_start_time'])
                                                            }
                                                        }
                                                    });
                                                }}>
                                                    Почати зараз
                                                </Checkbox>
                                            </Form.Item>

                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                name={[name, "planned_start_time"]}
                                                label="Час початку"
                                                rules={[{required: false}]}
                                                style={{display: form.getFieldValue(['shifts', name, 'start_now']) ? 'none' : 'block'}}

                                            >
                                                <DatePicker showTime format="YYYY-MM-DD HH:mm"
                                                            style={{width: "100%"}} locale={locale}
                                                />
                                            </Form.Item>
                                        </Col>

                                        <Col span={24}>
                                            <Divider orientation="left">Завдання</Divider>
                                            <Row gutter={24}>
                                                <Col xs={24} md={16}>
                                                    <Form.List name={[name, "tasks"]}>
                                                        {(taskFields, {add, remove}) => (
                                                            <>
                                                                {taskFields.map(({
                                                                                     key: taskKey,
                                                                                     name: taskName
                                                                                 }) => (
                                                                    <TaskItem
                                                                        key={taskKey}
                                                                        name={taskName}
                                                                        remove={remove}
                                                                        form={form}
                                                                        shiftIndex={name}
                                                                        updateTotalPercentage={() => updateTotalPercentage(name)}
                                                                    />
                                                                ))}
                                                                <Form.Item>
                                                                    <Button
                                                                        type="dashed"
                                                                        onClick={() => add()}
                                                                        block
                                                                        icon={<PlusOutlined/>}
                                                                    >
                                                                        Додати завдання
                                                                    </Button>
                                                                </Form.Item>
                                                            </>
                                                        )}
                                                    </Form.List>
                                                </Col>
                                                <Col xs={24} md={8}>
                                                    <ShiftProgress totalPercentage={shiftsPercentages[name] || 0}/>
                                                </Col>
                                            </Row>
                                        </Col>
                                    </Row>
                                </div>
                            ))}

                            <Form.Item>
                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    block
                                    icon={<PlusOutlined/>}
                                    size="large"
                                >
                                    Додати зміну
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>

                <div style={{textAlign: "center", marginTop: 24}}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={loading}
                        style={{width: 200, height: 40}}
                    >
                        Створити зміни
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default NewShiftForm;