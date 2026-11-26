// pages/like/like.js
const { API_BASE_URL, IMAGE_BASE_URL, PROFILE_KEY } = require('../../utils/config');
const auth = require('../../utils/auth')
const tabBar = require('../../utils/tab-bar');
const loginBehavior = require('../../utils/login-behavior');


const pageOptions = {
  data: {
    loggedIn: false,
    showLogin: false,

    imageBaseUrl: IMAGE_BASE_URL,
},

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.setData({loggedIn: auth.isLoggedIn(), showLogin: 1 - auth.isLoggedIn()})
    tabBar.sync(this, 1);
},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
};

Page(Object.assign({}, loginBehavior, pageOptions));