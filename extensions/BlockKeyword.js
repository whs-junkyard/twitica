(function(){
/**
 * Is that tweet blocked from displaying?
 * Now updated with anti-spam mechanism.
 * @param {Object} The tweet
 * @return {Boolean} True if blocked
 */
function process_tweet(d){
	keys = localStorage['blockKey'].split("||");
	blocked = false;
	keys.forEach(function(x){
		x=$.trim(x); if(x=="") return;
		if(x.match(/^user:/)){
			usRegex = x.replace(/^user:/, "");
			if(d['user']['screen_name'].match(new RegExp(usRegex, "i"))){
				console.log("blocked! user "+d['user']['screen_name']+" matched "+x);
				blocked = true;
			}
		}else if(x.match(/^src:/)){
			usRegex = x.replace(/^src:/, "");
			if(d['source'].match(new RegExp(usRegex, "i"))){
				console.log("blocked! src "+d['source']+" matched "+x);
				blocked = true;
			}
		}else{
			reg = new RegExp(x, "i");
			if(d['text'].match(reg)){
				console.log("blocked! "+d['text']+" matched "+x);
				blocked = true;
			}
		}
		if(blocked) return false;
	});
	if(d['retweeted_status'] && !blocked){
		blocked = process_tweet(d['retweeted_status']) === false;
	}
	// anti-spam
	/** @type {boolean} */ var spam = false;
	/*if(accInfo['twitter'] && !following && user && txt && src){
		var threshold = 4;
		var current = 0;
		if(src == "web") current += 1;
		if(txt.indexOf("@"+accInfo['twitter']['username']) == 0) current += 2;
		else if(txt.indexOf("@"+accInfo['twitter']['username']) != -1) current += 1;
		["iPad", "Xoom", "free", "RT", "http://", "iPhone", "Apple", "Steve Jobs", "MacBook", "iMac", "iPod Touch", "Trip", "bit.ly", "tinyurl.com", "win"].forEach(function(x){
			if(txt.match(new RegExp(x, "i"))) current += 1;
		});
		if(current > threshold){
			spam=true;
			console.log({"text": txt, "user": user, "src": src}, "spam");
		}
	}*/
	return blocked ? false : d;
}

register_hook("add message", process_tweet);
})();