
import os

DB_PATH = "love_app.db"
PORT = 8000
HOST = '0.0.0.0'

def get_abs_path(path):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, path)