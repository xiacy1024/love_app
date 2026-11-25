Component({
    properties: {
        show: {
            type: Boolean,
            value: false
        },
        selected: {
            type: Number,
            value: 0
        },
        // 首次进入必须选择，不能取消
        required: {
            type: Boolean,
            value: false
        }
    },
    data: {
        options: [
            { value: 1, label: '男生', glyph: '♂', desc: '看看男生们' },
            { value: 2, label: '女生', glyph: '♀', desc: '看看女生们' }
        ]
    },
    methods: {
        choose: function (event) {
            const value = Number(event.currentTarget.dataset.value);
            this.triggerEvent('confirm', { gender: value });
        },
        close: function () {
            if (this.properties.required) return;
            this.triggerEvent('close');
        },
        noop: function () {}
    }
});
