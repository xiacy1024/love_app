const api = require('../../utils/api');
const auth = require('../../utils/auth');
const loginBehavior = require('../../utils/login-behavior');
const tabBar = require('../../utils/tab-bar');

const GENDERS = [
    { value: 2, text: '男' },
    { value: 1, text: '女' }
];

const EDUCATIONS = [
    { value: 1, text: '高中及以下' },
    { value: 2, text: '大专' },
    { value: 3, text: '本科' },
    { value: 4, text: '硕士' },
    { value: 5, text: '博士' }
];

const INCOMES = [
    { value: 1, text: '5k 以下' },
    { value: 2, text: '5k-10k' },
    { value: 3, text: '10k-20k' },
    { value: 4, text: '20k-50k' },
    { value: 5, text: '50k 以上' }
];

function getFormData() {
  const profile = wx.getStorageSync("profile")
  return {
    user_id: profile.user_id,
    image_url: 'image_url' in profile ? profile.image_url : '',
    name: 'name' in profile ? profile.name : '',
    birthday: 'birthday' in profile ? profile.birthday : '2000-01-01',
    current_city: 'current_city' in profile ? profile.current_city : '',
    education: 'education' in profile ? profile.education : 1,
    gender: 'gender' in profile ? profile.gender : 1,
    income: 'income' in profile ? profile.income : 1,
    job: 'job' in profile ? profile.job : '',
    school: 'school' in profile ? profile.school : '',
    self_intro: 'self_intro' in profile ? profile.self_intro : ''
    };
}

function todayString() {
    const d = new Date();
    const month = d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : String(d.getMonth() + 1);
    const day = d.getDate() < 10 ? '0' + d.getDate() : String(d.getDate());
    return d.getFullYear() + '-' + month + '-' + day;
}

const pageOptions = {
    data: {
        loggedIn: false,
        showLogin: false,
        form: getFormData(),
        genderOptions: GENDERS,
        educationOptions: EDUCATIONS,
        incomeOptions: INCOMES,
        genderIndex: 0,
        educationIndex: 0,
        incomeIndex: 0,
        genderText: '男',
        educationText: '本科',
        incomeText: '20k-50k',
        vipChecked: false,
        maxDate: todayString(),
        errorText: '',
        saving: false,
        profileLoaded: false,
        imageBaseUrl: api.IMAGE_BASE_URL,
    },

    onShow: function () {
        this.refreshAuth();
        tabBar.sync(this, 1);
    },

    refreshAuth: function () {
        const loggedIn = auth.isLoggedIn();
        this.setData({ loggedIn: loggedIn });
        if (loggedIn) {
            // if (!this.data.profileLoaded) this.loadProfile();
        } else {
            this.setData({ showLogin: true });
        }
    },

    openLogin: function () {
        this.setData({ showLogin: true });
    },

    afterLogin: function () {
        //this.loadProfile();
    },

    afterCloseLogin: function () {
        wx.switchTab({ url: '/pages/recommend/recommend' });
    },

    setField: function (field, value) {
        const patch = {};
        patch['form.' + field] = value;
        patch.errorText = '';
        this.setData(patch);
    },

    onFieldInput: function (event) {
        this.setField(event.currentTarget.dataset.field, event.detail.value);
    },

    onDateChange: function (event) {
        this.setField('birthday', event.detail.value);
    },

    onPickerChange: function (event) {
        const type = event.currentTarget.dataset.type;
        const index = Number(event.detail.value);
        const patch = {};
        if (type === 'gender') {
            patch['form.gender'] = GENDERS[index].value;
            patch.genderIndex = index;
            patch.genderText = GENDERS[index].text;
        } else if (type === 'education') {
            patch['form.education'] = EDUCATIONS[index].value;
            patch.educationIndex = index;
            patch.educationText = EDUCATIONS[index].text;
        } else if (type === 'income') {
            patch['form.income'] = INCOMES[index].value;
            patch.incomeIndex = index;
            patch.incomeText = INCOMES[index].text;
        }
        patch.errorText = '';
        this.setData(patch);
    },

    onVipChange: function (event) {
        const checked = event.detail.value;
        this.setData({ vipChecked: checked });
        this.setField('vip', checked ? '1' : '');
    },

    chooseImage: function () {
        const self = this;
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: function (res) {
                const file = res.tempFiles && res.tempFiles[0];
                if (!file) return;
                wx.showLoading({ title: '上传中' });
                api.uploadImage(file.tempFilePath).then(function (data) {
                    wx.hideLoading();
                    //const url = (data && (data.url || data.image_url)) || file.tempFilePath;
                    const url = data && (data.url || data.image_url);
                    self.setField('image_url', url);
                }).catch(function () {
                    wx.hideLoading();
                    wx.showToast({ title: '图片上传失败', icon: 'none' });
                });
            }
        });
    },

    saveProfile: function () {
        if (this.data.saving) return;
        const form = this.data.form;
        if (!form.name || !form.name.trim()) {
            this.setData({ errorText: '请填写名字' });
            return;
        }
        const self = this;
        this.setData({ saving: true });
        wx.showLoading({ title: '保存中' });
        api.saveProfile(form).then(function () {
            wx.hideLoading();
            self.setData({ saving: false });
            wx.showToast({ title: '保存成功', icon: 'success' });
        }).catch(function () {
            wx.hideLoading();
            self.setData({ saving: false });
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        });
    }
};

Page(Object.assign({}, loginBehavior, pageOptions));
