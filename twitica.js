/** @define {string} API for cool features */ var TwPlusAPI="";
/** @type {number} */
var curPos=0;
/** @type {number} */
var lastId=0;
/** @type {Object.<string, Object>} */
var accInfo = {};
/** @type {Array.<string>} */
var dentsRendered=[];
/** @type {Array.<jQuery>} */
var dentsElement=[];
/** @const */
var geo = navigator.geolocation;
/** @type {Array.<number>} */
var geoPos = [null,null];
/** @type {string} */
var last_twitter_id = "0"
/** @type {boolean} */
var flickering = false
/** @type {number} */
var bgTimeout;
/** @type {Object} */
var SET;
/** @type {boolean} */
var twFirstLoadDone;
/** @type {Object.<string, jQuery>} */
var dataDiv = {};
if(TwPlusAPI != "mac")
	var DB;
/** @type {(null|Array.<string,string>)} */
var failtweet;
/** @type {(null|Twitter)} */
var Tw;
/** @type {(null|string)} */
var in_reply_to;
/** @type {number} */
var refocus_bounce;
google.load("earth", "1");

/**
 * Remove array's member
 * @see http://ejohn.org/blog/javascript-array-remove/
 * @return {Array}
 */
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

/**
 * Make array members unique
 * Note that $.unique is not supported for non-elements arrays.
 * @see http://www.martienus.com/code/javascript-remove-duplicates-from-array.html
 * @return {Array}
 */
Array.prototype.unique = function () {
	var r = new Array();
	o: for(var i = 0, n = this.length; i < n; i++){
		for(var x = 0, y = r.length; x < y; x++){
			if(r[x]==this[i]){
				continue o;
			}
		}
		r[r.length] = this[i];
	}
	return r;
}

/**
 * Show a notification at top right
 * @param {string} Message
 * @return {jQuery} The notification node
 */
function notify(str){
	e = $("<div class='notify'></div>").html(str).css("left", -1 * $(window).width()).appendTo("#notify");
	setTimeout(function(e){
		e.css("left", 0);
	}, 0, e);
	function hideE(e){
		e.css({"left": $(window).width()}).slideUp(1500, function(){
			$(this).remove();
		});
	}
	hidet = setTimeout(hideE, 3000 + ($("#notify").children().length * 200), e);
	e.data("timeout", hidet);
	e.click(function(){
		clearTimeout($(this).data('timeout'));
		hideE($(this));
	});
	return e;
}
// since we're firing multiple request at the same time
// we're going to have id for each message.
// the injector and twcom() handles ID automatically.
/** @type {Object.<number,Function>} */
var _twcom_callbacks = {};
/**
 * Backend-specific code
 * @param {Object} The message
 * @param {Function} callback function
 */
function twcom(what, callback){
	if(what.type == "geo"){
		return $.getJSON("http://maps.google.com/maps/api/geocode/json?sensor=true&"+$.param(what.data), callback);
	}else if(what.type == "tw.info"){
		callback(JSON.parse(localStorage['twitterData']));
	}else if(what.type == "tw.refresh"){
		if(!Tw){
			console.error("No OAuth!");
			return false;
		}
		if(!what.data.timeline) what.data.timeline = "home";
		if(what.data.timeline == "dm"){
			return Tw.get("direct_messages", what.param, callback);
		}else{
			if(what.data.timeline == "replies") what.data.timeline = "mentions";
			if(["mentions", "retweets_of_me", "retweeted_to_me", "retweeted_by_me"].indexOf(what.data.timeline) != -1)
				apiName = what.data.timeline;
			else
				apiName = what.data.timeline+"_timeline";
			if(!what.param) what.param = {};
			//what.param["include_entities"] = true;
			return Tw.get("statuses/"+apiName, what.param, callback);
		}
	}else if(what.type == "tw.status"){
		if(!Tw){
			console.error("No OAuth!");
			return false;
		}
		return Tw.get("statuses/show/"+what.data, null, callback);
	}else if(what.type == "tw.update"){
		if(!Tw){
			console.error("No OAuth!");
			return false;
		}
		data = {};
		if(what.data['status']) data.status = what.data['status'];
		if(what.data['irp']) data['in_reply_to_status_id'] = what.data['irp'];
		if(what.data['lat']) data.lat = what.data['lat'];
		if(what.data['long']) data['long'] = what.data['long'];
		//data["include_entities"] = true;
		return Tw.post("statuses/update", data, callback);
	}else if(what.type == "tw.retweet"){
		if(!Tw){
			console.error("No OAuth!");
			return false;
		}
		data = {};
		if(what.data.lat) data.lat = what.data.lat;
		if(what.data['long']) data['long'] = what.data['long'];
		//data["include_entities"] = true;
		return Tw.post("statuses/retweet/"+what.data.id, data, callback);
	}else if(what.type == "tw.shorten"){ // unused
		$.get("http://twitter.com/share?url="+encodeURIComponent(what.url), {}, (function(how,old,d){
			url = d.match(/<textarea [^>]+> (http:\/\/t\.co\/[a-zA-Z0-9]+)<\/textarea>/)[1];
			how({url: url, old: old});
		}).bind(this, callback, what.url));
	}else if(what.type == "shorten"){
		$.getJSON("https://api-ssl.bit.ly/v3/shorten?login=manatsawin&apiKey=R_fe0508be39d31d16b36c8ae014d4bfc4&format=json&domain=j.mp&longUrl="+encodeURIComponent(what.url), {}, (function(how,d){
			how({'url': d['data']['url'], 'old': d['data']['long_url']});
		}).bind(this, callback));
	}else if(what.type == "ytplaying" && TwPlusAPI == "chrome"){
		// find yt window
		var out = [];
		chrome.windows.getAll({"populate": true}, function(wnds){
			wnds.forEach(function(wnd){
				wnd['tabs'].forEach(function(tab){
					if(tab['url'].match(/^http[s]*:\/\/(www\.){0,1}youtube\.com\/watch\?v=/) && tab['title'] != ""){
						url = tab['url'].match(/^http[s]*:\/\/(?:www\.){0,1}youtube\.com\/watch\?v=(.*?)(?:&|$)/)[1];
						url = "http://youtu.be/"+url;
						out.push({"title": tab['title'].split("YouTube - ")[1], "url": url});
					}
				});
			});
			callback(out);
		});
	}else if(what.type == "tw.friends"){
		return Tw.get("statuses/friends", what.data, callback);
	}else if(TwPlusAPI == "chrome"){
		id=new Date().getTime();
		_twcom_callbacks[id] = callback || function(){};
		$("#twiticom").html(encodeURIComponent(JSON.stringify({id: id, data: what}))).mousedown();
	}else{
		throw("Cannot find parser for command");
	}
}
/**
 * Send browser notification to Chrome
 *
 * @param {String} Title
 * @param {String} Message
 * @param {String=} Icon URL (optional)
 */
function comnotify(title, msg, icon){
	if(SET['notifyDuration'] === undefined) SET['notifyDuration'] = 3;
	if(window.webkitNotifications){
		noti = window.webkitNotifications.createNotification(icon, title, msg);
		noti.show();
		if(SET['notifyDuration'] !== undefined && SET['notifyDuration'] > 0)
			setTimeout(function(){noti.cancel()}, SET['notifyDuration'] * 1000, noti);
		return noti;
	}else{
		unsupported();
	}
}
/**
 * Replace HTML escape string with their real representitive.
 * @param {String} Input
 * @returns {String} Unescaped string
 */
function ungt(s){
	return s.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, "'").replace(/&quote;/g, '"').replace(/&amp;/g, "&");
}
/**
 * Return selected notice
 *
 * Updated since 10 September 2010, as selecting the element with jQuery does not supply $.expando correctly
 * thus not supplying $.data and breaks replyCur. 
 *
 * @returns {jQuery} User-selected tweet
 */
function getCurrent(){
	return dentsElement[curPos];
}
/**
 * Is that tweet blocked from displaying?
 * Now updated with anti-spam mechanism.
 * @param {String} Message owner
 * @param {String} Source name (via attribute)
 * @param {String} Message body
 * @param {Boolean} Is current user following the message owner?
 * @return {Boolean} True if blocked
 */
