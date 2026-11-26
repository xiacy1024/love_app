const auth = require('../utils/auth');
const tabBar = require('../utils/tab-bar');

Component({
    data: {
        selected: 0,
        loggedIn: false,
        list: [
            { pagePath: '/pages/recommend/recommend', text: '推荐' },
            { pagePath: '/pages/like/like', text: '喜欢' },
            { pagePath: '/pages/profile/profile', text: '我的' }
        ]
    },

    lifetimes: {
        attached: function () {
            this.setData({ loggedIn: auth.isLoggedIn() });
        }
    },

    methods: {
        onTabTap: function (event) {
            const path = event.currentTarget.dataset.path;
            if (path) {
                wx.switchTab({ url: path });
            }
        },

        onLogout: function () {
            const self = this;
            wx.showModal({
                title: '退出登录',
                content: '退出后将以游客身份浏览，确定退出吗？',
                confirmText: '退出',
                cancelText: '取消',
                confirmColor: '#e05a73',
                success: function (res) {
                    if (!res.confirm) return;
                    auth.logout();
                    tabBar.syncLogout();
                    self.setData({ loggedIn: false });
                    wx.showToast({ title: '已退出登录', icon: 'success' });
                }
            });
        }
    }
});
