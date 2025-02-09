FROM python:3.12-slim

WORKDIR /app
COPY req.txt /app/
RUN pip install --no-cache-dir -r req.txt

COPY . /app/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]