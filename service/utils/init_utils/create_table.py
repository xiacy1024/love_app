
from utils.db_utils import execute_sql

create_user_sql = """
    CREATE TABLE IF NOT EXISTS user_info(
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        gender        INTEGER NOT NULL,  -- 1 男 2 女
        name          TEXT    NOT NULL,
        bithday       TEXT    NOT NULL default '2000-01-01',
        height        INTEGER NOT NULL,
        education     INTEGER,    -- 1 高中以下  2 大专  3 本科  4 硕士  5 博士
        school        text,     
        job           text,
        income        text,       -- 1 5000以下   2 5000-1万  3 1万-3万 4 3万-10万  5 10万以上
        current_city  text,
        image_url     text,
        self_intro    text,
        vip           INTEGER,
        recommend_score  float
    )
"""

create_tab_sql = """
    CREATE TABLE IF NOT EXISTS user_tag(
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL,
        tag_type      INTEGER NOT NULL,  -- 1 性格  2 爱好 3 游戏
        tag_name      TEXT    NOT NULL
    )
"""

def init_create_table():
    execute_sql(create_user_sql)
    execute_sql(create_tab_sql)