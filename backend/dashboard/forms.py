from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User


class CustomUserCreationForm(UserCreationForm):
    password1 = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput,
        help_text='Введите пароль'
    )
    password2 = forms.CharField(
        label='Подтверждение пароля',
        widget=forms.PasswordInput,
        help_text='Введите пароль повторно'
    )

    class Meta:
        model = User
        fields = ('username', 'password1', 'password2')
        help_texts = {
            'username': 'Обязательное поле. До 150 символов.',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Убираем все валидаторы паролей
        self.fields['password1'].validators = []
        self.fields['password2'].validators = []

    def clean_password2(self):
        # Просто проверяем что пароли совпадают, без дополнительной валидации
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Пароли не совпадают")
        return password2
