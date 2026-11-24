const auth = require('./auth');
const tabBar = require('./tab-bar');

/**
 * 公共登录行为：recommend / profile 两个页面共用。
 * 页面通过 afterLogin / afterCloseLogin 钩子处理各自的后续逻辑。
 */
const loginBehavior = {
    handleLogin: function () {
        const self = this;
        auth.login().then(function (loginResult) {
            // 登录接口返回 { user_id }，用 setData 写入页面 data，供本页后续方法调用
            const userId = loginResult && loginResult.user_id;
            self.setData({ showLogin: false, loggedIn: true, userId: userId });
            tabBar.sync(self);
            wx.showToast({ title: '登录成功', icon: 'success' });
            if (typeof self.afterLogin === 'function') {
                self.afterLogin();
            }
        }).catch(function (error) {
            const message = error && error.message ? error.message : '登录失败，请重试';
            wx.showToast({ title: message, icon: 'none' });
        });
    },

    closeLogin: function () {
        this.setData({ showLogin: false });
        if (typeof this.afterCloseLogin === 'function') {
            this.afterCloseLogin();
        }
    }
};

module.exports = loginBehavior;
