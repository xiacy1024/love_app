# create table
# generate data

from base_utils import *
from utils.init_utils.create_table import init_create_table

init_create_table()

user_profile_path = get_abs_path("data/user_profile.csv")
user_tag_path = get_abs_path("data/user_tag.csv")

import os

from init_utils.generate_user import generate_user_profile
from init_utils.generate_tags import generate_user_tag_info
from utils.db_utils import load_csv_to_db, execute_sql

if not os.path.exists(user_profile_path):
    generate_user_profile(user_profile_path)
    execute_sql("delete from user_profile")
    load_csv_to_db(user_profile_path, "user_profile", 14)
if not os.path.exists(user_tag_path):
    generate_user_tag_info(user_tag_path)
    load_csv_to_db(user_tag_path, "user_tag", 3, ["user_id", "tag_type", "tag_name"])
