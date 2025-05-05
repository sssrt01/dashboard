from .models import Shift, ShiftTask


def get_shifts_statistics():
    completed_shifts = Shift.objects.filter(
        status=Shift.Status.COMPLETED
    ).select_related('master')

    statistics = []

    for shift in completed_shifts:
        # Получаем все задания в смене (исключая перерывы)
        tasks = ShiftTask.objects.filter(
            shift=shift,
            type=ShiftTask.TaskType.TASK
        )

        # Подсчитываем процент выполнения для каждого задания
        tasks_completion = []
        for task in tasks:
            if task.target and task.ready_value:
                completion_percent = (task.ready_value / task.target) * 100
                tasks_completion.append(completion_percent)

        # Считаем средний процент выполнения смены
        avg_completion = sum(tasks_completion) / len(tasks_completion) if tasks_completion else 0

        statistics.append({
            'shift_id': shift.id,
            'master_name': shift.master.name,
            'start_time': shift.start_time,
            'end_time': shift.end_time,
            'avg_completion': round(avg_completion, 2),
            'tasks_count': len(tasks),
            'tasks_details': [
                {
                    'product_name': task.product.name if task.product else None,
                    'target': task.target,
                    'completed': task.ready_value,
                    'completion_percent': round((task.ready_value / task.target * 100),
                                                2) if task.target and task.ready_value else 0
                }
                for task in tasks
            ]
        })

    return statistics
