// pages/chat/chat.js
const { IMAGE_BASE_URL, PROFILE_KEY } = require('../../utils/config');
const api = require('../../utils/api');
const auth = require('../../utils/auth');
const loginBehavior = require('../../utils/login-behavior');
const tabBar = require('../../utils/tab-bar');

const AVATAR_COLORS = ['#e05a73', '#6c8cd5', '#4aa58c', '#d99a4e', '#9674c4', '#d46a6a'];

function avatarColor(id) {
    const n = Number(id) || 0;
    return AVATAR_COLORS[Math.abs(n) % AVATAR_COLORS.length];
}

function formatChatTime(value) {
    if (!value || typeof value !== 'string') return '';
    const parts = value.split(' ');
    const time = parts.length > 1 ? parts[1] : parts[0];
    return time ? time.slice(0, 5) : '';
}

function formatListTime(value) {
    if (!value || typeof value !== 'string') return '';
    const parts = value.split(' ');
    if (parts.length < 2) return value;
    const date = parts[0].split('-');
    const month = date.length >= 2 ? date[1] : '';
    const day = date.length >= 3 ? date[2] : '';
    return month + '-' + day + ' ' + parts[1].slice(0, 5);
}

// 单条消息加工：分左右、带头像与颜色（与喜欢页对话弹框一致）
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

// 按对话对象分组，取每个对象最后一条，再按最后时间倒序
function buildSessions(list, selfId, peerMap) {
    const grouped = {};
    list.forEach(function (item) {
        const sender = Number(item.sender_id);
        const receiver = Number(item.receiver_id);
        let peerId = sender === Number(selfId) ? receiver : sender;
        if (!peerId) return;
        const key = String(peerId);
        const time = String(item.create_time || '');
        if (!grouped[key] || time > grouped[key].time) {
            grouped[key] = { peerId: peerId, last: item, time: time };
        }
    });
    return Object.keys(grouped).map(function (key) {
        const entry = grouped[key];
        const peer = peerMap[key] || {};
        const isSelf = Number(entry.last.sender_id) === Number(selfId);
        const content = entry.last.content || entry.last.chat || entry.last.message || '';
        return {
            id: entry.peerId,
            name: peer.name || ('用户 ' + entry.peerId),
            avatarUrl: peer.image_url ? IMAGE_BASE_URL + peer.image_url : '',
            avatarInitial: (peer.name || '客').slice(0, 1),
            avatarColor: avatarColor(entry.peerId),
            preview: (isSelf ? '我: ' : '') + content,
            timeText: formatListTime(entry.last.create_time),
            sortTime: entry.time
        };
    }).sort(function (a, b) {
        if (b.sortTime > a.sortTime) return 1;
        if (b.sortTime < a.sortTime) return -1;
        return 0;
    });
}

const pageOptions = {
    data: {
        loggedIn: false,
        showLogin: false,
        viewState: 'loading',   // loading / ready / empty / error / guest
        sessions: [],
        detailOpen: false,
        detailUser: null,
        detailHistory: []
    },

    onShow: function () {
        const loggedIn = auth.isLoggedIn();
        this.setData({ loggedIn: loggedIn, showLogin: !loggedIn });
        tabBar.sync(this, 2);
        if (loggedIn) {
            this.loadSessions();
        } else {
            this.setData({ viewState: 'guest', sessions: [] });
        }
    },

    afterLogin: function () {
        this.onShow();
    },

    openLogin: function () {
        this.setData({ showLogin: true });
    },

    noop: function () {},

    loadSessions: function () {
        const self = this;
        const profile = wx.getStorageSync(PROFILE_KEY) || {};
        const userId = profile.user_id;
        if (userId === undefined || userId === null || userId === '') {
            this.setData({ viewState: 'error' });
            return;
        }
        this.setData({ viewState: 'loading' });
        api.getChatHistory(userId).then(function (history) {
            const list = Array.isArray(history) ? history : (history && Array.isArray(history.data) ? history.data : []);
            self._allMessages = list;
            // 喜欢列表仅用于补充对方头像/姓名，失败时退回用 id 占位
            return api.getLikes(userId).then(function (likes) {
                const likeList = Array.isArray(likes) ? likes : (likes && Array.isArray(likes.data) ? likes.data : []);
                const peerMap = {};
                likeList.forEach(function (user) { peerMap[String(user.id)] = user; });
                self._peerMap = peerMap;
                const sessions = buildSessions(list, userId, peerMap);
                self.setData({ viewState: sessions.length ? 'ready' : 'empty', sessions: sessions });
            }).catch(function () {
                self._peerMap = {};
                const sessions = buildSessions(list, userId, {});
                self.setData({ viewState: sessions.length ? 'ready' : 'empty', sessions: sessions });
            });
        }).catch(function () {
            self.setData({ viewState: 'error' });
        });
    },

    onRetry: function () {
        this.loadSessions();
    },

    openDetail: function (event) {
        const peerId = Number(event.currentTarget.dataset.id);
        const selfId = Number((wx.getStorageSync(PROFILE_KEY) || {}).user_id);
        const peer = (this._peerMap && this._peerMap[String(peerId)]) || { id: peerId };
        const messages = (this._allMessages || []).filter(function (item) {
            return (Number(item.sender_id) === selfId && Number(item.receiver_id) === peerId) ||
                (Number(item.receiver_id) === selfId && Number(item.sender_id) === peerId);
        }).slice().sort(function (a, b) {
            const ta = String(a.create_time || '');
            const tb = String(b.create_time || '');
            return ta < tb ? -1 : (ta > tb ? 1 : 0);
        }).map(function (item) {
            return decorateChatItem(item, selfId, peer);
        });
        this.setData({ detailOpen: true, detailUser: peer, detailHistory: messages });
    },

    closeDetail: function () {
        this.setData({ detailOpen: false, detailUser: null, detailHistory: [] });
    }
};

Page(Object.assign({}, loginBehavior, pageOptions));
