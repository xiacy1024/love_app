// pages/like/like.js
const { API_BASE_URL, IMAGE_BASE_URL, PROFILE_KEY } = require('../../utils/config');
const api = require('../../utils/api');
const auth = require('../../utils/auth');
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

// 对话头像占位色：按 id 取固定色，区分不同对话者
const AVATAR_COLORS = ['#e05a73', '#6c8cd5', '#4aa58c', '#d99a4e', '#9674c4', '#d46a6a'];

function avatarColor(id) {
    const n = Number(id) || 0;
    return AVATAR_COLORS[Math.abs(n) % AVATAR_COLORS.length];
}

// 把 create_time 截成 HH:MM 展示
function formatChatTime(value) {
    if (!value || typeof value !== 'string') return '';
    const parts = value.split(' ');
    const time = parts.length > 1 ? parts[1] : parts[0];
    return time ? time.slice(0, 5) : '';
}

// 聊天记录加工：分左右、带头像与颜色、按时间展示
function decorateChatItem(raw, selfId, peer) {
    const senderId = Number(raw.sender_id);
    const isSelf = senderId === Number(selfId);
    const who = isSelf ? (wx.getStorageSync(PROFILE_KEY) || {}) : (peer || {});
    const whoId = isSelf ? selfId : (peer && peer.id);
    const image = who.image_url;
    return Object.assign({}, raw, {
        isSelf: isSelf,
        contentText: raw.content || raw.chat || raw.message || '',
        timeText: formatChatTime(raw.create_time),
        avatarUrl: image ? IMAGE_BASE_URL + image : '',
        avatarInitial: (who.name || (isSelf ? '我' : '?')).slice(0, 1),
        avatarColor: avatarColor(whoId)
    });
}

// 轮询刷新时，把本地刚发、后端尚未确认的消息合并进去（按内容去重）
function mergePending(list, pending) {
    if (!pending || !pending.length) return list;
    const merged = list.slice();
    pending.forEach(function (p) {
        const exists = merged.some(function (item) {
            return item.isSelf && item.contentText === p.contentText;
        });
        if (!exists) merged.push(p);
    });
    return merged;
}

// 两次历史内容一致则跳过 setData，避免轮询造成列表抖动
function sameHistory(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].id !== b[i].id || a[i].contentText !== b[i].contentText) return false;
    }
    return true;
}

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

// 与推荐页 decorate 保持一致；兼容后端返回的 bithday 拼写
function decorate(raw) {
    const birthday = raw.birthday || raw.bithday;
    const age = calcAge(birthday);
    return Object.assign({}, raw, {
        ageText: age >= 0 ? age + ' 岁' : '保密',
        genderText: raw.gender === 1 ? '男' : (raw.gender === 2 ? '女' : '保密'),
        educationText: EDUCATION_TEXT[raw.education] || '未填写',
        incomeText: INCOME_TEXT[String(raw.income)] || '未填写',
        matchText: typeof raw.recommend_score === 'number' ? Math.round(raw.recommend_score * 100) + '%' : '0%',
        initial: (raw.name || '?').slice(0, 1)
    });
}

