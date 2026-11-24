
from init_utils.tag_list import personal_tag_list, hobby_tag_list, game_tag_list
import pandas as pd

import random
seed = 42
data_dic = {"user_id": [], "tag_type": [], "tag_name": []}
# for idx in range(1, 4001):

def generate_tag_list(tag_list = [], tag_len = 10):
    rng = random.Random(seed)
    choose_len = random.randint(0, tag_len)
    selected_tags = rng.sample(tag_list, choose_len)
    return selected_tags

def generate_user_tag_info(user_tag_path):
    for idx in range(1, 4001):
        personal_selected = generate_tag_list(personal_tag_list, 10)
        hobby_selected = generate_tag_list(hobby_tag_list, 10)
        game_selected = generate_tag_list(game_tag_list, 5)
        personal_len = len(personal_selected)
        hobby_len = len(hobby_selected)
        game_len = len(game_selected)
        data_dic["user_id"].extend([idx] * (personal_len + hobby_len + game_len))
        data_dic["tag_type"].extend([1] * personal_len + [2] * hobby_len + [3] * game_len)
        data_dic["tag_name"].extend(personal_selected + hobby_selected + game_selected)

    data = pd.DataFrame(data_dic)
    data.to_csv(user_tag_path, index=False, encoding="utf-8-sig", na_rep="")  # utf-8-sig：Excel 打开不乱码

