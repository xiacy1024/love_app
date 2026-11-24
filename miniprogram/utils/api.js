// 后端接口配置：
// 1. API_BASE_URL 只填服务根地址，不要带接口路径和查询参数。
// 2. 留空时使用内置模拟数据，游客浏览、右滑、点赞点踩、资料填写都能直接体验。
// 3. 本地 http://localhost 联调需要开发者工具关闭域名校验（本项目已设置 urlCheck: false）。
// 4. 真机预览 / 体验版 / 正式版必须改成已备案的 HTTPS 域名，并在小程序后台配置合法域名。
// 各接口路径在 ENDPOINTS 中单独配置：
//   recommend -> GET /get_user_info?gender=2（男）或 ?gender=1（女），返回候选人数组
//                性别由 utils/preference.js 中用户选择的「想看的性别」决定，游客无需登录即可选择
//   reaction  -> { id, action: 'like' | 'dislike' }
//   login     -> { code } -> { token }
//   profile   -> 当前用户资料
//   upload    -> multipart 文件上传，字段名 file，返回 { url }

// 手机调试时不能写 localhost：那指向手机自己。请填电脑在当前 WiFi 下的局域网 IP。
// 同时后端要以 0.0.0.0 启动（例如 flask run --host=0.0.0.0 --port=8000），否则手机连不上。
const API_BASE_URL = 'http://192.168.50.23:8000/api';

const ENDPOINTS = {
    recommend: '/get_user_info',
    reaction: '/recommend/reaction',
    login: '/auth/login',
    profile: '/profile',
    upload: '/upload'
};

const TOKEN_KEY = 'auth_token';
const PROFILE_KEY = 'mock_my_profile';

const MOCK_CANDIDATES = [
    {
        bithday: '1997-03-12',
        current_city: '合肥',
        education: 3,
        gender: 2,
        height: 184,
        id: 1021,
        image_url: '',
        income: '4',
        job: '市场专员',
        name: '顾川拾荒',
        recommend_score: 0.9984302242012433,
        school: '中山大学',
        self_intro: '喜欢看电影、听音乐，偶尔打打球。',
        vip: ''
    },
    {
        bithday: '1999-08-21',
        current_city: '上海',
        education: 4,
        gender: 1,
        height: 165,
        id: 1022,
        image_url: '',
        income: '3',
        job: '产品经理',
        name: '林知夏',
        recommend_score: 0.9742,
        school: '复旦大学',
        self_intro: '周末喜欢逛展和咖啡馆，希望能遇到一起旅行的人。',
        vip: '1'
    },
    {
        bithday: '1995-11-02',
        current_city: '杭州',
        education: 3,
        gender: 2,
        height: 178,
        id: 1023,
        image_url: '',
        income: '4',
        job: '软件工程师',
        name: '陈屿',
        recommend_score: 0.9531,
        school: '浙江大学',
        self_intro: '热爱跑步和做饭，期待一段认真长久的关系。',
        vip: ''
    },
    {
        bithday: '1998-05-30',
        current_city: '南京',
        education: 3,
        gender: 1,
        height: 168,
        id: 1024,
        image_url: '',
        income: '2',
        job: '教师',
        name: '苏晚晴',
        recommend_score: 0.9308,
        school: '南京师范大学',
        self_intro: '喜欢读书和徒步，生活简单，希望彼此真诚。',
        vip: ''
    },
    {
        bithday: '1996-01-17',
        current_city: '深圳',
        education: 4,
        gender: 2,
        height: 181,
        id: 1025,
        image_url: '',
        income: '5',
        job: '金融分析师',
        name: '江临',
        recommend_score: 0.9124,
        school: '武汉大学',
        self_intro: '工作之外喜欢摄影和打羽毛球，想找能一起探索城市的人。',
        vip: '1'
    },
    {
        bithday: '2000-09-09',
        current_city: '成都',
        education: 2,
        gender: 1,
        height: 160,
        id: 1026,
        image_url: '',
        income: '1',
        job: '设计师',
        name: '许清禾',
        recommend_score: 0.8865,
        school: '四川美术学院',
        self_intro: '爱画画也爱美食，希望对方有耐心、聊得来。',
        vip: ''
    }
];

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

function authHeader() {
    const token = wx.getStorageSync(TOKEN_KEY);
    return token ? { Authorization: 'Bearer ' + token } : {};
}

function requestJson(path, method, data, mockValue) {
    if (!API_BASE_URL) {
        return wait(320).then(function () {
            return clone(mockValue);
        });
    }
    return new Promise(function (resolve, reject) {
        wx.request({
            url: API_BASE_URL + path,
            method: method,
            data: data || {},
            header: Object.assign({ 'content-type': 'application/json' }, authHeader()),
            success: function (res) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else {
                    reject(new Error('HTTP ' + res.statusCode));
                }
            },
            fail: reject
        });
    });
}

module.exports = {
    API_BASE_URL: API_BASE_URL,

    getRecommendations: function (gender) {
        // 男=2，女=1；未传时默认按男处理，保证 URL 始终带 gender 参数
        const value = gender === 1 ? 1 : 2;
        const mockList = MOCK_CANDIDATES.filter(function (item) {
            return item.gender === value;
        });
        return requestJson(ENDPOINTS.recommend + '?gender=' + value, 'GET', {}, mockList);
    },

    sendReaction: function (payload) {
        return requestJson(ENDPOINTS.reaction, 'POST', payload, { ok: true });
    },

    login: function (code) {
        return requestJson(ENDPOINTS.login, 'POST', { code: code }, {
            token: 'mock-token-' + Date.now()
        });
    },

    getProfile: function () {
        if (!API_BASE_URL) {
            return wait(200).then(function () {
                return wx.getStorageSync(PROFILE_KEY) || null;
            });
        }
        return requestJson(ENDPOINTS.profile, 'GET', {}, null);
    },

    saveProfile: function (profile) {
        if (!API_BASE_URL) {
            return wait(300).then(function () {
                wx.setStorageSync(PROFILE_KEY, profile);
                return { ok: true };
            });
        }
        return requestJson(ENDPOINTS.profile, 'POST', profile, { ok: true });
    },

    uploadImage: function (filePath) {
        if (!API_BASE_URL) {
            return wait(300).then(function () {
                return { url: filePath };
            });
        }
        return new Promise(function (resolve, reject) {
            wx.uploadFile({
                url: API_BASE_URL + ENDPOINTS.upload,
                filePath: filePath,
                name: 'file',
                header: authHeader(),
                success: function (res) {
                    try {
                        resolve(JSON.parse(res.data));
                    } catch (e) {
                        reject(new Error('上传返回格式错误'));
                    }
                },
                fail: reject
            });
        });
    }
};
