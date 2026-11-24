Component({
    properties: {
        show: {
            type: Boolean,
            value: false
        }
    },
    methods: {
        handleLogin: function () {
            this.triggerEvent('login');
        },
        handleClose: function () {
            this.triggerEvent('close');
        },
        noop: function () {}
    }
});
