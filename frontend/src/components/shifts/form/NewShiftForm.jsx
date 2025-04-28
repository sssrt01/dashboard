import React, {useEffect, useState} from "react";
import {Button, Col, Divider, Form, message, Row, Select, Space, Typography} from "antd";
import {ClockCircleOutlined, PlusOutlined, UserOutlined} from "@ant-design/icons";
import styled from "styled-components";
import TaskItem from "./TaskItem";
import ShiftProgress from "./ShiftProgress";
import apiClient from "../../../services/api.jsx";

const { Title, Text } = Typography;
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
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      const tasksWithOrder = values.tasks.map((task, index) => ({
        ...task,
        order: index,
      }));

      await apiClient.post("shifts/", { ...values, tasks: tasksWithOrder });
      message.success("Зміну створено успішно!");
      window.location.reload();
    } catch (error) {
      message.error("Помилка створення зміни.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledCard>
      <div style={{ padding: "16px" }}>
        <Space align="center" style={{ marginBottom: "24px" }}>
          <ClockCircleOutlined style={{ fontSize: 24, color: "#1890ff" }} />
          <Title level={4} style={{ margin: 0 }}>
            Створення нової зміни
          </Title>
        </Space>

        <Form form={form} layout="vertical" onFinish={createShift}>
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                  name="master"
                  label="Майстер зміни"
                  rules={[{required: true, message: "Будь ласка, оберіть майстра зміни"}]}
              >
                <Select
                    placeholder="Оберіть майстра"
                  size="large"
                    suffixIcon={<UserOutlined/>}
                >
                  {masters.map(master => (
                      <Option key={master.id} value={master.id}>
                        {master.name}
                      </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Divider orientation="left" orientationMargin="0">
                <Text strong style={{ fontSize: 16 }}>
                  Завдання зміни
                </Text>
              </Divider>

              <Row gutter={24}>
                {/* Левая колонка с задачами */}
                <Col xs={24} md={16}>
                  <Form.List name="tasks">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name }) => (
                          <TaskItem
                            key={key}
                            name={name}
                            remove={remove}
                            form={form}
                            updateTotalPercentage={updateTotalPercentage}
                          />
                        ))}

                        <Form.Item>
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            block
                            icon={<PlusOutlined />}
                            size="large"
                          >
                            Додати завдання
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Col>

                {/* Правая колонка с нагрузкой */}
                <Col xs={24} md={8}>
                  <div
                    style={{
                      position: "sticky",
                      top: "20px",
                      padding: "16px",
                      border: "1px solid #e8e8e8",
                      borderRadius: "8px",
                      background: "#fff",
                    }}
                  >
                    <ShiftProgress totalPercentage={totalPercentage} />
                  </div>
                </Col>
              </Row>
            </Col>

            <Col span={24} style={{ marginTop: 24, textAlign: "center" }}>
              <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  style={{width: 200, height: 40}}
                  loading={loading}
              >
                Створити зміну
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    </StyledCard>
  );
};

export default NewShiftForm;