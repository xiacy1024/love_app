
from flask import Flask, jsonify, request
from base_utils import *
from utils.db_utils import execute_sql
from wechat import wechat_bp

app = Flask(__name__)

@app.route('/api/get_user_profile', methods=['GET'])
def get_user_profile():
    gender = request.args.get('gender', type=int)
    if gender is None:
        return jsonify({"error": "gender is required"}), 400
    rows = execute_sql("select * from user_profile where gender = ? and recommend_score>0", (gender,))
    result = [dict(row) for row in rows]
    result.sort(key= lambda item: item["recommend_score"], reverse=True)
    return jsonify(result)

@app.route('/api/profile', methods=['POST'])
def set_profile():
    body = request.get_json()
    user_id = body.get("user_id")
    print(body)
    update_stmt_list = []
    for key in body.keys():
        value = body[key]
        if not value:
            continue
        if key in ["name", "birthday", "current_city", "job", "school", "self_intro"]:
            update_stmt_list.append("%s = '%s'" % (key, value))
        elif key in ['gender', 'education', 'height', 'income']:
            update_stmt_list.append("%s = %d" % (key, value))

    update_sql = f""" update user_profile set {", ".join(update_stmt_list)} where id = {user_id} """
    print(update_sql)
    execute_sql(update_sql)
    return jsonify({"result": "success"})

if __name__ == '__main__':
    app.register_blueprint(wechat_bp)
    app.run(debug=True, host = HOST, port = PORT)
