Component({
    properties: {
        show: {
            type: Boolean,
            value: false
        }
    },
    methods: {
        onLoginTap: function () {
            this.triggerEvent('login');
        },
        handleClose: function () {
            this.triggerEvent('close');
        },
        noop: function () {}
    }
});
