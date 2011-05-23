/**
 * @license The Twitter library is licensed under the GNU Lesser General Public License version 3
 * Portions from the Prototype JavaScript library
 */

/* prototypejs/src/lang/function.js */
function prototype_update(array, args) {
	var arrayLength = array.length, length = args.length;
	while (length--) array[arrayLength + length] = args[length];
	return array;
}
function prototype_merge(array, args) {
	slice = Array.prototype.slice;
	array = slice.call(array, 0);
	return prototype_update(array, args);
}
Function.prototype.bind = function(context) {
	//if (arguments.length < 2) return this;
	slice = Array.prototype.slice;
	var __method = this, args = slice.call(arguments, 1);
	return function() {
		var a = prototype_merge(args, arguments);
		return __method.apply(context, a);
	}
}
/* prototypejs/src/lang/object.js */
_toString = Object.prototype.toString, STRING_CLASS = '[object String]';
function isString(object) {
	return _toString.call(object) === STRING_CLASS;
}
/* end */
if(!window['OAuth']) alert("BUG: OAuth haven't been loaded yet!");
/**
 * Twitter connector
 * @param {string=} Optionally OAuth access key
 * @param {string=} Optionally OAuth access key secret
 * @constructor
 */
function Twitter(accessKey, accessSecret){
	if(!localStorage['consumerKey']){
		localStorage['consumerKey'] = "B02C38CBnBOTwN4l4tGIQ";
		localStorage['consumerSecret'] = "RtCXZbUTaD8isPRxl26725zMPRyCaLf4CsF4WjNbPaI";
	}
	/**
	 * @type {object}
	 */
	this.consumer = {
		"consumerKey": localStorage['consumerKey'],
		"consumerSecret": localStorage['consumerSecret'],
		"serviceProvider": {
			"signatureMethod": "HMAC-SHA1",
			"requestTokenURL": "https://api.twitter.com/oauth/request_token",
			"accessTokenURL": "https://api.twitter.com/oauth/access_token"
		}
	};
	/**
	 * @type {object}
	 */
	this.user = {};
	if(accessKey){
		this.consumer['token'] = accessKey;
		this.consumer['tokenSecret'] = accessSecret;
	}
}
/**
 * @private
 * Call the Twitter API with OAuth
 * @this {Twitter}
 * @param {object} OAuth message
 * @param {function} callback function
 * @return {jQuery.jqXHR}
 */
Twitter.prototype._makeRequest = function(msg, callback){
	if(callback == undefined) callback = function(){}
	msg.method = msg.method.toUpperCase();
	reqBody = OAuth.formEncode(msg.parameters);
	OAuth.completeRequest(msg, this.consumer);
	authHeader = OAuth.getAuthorizationHeader("", msg.parameters);
	return $.ajax({
		"url": msg.action,
		"type": msg.method,
		"beforeSend": function(x){
			x.setRequestHeader("Authorization", authHeader);
			if(localStorage['phx'] && msg.method == "GET") x.setRequestHeader("X-PHX", "true");
		},
		"data": reqBody,
		"error": function(x){
			return callback(JSON.parse(x.responseText));
		},
		"success": function(d){
			if(isString(d)){
				out = {}
				$.each(OAuth.decodeForm(d), function(k,v){
					out[v[0]] = v[1];
				});
				return callback(out);
			}else{
				return callback(d);
			}
		}
	});
};
/**
 * Perform xAuth authentication
 * @param {string} Username
 * @param {string} Password
 * @param {function} Callback function, will be called with true when success.
 * @this {Twitter}
 */
Twitter.prototype.xauth = function(username, password, callback){
	if(callback == undefined) callback = function(){}
	this._makeRequest({
		"method": "POST",
		"action": this.consumer['serviceProvider']['accessTokenURL'],
		"parameters": [
			["x_auth_username", username],
			["x_auth_password", password],
			["x_auth_mode", "client_auth"]
		]
	}, (/** @this {Twitter} */ function(res){
		if(res.oauth_token){
			this.consumer.token = res.oauth_token;
			this.consumer.tokenSecret = res.oauth_token_secret;
			callback(true);
		}else callback(false);
	}).bind(this));
};
/**
 * Perform OAuth authorization step 1
 * @param {function} Callback function
 * @this {Twitter}
 */
Twitter.prototype.oauth = function(callback){
	if(callback == undefined) callback = function(){}
	this._makeRequest({
		"method": "POST",
		"action": this.consumer['serviceProvider']['requestTokenURL']
	}, (function(cb, res){
		callback({
			"data": res,
			"url": "https://api.twitter.com/oauth/authenticate?oauth_token="+res['oauth_token']+"&oauth_callback=oob"
		});
	}).bind(this, callback));
}
/**
 * Perform OAuth authentication step 2
 * @param {(number|string)} PIN
 * @param {Object.<string, string>} Data as returned from oauth()
 * @param {function} Callback function
 * @this {Twitter}
 */
Twitter.prototype.oauth2 = function(pin, data, callback){
	if(callback == undefined) callback = function(){}
	this.consumer.token = data.oauth_token;
	this.consumer.tokenSecret = data.oauth_token_secret;
	this._makeRequest({
		"method": "POST",
		"action": this.consumer['serviceProvider']['accessTokenURL'],
		"parameters": [
			["oauth_verifier", parseInt(pin)]
		]
	}, (/** @this {Twitter} */ function(res){
		if(res['oauth_token']){
			this.consumer['token'] = res['oauth_token'];
			this.consumer['tokenSecret'] = res['oauth_token_secret'];
			callback(true);
		}else callback(false);
	}).bind(this));
};
/**
 * @private
 * Request a JSON and return it
 * @param {string} Type of request: GET/POST (use respectively functions instead)
 * @param {string} Endpoint. Eg. statuses/home_timeline
 * @param {Object} GET/POST parameters
 * @param {function} Optionally callback function. Will be called with the response as first argument.
 * @this {Twitter}
 */
Twitter.prototype._doRequest = function(type, url, params, callback){
	if(url.indexOf("http://") != 0) url = "https://api.twitter.com/1/" + url + ".json";
	if(callback == undefined) callback = function(){}
	if($.isFunction(params)){callback = params; params = null;}
	this._makeRequest({
		"method": type,
		"action": url,
		"parameters": params
	}, (/** @this {Twitter} */ function(res){
		if(url == "https://api.twitter.com/1/account/verify_credentials.json")
			this.user = res;
		callback(res);
	}).bind(this));
}
/**
 * @see Twitter.prototype._doRequest
 * @this {Twitter}
 */
Twitter.prototype.get = function(){
	return this._doRequest.apply(this, prototype_merge(["get"], arguments));
};
/**
 * @see Twitter.prototype._doRequest
 * @this {Twitter}
 */
Twitter.prototype.post = function(){
	return this._doRequest.apply(this, prototype_merge(["post"], arguments));
};
/**
 * Sign a request for OAuth Echo
 * @param {string} URL target
 * @return {string} Signed header
 * @this {Twitter}
 */
Twitter.prototype.sign = function(url){
	if(url === undefined) url = "https://api.twitter.com/1/account/verify_credentials.json";
	if(url.indexOf("http://") != 0 && url.indexOf("https://") != 0) url = "https://api.twitter.com/1/" + url + ".json";
	msg = {
		"method": "GET",
		"action": url
	};
	reqBody = OAuth.formEncode(msg.parameters);
	OAuth.completeRequest(msg, this.consumer);
	authHeader = OAuth.getAuthorizationHeader("", msg.parameters);
	return authHeader;
}