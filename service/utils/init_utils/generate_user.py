#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
随机生成 user_info 表测试数据：2000 条男（gender=1）+ 2000 条女（gender=2），共 4000 行，输出 CSV。

字段顺序严格对齐建表语句：
    id, gender, name, birthday, height, education, school, job,
    income, current_city, image_url, self_intro, vip

约定：
- 年龄不单独建列（建表语句里没有 age 字段），统一用 birthday 落在「今天满 18~35 周岁」的区间，
  脚本内会回算周岁并断言校验。
- image_url 一律留空（按要求不要图片）。
- 建表时未加 NOT NULL 的字段（education / school / job / income / current_city /
  image_url / self_intro / vip）按不同比例随机留空。
- education、gender、income 都按注释里的数字编码存：education 1~5，income 1~4（TEXT 列存 '1'~'4'）。

依赖：pandas（随机逻辑只用标准库 random / datetime，pandas 仅用于建表与写 CSV）
运行：python3 gen_user_info_csv.py
"""

import itertools
import os
import random
from datetime import date

import pandas as pd

# ---------------- 配置 ----------------
SEED = 2026                      # 固定随机种子，保证每次生成结果可复现
MALE_N = 2000                    # 男生条数
FEMALE_N = 2000                  # 女生条数
ADD_AGE_COLUMN = False           # True 时额外输出 age 列（方便人工核对，导入前需删掉该列）

MIN_AGE, MAX_AGE = 18, 35

# 出生日期基准：用脚本运行当天，保证任何时间跑出来的年龄都真的落在 18~35
TODAY = date.today()

# ---------------- 昵称词库 ----------------
MALE_PREFIX = [
    "山野", "晚风", "老街", "拾光", "南巷", "北岛", "青衫", "孤舟", "旧梦", "长风",
    "星河", "亦寒", "子墨", "半盏", "清酒", "野鹤", "临渊", "听雨", "折枝", "不语",
    "归途", "柚屿", "鹿鸣", "竹里", "月下", "暮云", "轻尘", "墨白", "松间", "杳然",
    "渭城", "孤鸿", "寒山", "石桥", "白桦", "飞鸟", "远方", "深巷", "木棉", "岩上",
    "雾里", "岛歌", "江声", "山岚", "林间", "松风", "砾川", "渡口", "长夜", "半山",
]
MALE_SUFFIX = [
    "少年", "先生", "旅人", "过客", "小七", "与鹿", "行歌", "不归", "同学", "夜行",
    "的风", "不眠", "饮茶", "向南", "在野", "未晚", "的猫", "看海", "等风", "半醒",
    "提笔", "赶路", "逐光", "入梦", "待雪", "煮酒", "骑鲸", "踏浪", "种树", "拾荒",
    "走马", "观星", "牧云", "枕河", "拂衣", "折柳", "望山", "涉川", "问竹", "守灯",
    "煮茶", "温酒", "闭户", "读书", "扫叶", "收麦", "看山", "听泉", "过桥", "夜里",
]
FEMALE_PREFIX = [
    "半糖", "晚柠", "软糖", "小鹿", "云朵", "甜柚", "桃桃", "喵呜", "轻语", "星野",
    "南栀", "拾月", "温言", "梨落", "木木", "苏苏", "浅浅", "月半", "白桃", "青柠",
    "糯米", "布丁", "奶油", "樱桃", "猫咪", "小满", "芋圆", "珍珠", "抹茶", "橘子",
    "葡萄", "莓莓", "小熊", "兔兔", "奶糖", "棉花", "气泡", "奶酪", "山楂", "桂花",
    "柚子", "栗子", "麦芽", "薄荷", "话梅", "杏子", "松饼", "蛋挞", "雪梨", "酒酿",
]
FEMALE_SUFFIX = [
    "不加冰", "小姐", "同学", "日记", "小铺", "与猫", "的糖", "心事", "不打烊", "很甜",
    "呀", "酱", "寄信", "看云", "等雨", "收信", "的梦", "小记", "慢慢", "微微",
    "软软", "甜甜", "恰饭", "赖床", "发呆", "散步", "种草", "追星", "画画", "听歌",
    "烘焙", "撸猫", "晒太阳", "数星星", "吹泡泡", "爱吃", "很乖", "偷偷", "悄悄", "轻轻",
    "每天", "一直", "有点甜", "超甜", "好饿", "赖皮", "观察员", "打工", "在逃", "不加班",
]

# ---------------- 其他词库 ----------------
SCHOOLS = [
    "清华大学", "北京大学", "复旦大学", "上海交通大学", "浙江大学", "南京大学", "武汉大学",
    "中山大学", "四川大学", "华中科技大学", "西安交通大学", "同济大学", "东南大学",
    "中国人民大学", "南开大学", "天津大学", "山东大学", "厦门大学", "苏州大学", "郑州大学",
    "湖南大学", "吉林大学", "深圳大学", "华东师范大学", "上海财经大学", "北京邮电大学",
    "电子科技大学", "华南理工大学", "重庆大学", "兰州大学", "江南大学", "宁波大学",
    "某职业技术学院", "某师范学院",
]
JOBS = [
    "程序员", "产品经理", "设计师", "运营专员", "教师", "医生", "护士", "会计", "律师",
    "销售", "行政专员", "人事专员", "市场专员", "新媒体编辑", "数据分析师", "测试工程师",
    "电商运营", "自由职业者", "创业者", "公务员", "银行柜员", "摄影师", "咖啡师",
    "健身教练", "主播", "翻译", "建筑师", "工程师", "客户经理", "实习生",
]
CITIES = [
    "北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京", "西安", "重庆",
    "苏州", "天津", "长沙", "郑州", "青岛", "厦门", "宁波", "合肥", "济南", "福州",
    "昆明", "大连", "沈阳", "无锡", "东莞", "佛山", "南昌", "贵阳", "太原", "石家庄",
]
INTRO_MALE = [
    "平时喜欢健身和骑行，周末常去爬山。",
    "工作稳定，性格温和，希望认识聊得来的人。",
    "会做饭，几道拿手菜还行。",
    "喜欢看电影、听音乐，偶尔打打球。",
    "码农一枚，加班有点多，但生活还算规律。",
    "性格慢热，熟了话不少。",
    "想找个人一起吃饭、散步、看展。",
    "爱好摄影，周末喜欢到处走走。",
    "不太会说话，但挺真诚。",
    "安静和热闹都行，看场合。",
    "打球、跑步、游泳，运动是刚需。",
    "喜欢历史和老电影，偶尔写点东西。",
]
INTRO_FEMALE = [
    "喜欢烘焙和插花，周末喜欢宅在家。",
    "性格开朗，爱笑，容易被小事逗乐。",
    "喜欢旅行，一年至少出去玩两次。",
    "养了一只猫，日常被它支配。",
    "喜欢看书和纪录片，偶尔画画。",
    "工作忙但生活不将就，会给自己做饭。",
    "喜欢跑步和瑜伽，周末去公园。",
    "话不多，但很会听人说话。",
    "爱拍照，喜欢记录生活里的小瞬间。",
    "想找一个能一起吃饭、一起看日落的人。",
    "咖啡和奶茶爱好者，甜食戒不掉。",
    "比较独立，也希望能有人依靠。",
]

# 留空比例（NULL 概率）
NULL_EDU = 0.05
NULL_SCHOOL = 0.08
NULL_JOB = 0.06
NULL_INCOME = 0.07
NULL_CITY = 0.04
NULL_INTRO = 0.15
NULL_VIP = 0.25

EDU_WEIGHTS = [6, 22, 46, 20, 6]        # 1 高中以下 / 2 大专 / 3 本科 / 4 硕士 / 5 博士
INCOME_WEIGHTS = [15, 35, 35, 15]       # 1 5000以下 / 2 5000-1万 / 3 1万-3万 / 4 3万-10万


def random_birthday(today=TODAY):
    """返回 (周岁, 'YYYY-MM-DD')，保证周岁落在 [MIN_AGE, MAX_AGE]。"""
    for _ in range(500):
        age = random.randint(MIN_AGE, MAX_AGE)
        year = today.year - age
        month = random.randint(1, 12)
        day = random.randint(1, 28)          # 避开 29/30/31，省去闰年与月末特判
        try:
            birth = date(year, month, day)
        except ValueError:
            continue
        # 回算真实周岁
        actual = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
        if MIN_AGE <= actual <= MAX_AGE:
            return actual, birth.isoformat()
    raise RuntimeError("生日生成失败：重试 500 次仍未落到合法区间")


def build_nicknames(prefixes, suffixes, count, used=None):
    """从前缀×后缀的组合池里无重复抽 count 个昵称。"""
    pool = ["".join(p) for p in itertools.product(prefixes, suffixes)]
    if used:
        pool = [n for n in pool if n not in used]
    if len(pool) < count:
        raise ValueError(f"昵称组合池只有 {len(pool)} 个，不够 {count} 条")
    return random.sample(pool, count)


def make_rows(gender_code, n, nicknames, intro_pool):
    """生成 n 行记录（dict 列表），顺序即建表字段顺序。"""
    rows = []
    for idx in range(n):
        age, birthday = random_birthday()

        # 身高：正态分布后裁剪到合理区间，男女不同
        if gender_code == 1:
            height = int(round(random.gauss(175, 5.0)))
            height = max(165, min(195, height))
        else:
            height = int(round(random.gauss(162, 4.5)))
            height = max(150, min(178, height))

        # 学历：先按权重选，再按比例置空；学历空则学校必空（保持逻辑一致）
        if random.random() < NULL_EDU:
            education = None
            school = None
        else:
            education = random.choices([1, 2, 3, 4, 5], weights=EDU_WEIGHTS, k=1)[0]
            school = None if random.random() < NULL_SCHOOL else random.choice(SCHOOLS)

        if random.random() < NULL_JOB:
            job = None
        else:
            job = random.choice(JOBS)

        if random.random() < NULL_INCOME:
            income = None
        else:
            income = str(random.choices([1, 2, 3, 4], weights=INCOME_WEIGHTS, k=1)[0])

        city = None if random.random() < NULL_CITY else random.choice(CITIES)

        intro = None if random.random() < NULL_INTRO else random.choice(intro_pool)

        if random.random() < NULL_VIP:
            vip = None
        else:
            vip = random.choices([0, 1], weights=[70, 30], k=1)[0]

        rows.append({
            "id": idx + 1,              # 占位，由 SQLite AUTOINCREMENT 覆盖，导入前可删
            "gender": gender_code,
            "name": nicknames[idx],
            "birthday": birthday,
            "height": height,
            "education": education,
            "school": school,
            "job": job,
            "income": income,
            "current_city": city,
            "image_url": None,
            "self_intro": intro,
            "vip": None,
            "recommend_score": random.random(),
        })
    return rows


def exact_age(birthday_series, ref=TODAY):
    """精确周岁：没到今年生日就减 1，不用 365 天近似。"""
    b = pd.to_datetime(birthday_series)
    not_yet = (ref.month < b.dt.month) | ((ref.month == b.dt.month) & (ref.day < b.dt.day))
    return (ref.year - b.dt.year - not_yet.astype(int)).astype("Int64")

def generate_name_list(gender):
    SURNAMES = (
        "王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾"
        "肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏"
        "韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴"
        "莫孔向汤常温康施文牛樊葛邢安齐易乔伍庞颜倪庄聂章鲁岳翟殷詹申欧耿"
        "关兰焦俞左柳甘祝包宁尚符舒阮柯纪梅童凌毕单季裴霍涂成苗谷盛曲翁冉"
        "骆蓝路游辛靳管柴蒙鲍华喻祁蒲房滕屈饶解牟艾尤阳时穆农司卓古吉缪简"
        "车项连芦麦褚娄窦戚岑景党宫费卜冷晏席卫米柏宗瞿桂全佟应臧闵苟邬边"
        "卞姬师和仇栾隋商刁沙荣巫寇桑郎甄丛仲虞敖巩明佘池查麻苑迟邝封谈匡"
        "鞠惠荆乐冀郁胥南班储原栗燕楚鄢劳谌奚皮粟冼蔺楼闻厉"
    )

    # 复姓（低概率出现）
    COMPOUND_SURNAMES = (
        "欧阳", "太史", "端木", "上官", "司马", "东方", "独孤", "南宫", "万俟",
        "闻人", "夏侯", "诸葛", "尉迟", "公羊", "赫连", "澹台", "皇甫", "宗政",
        "濮阳", "公冶", "太叔", "申屠", "公孙", "慕容", "仲孙", "钟离", "长孙",
        "宇文", "司徒", "鲜于", "司空", "闾丘", "子车", "亓官", "司寇", "巫马",
        "公西", "颛孙", "壤驷", "公良", "漆雕", "乐正", "宰父", "谷梁", "拓跋",
        "夹谷", "轩辕", "令狐", "段干", "百里", "呼延", "东郭", "南门", "羊舌",
        "微生", "梁丘", "左丘", "东门", "西门", "第五",
    )

    # ------------------------------------------------------- 名字用字池（按性别）
    # 男性常用字（多用于双字名的第一个字，如“志强”“文博”）
    MALE_CHARS = (
        "伟 强 磊 军 洋 勇 杰 涛 明 超 刚 平 辉 健 俊 帆 鹏 斌 宇 浩 凯 鑫 龙 飞 "
        "峰 亮 波 宁 建 国 志 远 博 文 武 帅 旭 阳 昊 晨 睿 哲 楠 霖 铭 泽 轩 "
        "然 翔 皓 煜 坤 锐 钧 岳 恒 毅 朗 航 川 海 江 森 松 柏 腾 达 顺 安 泰 "
        "和 康 盛 昌 隆 兴 瑞 吉 嘉 善 德 义 礼 智 信 忠 勤 诚 正 清 思 学 书 "
        "墨 章 翰 儒 谦 敏 聪 卓 越 冠 元 甲 辰 秋 冬 玉 厚 深 广 宏 高 长 久 "
        "永 骏 驰 鹏 虎 鹰 岩 峻 巍 澜 洲 城 增 泰 丰 裕 富 贵 雄 宏 "
    )

    # 女性常用字（多用于双字名的第一个字，如“雅婷”“晓雯”）
    FEMALE_CHARS = (
        "芳 娜 敏 静 丽 艳 娟 霞 秀 燕 玲 婷 雪 琳 颖 倩 欣 悦 涵 萱 琪 妍 娇 "
        "妮 娅 婉 姝 媛 婧 嫣 婕 妤 冰 清 洁 玉 莹 瑶 琼 珊 珍 珠 翠 碧 青 蓝 "
        "紫 红 丹 彩 虹 云 露 霜 梅 兰 竹 菊 荷 莲 蕊 蕾 莉 薇 蓉 菲 芷 芸 芝 "
        "芬 香 馨 韵 音 诗 词 歌 琴 瑟 筝 舞 姿 影 月 星 曦 晴 暖 柔 温 恬 宁 "
        "安 娴 淑 惠 慧 怡 佳 嘉 瑞 祥 喜 乐 甜 美 春 夏 秋 花 叶 素 颜 灵 秀 "
        "丝 绢 纱 锦 绣 绮 罗 钰 琅 璃 珀 珂 玥 珺 瑛 璇 璟 璧 晓 雯 汐 澜 薇 "
    )

    # 男女通用字（中性名，降低名字的“性别标签”浓度）
    NEUTRAL_CHARS = (
        "子 一 心 新 文 明 华 平 安 和 乐 欣 悦 思 念 知 言 语 名 远 天 云 春 "
        "冬 晨 阳 晖 朗 清 澄 真 诚 信 恒 久 长 永 嘉 瑞 哲 唯 初 予 亦 知 沐 "
    )

    # 双字名的“尾字”池：真实姓名中常见的收尾用字，用来提升成名的自然度
    MALE_TAIL_CHARS = (
        "杰 强 伟 涛 峰 宇 浩 明 辉 斌 鹏 龙 飞 磊 军 阳 坤 楠 轩 然 霖 泽 睿 "
        "晨 旭 航 翔 俊 超 刚 平 波 亮 建 国 志 远 博 文 武 帅 昊 岳 恒 毅 朗 "
        "川 海 江 林 松 柏 腾 达 康 健 全 盛 昌 兴 瑞 嘉 德 诚 正 清 思 学 章 "
        "锋 彪 钧 锐 凯 鑫 森 驹 骏 岩 峻 磊 铮 铭 溢 洋 舟 帆 潮 涛 川 "
    )
    FEMALE_TAIL_CHARS = (
        "婷 琪 欣 悦 涵 萱 琳 颖 倩 雪 娜 静 丽 燕 菲 雯 璇 婧 媛 娅 婉 姝 瑶 "
        "莹 珊 蕾 蕊 薇 蓉 莉 芸 芷 兰 梅 竹 菊 荷 莲 月 星 晴 曦 宁 安 娴 "
        "淑 惠 慧 怡 佳 嘉 瑞 珍 珠 玉 冰 清 洁 云 露 霜 音 韵 诗 歌 舞 姿 影 "
        "琦 玥 珺 妤 婕 嫣 姝 妍 懿 霏 晗 曦 汐 滢 泓 璠 璧 琼 珊 珂 瑗 璐 "
    )

    # ------------------------------------------------------------ 权重配置
    COMPOUND_SURNAME_RATE = 0.03  # 复姓出现概率
    TWO_CHAR_GIVEN_RATE = 0.65  # 双字名概率（其余为单字名）
    NEUTRAL_CHAR_RATE = 0.12  # 名字中使用中性字的概率

    # 按人口占比加权：姓氏池中靠前的姓氏权重更高
    _SURNAME_WEIGHTS = [1.0 / (i + 12) for i in range(len(SURNAMES))]

    def _char_pool(text):
        """空格分隔的用字串 -> 去重后的字列表，避免随机抽到空格。"""
        return tuple(dict.fromkeys(text.split()))

    MALE_CHARS = _char_pool(MALE_CHARS)
    FEMALE_CHARS = _char_pool(FEMALE_CHARS)
    NEUTRAL_CHARS = _char_pool(NEUTRAL_CHARS)
    MALE_TAIL_CHARS = _char_pool(MALE_TAIL_CHARS)
    FEMALE_TAIL_CHARS = _char_pool(FEMALE_TAIL_CHARS)

    # 自检：所有用字池都必须是单字，防止字表里混入多字词
    for _pool_name, _pool in (
            ("MALE_CHARS", MALE_CHARS), ("FEMALE_CHARS", FEMALE_CHARS),
            ("NEUTRAL_CHARS", NEUTRAL_CHARS), ("MALE_TAIL_CHARS", MALE_TAIL_CHARS),
            ("FEMALE_TAIL_CHARS", FEMALE_TAIL_CHARS),
    ):
        _bad = [c for c in _pool if len(c) != 1]
        if _bad:
            raise ValueError(f"{_pool_name} 含非单字用字：{_bad}")

    def _pick(pool, rng, allow_neutral=True):
        """按概率在指定池与中性池之间取值。"""
        if allow_neutral and rng.random() < NEUTRAL_CHAR_RATE:
            return rng.choice(NEUTRAL_CHARS)
        return rng.choice(pool)

    def _build_given_name(gender, rng):
        """按性别生成名（不含姓），返回 1~2 个汉字。"""
        primary = MALE_CHARS if gender == 1 else FEMALE_CHARS
        tails = MALE_TAIL_CHARS if gender == 1 else FEMALE_TAIL_CHARS

        if rng.random() < TWO_CHAR_GIVEN_RATE:
            # 首字可带中性色彩，尾字固定用性别尾字池，保证成名的自然度
            first = _pick(primary, rng)
            second = _pick(tails, rng, allow_neutral=False)
            # 避免叠字（如“娜娜”）以及突兀的重复用字
            while second == first:
                second = _pick(tails, rng, allow_neutral=False)
            return first + second

        # 单字名优先用高频尾字（“王杰”“李婷”这类更自然）
        return rng.choice(tails)

    def generate_one(gender, rng):
        if rng.random() < COMPOUND_SURNAME_RATE:
            surname = rng.choice(COMPOUND_SURNAMES)
        else:
            surname = rng.choices(SURNAMES, weights=_SURNAME_WEIGHTS, k=1)[0]

        given = _build_given_name(gender, rng)
        tries = 0
        # 避免姓名用字重复，如“王伟伟”“第五五”
        while given[0] == surname[-1] and tries < 5:
            given = _build_given_name(gender, rng)
            tries += 1

        return surname + given
        return {
            "name": surname + given,
            "surname": surname,
            "given_name": given,
            "gender": gender,
            "gender_cn": "男" if gender == "male" else "女",
            "name_length": len(surname + given),
        }

    def generate(count, gender="mixed", seed=None, unique=True):
        """生成 count 条姓名记录；unique=True 时自动跳过重名。"""
        rng = random.Random(seed)
        results, seen = [], set()
        guard, max_guard = 0, count * 200 + 1000

        while len(results) < count and guard < max_guard:
            guard += 1
            name = generate_one(gender, rng)
            if unique and name in seen:
                continue
            seen.add(name)
            # item["id"] = len(results) + 1
            results.append(name)

        return results
    return generate(2000, gender)

def generate_user_info(user_info_path):
    random.seed(SEED)

    # male_names = build_nicknames(MALE_PREFIX, MALE_SUFFIX, MALE_N)
    # female_names = build_nicknames(FEMALE_PREFIX, FEMALE_SUFFIX, FEMALE_N, used=set(male_names))

    male_names = generate_name_list(1)
    female_names = generate_name_list(2)

    male_rows = make_rows(1, MALE_N, male_names, INTRO_MALE)
    female_rows = make_rows(2, FEMALE_N, female_names, INTRO_FEMALE)

    all_rows = male_rows + female_rows
    random.shuffle(all_rows)                 # 打乱男女顺序，避免 CSV 前 2000 行全是男生
    for i, r in enumerate(all_rows, start=1):
        r["id"] = i

    df = pd.DataFrame(all_rows, columns=[
        "id", "gender", "name", "birthday", "height", "education", "school",
        "job", "income", "current_city", "image_url", "self_intro", "vip", "recommend_score"
    ])

    # 关键：含空值的整数列必须用可空整型 Int64，
    # 否则 pandas 会把整列推断成 float64，CSV 里写成 3.0 / 0.0，导入 INTEGER 列会变成 REAL。
    for col in ["id", "gender", "height", "education", "vip"]:
        df[col] = df[col].astype("Int64")

    age = exact_age(df["birthday"], TODAY)

    # 可选附带 age 列，方便人工核对生日是否真的在 18~35
    if ADD_AGE_COLUMN:
        df["age"] = age

    df.to_csv(user_info_path, index=False, encoding="utf-8-sig", na_rep="")   # utf-8-sig：Excel 打开不乱码

    # ------------------- 自检 -------------------
    print(f"已生成 {len(df)} 行 -> {user_info_path}")
    print(f"男女分布：男 {int((df.gender == 1).sum())} / 女 {int((df.gender == 2).sum())}")
    print(f"周岁区间：{age.min()} ~ {age.max()}（要求 18~35）")
    assert age.min() >= MIN_AGE and age.max() <= MAX_AGE, "年龄越界"
    print(f"昵称去重后：{df['name'].nunique()} 个（应为 4000）")
    print("各字段空值率：")
    for col in ["education", "school", "job", "income", "current_city", "image_url", "self_intro", "vip"]:
        print(f"  {col:<13} {df[col].isna().mean() * 100:5.1f}%")
    print("gender 编码分布：")
    print(df["gender"].value_counts().sort_index().to_string())
    print("education 编码分布：")
    print(df["education"].value_counts(dropna=False).sort_index().to_string())
    print("income 编码分布：")
    print(df["income"].value_counts(dropna=False).sort_index().to_string())

