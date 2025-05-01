import logging
import time
import traceback

import redis
from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.conf import settings
from django.forms.models import model_to_dict
from django.utils import timezone

from dashboard.models import ShiftTask, Shift

redis_conn = redis.Redis(
    host=settings.REDIS_CONFIG["HOST"],
    port=settings.REDIS_CONFIG["PORT"],
    db=settings.REDIS_CONFIG["DB"],
    password=settings.REDIS_CONFIG["PASSWORD"],
    decode_responses=True,
)


@shared_task
def check_and_start_shifts():
    """
    Проверяет и запускает смены, которые должны начаться
    """
    current_time = timezone.now()

    # Находим все запланированные смены, которые должны начаться
    planned_shifts = Shift.objects.filter(
        status='PLANNED',
        planned_start_time__lte=current_time
    ).order_by('planned_start_time')

    for shift in planned_shifts:
        # Завершаем все активные смены перед запуском новой
        Shift.end_active_shifts()

        # Запускаем смену
        shift.start_shift()


@shared_task(bind=True)
def lead_shift(self, shift_id):
    """
    Ведение смены в реальном времени.
    При старте каждого задания через WS отправляется полная информация
    о смене и текущем задании. При смене задания отправляется новое задание.
    """
    channel_layer = get_channel_layer()
    shift_key = f"shift:{shift_id}"
    tasks_list_key = f"shift:{shift_id}:tasks"

    logging.warning(f"[SHIFT {shift_id}] Task started.")

    # Получаем список ID заданий в нужном порядке
    task_ids = redis_conn.lrange(tasks_list_key, 0, -1)
    num_tasks = len(task_ids)

    if num_tasks == 0:
        logging.error(f"[SHIFT {shift_id}] No tasks found!")
        self.update_state(state="FAILURE", meta="Нет заданий для смены.")
        return "Нет заданий"

    active_task_index = int(redis_conn.hget(shift_key, "active_task") or 0)

    while active_task_index < num_tasks:
        current_task_id = task_ids[active_task_index]
        task_key = f"task:{current_task_id}"
        task_data = redis_conn.hgetall(task_key)

        if not task_data:
            logging.warning(f"[SHIFT {shift_id}] Task {current_task_id} not found in Redis. Skipping.")
            active_task_index += 1
            redis_conn.hset(shift_key, "active_task", active_task_index)
            continue

        task_type = task_data.get("type")
        now_str = timezone.now().isoformat()

        # Если задание ещё не запущено, устанавливаем время старта
        if not task_data.get("started_at"):
            redis_conn.hset(task_key, "started_at", now_str)
            task_data["started_at"] = now_str
            logging.info(f"[TASK {current_task_id}] Started at {now_str}")

        # Формируем полную информацию о смене
        try:
            shift_obj = Shift.objects.get(id=shift_id)
            shift_info = model_to_dict(shift_obj)
        except Exception as e:
            logging.error(f"[SHIFT {shift_id}] Ошибка получения смены из БД: {str(e)}", exc_info=True)
            shift_info = {"id": shift_id}

        # Отправляем полную информацию о смене и новом активном задании
        async_to_sync(channel_layer.group_send)(
            f"shift_{shift_id}",
            {
                "type": "shift.update",
                "event": "new_task",
                "data": {
                    "shift": shift_info,
                    "task": task_data,
                },
            },
        )
        logging.warning(
            f"[SHIFT {shift_id}] Processing task index: {active_task_index} (Task ID: {current_task_id}, Type: {task_type})")

        # Основной цикл выполнения задания
        while True:
            new_active_task_index = int(redis_conn.hget(shift_key, "active_task") or 0)
            logging.warning(
                f"[SHIFT {shift_id}] Checking active_task: {new_active_task_index} (current: {active_task_index})")
            if new_active_task_index != active_task_index:
                # Завершаем текущее задание
                finish_time = timezone.now().isoformat()
                redis_conn.hset(task_key, "finished_at", finish_time)
                task_data["finished_at"] = finish_time
                logging.info(f"[TASK {current_task_id}] Marked as finished (active_task changed).")
                async_to_sync(channel_layer.group_send)(
                    f"shift_{shift_id}",
                    {
                        "type": "task.update",
                        "event": "finish",
                        "task_id": current_task_id,
                        "data": task_data,
                    },
                )
                active_task_index = new_active_task_index
                break

            if task_type == "TASK":
                # Обновляем время выполнения
                current_time_spent = int(task_data.get("time_spent") or 0) + 1
                redis_conn.hset(task_key, "time_spent", str(current_time_spent))
                task_data["time_spent"] = str(current_time_spent)
                logging.info(f"[TASK {current_task_id}] TASK type updated: time_spent = {current_time_spent}")
                async_to_sync(channel_layer.group_send)(
                    f"shift_{shift_id}",
                    {
                        "type": "task.update",
                        "event": "update",
                        "task_id": current_task_id,
                        "data": task_data,
                    },
                )

            elif task_type == "BREAK":
                # Обновляем оставшееся время для перерыва
                current_remaining = int(task_data.get("remaining_time") or 0)
                logging.info(f"[TASK {current_task_id}] BREAK type, remaining_time before update: {current_remaining}")
                if current_remaining > 0:
                    current_remaining -= 1
                    redis_conn.hset(task_key, "remaining_time", str(current_remaining))
                    task_data["remaining_time"] = str(current_remaining)
                    logging.info(f"[TASK {current_task_id}] BREAK updated, remaining_time now: {current_remaining}")
                    async_to_sync(channel_layer.group_send)(
                        f"shift_{shift_id}",
                        {
                            "type": "task.update",
                            "event": "update",
                            "task_id": current_task_id,
                            "data": task_data,
                        },
                    )
                else:
                    # Если время перерыва истекло – завершаем задание
                    finish_time = timezone.now().isoformat()
                    redis_conn.hset(task_key, "finished_at", finish_time)
                    task_data["finished_at"] = finish_time
                    logging.info(f"[TASK {current_task_id}] BREAK finished. Finishing task.")
                    async_to_sync(channel_layer.group_send)(
                        f"shift_{shift_id}",
                        {
                            "type": "task.update",
                            "event": "finish",
                            "task_id": current_task_id,
                            "data": task_data,
                        },
                    )
                    # Переходим к следующему заданию
                    new_active_task_index = active_task_index + 1
                    redis_conn.hset(shift_key, "active_task", new_active_task_index)
                    active_task_index = new_active_task_index
                    break

            # Обновляем данные задания для следующей итерации
            task_data = redis_conn.hgetall(task_key)
            logging.warning(f"[TASK {current_task_id}] Sleeping for 1 second.")
            time.sleep(1)

    # Завершаем смену: обновляем базу данных и очищаем данные в Redis
    try:
        logging.warning(f"[SHIFT {shift_id}] Marking shift as completed in database.")
        shift = Shift.objects.get(id=shift_id)
        shift.status = Shift.Status.COMPLETED
        shift.end_time = timezone.now()
        shift.save()

        for task_id in task_ids:
            try:
                task_key = f"task:{task_id}"
                task_data = redis_conn.hgetall(task_key)
                if task_data:
                    task_defaults = {
                        "time_spent": int(task_data.get("time_spent") or 0),
                        "ready_value": int(task_data.get("ready_value") or 0) if task_data.get("ready_value") else None,
                        "remaining_time": int(task_data.get("remaining_time") or 0) if task_data.get(
                            "remaining_time") else None,
                        "started_at": task_data.get("started_at"),
                        "finished_at": task_data.get("finished_at"),
                    }
                    ShiftTask.objects.filter(id=task_id).update(**task_defaults)
                    logging.info(f"[TASK {task_id}] Updated in database.")
                    redis_conn.delete(task_key)
            except Exception as e:
                logging.error(f"[TASK {task_id}] Error updating database: {str(e)}")
                logging.error(traceback.format_exc())

        redis_conn.delete(shift_key)
        redis_conn.delete(tasks_list_key)
        logging.info(f"[SHIFT {shift_id}] Data cleared from Redis.")

    except Exception as e:
        logging.error(f"[SHIFT {shift_id}] Error finalizing shift: {str(e)}")
        logging.error(traceback.format_exc())
        self.update_state(state="FAILURE", meta=str(e))
        raise e

    async_to_sync(channel_layer.group_send)(
        f"shift_{shift_id}",
        {"type": "shift.update", "event": "completed", "data": {"shift_id": shift_id}},
    )

    logging.warning(f"[SHIFT {shift_id}] Completed successfully.")
    return f"Shift {shift_id} completed."
