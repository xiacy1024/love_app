const api = require('./api');
const { API_BASE_URL, IMAGE_BASE_URL, PROFILE_KEY, LOGGED_IN_KEY } = require('./config');

function isLoggedIn() {
    return wx.getStorageSync(LOGGED_IN_KEY, 0);
}

function exchange(code) {
    return api.login(code).then(function (data) {
        const userId = data && data.user_id;
        if (userId === undefined || userId === null || userId === '') {
            throw new Error('登录接口未返回 user_id');
        }
        wx.setStorageSync("profile", data)
        return data;
    });
}

function login() {
    return new Promise(function (resolve, reject) {
        wx.login({
            success: function (res) {
                const code = res.code || (API_BASE_URL ? '' : 'mock-code');
                if (!code) {
                    reject(new Error('wx.login 未返回 code'));
                    return;
                }
                exchange(code).then(resolve).catch(reject);
                wx.setStorageSync(LOGGED_IN_KEY, 1);
            },
            fail: function () {
                reject(new Error('wx.login 调用失败'));
            }
        });
    });
}

function logout() {
    wx.setStorageSync(LOGGED_IN_KEY, 0);
}


module.exports = {
    isLoggedIn: isLoggedIn,
    login: login,
    logout: logout
};
