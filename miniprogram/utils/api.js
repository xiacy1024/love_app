// 后端接口配置：
// 1. API_BASE_URL 只填服务根地址，不要带接口路径和查询参数。
// 2. 留空时使用内置模拟数据，游客浏览、右滑、点赞点踩、资料填写都能直接体验。
// 3. 本地 http://localhost 联调需要开发者工具关闭域名校验（本项目已设置 urlCheck: false）。
// 4. 真机预览 / 体验版 / 正式版必须改成已备案的 HTTPS 域名，并在小程序后台配置合法域名。
// 各接口路径在 ENDPOINTS 中单独配置：
//'http://192.168.50.23:8000/api' 
// http://192.168.71.83:8000/api

const { API_BASE_URL, IMAGE_BASE_URL } = require('../../utils/config');

PROFILE_KEY = "profile"

const ENDPOINTS = {
    recommend: '/get_user_profile',
    reaction: '/recommend/reaction',
    login: '/wechat/login',
    profile: '/profile',
    upload: '/upload_image'
};

const MOCK_CANDIDATES = require("./mock_data").MOCK_CANDIDATES

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
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
            header: { 'content-type': 'application/json' },
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
    IMAGE_BASE_URL: IMAGE_BASE_URL,

    getRecommendations: function (gender) {
        // 男=1，女=2；未传时默认按男处理，保证 URL 始终带 gender 参数
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
            user_id: 10001
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
        wx.setStorageSync(PROFILE_KEY, profile);
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
