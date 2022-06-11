module.exports = {
    FIRMWARE_V: {
        vBefore3: 1,
        v3: 2,
        vAfter3: 3,
    },


    getConfigFields(self) {
        return [
            {
                type: 'text',
                id: 'info',
                label: 'Information',
                width: 12,
                value: 'This module is for Epson Business projectors'
            }, {
                type: 'textinput',
                id: 'url',
                label: 'Projector URL',
                width: 6,
                regex: self.REGEX_IP
            }, {
                type: 'textinput',
                id: 'password',
                label: 'Web Control Password',
                width: 6,
                default: 'admin'
            }, {
                type: 'checkbox',
                id: 'https',
                label: 'HTTPS Connection',
                width: 12,
                default: false
            }, {
                type: 'dropdown',
                id: 'firmware',
                label: 'Firmware',
                width: 12,
                choices: [
                    { id: this.FIRMWARE_V.vBefore3, label: '< v3'},
                    { id: this.FIRMWARE_V.v3, label: 'v3'},
                    { id: this.FIRMWARE_V.vAfter3, label: '> v3'},
                ],
                default: 1
            }
        ]
    }
}