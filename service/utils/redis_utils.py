
import os
import redis
from redis import ConnectionPool

redis_ip = os.getenv("REDIS_IP", "localhost")
redis_port = os.getenv("REDIS_PORT", 6379)
redis_conn = None

redis_pool = ConnectionPool(
    host = os.getenv("REDIS_IP", "localhost"),
    port = os.getenv("REDIS_PORT", 6379),
    db = 0,
    # password=REDIS_PASSWORD,
    decode_responses = True,
    max_connections = 20,
    socket_timeout=3,
    socket_connect_timeout=3,
    health_check_interval=30,
)

def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=redis_pool)

def redis_publish(key, value) -> None:
    get_redis().publish(key, value)

def redis_subscribe(key):
    return get_redis().subscribe(key)
