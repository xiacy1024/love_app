const auth = require('./auth');

/**
 * 自定义 TabBar 的状态同步工具。
 * 登录态变化时，页面和 TabBar 组件都从这里取同一份数据，避免各处自己记状态。
 */
function getBar(page) {
    if (!page || typeof page.getTabBar !== 'function') return null;
    const bar = page.getTabBar();
    if (!bar || typeof bar.setData !== 'function') return null;
    return bar;
}

// 页面 onShow / 登录成功后调用：刷新 TabBar 的登录态与选中项
function sync(page, selected) {
    const bar = getBar(page);
    if (!bar) return;
    const patch = { loggedIn: auth.isLoggedIn() };
    if (typeof selected === 'number') {
        patch.selected = selected;
    }
    bar.setData(patch);
}

// 退出登录后调用：清空各页面的登录态，并刷新所有 TabBar
function syncLogout() {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    pages.forEach(function (page) {
        if (!page || typeof page.setData !== 'function') return;
        const patch = { loggedIn: false, userId: '' };
        if (page.data && Object.prototype.hasOwnProperty.call(page.data, 'profileLoaded')) {
            patch.profileLoaded = false;
        }
        page.setData(patch);
        sync(page);
    });
}

module.exports = {
    sync: sync,
    syncLogout: syncLogout
};
