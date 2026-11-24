from flask import Blueprint, request, jsonify
import requests
from utils.db_utils import execute_sql, insert_data_by_sql, get_profile_by_userid

# 定义蓝图，而不是 Flask 实例
wechat_bp = Blueprint('wechat', __name__, url_prefix='/api/wechat')

import os
APP_ID = os.environ.get("WECHAT_APP_ID")
APP_SECRET = os.environ.get("WECHAT_APP_SECRET")

def code_to_openid(code: str) -> dict:
    """
    使用 code 向微信服务器换取 openid 和 session_key。
    注意：session_key 仅应在服务端临时使用（如解密手机号），严禁返回前端或存库。
    """
    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": APP_ID, #"wxa6848950185c9456",
        "secret": APP_SECRET, #"3008dff6bfcaf84ca0022e0a94ac1ca0",
        "js_code": code,
        "grant_type": "authorization_code",  # 固定值
    }

    # 设置超时，避免微信接口异常时阻塞服务
    resp = requests.get(url, params=params, timeout=(3, 5))
    data = resp.json()

    if data.get("errcode"):
        # 常见错误：40029 code无效；45011 频率限制
        raise ValueError(f"微信接口错误 [{data['errcode']}]: {data.get('errmsg')}")

    openid = data["openid"]
    select_sql = f""" select user_id from auth_wechat where open_id = '{openid}' """
    result = execute_sql(select_sql)
    if len(result) == 0:
        insert_user_sql = """ INSERT INTO user_profile (name) VALUES (null)"""
        user_id = insert_data_by_sql(insert_user_sql)
        insert_auth_sql = f""" INSERT INTO auth_wechat (open_id, user_id) values('{openid}', {user_id}) """
        insert_data_by_sql(insert_auth_sql)
        return { "user_id": user_id }
    else:
        profile_row = get_profile_by_userid(result[0][0])[0]
        profile = dict(profile_row)
        profile["user_id"] = profile["id"]

        return profile


@wechat_bp.route('/login', methods=['POST'])
def login():
    body = request.get_json()
    if not body or not body.get("code"):
        return jsonify({"error": "缺少 code 参数"}), 400

    try:
        return jsonify(code_to_openid(body["code"]))
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except requests.RequestException:
        return jsonify({"error": "网络请求微信接口失败"}), 500
