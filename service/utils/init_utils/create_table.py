
from utils.db_utils import execute_sql, personal_tag_list, hobby_tag_list

create_user_sql = """
    CREATE TABLE IF NOT EXISTS user_profile(
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        gender        INTEGER NOT NULL default 1,  -- 1 男 2 女
        name          TEXT,
        birthday      TEXT    NOT NULL default '2000-01-01',
        height        INTEGER,
        education     INTEGER,    -- 1 高中以下  2 大专  3 本科  4 硕士  5 博士
        school        text,     
        job           text,
        income        INTEGER,    -- 1 5k 以下   2 5k-10k  3 10k-20k 4 20k-50k  5 50k 以上
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

create_tab_personality_sql = """
    CREATE TABLE IF NOT EXISTS user_tag_personality(
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL,
        score         float
    )
"""

create_tab_hobby_sql = """
    CREATE TABLE IF NOT EXISTS user_tag_hobby(
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL
    )
"""

create_auth_wechat_sql = """
    CREATE TABLE IF NOT EXISTS auth_wechat(
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL,
        open_id       TEXT NOT NULL
    )    
"""

create_auth_wechat_index_sql = """
    CREATE INDEX IF NOT EXISTS auth_wechat_openid
        ON auth_wechat(open_id)
"""

def init_create_table():
    execute_sql(create_user_sql)
    #execute_sql(create_tab_sql)
    execute_sql(create_tab_personality_sql)
    personality_column_info = execute_sql("PRAGMA table_info(user_tag_personality)")
    personality_column_list = [ row[1] for row in personality_column_info]
    for tag in personal_tag_list:
        if tag in personality_column_list:
            continue
        execute_sql(f""" ALTER TABLE user_tag_personality ADD COLUMN {tag} integer """)
    execute_sql(create_tab_hobby_sql)
    hobby_column_info = execute_sql("PRAGMA table_info(user_tag_hobby)")
    hobby_column_list = [row[1] for row in hobby_column_info]
    for tag in hobby_tag_list:
        if tag in hobby_column_list:
            continue
        execute_sql(f""" ALTER TABLE user_tag_hobby ADD COLUMN {tag} integer """)
    execute_sql(create_auth_wechat_sql)
    execute_sql(create_auth_wechat_index_sql)