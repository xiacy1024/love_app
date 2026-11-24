const api = require('../../utils/api');
const auth = require('../../utils/auth');
const preference = require('../../utils/preference');
const loginBehavior = require('../../utils/login-behavior');
const tabBar = require('../../utils/tab-bar');

const EDUCATION_TEXT = {
    1: '高中及以下',
    2: '大专',
    3: '本科',
    4: '硕士',
    5: '博士'
};

const INCOME_TEXT = {
    1: '5k 以下',
    2: '5k-10k',
    3: '10k-20k',
    4: '20k-50k',
    5: '50k 以上'
};

function calcAge(birthday) {
    if (!birthday) return -1;
    const parts = birthday.split('-');
    if (parts.length < 3) return -1;
    const year = Number(parts[0]);
    if (!year) return -1;
    const now = new Date();
    let age = now.getFullYear() - year;
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) {
        age -= 1;
    }
    return age >= 0 && age < 120 ? age : -1;
}

function decorate(raw) {
    const age = calcAge(raw.birthday);
    return Object.assign({}, raw, {
        ageText: age >= 0 ? age + ' 岁' : '保密',
        genderText: raw.gender === 1 ? '男' : (raw.gender === 2 ? '女' : '保密'),
        educationText: EDUCATION_TEXT[raw.education] || '未填写',
        incomeText: INCOME_TEXT[String(raw.income)] || '未填写',
        isVip: !!raw.vip && raw.vip !== '0',
        matchText: typeof raw.recommend_score === 'number' ? Math.round(raw.recommend_score * 100) + '%' : '0%',
        initial: (raw.name || '?').slice(0, 1)
    });
}

const pageOptions = {
    data: {
        viewState: 'loading',
        list: [],
        current: null,
        currentIndex: 0,
        progressText: '',
        showLogin: false,
        switchClass: '',
        preferredGender: 0,
        preferenceText: '',
        showGenderPicker: false,
        genderRequired: false
    },

    onLoad: function () {
        this.pendingAction = null;
        const gender = preference.getPreferredGender();
        if (gender) {
            this.setData({ preferredGender: gender, preferenceText: gender === 2 ? '想看男生' : '想看女生' });
            this.loadList();
        } else {
            // 首次进入：先选想看的性别，不请求接口
            this.setData({ showGenderPicker: true, genderRequired: true, viewState: 'idle' });
        }
    },

    openGenderPicker: function () {
        this.setData({ showGenderPicker: true, genderRequired: false });
    },

    closeGenderPicker: function () {
        if (this.data.genderRequired) return;
        this.setData({ showGenderPicker: false });
    },

    handleGenderConfirm: function (event) {
        const gender = event.detail.gender;
        if (gender !== 1 && gender !== 2) return;
        preference.setPreferredGender(gender);
        this.setData({
            preferredGender: gender,
            preferenceText: gender === 2 ? '想看男生' : '想看女生',
            showGenderPicker: false,
            genderRequired: false
        });
        this.loadList();
    },

    onShow: function () {
        // 从资料页返回时刷新登录态展示，并同步 user_id 供后续调用
        this.setData({ loggedIn: auth.isLoggedIn(), userId: auth.getUserId() });
        tabBar.sync(this, 0);
    },

    loadList: function () {
        const self = this;
        this.setData({ viewState: 'loading' });
        api.getRecommendations(this.data.preferredGender).then(function (list) {
            const rawList = Array.isArray(list) ? list : (list && Array.isArray(list.data) ? list.data : []);
            const decorated = rawList.map(decorate);
            if (!decorated.length) {
                self.setData({ viewState: 'empty', list: [], current: null, progressText: '' });
                return;
            }
            self.setData({
                viewState: 'ready',
                list: decorated,
                currentIndex: 0,
                current: decorated[0],
                progressText: '1 / ' + decorated.length
            });
        }).catch(function () {
            self.setData({ viewState: 'error' });
        });
    },

    handleRetry: function () {
        this.loadList();
    },

    showAt: function (index) {
        const list = this.data.list;
        if (!list.length) return;
        const next = (index + list.length) % list.length;
        const self = this;
        this.setData({
            currentIndex: next,
            current: list[next],
            progressText: (next + 1) + ' / ' + list.length,
            switchClass: 'card-enter'
        }, function () {
            setTimeout(function () {
                self.setData({ switchClass: '' });
            }, 280);
        });
    },

    nextCandidate: function () {
        this.showAt(this.data.currentIndex + 1);
    },

    onTouchStart: function (event) {
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    },

    onTouchEnd: function (event) {
        const touch = event.changedTouches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            this.nextCandidate();
        }
    },

    ensureAuth: function (action) {
        if (auth.isLoggedIn()) {
            action();
            return;
        }
        this.pendingAction = action;
        this.setData({ showLogin: true });
    },

    afterLogin: function () {
        const pending = this.pendingAction;
        this.pendingAction = null;
        if (pending) pending();
    },

    afterCloseLogin: function () {
        this.pendingAction = null;
    },

    handleLike: function () {
        this.react('like');
    },

    handleDislike: function () {
        this.react('dislike');
    },

    react: function (action) {
        const candidate = this.data.current;
        if (!candidate) return;
        const self = this;
        this.ensureAuth(function () {
            api.sendReaction({ id: candidate.id, action: action }).then(function () {
                wx.showToast({ title: action === 'like' ? '已喜欢' : '已跳过', icon: 'success' });
                self.nextCandidate();
            }).catch(function () {
                wx.showToast({ title: '提交失败，请重试', icon: 'none' });
            });
        });
    }
};

Page(Object.assign({}, loginBehavior, pageOptions));
