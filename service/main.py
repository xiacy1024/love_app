
import extensions
from extensions import app

import os

# 关键：在 app.run() 之前导入 ws_module，触发 @sock.route 注册
import ws_module  # noqa: F401

if __name__ == '__main__':
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    app.run(debug=True, host = host, port = port, threaded=True)