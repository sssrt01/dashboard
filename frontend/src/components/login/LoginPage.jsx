import React, {useState} from 'react';
import {Button, Form, Input, message} from 'antd';
import {LockOutlined, UserOutlined} from '@ant-design/icons';
import {useNavigate} from 'react-router-dom';
import authService from '../../services/authService.jsx';
import "../../assets/LoginPage.css";

const FORM_MESSAGES = {
    SUCCESS: 'Ви успішно увійшли!',
    ERROR: 'Невірне ім\'я користувача або пароль',
    USERNAME_REQUIRED: 'Введіть ім\'я користувача!',
    PASSWORD_REQUIRED: 'Введіть пароль!'
};

const FORM_CONFIG = {
    USERNAME_RULES: [{required: true, message: FORM_MESSAGES.USERNAME_REQUIRED}],
    PASSWORD_RULES: [{required: true, message: FORM_MESSAGES.PASSWORD_REQUIRED}]
};

const LoginForm = ({onSubmit, loading}) => (
    <Form
        name="login-form"
        className="login-form"
        initialValues={{remember: true}}
        onFinish={onSubmit}
    >
        <h1 className="login-title">Вхід</h1>
        <Form.Item name="username" rules={FORM_CONFIG.USERNAME_RULES}>
            <Input
                prefix={<UserOutlined className="site-form-item-icon"/>}
                placeholder="Ім'я користувача"
            />
        </Form.Item>
        <Form.Item name="password" rules={FORM_CONFIG.PASSWORD_RULES}>
            <Input.Password
                prefix={<LockOutlined className="site-form-item-icon"/>}
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
);

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            await authService.login(values.username, values.password);
            message.success(FORM_MESSAGES.SUCCESS);
            navigate('/shifts');
        } catch (error) {
            message.error(FORM_MESSAGES.ERROR);
            console.error('Ошибка входа:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <LoginForm onSubmit={handleLogin} loading={loading}/>
    </div>
  );
};

export default LoginPage;