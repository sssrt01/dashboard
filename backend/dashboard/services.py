from dashboard.models import ShiftTask, Shift


def get_shifts_statistics():
    completed_shifts = Shift.objects.filter(
        status=Shift.Status.COMPLETED
    ).select_related('master')

    masters_stats = {}

    for shift in completed_shifts:
        master_id = shift.master.id
        master_name = shift.master.name

        if master_id not in masters_stats:
            masters_stats[master_id] = {
                'master_id': master_id,
                'master_name': master_name,
                'total_shifts': 0,
                'total_completion': 0,
                'shifts_details': []
            }

        tasks = ShiftTask.objects.filter(
            shift=shift,
            type=ShiftTask.TaskType.TASK
        )

        shift_completion = 0
        valid_tasks = 0

        for task in tasks:
            if task.target and task.ready_value:
                completion_percent = (task.ready_value / task.target) * 100
                shift_completion += completion_percent
                valid_tasks += 1

        avg_shift_completion = round(shift_completion / valid_tasks, 2) if valid_tasks > 0 else 0

        masters_stats[master_id]['total_shifts'] += 1
        masters_stats[master_id]['total_completion'] += avg_shift_completion

        masters_stats[master_id]['shifts_details'].append({
            'shift_id': shift.id,
            'start_time': shift.start_time,
            'end_time': shift.end_time,
            'avg_completion': avg_shift_completion,
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

    result = []
    for master_stats in masters_stats.values():
        master_stats['avg_completion'] = round(
            master_stats['total_completion'] / master_stats['total_shifts']
            if master_stats['total_shifts'] > 0 else 0,
            2
        )
        result.append(master_stats)

    return result
