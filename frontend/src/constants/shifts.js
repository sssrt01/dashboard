import dayjs from 'dayjs';

// Форматы дат
export const DATE_TIME_FORMAT = 'DD.MM.YYYY HH:mm:ss';
export const DATE_TIME_SHORT_FORMAT = 'DD.MM.YYYY HH:mm';

// Общие значения
export const EMPTY_VALUE = '—';
export const PAGE_SIZE = {
    DEFAULT: 10,
    SMALL: 5
};

// Цвета статусов
export const STATUS_COLORS = {
    PLANNED: 'blue',
    ACTIVE: 'green',
    COMPLETED: 'gray',
    CANCELLED: 'red',
};

// Утилитные функции для работы с датами
export const formatDateTime = (date, format = DATE_TIME_FORMAT) => {
    return date ? dayjs(date).format(format) : EMPTY_VALUE;
};

export const formatValue = (value, formatter) => {
    return value != null ? formatter(value) : EMPTY_VALUE;
};

export const compareDates = (dateA, dateB) => {
    if (!dateA) return -1;
    if (!dateB) return 1;
    return dayjs(dateA).unix() - dayjs(dateB).unix();
};