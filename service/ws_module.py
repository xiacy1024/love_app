from flask import Flask, Blueprint
from flask_sock import Sock
# from extensions import sock

ws_bp = Blueprint('ws', __name__)
import redis
import traceback
from utils.redis_utils import get_redis
from base_utils import *

from extensions import app
sock = Sock(app)

@sock.route('/ws/get_chat_latest/<int:receiver_id>/stream')
def get_chat_latest(ws, receiver_id):
    channel = REDIS_CHAT_PREFIX + str(receiver_id)
    pubsub = get_redis().pubsub()
    pubsub.subscribe(channel)
    try:
        for msg in pubsub.listen():
            if msg['type'] != 'message':
                continue
            ws.send(msg["data"])
    except Exception as e:
        print(f'[ws closed] type={type(e).__name__}, msg={e!r}')
        traceback.print_exc()
        if isinstance(e, (ConnectionResetError, BrokenPipeError)):
            print('[ws closed] 底层 TCP 已断（客户端断网/崩溃/被代理切断）')
        elif isinstance(e, ConnectionError):
            print('[ws closed] WebSocket 层连接异常（客户端正常关闭，或 Werkzeug 开发服务器问题）')
        elif isinstance(e, redis.exceptions.ConnectionError):
            print('[ws closed] Redis 连接异常')
    finally:
        try:
            pubsub.close()
        except Exception as ce:
            print(f'[pubsub close] type={type(ce).__name__}, msg={ce!r}')