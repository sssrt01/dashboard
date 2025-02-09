import React, { useState, useEffect } from "react";
import { Form, Input, Button, Select, TimePicker, message } from "antd";
import apiClient from "../services/api.jsx";

const { Option } = Select;

const ShiftForm = () => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [packings, setPackings] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleProductChange = (value) => {
    form.setFieldsValue({ packing: undefined });
    fetchPackings(value);
  };

  const handleSubmit = (values) => {
    setLoading(true);

    const shiftTimeInSeconds =
      values.shift_time.hour() * 3600 + values.shift_time.minute() * 60;

    const payload = { ...values, shift_time: shiftTimeInSeconds };

    apiClient
      .post("shift/", payload)
      .then(() => {
        message.success("Зміну успішно створено.");
        form.resetFields();
      })
      .catch((error) => {
        const errorMsg =
          error.response?.data?.error || "Помилка створення зміни.";
        message.error(errorMsg);
      })
      .finally(() => setLoading(false));
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      style={{
        margin: "0 auto",
        padding: "20px",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Form.Item
        label="Назва зміни"
        name="name"
        rules={[
          { required: true, message: "Будь ласка, введіть назву зміни." },
        ]}
      >
        <Input style={{ maxWidth: 600 }} placeholder="Введіть назву зміни" />
      </Form.Item>

      <Form.Item
        label="Продукт"
        name="product"
        rules={[{ required: true, message: "Будь ласка, виберіть продукт." }]}
      >
        <Select
          style={{ maxWidth: 600 }}
          placeholder="Виберіть продукт"
          onChange={handleProductChange}
        >
          {products.map((product) => (
            <Option key={product.id} value={product.id}>
              {product.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="Упаковка"
        name="packing"
        rules={[{ required: true, message: "Будь ласка, виберіть упаковку." }]}
      >
        <Select
          style={{ maxWidth: 600 }}
          placeholder="Виберіть упаковку"
          disabled={!packings.length}
        >
          {packings.map((packing) => (
            <Option key={packing.id} value={packing.id}>
              {packing.value} л
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="Цільове значення"
        name="target_value"
        rules={[
          { required: true, message: "Будь ласка, введіть цільове значення." },
        ]}
      >
        <Input
          style={{ maxWidth: 600 }}
          type="number"
          placeholder="Введіть цільове значення"
        />
      </Form.Item>

      <Form.Item
        label="Час зміни (HH:mm)"
        name="shift_time"
        rules={[{ required: true, message: "Будь ласка, введіть час зміни." }]}
      >
        <TimePicker format="HH:mm" placeholder="Виберіть час зміни" />
      </Form.Item>

      <Form.Item>
        <Button
          style={{ maxWidth: 600 }}
          type="primary"
          htmlType="submit"
          loading={loading}
          block
        >
          Створити зміну
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ShiftForm;
