
from flask import Flask, jsonify, request
from base_utils import *
from utils.db_utils import execute_sql
app = Flask(__name__)
@app.route('/hello', methods=['GET'])
def hello_world():
    return jsonify({"message": "Hello, World!"})

@app.route('/api/get_user_info', methods=['GET'])
def get_user_info():
    gender = request.args.get('gender', type=int)
    if gender is None:
        return jsonify({"error": "gender is required"}), 400
    rows = execute_sql("select * from user_info where gender = ?", (gender,))
    result = [dict(row) for row in rows]
    result.sort(key= lambda item: item["recommend_score"], reverse=True)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, host = HOST, port = PORT)
