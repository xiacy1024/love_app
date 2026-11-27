
const { API_BASE_URL, IMAGE_BASE_URL, PROFILE_KEY } = require('./config');

const ENDPOINTS = {
    recommend: '/get_user_profile',
    reaction: '/recommend/reaction',
    login: '/wechat/login',
    profile: '/profile',
    upload: '/upload_image',
    like: '/get_like_list',
    chatHistory: '/get_chat_history',
    sendMessage: '/send_message'
};

function requestJson(path, method, data) {
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

    getRecommendations: function (gender) {
        // 男=1，女=2；未传时默认按男处理，保证 URL 始终带 gender 参数
        const value = gender === 1 ? 1 : 2;
        return requestJson(ENDPOINTS.recommend + '?gender=' + value, 'GET');
    },

    // 喜欢列表：GET，参数 user_id 取自 wx.getStorageSync("profile").user_id
    getLikes: function (userId) {
        return requestJson(ENDPOINTS.like + '?user_id=' + userId, 'GET');
    },

    // 历史对话：后端待开发，先留好调用入口
    getChatHistory: function (userId, targetId) {
        return requestJson(ENDPOINTS.chatHistory + '?user_id=' + userId + '&target_id=' + targetId, 'GET');
    },

    // 发送消息：参数与后端 /api/send_message 对齐
    sendMessage: function (senderId, receiverId, content) {
        return requestJson(ENDPOINTS.sendMessage, 'POST', {
            sender_id: senderId,
            receiver_id: receiverId,
            content: content
        });
    },

    sendReaction: function (payload) {
        return requestJson(ENDPOINTS.reaction, 'POST', payload);
    },

    login: function (code) {
        return requestJson(ENDPOINTS.login, 'POST', { code: code });
    },

    getProfile: function () {
        return requestJson(ENDPOINTS.profile, 'GET', {});
    },

    saveProfile: function (profile) {
        wx.setStorageSync(PROFILE_KEY, profile);
        return requestJson(ENDPOINTS.profile, 'POST', profile);
    },

    uploadImage: function (filePath) {
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
