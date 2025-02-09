import React, { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import authService from '../services/authService.jsx';
import "../assets/LoginPage.css"
const LoginPage = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authService.login(values.username, values.password);
      message.success('Ви успішно увійшли!');
      window.location.href = '/admin';
    } catch (error) {
      message.error('Невірне ім’я користувача або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Form
        name="login-form"
        className="login-form"
        initialValues={{ remember: true }}
        onFinish={onFinish}
      >
        <h1 className="login-title">Вхід</h1>
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Введіть ім’я користувача!' }]}
        >
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="Ім’я користувача"
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Введіть пароль!' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="Пароль"
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="login-form-button"
            loading={loading}
          >
            Увійти
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default LoginPage;
