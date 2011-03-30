/**
 * Web worker for streaming Twitter
 *
 * @since 5 June 2010
 * @see http://www.whatwg.org/specs/web-workers/current-work/
 */
importScripts('twplus/sha1.js');
importScripts('twplus/oauth.js');

var CHD = {};
CHD.cb = function(){}
CHD.xhr = new XMLHttpRequest();
var CHDtimeout;
accInfo = {};

function comm(message){
	postMessage(JSON.stringify({
		"type": "message",
		"message": message
	}));
};
CHD.cb = function(m){
	
}

console = {
	"log": function(x,y){postMessage(JSON.stringify({type: "console.log", data: [x,y]}));},
	"error": function(x,y){postMessage(JSON.stringify({type: "console.error", data: [x,y]}));},
	"warn": function(x,y){postMessage(JSON.stringify({type: "console.warn", data: [x,y]}));},
};
trim = function(s){
	return s.replace(/^\s+|\s+$/, '');
};

/**
 * Streams Twitter
 * Returned in Twitica Desktop (extension) on 30 March 2011
 *
 * @since 23 April 2010
 * @see http://apiwiki.twitter.com/ChirpUserStreams
 * @see http://developer.apple.com/internet/webcontent/xmlhttpreq.html
 */
// jQuery isn't reliable in this case
// as we streams data, not load it
//
// actually, I had the idea that in this section we loads prototypeJS, but it probably not a good idea.
function makeTimeout(){
	CHDtimeout = setTimeout(function(){
		comm({message: "lostcon"});
		CHD.connected = false;
	}, 90000);
}
CHD.xhr.onreadystatechange = function(){
	if(CHD.xhr.readyState == 2){
		if(CHD.xhr.responseText.indexOf("UNAUTHORIZED") != -1){
			comm({message: "loginerror"});
			CHD.xhr.abort();
		}
	}else if(CHD.xhr.readyState == 3){
		if(!CHD.connected){
			CHD.connected=true;
			comm({message: "connected"});
		}
		clearTimeout(CHDtimeout); makeTimeout();
		postMessage(CHD.xhr.responseText);
	}else if(CHD.xhr.readyState == 4){
		comm({message: "lostcon"});
		CHD.connected = false;
	}
}
onmessage = function(e){
	e=JSON.parse(e.data);
	msg = {
		method: "GET",
		action: "https://userstream.twitter.com/2/user.json?with=users"
	}
	reqBody = OAuth.formEncode(msg.parameters);
	OAuth.completeRequest(msg, e);
	authHeader = OAuth.getAuthorizationHeader("", msg.parameters);
	CHD.connected = false;
	CHD.xhr.open("GET", msg.action, true);
	CHD.xhr.setRequestHeader("Authorization", authHeader);
	CHD.xhr.send(reqBody);
}
