const api = require('./api');

const TOKEN_KEY = 'auth_token';

function isLoggedIn() {
    return !!wx.getStorageSync(TOKEN_KEY);
}

function exchange(code) {
    return api.login(code).then(function (data) {
        const token = data && (data.token || data.accessToken);
        if (!token) {
            throw new Error('登录接口未返回 token');
        }
        wx.setStorageSync(TOKEN_KEY, token);
        return data;
    });
}

function login() {
    // 未配置后端时，预览环境里 wx.login 可能不可用，直接使用模拟登录码。
    if (!api.API_BASE_URL && typeof wx.login !== 'function') {
        return exchange('mock-code');
    }
    return new Promise(function (resolve, reject) {
        wx.login({
            success: function (res) {
                const code = res.code || (api.API_BASE_URL ? '' : 'mock-code');
                if (!code) {
                    reject(new Error('wx.login 未返回 code'));
                    return;
                }
                exchange(code).then(resolve).catch(reject);
            },
            fail: function () {
                if (!api.API_BASE_URL) {
                    exchange('mock-code').then(resolve).catch(reject);
                } else {
                    reject(new Error('wx.login 调用失败'));
                }
            }
        });
    });
}

function logout() {
    wx.removeStorageSync(TOKEN_KEY);
}

module.exports = {
    isLoggedIn: isLoggedIn,
    login: login,
    logout: logout,
    TOKEN_KEY: TOKEN_KEY
};
