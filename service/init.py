# create table
# generate data

from base_utils import *
from utils.init_utils.create_table import init_create_table

init_create_table()

user_info_path = get_abs_path("data/user_info.csv")
user_tag_path = get_abs_path("data/user_tag.csv")

import os

from init_utils.generate_user import generate_user_info
from init_utils.generate_tags import generate_user_tag_info
from utils.db_utils import load_csv_to_db

if not os.path.exists(user_info_path):
    generate_user_info(user_info_path)
    load_csv_to_db(user_info_path, "user_info", 14)
if not os.path.exists(user_tag_path):
    generate_user_tag_info(user_tag_path)
    load_csv_to_db(user_tag_path, "user_tag", 3, ["user_id", "tag_type", "tag_name"])
