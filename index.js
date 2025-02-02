var instance_skel = require('../../instance_skel');
var actions       = require('./actions');
var config      = require('./config')
var debug;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function (config) {
	var self = this;
	self.config = config;
	self.actions();
}

instance.prototype.init = function () {
	var self = this;
	self.status(self.STATE_OK);
	debug = self.debug;
	log = self.log;
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return config.getConfigFields(self)
}

// When module gets deleted
instance.prototype.destroy = function () {
	debug("destroy");
}

instance.prototype.actions = function (system) {
	var self     = this;
	const series = self.config.projectorSeries;
	self.setActions(actions.getActions(series));
}

instance.prototype.action = function (action) {
	var self        = this
    var cmdArray    = []
	var path        = ""
	var cmd         = ""
    var headers     = {}
    var options     = {}
	const url       = "http" + (self.config.https ? "s" : "") + "://" + self.config.url
    
    switch (self.config.firmware) {
        case config.FIRMWARE_V.vBefore3: // FW pre-v3.0
            const timestamp = new Date().getTime()

            headers = {
                'Connection': 'keep-alive',
                'Accept': 'text/plain, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Referer': url + '/cgi-bin/WebControl/Lens_Control',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'de,en;q=0.9'
            };
        
            cmdArray = actions.getAction(action)
            path = cmdArray.map((val) => {
                return val.name + "=" + val.parameters.join('+')
            }).join('&')

            cmd = url + "/cgi-bin/directsend?" + path + "&_=" + timestamp;
        
            system.emit('log', 'Epson PJ', 'debug', 'FW<3 Action: ' + action.action);
            system.emit('log', 'Epson PJ', 'debug', 'FW<3 Requesting: ' + cmd);
        
            self.system.emit('rest_get', cmd, function (err, result) {
                if (err !== null) {
                    self.log('error', 'HTTP GET Request failed (' + result.error.code + ')');
                    self.status(self.STATUS_ERROR, result.error.code);
                }
                else {
                    self.status(self.STATUS_OK);
                }
            }, headers);
            break
        case config.FIRMWARE_V.v3: // FW around v3.0, requires HTTP basic auth
            headers = {
                'Referer': url + '/cgi-bin/webconf',
            }

            options = {
                user: 'EPSONWEB',
                password: self.config.password
            }

            cmdArray = actions.getAction(action)
            path = cmdArray.map((val) => {
                return val.name + "=" + val.parameters.join('+')
            }).join('&')
            cmd = url + "/cgi-bin/directsend?" + path
        
            system.emit('log', 'Epson PJ', 'debug', 'FW3 Action: ' + action.action)
            system.emit('log', 'Epson PJ', 'debug', 'FW3 Requesting: ' + cmd)
        
            self.system.emit('rest_get', cmd, function (err, result) {
                if (err !== null) {
                    self.log('error', 'HTTP GET Request failed (' + result.error.code + ')')
                    self.status(self.STATUS_ERROR, result.error.code)
                }
                else {
                    self.status(self.STATUS_OK)
                }
            }, headers, options)
            break
        case config.FIRMWARE_V.vAfter3: // FW aorund v4

            cmdArray = actions.getAction(action)
            // ESCVP21 API expects array of commands, formed as objects each with
            // key 'name' as the command, value String
            // key 'parameters' as an Array of parameters, value String
            let _commands = cmdArray.map(val => {
                return {
                    name: val.name, 
                    parameters: val.parameters.map(param => {return param.toString()})
                }
            })

            // hardcoded using api v05 - not sure if there are others
            cmd = url + "/api/v05/escvp21"

            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: {
                    commands: _commands,
                },
                digestAuth: 'EPSONAPI:'+ self.config.password,
            }

            system.emit('log', 'Epson PJ', 'debug', 'Action: ' + action.action)
            system.emit('log', 'Epson PJ', 'debug', 'Requesting: ' + cmd)
        
            const urllib = require('urllib');
            urllib.request(cmd, options, function (err, data, res) {
                if (err) {
                    self.log('error', 'HTTP POST Request failed (' + err.message + ')')
                    self.status(self.STATUS_ERROR, err.message)
                } else {
                    system.emit('log', 'Epson PJ', 'debug', 'PJ Reponse: ' + data.toString())
                    self.status(self.STATUS_OK)
                }

            });
            break
    }

}

instance_skel.extendedBy(instance);
exports = module.exports = instance;