function isBlocked(user, src, txt, following){
	keys = localStorage['blockKey'].split("||");
	blocked = false;
	keys.forEach(function(x){
		x=$.trim(x); if(x=="") return;
		if(x.match(/^user:/) && user){
			usRegex = x.replace(/^user:/, "");
			if(user.match(new RegExp(usRegex, "i"))){
				console.log("blocked! user "+user+" matched "+x);
				blocked = true;
			}
		}else if(x.match(/^src:/) && src){
			usRegex = x.replace(/^src:/, "");
			if(src.match(new RegExp(usRegex, "i"))){
				console.log("blocked! src "+user+" matched "+x);
				blocked = true;
			}
		}else if(txt){
			reg = new RegExp(x, "i");
			if(txt.match(reg)){
				console.log("blocked! "+user+" matched "+x);
				blocked = true;
			}
		}
	});
	// anti-spam
	/** @type {boolean} */ var spam = false;
	if(accInfo['twitter'] && !following && user && txt && src){
		/** @const */ var threshold = 4;
		var current = 0;
		if(src == "web") current += 1;
		if(txt.indexOf("@"+accInfo['twitter']['username']) == 0) current += 2;
		else if(txt.indexOf("@"+accInfo['twitter']['username']) != -1) current += 1;
		["iPad", "Xoom", "free", "RT", "http://", "iPhone", "Apple", "Steve Jobs", "MacBook", "iMac", "iPod Touch", "Trip", "bit.ly"].forEach(function(x){
			if(txt.match(new RegExp(x, "i"))) current += 1;
		});
		if(current > threshold){
			spam=true;
			console.log({"text": txt, "user": user, "src": src}, "spam");
		}
	}
	return blocked || spam;
}
/**
 * Scroll to the selected notice
 * @see getCurrent
 */
function refocus(){
	title = document.title.replace(/^\(([\-0-9 !]+)\) /, "")
	if(!konami){
		count = curPos+1;
		left = lastId-count;
	}else{
		count = lastId-curPos;
		left = count-1;
	}
	mentionCnt = $("#body article:gt("+curPos+")").filter(".replied").length;
	if(left){
		prefix = "("
		if(mentionCnt > 0){
			prefix += mentionCnt+"! "
		}
		prefix += left + ")"
		document.title = prefix+" "+title;
	}else
		document.title = title
	if(TwPlusAPI == "mac")
		twcom({"type": "refocus", "count": count, "mention": mentionCnt});
	$("#twcounter").html(count+"/"+lastId);
	
	if($("#body article.selected").data("id") == curPos && !twFirstLoadDone){
		return 0;
	}
	
	$("#body article.selected").removeClass("selected").blur();
	thisOne = getCurrent();
	if(thisOne)
		thisOne.addClass("selected").focus(); //focus here is the event focus
	if(SET['bgimg']){
		if(!$("#body").hasClass("withbg")){
			$("#body").addClass("withbg");
		}
		try{
			if(thisOne.data("data")['user']['profile_background_image_url'] != $("#bodyimg").data("img")){
				$("#bodyimg").css("opacity", 0);
				dd=$("<div id='bodyimg' class='bodyimgs'></div>").css({
					"top": $("header").height(), "left": 0, "position": "fixed", "z-index": -100, "width": "100%", "height": "100%",
					"background-image": "url("+thisOne.data("data")['user']['profile_background_image_url']+")",
					"background-color": "#"+thisOne.data("data")['user']['profile_background_color'],
					"background-repeat": thisOne.data("data")['user']['profile_background_tile'] ? "repeat" : "no-repeat", 
					"opacity": 0
				}).data("img", thisOne.data("data")['user']['profile_background_image_url']).appendTo("body");
				setTimeout(function(dd){dd.css("opacity", 1);}, 1, dd); // have to wait for css to be applied
				setTimeout(function(t){
					$(".bodyimgs").not(t).remove();
				}, 250, dd);
			}
		}catch(e){}
	}else{
		if($("#body").hasClass("withbg")){
			$("#body").removeClass("withbg");
		}
	}
	
	if(navigator.userAgent.indexOf("Android") != -1) return 0;
	// #thaiWitter
	if(thisOne === undefined || thisOne.length==0) return 0;
	t = thisOne.offset().top;
	b = t + thisOne.height();
	tt = $("body").scrollTop() + thisOne.height() + 30;
	bb = $("body").scrollTop() + $(window).height() - $("footer").height() - thisOne.height();
	ot = $("body").scrollTop();
	speed = 0;
	if(b>bb){
		flickering = true;
		np = b - $(window).height() +$("footer").height() + 100;
		distance = Math.abs(ot-np);
		speed = Math.max((distance/2.5)*0.01, 3);
		$('body').stop(true).animate({"scrollTop":  np}, {duration: (speed*100)+500, easing: "easeOutBack"}, function(){
			flickering = false;
		});
		//$('body').scrollTop(np);
	}else if(t < tt){
		flickering = true;
		np = t - 25 - 100;
		distance = Math.abs(ot-np);
		speed = Math.max((distance/2.5)*0.01, 3);
		$('body').stop(true).animate({"scrollTop":  np}, {duration: (speed*100)+500, easing: "easeOutBack"}, function(){
			flickering = false;
		});
		//$('body').scrollTop(np);
	}
	return speed*100;
}
/**
 * Scroll n tweet down
 * N could be positive (down) or negative (up)
 * @param {int} Amount to scroll, can be positive and negative
 * @param {boolean=} Do refocus() (default=true)
 */
function scroll(a, ref){
	curPos += a
	if(curPos < 0){
		curPos = 0;
		if(ref !== false) refocus();
	}else if(curPos > lastId-1){
		curPos = lastId-1;
		if(ref !== false) refocus();
	}else{
		if(ref !== false) refocus();
	}
}
/**
 * Send message
 * @param {String} Message to send
 */
function sendTweet(msg){
	notify("Tweeting...");
	cb = function(o){
		try{
			o = JSON.parse(o);
		}catch(e){}
		if(o == null || (!o.id && !o.error)){
			failtweet = [msg, in_reply_to]
			notify("<b>ERROR:</b> Your tweet couldn't be send.");
			return
		}
		if(o.error){
			failtweet = [msg, in_reply_to]
			notify("<b>ERROR:</b> "+o.error);
			return
		}
		failtweet = null;
		notify("<div style='color: #afa'>Success! Your tweet have been posted</div>");
		addTweet(o);
	};
	if(SET['nogeo']){
		// hey, put it out!
		geoPos = [];
	}
	reqData = {
		"status": msg,
		"irp": in_reply_to,
		"lat": geoPos[0], "long": geoPos[1]
	};
	twcom({type: "tw.update", data:reqData}, cb);
	
	in_reply_to = null;
}
/**
 * Draw and process a message
 * @private
 *
 * @param {Object} The message, as returned from Twitter API
 * @param {String} Origin ("twitter" only)
 */