const pageOptions = {
    data: {
        loggedIn: false,
        showLogin: false,
        viewState: 'loading',   // loading / ready / empty / error / guest
        list: [],
        imageBaseUrl: IMAGE_BASE_URL,
        activeId: null,         // hover 时展示详情的用户 id
        chatOpen: false,        // 对话弹框显隐
        chatUser: null,         // 当前对话对象
        chatHistory: [],
        chatLoading: false,
        chatInput: ''           // 对话输入框内容
    },

    onShow: function () {
        const loggedIn = auth.isLoggedIn();
        this.setData({ loggedIn: loggedIn, showLogin: !loggedIn });
        tabBar.sync(this, 1);
        if (loggedIn) {
            this.loadLikes();
        } else {
            // 游客不请求接口
            this.setData({ viewState: 'guest', list: [] });
        }
    },

    afterLogin: function () {
        this.onShow();
    },

    openLogin: function () {
        this.setData({ showLogin: true });
    },

    noop: function () {},

    loadLikes: function () {
        const self = this;
        const profile = wx.getStorageSync(PROFILE_KEY) || {};
        const userId = profile.user_id;
        if (userId === undefined || userId === null || userId === '') {
            this.setData({ viewState: 'error' });
            return;
        }
        this.setData({ viewState: 'loading' });
        api.getLikes(userId).then(function (list) {
            const rawList = Array.isArray(list) ? list : (list && Array.isArray(list.data) ? list.data : []);
            const decorated = rawList.map(decorate);
            if (!decorated.length) {
                self.setData({ viewState: 'empty', list: [] });
                return;
            }
            self.setData({ viewState: 'ready', list: decorated });
        }).catch(function () {
            self.setData({ viewState: 'error' });
        });
    },

    onRetry: function () {
        this.loadLikes();
    },

    onCardEnter: function (event) {
        this.setData({ activeId: Number(event.currentTarget.dataset.id) });
    },

    onCardLeave: function () {
        this.setData({ activeId: null });
    },

    openChat: function (event) {
        const id = Number(event.currentTarget.dataset.id);
        const user = this.data.list.filter(function (item) { return Number(item.id) === id; })[0];
        if (!user) return;
        this._chatTargetId = user.id;
        this._pendingMessages = [];
        this.setData({
            chatOpen: true,
            chatUser: user,
            chatHistory: [],
            chatLoading: true,
            chatInput: '',
            activeId: null
        });
        this.loadChatHistory(user.id, true);
    },

    closeChat: function () {
        this._chatTargetId = null;
        this._pendingMessages = [];
        this.setData({ chatOpen: false, chatUser: null, chatHistory: [], chatInput: '' });
    },

    onChatInput: function (event) {
        this.setData({ chatInput: event.detail.value || '' });
    },

    // 发送消息：本地即时展示 + 同步服务端；本地消息进 pending，避免被轮询冲掉
    sendMessage: function () {
        const self = this;
        const text = (this.data.chatInput || '').trim();
        if (!text || !this.data.chatUser) return;
        const profile = wx.getStorageSync(PROFILE_KEY) || {};
        const message = decorateChatItem({
            id: 'local_' + Date.now(),
            sender_id: profile.user_id,
            content: text,
            create_time: ''
        }, profile.user_id, this.data.chatUser);
        if (!this._pendingMessages) this._pendingMessages = [];
        this._pendingMessages.push(message);
        this.setData({
            chatHistory: mergePending(this.data.chatHistory, [message]),
            chatInput: ''
        });
        api.sendMessage(profile.user_id, this.data.chatUser.id, text).then(function () {
            // 发送成功：清掉 pending 里该条，让轮询拉回服务端真实记录（带 id/时间）
            self._pendingMessages = (self._pendingMessages || []).filter(function (item) {
                return item.id !== message.id;
            });
            if (self._chatTargetId !== null && self._chatTargetId !== undefined && self.data.chatOpen) {
                self.loadChatHistory(self._chatTargetId, false);
            }
        }).catch(function (error) {
            console.error('发送消息失败', error);
            wx.showToast({ title: '发送失败', icon: 'none' });
        });
    },

    // 历史对话：后端按 create_time desc 返回，这里反转成时间正序（旧→新）
    // showLoading=true 仅首次打开时显示 loading，轮询刷新静默进行
    loadChatHistory: function (targetId, showLoading) {
        const self = this;
        const profile = wx.getStorageSync(PROFILE_KEY) || {};
        const userId = profile.user_id;
        if (showLoading) this.setData({ chatLoading: true });
        api.getChatHistory(userId, targetId).then(function (history) {
            let list = Array.isArray(history) ? history : (history && Array.isArray(history.data) ? history.data : []);
            list = list.slice().reverse().map(function (item) {
                return decorateChatItem(item, userId, self.data.chatUser);
            });
            list = mergePending(list, self._pendingMessages || []);
            if (sameHistory(list, self.data.chatHistory)) {
                self.setData({ chatLoading: false });
                return;
            }
            self.setData({ chatHistory: list, chatLoading: false });
        }).catch(function () {
            // 轮询失败不清空已有历史，仅首次加载显示空态
            if (showLoading) self.setData({ chatHistory: [], chatLoading: false });
        });
    }
};

Page(Object.assign({}, loginBehavior, pageOptions));
