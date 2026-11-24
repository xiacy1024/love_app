// 浏览偏好：用户想看的候选人性别。
const GENDER_KEY = 'preferred_gender';

function getPreferredGender() {
    const value = Number(wx.getStorageSync(GENDER_KEY));
    return value === 1 || value === 2 ? value : 0;
}

function setPreferredGender(gender) {
    wx.setStorageSync(GENDER_KEY, gender === 2 ? 2 : 1);
}

function clearPreferredGender() {
    wx.removeStorageSync(GENDER_KEY);
}

module.exports = {
    GENDER_KEY: GENDER_KEY,
    getPreferredGender: getPreferredGender,
    setPreferredGender: setPreferredGender,
    clearPreferredGender: clearPreferredGender
};
