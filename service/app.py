
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
        if key in ["name", "birthday", "current_city", "job", "school", "self_intro", "image_url"]:
            update_stmt_list.append("%s = '%s'" % (key, value))
        elif key in ['gender', 'education', 'height', 'income']:
            update_stmt_list.append("%s = %d" % (key, value))

    update_sql = f""" update user_profile set {", ".join(update_stmt_list)} where id = {user_id} """
    print(update_sql)
    execute_sql(update_sql)
    return jsonify({"result": "success"})

@app.route('/api/upload_image', methods=['POST'])
def upload_image():

    ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png"}
    f = request.files.get("file")  # 字段名要和 wx.uploadFile 的 name 一致
    if not f:
        return jsonify(code=1, msg="没有收到文件"), 400
    if f.mimetype not in ALLOWED:
        return jsonify(code=1, msg="不支持的类型"), 400


    import boto3
    from boto3.s3.transfer import TransferConfig
    from botocore.config import Config
    from botocore.exceptions import ClientError, BotoCoreError

    s3 = boto3.client(
        "s3",
        endpoint_url = os.getenv("S3_ENDPOINT_URL"),
        aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID", ""),
        aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY", ""),
        region_name="us-east-1",  # SeaweedFS 不校验，但 boto3 必须有
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},  # 自建必须用 path style
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=3,
            read_timeout=10,
            max_pool_connections=20
        ),
    )

    # s3.create_bucket(Bucket="pics")  # 已存在会抛错，自己 try/except

    import uuid
    file_name = uuid.uuid4().hex + ".jpg"
    s3.upload_fileobj(
        Fileobj=f.stream, Bucket = "pics", Key = file_name,
        ExtraArgs={"ContentType": f.mimetype})
    print(file_name)
    return jsonify({"image_url": file_name})

if __name__ == '__main__':
    app.register_blueprint(wechat_bp)
    app.run(debug=True, host = HOST, port = PORT)