function processMsg(d, kind){
	// Handle RT nicely
	if(d['retweeted_status']){
		if(dentsRendered.indexOf(d['retweeted_status']['id']) != -1) return "rendered";
		rtData = $.extend(true, {}, d); // clone it!
		d = d['retweeted_status'];
		d['rtdata'] = rtData;
	}
	// DM
	if(d['sender']){
		d['user'] = d['sender'];
	}

	d['html'] = $("<span>"+twttr.txt.autoLink(d['text'].replace(/</g, "&lt;").replace(/>/g, "&gt;"), {
		extraHtml: " target=\"blank\"",
		usernameUrlBase: "https://twitter.com/",
		listUrlBase: "https://twitter.com/"
	}).replace("\n", "<br />")+"</span>");
	if(!d['user']['profile_url']){
		if(kind == "twitter")
			d['user']['profile_url'] = "https://twitter.com/"+d['user']['screen_name'];
	}
	if(!d['url']){
		if(kind == "twitter")
			d['url'] = "https://twitter.com/"+d['user']['screen_name'] + "/status/" + d['id_str'];
	}
	if(d['in_reply_to_status_id'] && !d['in_reply_to_status_url']){
		if(kind == "twitter"){
			d['in_reply_to_status_url'] = "https://twitter.com/"+d['in_reply_to_screen_name']+"/status/"+d['in_reply_to_status_id_str']
		}
	}
	
	info = ['from '+ungt(d['source'])]
	
	time = new Date(d['created_at']);
	times = time.toLocaleTimeString();
	if(time.toLocaleDateString() != new Date().toLocaleDateString())
		times = time.getDate() + "/" + time.getMonth() + "/" + (1900 + time.getYear()) + " " + times;
	info.unshift("<time datetime='"+d['created_at']+"' pubdate><a href='"+d['url']+"'>"+times+"</a></time>");
	
	if(d['in_reply_to_status_id']){
		if($(".username:eq(0)", d['html']).html() == d['in_reply_to_screen_name']){
			$(".username:eq(0)", d['html']).addClass("noticebadge");
			$(".username:eq(0)", d['html']).data("id", d['in_reply_to_status_id_str']).click(function(e){
				if(e.ctrlKey) return true;
				theDiv = dataDiv[$(this).data("id")];
				if(!theDiv) return true;
				else scroll(theDiv.data("id") - curPos);
				return false;
			});
			$(".username:eq(0)", d['html']).attr("href", d['in_reply_to_status_url']);
		}else{
			irp = $("<span class='noticebadge'><a href='"+d['in_reply_to_status_url']+"'>» "+d['in_reply_to_screen_name']+"</a></span>");
			irp.data("id", d['in_reply_to_status_id_str']).click(function(e){
				if(e.ctrlKey) return true;
				theDiv = dataDiv[$(this).data("id")];
				if(!theDiv) return true;
				else scroll(theDiv.data("id") - curPos);
				return false;
			});
			info.push(irp);
		}
	}
	if(d['geo'])
		info.push($("<a href='#' title='Geolocation'><img src='marker.png'></a>").click(function(){
			if(navigator.userAgent.indexOf("Android") != -1){
				window.location = "http://maps.google.com/maps?q="+d['geo']['coordinates'][0]+","+d['geo']['coordinates'][1]+"&z=17";
				return false;
			}else{
				geoMap = $("<div>Loading map...</div>").css({
					"width": $(window).width() * 6/7, "height": $(window).height() * 3/4,
					"text-align": "center", "font-size": "16pt"
				});
				Shadowbox.open({
					content: geoMap,
					player: "jquery",
					title: "@"+d['user']['screen_name']+" position"
				});
				setTimeout(function(geoMap){
					geoMap.gMap({
						markers: [{latitude: d['geo']['coordinates'][0], longitude: d['geo']['coordinates'][1], html: "<span style='color:black'>"+d['user']['name']+"</span>"}],
						zoom: 17,
						latitude: d['geo']['coordinates'][0], longitude: d['geo']['coordinates'][1],
						controls: ["GMapTypeControl", "GSmallZoomControl3D"]
					});
				}, 1200, geoMap); // somehow gMaps doesn't play nicely and need window resizing, but this trick use less CPU
				return false;
			}
		}));
	lock="";
	if(d['user']['protected']) lock = "<img src='lock.png' title='Protected Tweet' alt='Protected Tweet'>";
	if(d['rtdata']) info.push("<span class='noticebadge'>&#9851 "+d['rtdata']['user']['screen_name']+"</span>");
	
	dent = $('<article><table><tr><td><a href="'+ d['user']['profile_url'] +'" target="_blank"><img src="'+d['user']['profile_image_url']+'" class="avatar" /></a></td><td class="noticetdin">'
		+ '<div>'+lock+'<span class="user" title="'+d['user']['name']+' ('+kind+')">'+d['user']['screen_name']+'</span> <span class="noticebody"></span> <span class="info"></span></div>'
		+ '</td></tr></table></article>'
	);
	$(".noticebody", dent).append(d['html']);
	$("a>.avatar", dent).click(function(e){
		if(navigator.userAgent.indexOf("Android") == -1 && !e.ctrlKey){
			window.open("?timeline=user&user="+d['user']['screen_name'], d['user']['id']+'timeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
			return false;
		}
	});

	// have to do this after the dent have been created
	if(d['in_reply_to_status_id']){
		function handleGotStatus(origt){
			if(!dataDiv[d['id_str']]) return; // we can't check this ahead since dataDiv would be populated after processMsg returned
			if(origt['error']){
				$(".username:eq(0)", dataDiv[d['id_str']]).attr("title", origt.error).css("background", "red");
			}else{
				dataDiv[d['id_str']].data("replystatus", origt);
			}
		}
		if(!dataDiv[d['in_reply_to_status_id_str']]){
			function tweetNotFound(){
				cb=function(origt){
					if(TwPlusAPI != "mac"){
						DB.transaction(function(x){
							x.executeSql("INSERT INTO notices (id, kind, data, creation) VALUES (?,?,?, ?)", [origt.id_str, kind, JSON.stringify(origt), new Date().getTime()]);
						});
					}
					handleGotStatus(origt);
				};
				if(kind == "twitter")
					twcom({type: "tw.status", data: d['in_reply_to_status_id_str']}, cb);
			}
			if(TwPlusAPI != "mac"){
				// Try look it in db first
				DB.transaction(function(x){
					x.executeSql("SELECT * FROM notices WHERE id=? AND kind=?", [d['in_reply_to_status_id_str'], kind], function(x,rs){
						rs = rs.rows;
						if(rs.length == 0){
							tweetNotFound();
						}else{
							handleGotStatus(JSON.parse(rs.item(0).data));
						}
					});
				});
			}else{
				tweetNotFound();
			}
		}else{
			dent.data("replystatus", dataDiv[d['in_reply_to_status_id_str']].data("data"));
		}
	}

	$.each(info, function(key,value){
		if(typeof value == "string"){
			$(".info", dent).append("<span>"+value+"</span>")
		}else{
			$(".info", dent).append(value)
		}
		$(".info", dent).append("<span> </span>")
	});

	/**
	 * Check whether the link should be handled on Twitica or not
	 * @param {Event}
	 * @returns {Boolean} True if the event can be processed on Twitica
	 */
	function linkCheck(e){
		if(e.ctrlKey || e.metaKey) return false;
		// check for Android, and then do not allow cross-tweet link click
		// how this is Twitica "Desktop" when it support Android?
		if(navigator.userAgent.indexOf("Android") != -1){
			if(!e.data.dent.hasClass("selected")){
				// instead, select this tweet
				e.data.dent.click(); // hack!!
				return false;
			}
		}
		return true;
	}
	$("a", dent).each(function(){
		if(this.href.match(/\.(png|jp[e]{0,1}g|gif|swf|flv)$/)){
			$(this).bind("click", function(e){
				if(linkCheck(e) == false) return true;
				player = this.href;
				if(player.indexOf(/\.(png|jp[e]{0,1}g|gif)$/) != -1) player = "img";
				else if(player.indexOf(/\.swf$/) != -1) player = "swf";
				else if(player.indexOf(/\.flv$/) != -1) player = "flv";
				else player = "iframe";
				Shadowbox.open({
					content: this.href,
					player: player,
					title: "Attachment",
					"width": $(window).width() * 6/7, "height": $(window).height() * 3/4
				});
				e.preventDefault();
			}).data("click", true);
		/*}else if(this.href.indexOf("http://yfrog.com/") == 0 || this.href.indexOf("http://twitpic.com/") == 0 || this.href.indexOf("http://www.pg.in.th/p/") == 0 || this.href.indexOf("http://twitgoo.com/") == 0 || this.href.indexOf("http://tweetphoto.com/") == 0 || this.href.indexOf("http://upic.me/") == 0){
			$(this).bind("click", {dent:dent}, function(e){
				if(linkCheck(e) == false) return false;
				Shadowbox.open({
					content: $(this).attr("title"),
					player: "iframe",
					title: "Attachment",
					"width": $(window).width() * 6/7, "height": $(window).height() * 3/4,
				});
				e.preventDefault();
			}).data("click", true);*/
		}else if(ImageLoader['getProvider'](this.href)){
			$(this).bind("click", function(e){
				if(linkCheck(e) == false) return true;
				notify("Loading image...");
				ImageLoader['viewer']['shadowbox'](this.href);
				e.preventDefault();
			}).data("click", true);
		}else{
			$(this).bind("click", {dent:dent}, linkCheck);
		}
	});
	$("a", dent).attr("target", "_blank");
	return dent;
}

/**
 * Add message to timeline
 * Use addTweet instead or write your own backend
 * @private
 *
 * @param {Object} The message, as returned from Twitter API
 * @param {Boolean} If true will scroll down if autoscroll setting is true.
 * @param {Boolean} If true will slide the tweet in, otherwise just inject it
 * @param {Boolean} If true will call comnotify if the user have been mentioned
 * @param {String} Origin ("twitter" only)
 */
function addMsg(d, doScroll, eff, notifyMention, kind){
	// DM
	if(d['sender']){
		d['user'] = d['sender'];
		d['source'] = "";
	}
	if(dentsRendered.indexOf(d['id_str']) != -1) return;
	if(!d['sender']){
		if(isBlocked(d['user']['screen_name'], ungt(d['source']), ungt(d['text']), d['user']['following'])){
			return;
		}
	}
	if(d['retweeted_status'] && isBlocked(d['retweeted_status']['user']['screen_name'])) return;
	if(!$.query.get("timeline") && TwPlusAPI != "mac"){
		DB.transaction(function(x){
			nd = $.extend(true, {}, d);
			delete nd['html'];
			try{delete nd['retweeted_status']['html'];}catch(e){}
			try{
				x.executeSql('INSERT INTO scrollback (kind, data) VALUES (?, ?)', [kind, JSON.stringify(nd)], function(x, rs){
					x.executeSql('DELETE FROM scrollback WHERE id <= ?', [rs.insertId - 21]); // garbage collection
				});
				// So in case that this tweet is gone, but new tweet that reply to this one isn't it still being cached.
				x.executeSql("INSERT INTO notices (id, kind, data, creation) VALUES (?,?,?, ?)", [nd['id_str'], kind, JSON.stringify(nd), new Date().getTime()]);
			}catch(e){console.error(e, "serialization fail"); console.log(nd);}
		});
	}
	
	if(doScroll == undefined){
		doScroll=true;
		if(d['user']['screen_name'] == accInfo[kind]['username'] && d['retweeted_status']) doScroll=false;
	}
	if(eff == undefined) eff = true;
	if(notifyMention== undefined) notifyMention = true;

	/* now onto the big job */
	dent=processMsg(d, kind);
	if(!dent){
		return console.error(d, "Cannot render it properly!");
	}
	if(typeof dent == "string") return; // error
	dentsRendered.push(d['id_str']);

	if(eff)
		dent.css("margin-left", -1*$(window).width());

	dataDiv[d['id_str']] = dent;	
	dent.appendTo("#body").addClass(kind).click(function(){
		curPos = $(this).data("id");
		refocus();
	}).focus(function(){
		$(".noticeMeta").slideUp(100, function(){$(this).remove();});
		metad = [];
		d = $(this).data("data");
		kind = $(this).data("type");
		if(dentsRendered.indexOf(d['in_reply_to_status_id_str']) == -1 && $(this).data("replystatus")){
			irp = processMsg($(this).data("replystatus"), kind);
			offset = $(this).offset();
			irpBox = $("<div class='noticeMeta'></div>").append(irp).appendTo("body");
			// since we cannot get height of element not rendered, we need to flash it
			irpBox.css({
				"position": "absolute",
				"top": offset.top - ($(this).height()/2) - irpBox.height() - 3,
				"left": offset.left
			}).hide().slideDown(250);
		}
		if(metad.length > 0){
			offset = $(this).offset();
			noticeMetad = $("<div class='noticeMeta'></div>").css({
				"position": "absolute",
				"top": offset.top + $(this).height() + 5,
				"left": offset.left
			}).appendTo("body").hide().slideDown(250);
			$.each(metad, function(indexNotUsed, theMetad){
				theMetad.appendTo(noticeMetad);
			});
		}
	}).blur(function(){
		//$(".noticeMeta").slideUp(100, function(){$(this).remove();}); // buggy, removed
	}).data("type", kind).data("data", d).data("id", lastId);
	dentsElement[lastId] = dent;
	if(eff){
		dent.hide().slideDown(1000);
		setTimeout(function(dent){
			dent.css("margin-left", 0);
		}, 1, dent);
	}
	if(doScroll && curPos == lastId-1 && SET['autoscroll']){
		curPos = lastId;
		tout=0;
		if(eff)
			tout = 1000;
		setTimeout(refocus, tout);
	}else{
		refocus();
	}
	if(!d['in_reply_to_screen_name']){
		// "@ something" broke this code
		try{
			d['in_reply_to_screen_name'] = d['text'].match(/^@([^ ]+) /)[1];
		}catch(e){}
	}
	//if(accInfo[kind] && d.in_reply_to_screen_name == accInfo[kind]['username']){
	if(accInfo[kind] && d['user']['id'] != accInfo[kind]['data']['id'] && d['text'].match(new RegExp("@"+accInfo[kind]['username']+"(?: |$)", "i"))){
		if(notifyMention && !$.query.get("timeline")){
			comnotify("@"+d['user']['screen_name'], d['text'], d['user']['profile_image_url']);
		}
		dent.addClass("replied");
	}
	lastId++;
}
/**
 * Add Twitter message
 * 
 * @param {Object} The message, as returned from Twitter API
 * @param {Boolean} If true will scroll down if autoscroll setting is true.
 * @param {Boolean} If true will slide the tweet in, otherwise just inject it
 * @param {Boolean} If true will call comnotify if the user have been mentioned
 * @see addMsg
 */
function addTweet(d, doScroll, eff, notifyMention){
	addMsg(d, doScroll, eff, notifyMention, "twitter");
}
/**
 * Set the text cursor to position
 * @param {Element} The textbox
 * @param {Integer} Position to move to
 * @todo Implement this as jQuery plugin
 */
function setCaretTo(node, pos) {
	var node = (typeof node == "string" || node instanceof String) ? document.getElementById(node) : node;
	if(!node){
		return false;
	}else if(node.createTextRange){
		var textRange = node.createTextRange();
		textRange.collapse(true);
		textRange.moveEnd(pos);
		textRange.moveStart(pos);
		textRange.select();
		return true;
	}else if(node.setSelectionRange){
		node.setSelectionRange(pos,pos);
		return true;
	}
	return false;
}
/**
 * Reply to the selected message
 */
function replyCur(){
	/** @const */ var twdata = getCurrent().data("data");
	/** @const */ var ft = $("footer textarea");
	if(getCurrent().data("type") == "twitter")
		in_reply_to = twdata['id_str'];
		
	if($.query.get("timeline") == "dm"){
		ft.val("d "+twdata['user']['screen_name']+" "+ ft.val())
			.data("mention", twdata['user']['screen_name']);
		setCaretTo(ft.get(0), ft.val().length);
		$(".user").removeClass("mentioned");
		$(".user", getCurrent()).addClass("mentioned");
		return;
	}
	
	if(ft.data("elem") && ft.data("elem").selector == getCurrent().selector
			&& ft.val() == "@"+twdata['user']['screen_name']+" "){
		// reply to all
		ppls = twdata['text'].match(/\B(@[a-z0-9_A-Z\/]+)/g);
		if(ppls && ppls.length > 0){
			ppls = ppls.filter(function(x){if(x=="@"+twdata['user']['screen_name']) return false; else return true;});
			ppls = ppls.unique();
			ft.val(ppls.join(" ")+" ");
		}
	}else{
		if(twdata['retweeted_status']){
			// reply to rt
			ft.val("@"+twdata['retweeted_status']['user']['screen_name']+" @"+twdata['user']['screen_name']+
					" "+(twdata['retweeted_status']['text'].match(/\B(@[a-z0-9_A-Z\/]+)/g) || []).join(" ")+
					ft.val())
				.data("mention", twdata['retweeted_status']['user']['screen_name']);
		}else if(ft.val().indexOf("@"+twdata['user']['screen_name']) == -1){
			ft.val("@"+twdata['user']['screen_name']+" "+ ft.val())
				.data("mention", twdata['user']['screen_name']);
		}
		ft.data("elem", getCurrent());
		ft['keyup'](); // fuck closure compiler
	}
	setCaretTo(ft.get(0), ft.val().length);
	$(".user").removeClass("mentioned");
	$(".user", getCurrent()).addClass("mentioned");
}
/**
 * Repeat/Retweet the selected message
 */
function repeatCur(){
	if($.query.get("timeline") == "dm"){
		return notify("Not applicable.");
	}
	type = getCurrent().data("type");
	if(type == "twitter"){
		if(getCurrent().data("data")['user']['protected'] && !getCurrent().data("data")['retweeted_status']){ // rt always rt-able!
			notify("Cannot retweet protected tweet!");
			return;
		}
		notify("Retweeting...");
		cb = function(d){
			try{
				d = JSON.parse(d);
			}catch(e){}
			if(d['errors']) d['error'] = d['errors'];
			if(!d['error']){
				notify("<div style='color: #afa'>Success! Retweeted</div>");
				addTweet(d);
			}else{
				notify("<b>ERROR:</b> "+d['error']);
			}
		};
		meta = {"id": getCurrent().data("data")['id_str'], "lat": geoPos[0], "long": geoPos[1]};
		twcom({type: "tw.retweet", data: meta}, cb);
	}
}

// Shhh..
/**
 * Konami code handler
 * @private
 * @this {jQuery}
 */
$.fn.konami = function(callback, code) {
	if(code == undefined) code = "38,38,40,40,37,39,37,39,66,65";
	
	return this.each(function() {
		var kkeys = [];
		$(this).keydown(function(e){
			kkeys.push( e.keyCode );
			if ( kkeys.toString().indexOf( code ) >= 0 ){
				//$(this).unbind('keydown', arguments.callee);
				callback(e);
				kkeys = [];
			}else if(code.indexOf(kkeys.toString()) != 0){
				kkeys = [];
			}
		}, true);
	});
};

var twloadtimeout;

/**
 * Load twitter timeline
 * @param {Boolean} Automatically refresh or not
 * @param {Function} Callback function after request is sent. Only applicable when periodical is false
 */
function twitterLoad(periodical, callback){
	if(periodical == undefined) periodical = true;
	twFirstLoadDone = true;
	clearTimeout(twloadtimeout);
	notify("Refreshing tweets...");
	sendSince = "&since_id=" + last_twitter_id;
	if(last_twitter_id == 0) sendSince=""; // user timeline do not like this
	loadCb=function(d){
		notify("Twitter loaded...");
		if(d['error'] || d['errors']){
			notify("Twitter error!");
			return;
		}
		if(d.length == 0) return;
		last_twitter_id = d[0].id_str;
		d = d.reverse();
		$.each(d, function(k,v){addTweet(v);});
		refocus();
		if(curPos != lastId && SET['autoscroll']){
			setTimeout(scroll, 1000, lastId - curPos);
		}
	};
	params = {user: $.query.get("user"), since_id: last_twitter_id || 0}
	if(!params.user) delete params.user;
	if(!params.since_id) delete params.since_id;
	twcom({type: "tw.refresh", data: {timeline: $.query.get("timeline")}, param: params}, loadCb);
	if(!periodical && callback) callback();
	if(periodical)
		twloadtimeout = setTimeout(twitterLoad, 60000*3);
}

var CHDfriends;
/**
 * Parse events
 * @private
 *
 * @param {Object} An object as returned from the stream
 * @since 23 April 2010
 */
function chirpParse(d){
	if(d['text']){
		last_twitter_id = d['id_str'];
		d.user.following = CHDfriends.indexOf(d['user']['id']) != -1;
		addTweet(d);
	}else if(d['friends']){
		CHDfriends = d['friends'];
		if(TwPlusAPI != "mac"){
			DB.transaction(function(x){
				x.executeSql("SELECT * FROM following", null, function(x, rs){
					rs = rs.rows;
					for(i=0; i<rs.length; i++){
						d = rs.item(i);
						if(CHDfriends.indexOf(d['id']) == -1){
							// user have unfollowed, remove target
							x.executeSql("DELTE FROM following WHERE id=?", [d['id']]);
						}
					}
				});
			});
		}
	/* Events intentionally not handled: retweet */
	}else if(d['event'] == "follow"){
		if(d['target']['id'] == accInfo['twitter']['data']['id']){
			notify("<b>"+d['source']['screen_name']+"</b> started following you.");
		}else if(TwPlusAPI != "mac" && d['source']['id'] == accInfo['twitter']['data']['id']){
			DB.transaction(function(x){
				x.executeSql("INSERT INTO following (id, name, data, kind) VALUES (?, ?, ?, ?)", [d['target']['id'], d['target']['screen_name'], JSON.stringify(d['target']), "twitter"]);
			});
		}
	}else{
		console.log(d, "CHIRP_newkind");
	}
}

/**
 * Get latest message from the datastream
 * Moved from twplus_chirp
 * @private
 * 
 * @since 30 March 3011
 * @param {String} Entire received data
 * @see twplus_chirp
 * @see chirpConnect
 */
var CHDlastInd = 0;
function chirpLastMessage(res){
	// clone of parser algorithm 2 in chirp.js
	d=res.replace(/^\s+|\s+$/, '').substring(CHDlastInd).split(/([\r\n]+|$)/);
	var buffer = "";
	d.forEach(function(me){ // for each un-parsed line
		buffer += me;
		// (this line trimmed is empty OR last character is }) AND the buffer is not blank
		if((me.replace(/^\s+|\s+$/, '') == "" || me[me.length-1] == "}") && buffer.replace(/^\s+|\s+$/, '') != ""){
			try{
				chirpParse(JSON.parse(buffer)); // then parse it
			}catch(e){
				if(me.replace(/^\s+|\s+$/, '') == ""){
					console.error(e);
					console.log(buffer, me);
				}
				return;
			}
			CHDlastInd += buffer.length;
			buffer = "";
		}
	});
}

var chirpFallback = 2.5, chirpConnected = false, chirpClearFallback;
var CHD = {};
CHD.xhr = new XMLHttpRequest();
var CHDtimeout, CHDreset, CHDresetting;
/**
 * Create connection timeout for chirp connection
 * Moved here from background page since 1.8
 * @private
 * @since version 1.8
 */
function chirpTimeout(){
	CHDtimeout = setTimeout(function(){
		notify("[+] Twitter stream Error! Will retry soon.");
		chirpFallback *= 2;
		setTimeout(chirpConnect, chirpFallback*1000);
		CHD.connected = false;
		CHD.xhr.abort();
	}, 90000);
}
/**
 * Create connection to user stream and bind event
 * Moved here from background page since 1.8
 * @private
 * @since version 1.8
 * @see chirp
 */
function chirpConnect(){
	msg = {
		method: "GET",
		action: "https://userstream.twitter.com/2/user.json?with=users"
	}
	reqBody = OAuth.formEncode(msg.parameters);
	OAuth.completeRequest(msg, Tw.consumer);
	authHeader = OAuth.getAuthorizationHeader("", msg.parameters);
	CHD.connected = false;
	CHD.xhr.open("GET", msg.action, true);
	CHD.xhr.setRequestHeader("Authorization", authHeader);
	CHD.xhr.send(reqBody);
	CHD.xhr.onreadystatechange = function(){
		if(CHD.xhr.readyState == 2){
			if(CHD.xhr.responseText.indexOf("UNAUTHORIZED") != -1){
				notify("[+] Cannot login to user stream!");
				$("#refreshbut").show();
				twitterLoad();
				CHD.xhr.abort();
			}
		}else if(CHD.xhr.readyState == 3){
			if(!CHD.connected){
				CHD.connected=true;
				CHDresetting=false;
				clearTimeout(chirpClearFallback);
				notify("[+] Connected to user stream");
				CHDlastInd = 0;
				chirpConnected = new Date().getTime();
				$("#refreshbut").hide();
				clearTimeout(CHDreset);
				CHDreset = setTimeout(function(){
					CHDresetting = true;
					CHD.xhr.abort();
					notify("Resetting user stream...");
					chirpConnect();
				}, 30*60*1000);
				chirpClearFallback = setTimeout(function(){chirpFallback = 2.5}, 5000);
			}
			clearTimeout(CHDtimeout); chirpTimeout();
			chirpLastMessage(CHD.xhr.responseText);
		}else if(CHD.xhr.readyState == 4){
			CHD.connected = false;
			if(CHDresetting) return;
			notify("[+] Twitter stream Error! Will retry in "+chirpFallback+"s");
			chirpFallback *= 2;
			setTimeout(chirpConnect, chirpFallback*1000);
		}
	};
}
/**
 * Connect to chirp
 *
 * @since 5 June 2010
 */
function chirp(){
	if($.query.get("nostream")) return twitterLoad();
	chirpConnect();
}

/**
 * Search
 * @param {Boolean} True to search up, false to search down
 */
function search(dir){
	// up; dir=true
	keyword = $("footer textarea").val().toLowerCase()
	if(keyword == "omg"){
		// <Chicken7> *Guthix's voice* No! There must be balance, so you must receive any disclipining for your unbalanced remarks!
		/* TODO: Guthix is unreliable when I pray. Saradomin is homo. Find a better god. */
		notify("Oh my Guthix !<br>You discovered this easter egg!");
	}
	if(dir){
		dirN = "above";
	}else{
		dirN = "below";
	}
	lookIn = 0;
	while(true){
		if(dir) lookIn-=1;
		else lookIn+=1;
		ele = dentsElement[curPos+lookIn];
		if(ele === undefined) break;
		if($(".user", ele).text().toLowerCase().indexOf(keyword) != -1 || $(".noticebody", ele).text().toLowerCase().indexOf(keyword) != -1){
			curPos = ele.data("id"); refocus();
			return false;
		}
	}
	notify("Sorry, no match "+dirN);
}
var geoPollerID=undefined;
/**
 * Update geolocation
 */
function geoPoller(){
	geoPollerID = geo.watchPosition(function(pos){
		lat = Math.round(pos.coords.latitude*Math.pow(10,3))/Math.pow(10,3)
		lon = Math.round(pos.coords.longitude*Math.pow(10,3))/Math.pow(10,3)
		if(accInfo['twitter']['data']['id_str'] == "73110871"){
			lat = 37.52729;
			lon = 127.043576;
		}
		if(lat && lon && lat !== 0 && lon !== 0){
			geoPos = [lat, lon];
			if((geoPos[0] != lat && geoPos[1] != lon) || $("#geoloc").html() == ""){
				mapCallback = function(res){
					if(res['results'].length == 0){
						res['results'][0] = {"formatted_address": geoPos.join(", ")};
					}
					$("#geoloc").html("<img src='marker.png' />"+res['results'][0]['formatted_address'])
						.attr("title", res['results'][0]['formatted_address']);
					$("#geoloc").click(function(){
						if(navigator.userAgent.indexOf("Android") != -1){
							window.location = "http://maps.google.com/maps?q="+lat+","+lon+"&z=17";
							return false;
						}
						geoMap = $("<div>Loading map...</div>").css({
							"width": $(window).width() * 6/7, "height": $(window).height() * 3/4,
							"text-align": "center", "font-size": "16pt"
						});
						Shadowbox.open({
							content: geoMap,
							player: "jquery",
							title: "Your current position"
						});
						setTimeout(function(geoMap){
							geoMap.gMap({
								"markers": [
									{
										"latitude": lat,
										"longitude": lon,
										"html": "<span style='color:black'>"+res['results'][0]['formatted_address']+"</span>"
									}
								],
								"zoom": 17,
								"latitude": lat, "longitude": lon,
								"controls": ["GMapTypeControl", "GSmallZoomControl3D"]
							});
						}, 1200, geoMap);
						return false;
					});
				};
				twcom({type: "geo", data: {"latlng": lat+","+lon}}, mapCallback);
			}
		}
	});
}

/**
 * Load Twitter following list
 */
function loadFollowing(){
	if(TwPlusAPI == "mac") return;
	if(new Date().getTime() - localStorage['lastFollowLoad'] < 3600*24*1000) return;
	DB.transaction(function(x){
		// sqlite docs said this is called truncate
		x.executeSql("DELETE FROM following");
	});
	function handleGotPage(out){
		DB.transaction(function(x){
			out['users'].forEach(function(d){
				x.executeSql("INSERT INTO following (id, name, data, kind) VALUES (?, ?, ?, ?)", [d['id'], d['screen_name'], JSON.stringify(d), "twitter"]);
			});
		});
		localStorage['lastFollowLoad'] = new Date().getTime();
		if(out['next_cursor_str'] && out['next_cursor_str'] != 0 && out['users'].length > 0)
		twcom({type: "tw.friends", "data": {"cursor": out['next_cursor_str']}}, handleGotPage);
	}
	twcom({type: "tw.friends", "data": {"cursor": -1}}, handleGotPage);
}

/**
 * Hightlight menu item a la Mac OS X
 * @param {string} jQuery Selector
 */
function highlightMenu(sel){
	e=$(sel).parent();
	e.css({"background": "#666"});
	setTimeout(function(){
		e.attr("style", "");
	}, 250);
}

var konami=false;

$(function(){
	if(TwPlusAPI != "mac"){
		DB = window.openDatabase("TwiticaDesktop", "1", "Twitica Desktop's old notices storage", 1024*1024);
		DB.transaction(function(x){
			x.executeSql('SELECT * FROM scrollback LIMIT 1', null, function(){}, function(){
				// so, create the db!
				x.executeSql('CREATE TABLE scrollback (id INTEGER PRIMARY KEY AUTOINCREMENT, data BLOB, kind TEXT)', null, function(){
					twitterLoad(false, chirp);
				}, function(){console.error(arguments);});
			});
			x.executeSql('DELETE FROM notices WHERE creation <= ?', [new Date().getTime() - (3600)], function(){}, function(){
				x.executeSql('CREATE TABLE notices (id BIGINT PRIMARY KEY, data BLOB, kind TEXT, creation INTEGER)');
			});
			x.executeSql('SELECT * FROM following', null, function(){}, function(){
				localStorage['lastFollowLoad'] = 0;
				x.executeSql('CREATE TABLE following (id BIGINT PRIMARY KEY, name TEXT, data BLOB, kind TEXT)');
			})
		});
	}
	if(!localStorage['blockKey']) localStorage['blockKey'] = "";
	if(!localStorage['config'])
		localStorage['config'] = '{"nogeo": true}';
	SET = JSON.parse(localStorage['config']);
	$("#dropMe,#help").hide();
	if(TwPlusAPI == "chrome" && false){
		$("#twiticom").get(0).onmouseup = function(){
			d=JSON.parse(decodeURIComponent($(this).html()));
			_twcom_callbacks[d.id](d.data);
			delete _twcom_callbacks[d.id];
		};
	}
	if(localStorage['twitterKey']){
		keys = JSON.parse(localStorage['twitterKey']);
		Tw = new Twitter(keys[0], keys[1]);
	}
	if(!Tw){
		if(TwPlusAPI == "chrome"){
			window.location = chrome.extension.getURL("twplus/options.html");
		}else if(TwPlusAPI == "mac"){
			window.location = "twplus/options.html";
		}else{
			alert("Not logged in -- backend fault!");
		}
		return;
	}
	twcom({type: "tw.info"}, function(d){
		accInfo = {"twitter": {"username": d['screen_name'], "data": d}};
		// update the page title to the beta status if detected
		titleAdd = " ";
		if($.query.get("timeline") == "replies"){
			document.title = "Mentions to @"+d['screen_name']+" | Twitica Desktop"+titleAdd;
		}else if($.query.get("timeline") == "dm"){
			document.title = "Direct Messages to @"+d['screen_name']+" | Twitica Desktop"+titleAdd;
		}else if($.query.get("timeline") == "user"){
			document.title = "@"+$.query.get("user")+" from @"+d['screen_name']+" | Twitica Desktop"+titleAdd;
		}else{
			document.title = "@"+d['screen_name']+" | Twitica Desktop"+titleAdd;
		}
		if(!SET['nogeo']) geoPoller();
		loadFollowing();
	});
	$("footer textarea").bind("keyup", function(e){
		if(e.which != 9){
			$(this).data("autocomplete", null);
			$(this).data("autocomplete_u", null);
		}
		left = 140 - this.value.length;
		$("#lencounter").html(left);
		if($(this).data("mention")){
			if(this.value.indexOf("@" + $(this).data("mention") + " ") != 0){
				$(".user", $(this).data("elem")).removeClass("mentioned");
				$(this).data("mention", "").data("elem", null);
				in_reply_to = null;
			}
		}
		if(left < 0){
			this.style.backgroundColor = "red";
		}else if(this.style.backgroundColor != "#111"){
			this.style.backgroundColor = "#111";
		}
	});
	
	if(navigator.userAgent.match("Macintosh")){
		$("#help table th").html(function(i, x){
			return x.replace("Ctrl+", "⌘");
		});
		$("footer textarea").attr("placeholder", "Press ⌘H for help.");
	}
	/**
	 * Shuffle array
	 * @see http://stackoverflow.com/questions/962802/is-it-correct-to-use-javascript-array-sort-method-for-shuffling
	 * @param {Array}
	 * @return {Array}
	 */
	function shuffle(array) {
	    var tmp, current, top = array.length;
	    if(top) while(--top) {
	        current = Math.floor(Math.random() * (top + 1));
	        tmp = array[current];
	        array[current] = array[top];
	        array[top] = tmp;
	    }
	    return array;
	}
	var tipList = shuffle([
		"This application have an easter egg!",
		"/bgimg might slow down your computer",
		"Read changelogs at #TwiticaDesktop",
		"Click a user's avatar to open their timeline",
		"Ctrl/Cmd+Click on an image link to open in tab",
		"Feature request and bug report at @manatsawin",
		"Press on <img src='marker.png' /> to view map"
	]);
	function updateTOTD(){
		tip = tipList.shift();
		tipList.push(tip);
		$("#tips").html(tip);
	}
	updateTOTD();
	setInterval(updateTOTD, 15*60*1000);
	
	function getMentioning(){
		ft = $("footer textarea");
		t = ft.get(0).selectionEnd;
		txt = $.trim(ft.val());
		pos = txt.substr(0, t) + "!!!!!!" + txt.substr((t-1)*-1);
		pos = pos.split(/([: ])/);
		thePos = -1;
		$.each(pos, function(i,e){
			if(e.indexOf("!!!!!!") != -1){
				thePos = i;
				return false;
			}
			return true;
		});
		if(thePos == -1) throw("Oh, shit");
		txt = txt.split(/([: ])/);
		if(txt[thePos].match(/^@/)) return thePos;
	}
	
	/**
	 * Event bindings
	 */
	$("#refreshbut").click(function(){
		twitterLoad();
		return false;
	});
	$("#retweetbut").click(function(){
		repeatCur();
		return false;
	});
	$("#replybut").click(function(){
		replyCur();
		return false;
	})
	$(window).keydown(function(e){
		if(e.target.type == "text" || e.target.type == "password") return;
		kmul = konami ? -1 : 1;
		if($("footer textarea").val().length == 0 || e.which == 33 || e.which == 34){
			if(e.which == 38 || e.which == 33 || e.which == 40 || e.which == 34){
				e.preventDefault();
				if(e.which == 38)
					scroll(-1 * kmul);
				else if(e.which == 33)
					scroll(-10 * kmul);
				else if(e.which == 40)
					scroll(1 * kmul);
				else
					scroll(10 * kmul);
			}else if((e.which == 35 && !konami) || (e.which == 36 && konami)){
				scroll(lastId - curPos);
				e.preventDefault();
			}else if((e.which == 36 && !konami) || (e.which == 35 && konami)){
				scroll((-1*curPos)-1);
				e.preventDefault();
			}else if(e.which == 13){
				e.preventDefault();
				firstLink = $(".noticebody a:not(.tweet-url):eq(0)", getCurrent());
				if(firstLink.length > 0){
					if(firstLink.data("click")){
						firstLink.click();
					}else{
						window.open(firstLink.attr("href"), '_blank');
					}
				}else{
					notify("No links found");
				}
			}
		}
		cmdKey = e.ctrlKey;
		if(navigator.userAgent.match("Macintosh")){
			cmdKey = e.metaKey;
		}
		if(cmdKey){ 
			if(e.which == 89){
				replyCur();
				highlightMenu("#replybut");
				e.preventDefault();
			}else if(e.which == 69){
				repeatCur();
				highlightMenu("#retweetbut");
				e.preventDefault();
			}else if(e.which == 82){
				if(!CHD.connected){
					highlightMenu("#refreshbut");
					twitterLoad();
				}
				e.preventDefault();
			}else if(e.which == 70){
				search(true);
				e.preventDefault();
			}else if(e.which == 71){
				search(false);
				e.preventDefault();
			}else if(e.which == 77){
				window.open("?timeline=replies", 'repliestimeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
				e.preventDefault();
			}else if(e.which == 72){
				$("#help").fadeToggle();
				e.preventDefault();
			}else if(e.which == 83){
				urls = $("footer textarea").val().match(/(https?:\/\/|www\.)(\S*\w+)+/g);
				urls = $.unique(urls);
				notify("Shortening URLs");
				urls.forEach(function(me){
					twcom({'type': "shorten", 'url': me}, function(res){
						ov = $("footer textarea").val();
						ov = ov.replace(res['old'], res['url']);
						$("footer textarea").val(ov);
					});
				});
				e.preventDefault();
			}else if(e.which == 75){
				bk = prompt("Keywords to block? Prefix with src: to block a client, user: to block a user. Regex OK. Split with ||", localStorage['blockKey']);
				if(!bk) return
				notify("Blocked "+bk.split("||").length+" conditions");
				localStorage['blockKey'] = bk;
			}else if(e.which == 90 && failtweet){
				in_reply_to = failtweet[1];
				$("footer textarea").val(failtweet[0]);
				e.preventDefault();
			}else if(e.which == 190){
				window.open("?timeline=dm", 'repliestimeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
				e.preventDefault();
			}
		}
		if(e.which == 9){
			var mentioning = getMentioning();
		}
		cmds = ["ytplaying", "bgimg", "nothai", "autoscroll", "nogeo", "notifyduration"].sort();
		if(TwPlusAPI != "chrome"){
			cmds.remove(cmds.indexOf("ytplaying"));
		}
		if(e.which == 13 && $("footer textarea").val().length > 0){
			txt = $("footer textarea").val();
			if($.trim(txt) == "/ytplaying"){
				e.preventDefault();
				if(TwPlusAPI != "chrome"){
					notify("Sorry, this command is only available on Chrome version");
				}else{
					twcom({type: "ytplaying"}, function(resp){
						if(resp.length  > 1) notify("This command only works with only one YouTube tab.");
						else if(resp.length == 0) notify("No YouTube open");
						else{
							$("footer textarea").val("#nowplaying " + resp[0]['title'] + " " + resp[0]['url']);
						}
					});
				}
				return;
			}else if($.trim(txt).match(/^\/notifyduration/)){
				arg = $.trim(txt).split(" ");
				if(arg.length < 2){
					notify("Usage: /notifyduration "+SET['notifyDuration']);
					return false;
				}
				SET['notifyDuration'] = parseFloat(arg[1]);
				localStorage['config'] = JSON.stringify(SET);
				notify("Notification time set to "+SET['notifyDuration']);
				$("footer textarea").val("")
				return false;
			}else if(toggleSet = $.trim(txt).match(/^\/(bgimg|nothai|autoscroll|nogeo)(?: +|$)/)){
				toggleSet  = toggleSet[1];
				SET[toggleSet] = !SET[toggleSet]
				localStorage['config'] = JSON.stringify(SET);
				setName = {
					"bgimg": "Background image",
					"nothai": "No Thai input",
					"autoscroll": "Auto scrolling",
					"nogeo": "Disable geolocation"
				}
				if(SET[toggleSet] == true) notify(setName[toggleSet]+" <strong>ON</strong>");
				else notify(setName[toggleSet]+" <strong>OFF</strong>");
				if(toggleSet == "nogeo" && SET[toggleSet]){
					navigator.geolocation.clearWatch(geoPollerID);
					$("#geoloc").fadeOut();
				}else if(toggleSet == "nogeo" && !SET[toggleSet]){
					geoPoller();
					$("#geoloc").fadeIn();
				}else if(toggleSet == "bgimg" && !SET[toggleSet]){
					$("#bodyimg").css({opacity: 0});
					setTimeout(function(){
						$("#bodyimg").remove();
						refocus();
					}, 250);
				}
				e.preventDefault();
				$("footer textarea").val("")
				return;
			}else if($.trim(txt).indexOf("/") == 0 && $.trim(txt).indexOf("//") != 0 &&
					!$.trim(txt).match(/^\/(me|action) /i)){
				notify("You mistyped a command? You only can send // in tweet.");
				e.preventDefault();
				return;
			}
			if(SET['nothai'] && txt.match(/([ก-๙]+)/)){
				notify("/nothai is ON, you can't tweet in Thai!");
				e.preventDefault();
				return;
			}
			sendTweet(txt);
			$("footer textarea").val("")
				.data("mention", null)
				.data("elem", null)
				.data("autocomplete", null)
				.data("autocomplete_u", null);
			$(".mentioned").removeClass("mentioned");
			e.preventDefault();
		}else if(e.which == 9 && $.trim($("footer textarea").val()).indexOf("/") == 0){
			e.preventDefault();
			moreTab = $("footer textarea").data("autocomplete");
			if(moreTab) kwd = moreTab.kwd;
			else kwd = $.trim($("footer textarea").val()).substr(1);
			if(moreTab && moreTab.output.length > 0){
				output = moreTab.output;
			}else{
				indMatchLength = [];
				cmds.forEach(function(v, ind){
					if(v.indexOf(kwd) == 0)
						indMatchLength.push([ind, v.match(kwd)[0].length]);
				});
				if(indMatchLength.length == 0){
					notify("No autocomplete match for commands.");
					return;
				}
				output = indMatchLength;
			}
			iUseThis = output.shift();
			// okay now we got the command
			$("footer textarea").val("/"+cmds[iUseThis[0]]+" ").data("autocomplete", {kwd: kwd, output: output});
			setCaretTo($("footer textarea").get(0), $("footer textarea").val().length);
		}else if(e.which == 9 && mentioning !== undefined && TwPlusAPI != "mac"){
			e.preventDefault();
			moreTab = $("footer textarea").data("autocomplete_u");
			txt = $.trim($("footer textarea").val()).split(/([: ])/);
			if(moreTab){
				kwd = moreTab.kwd;
				pos = moreTab.pos + 1;
			}else{
				kwd = txt[mentioning].substr(1);
				pos = 0;
			}
			DB.transaction(function(x){
				x.executeSql("SELECT name FROM following WHERE name LIKE ? ORDER BY name LIMIT ?,1", [kwd+"%", pos], function(x, rs){
					rs = rs.rows;
					if(rs.length == 0 && pos > 0) return pos=0;
					else if(rs.length == 0){return notify("No autocomplete match for user");}
					d = rs.item(0);
					txt[mentioning] = "@"+d['name']+"!!!!!!!!!!";
					// joined text
					jned = txt.join("");
					// replaced value, going to use in textarea
					rpval = jned.replace("!!!!!!!!!!", "");
					txtPos = jned.indexOf("!!!!!!!!!!")
					if(txtPos == jned.length - "!!!!!!!!!!".length){
						rpval += " ";
						txtPos += 1;
					}
					$("footer textarea").val(rpval);
					setCaretTo($("footer textarea").get(0), txtPos);
				})
			}, function(e,i){console.error(e);});
			$("footer textarea").data("autocomplete_u", {kwd: kwd, pos: pos});
		}
		$("footer textarea").get(0).focus();
	});
	$("#body").css({marginTop: $(window).height()*0.8, marginBottom: $(window).height()*0.8});
	$(window).bind("resize", function(){
		if(navigator.userAgent.indexOf("Android") == -1)
			$("#body").css({marginTop: $(window).height()*0.8, marginBottom: $(window).height()*0.8});
		refocus();
	});
	$(window).mousewheel(function(e,d){
		amt = Math.floor(d);
		if(amt<0) amt = Math.min(-1, amt);
		else amt = Math.max(1, amt);
		scroll(amt*(konami?1:-1), false);
		clearTimeout(refocus_bounce);
		refocus_bounce = setTimeout(refocus, 5);
	});
	$(window).konami(function(){
		konami = !konami;
		$("#body").css("-webkit-transition", "-webkit-transform 3s ease-in-out");
		//setTimeout(function(){$("#body").css("-webkit-transform", "rotatey("+(konami?"180":"0")+"deg)");}, 1);
		setTimeout(function(){
			$("#body").css("-webkit-transform", "rotatex("+(konami?"180":"0")+"deg)");
			if(konami){
				$("<style id='konamic'>article{-webkit-transform: rotatex(180deg);}</style>").appendTo('body');
			}else{
				$("#konamic").remove();
			}
			setTimeout(refocus, 3000);
		}, 1);
	});
	// HTML5 drop file upload
	if((new XMLHttpRequest).send && false){
		function notifyDrag(e){
			$("#dropMe").show();
			e.stopPropagation();
			e.preventDefault();
		};
		function notifyDragOut(e){
			$("#dropMe").hide();
			e.stopPropagation();
			e.preventDefault();
		}
		document.getElementById("body").addEventListener("dragover", notifyDrag, false);
		document.getElementById("body").addEventListener("dragleave", notifyDragOut, false);
		document.getElementById("body").addEventListener("drop", function(e){
			e.stopPropagation();
			e.preventDefault();
			$("#dropMe").fadeOut(1000);
			console.log(e);
			//if(e.dataTransfer.files.length == 0) return false;
			file = e.dataTransfer.files[0];
			notify("Uploading <strong>"+file.name+"</strong>");
			// todo: confirmation
			twcom({type:"echo"}, function(head){
				reqBody = {
					"key": "f34802b649652898869c2b9ea979d5bb",
					"media": file
				}
				// putting this in TwPlus would be too complex to pass the file around
				$.ajax({
					"url": "http://api.twitpic.com/2/upload.json",
					"type": "POST",
					"beforeSend": function(x){
						x.setRequestHeader("X-Auth-Service-Provider", "https://api.twitter.com/1/account/verify_credentials.json");
						x.setRequestHeader("X-Verify-Credentials-Authorization", head);
					},
					"data": reqBody,
					"error": function(x){
						console.log(x.responseText);
					},
					"success": function(d){
						console.log(d);
					}
				});
			});
		}, false);
	}
	
	if(!$.query.get("timeline") && TwPlusAPI != "mac"){
		DB.transaction(function(x){
			x.executeSql("SELECT * FROM scrollback ORDER BY id ASC", null, function(x, rs){
				rs = rs.rows;
				for(i=0; i<rs.length; i++){
					d = rs.item(i);
					obj = JSON.parse(d['data']);
					if(d['kind'] == "twitter") addTweet(obj, false, false, false);
					last_twitter_id = obj['id_str'];
				}
				scroll($("#body article").length);
				if(!$.query.get("nostream") && navigator.userAgent.indexOf("Android") == -1){ // Android runs buggy with chirp
					twitterLoad(false, chirp); // User Stream Suggestions: Connections>Churn>Delay opening a stream in case user quit quickly
				}else{
					twitterLoad();
				}
			});
		});
	}else{
		twitterLoad();
	}
	
	Shadowbox.init({
	    skipSetup: true
	});
	
	setTimeout(function(){$("header .info").slideUp()}, 60000);
});