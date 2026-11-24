
from base_utils import *
import sqlite3
from contextlib import closing

def get_conn():
    conn = sqlite3.connect(get_abs_path(DB_PATH))
    conn.row_factory = sqlite3.Row        # 结果可按列名访问 row["name"]
    return conn

def execute_sql(sql, params=()):
    with closing(get_conn()) as conn:  # closing 保证连接关闭
        with conn:  # with 管理事务：正常 commit，异常 rollback
            cur = conn.execute(sql, params)
            return cur.fetchall()

def load_csv_to_db(csv_path, table_name, column_cnt, column_list = []):
    import csv
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # 跳过表头
        rows = [tuple(row) for row in reader]

    with closing(get_conn()) as conn:  # closing 保证连接关闭
        with conn:  # with 管理事务：正常 commit，异常 rollback
            cursor = conn.cursor()
            if not column_list:
                cursor.executemany(f"INSERT INTO {table_name} VALUES ({', '.join(['?']*column_cnt)})", rows)
            else:
                cursor.executemany(f"INSERT INTO {table_name} ({', '.join(column_list)}) VALUES ({', '.join(['?'] * column_cnt)})", rows)
