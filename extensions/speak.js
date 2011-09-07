(function(){
function process_tweet(d){
	if(d['retweeted_status']){
		return d
	}
	userread = d['user']['screen_name'].split("").join(".");
	$.getJSON("http://localhost:3000/?callback=?", {"text": userread+" ทวีตว่า "+d['text']});
	return d;
}

register_hook("add message", process_tweet);
})();