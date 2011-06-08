/** @define {string} API for cool features */ var TwPlusAPI="";
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
/** @const */
var starIcon = "<span title='Favorited' style='color:yellow; -webkit-text-stroke: #555 1px;' class='staricon'>★ </span>";
/** @type {boolean} */
var isFocusing;
/** @type {number} */
var startTime = new Date().getTime()
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
		}else if(what.data.timeline == "favorites"){
			return Tw.get("favorites", what.param, callback);
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
	}else if(what.type == "shorten"){
		var data = {
			"login": "manatsawin",
			"apiKey": "R_fe0508be39d31d16b36c8ae014d4bfc4",
			"format": "json",
			"domain": "j.mp",
			"longUrl": what['url']
		};
		if(localStorage['bitlyKey'] && localStorage['bitlyUser']){
			data['x_login'] = localStorage['bitlyUser'];
			data['x_apiKey'] = localStorage['bitlyKey'];
		}
		$.getJSON("https://api-ssl.bit.ly/v3/shorten", data, (function(how,d){
			how({'url': d['data']['url'], 'old': what['url']});
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
	}else if(what.type == "refocus" && TwPlusAPI == "mac"){
		return twmac.refocus(what.count, what.left, what.mention);
	}else if(what.type == "tw.fav"){
		return Tw.post("favorites/create/"+what.id, null, callback);
	}else if(what.type == "tw.unfav"){
		return Tw.post("favorites/destroy/"+what.id, null, callback);
	}else if(what.type == "tw.destroy"){
		return Tw.post("statuses/destroy/"+what.id, null, callback);
	}else if(what.type == "tw.echo"){
		return callback(Tw.sign());
	}else if(TwPlusAPI == "chrome"){
		id=new Date().getTime();
		_twcom_callbacks[id] = callback || function(){};
		$("#twiticom").html(encodeURIComponent(JSON.stringify({id: id, data: what}))).mousedown();
	}else{
		throw("Cannot find parser for command "+what.type);
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
 * Updated 10 September 2010, as selecting the element with jQuery does not supply $.expando correctly
 * thus not supplying $.data and breaks replyCur. 
 *
 * Updated 17 May 2011 for Twitica 2.0
 *
 * @returns {jQuery} User-selected tweet
 */
function getCurrent(){
	return $("#body article.selected");
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
	return blocked || spam;
}
/**
 * Focus the element
 * @since 17 May 2011
 */
function focus(e){
	$("#body article.selected").removeClass("selected").blur();
	e.addClass("selected").focus();
}
/**
 * Scroll to the selected notice
 * @see getCurrent
 */
function refocus(){
	title = document.title.replace(/^\(([\-0-9 !]+)\) /, "");
	if(isFocusing) unreadCount=[0,0];
	if(getCurrent().length == 0) focus($("#body article:first"));
	var curPos = getCurrent().prevAll().length;
	var lastId = $("#body article").length;
	if(unreadCount[0] <= 0 || true){
		if(!konami){
			count = curPos+1;
			left = lastId-count;
		}else{
			count = lastId - curPos;
			left = count-1;
		}
		mentionCnt = getCurrent().nextAll(".replied").length;
	}else{
		left = unreadCount[0];
		mentionCnt = unreadCount[1];
		if(!konami){
			count = curPos+1;
		}else{
			count = lastId-curPos;
		}
	}
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
		twcom({"type": "refocus", "count": count, "left": left || 0, "mention": mentionCnt});
	$("#twcounter").html(count+"/"+lastId);
	
	/*if($("#body article.selected").data("id") == curPos && !twFirstLoadDone){
		return 0;
	}*/
	
	thisOne = getCurrent();
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
		np = b - $(window).height() + $("footer").height() + 100 + $("header").height();
		distance = Math.abs(ot-np);
		speed = Math.max((distance/2.5)*0.01, 3);
		$('body').stop(true).animate({"scrollTop":  np}, {duration: (speed*100)+500, easing: "easeOutBack"}, function(){
			flickering = false;
		});
		//$('body').scrollTop(np);
	}else if(t < tt){
		flickering = true;
		np = t - 25 - 100 - $("header").height();
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
 * @param {number} Amount to scroll, can be positive and negative
 * @param {boolean=} Do refocus() (default=true)
 */
function scroll(a, ref){
	e = getCurrent();
	while(a != 0){
		if(a < 0){
			a+=1;
			if(e.prev().length != 0)
				e=e.prev();
		}else if(a > 0){
			a-=1;
			if(e.next().length != 0)
				e=e.next();
		}
	}
	focus(e);
	if(ref !== false) refocus();
	//if(isFocusing) unreadCount=[0,0];
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
		if(["dm", "user"].indexOf($.query.get("timeline")) == -1)
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
 * Color the nick
 * @see http://xchat.sourcearchive.com/documentation/2.4.1-0.1/inbound_8c-source.html
 * @param {string} screen_name
 * @return {string} color code with hash or color name
 */
function color_of(name){
	/** @type {number} */ var sum = 0;
	/** @type {number} */ var i=0;
	/** @const */ var rcolors = [
		"#ff6666", "#ffff66", "#66ff66", "#66ffff", "#ffcc66", "#ccff66", "#66ffcc", "#66ccff"
	];
	while (name[i]){
		sum += name[i++].charCodeAt(0);
	}
	sum %= rcolors.length;
	return rcolors[sum];
}
/**
 * Draw and process a message
 * @private
 *
 * @param {Object} The message, as returned from Twitter API
 * @param {string} Origin ("twitter" only)
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
	
	if(SET['usercolor'] && false){
		$(".username", d['html']).each(function(){
			this.style.color = color_of(this.innerHTML);
		});
	}
	if(d['in_reply_to_status_id']){
		if($(".username:eq(0)", d['html']).html() == d['in_reply_to_screen_name']){
			$(".username:eq(0)", d['html']).addClass("noticebadge");
			$(".username:eq(0)", d['html']).data("id", d['in_reply_to_status_id_str']).click(function(e){
				if(e.ctrlKey) return true;
				theDiv = dataDiv[$(this).data("id")];
				if(!theDiv) return true;
				else{
					focus(theDiv);
					refocus();
				}
				return false;
			});
			$(".username:eq(0)", d['html']).attr("href", d['in_reply_to_status_url']);
		}else{
			irp = $("<span class='noticebadge irp'><a href='"+d['in_reply_to_status_url']+"'>» "+d['in_reply_to_screen_name']+"</a></span>");
			irp.data("id", d['in_reply_to_status_id_str'])
			if(SET['usercolor'] && false){
				irp.css("color", color_of(d['in_reply_to_screen_name']));
			}
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
	if(d['user']['protected']) lock += "<img src='lock.png' title='Protected Tweet' alt='Protected Tweet'> ";
	if(d['favorited']) lock += starIcon;
	if(d['rtdata']){
		rtele = $("<span class='noticebadge'>&#9851 "+d['rtdata']['user']['screen_name']+"</span>");
		if(SET['usercolor']){
			rtele.css("color", color_of(d['rtdata']['user']['screen_name']));
		}
		info.push(rtele);
	}
	
	avatarLeft = '<td class="avatarbox"><a href="'+ d['user']['profile_url'] +'" target="_blank"><img src="'+d['user']['profile_image_url']+'" class="avatar" /></a></td>';
	avatarRight = "";
	tdClass = "";
	if(SET['rightside'] && d['user']['id'] == accInfo['twitter']['data']['id']){
		avatarRight = avatarLeft.replace('class="avatar"', 'class="avatarright"');
		avatarLeft = "";
		tdClass = "leftaligned"
	}
	dent = $('<article><table><tr>'+avatarLeft+'<td class="noticetdin '+tdClass+'">'
		+ '<div><span class="tweeticon">'+lock+'</span><span class="user" title="'+d['user']['name']+'">'+d['user']['screen_name']+'</span> <span class="noticebody"></span> <span class="info"></span></div>'
		+ '</td>'+avatarRight+'</tr></table></article>'
	).data("data", d).data("id", d['id_str']);
	if(SET['usercolor'])
		$(".user", dent).css("color", color_of(d['user']['screen_name']));
	$(".noticebody", dent).append(d['html']);
	

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

	$("a", dent).attr("target", "_blank");
	return dent;
}

/** @type {Array.<number>} */
var unreadCount=[0,0];
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
	dent.appendTo("#body").addClass(kind).data("type", kind);
	dentsElement[dentsElement.length] = dent;
	if(eff){
		dent.hide().slideDown(1000);
		setTimeout(function(dent){
			dent.css("margin-left", 0);
		}, 1, dent);
	}
	if(doScroll && getCurrent().nextAll().length == 1 && SET['autoscroll']){
		focus(dent);
		tout=0;
		if(eff)
			tout = 1000;
		setTimeout(function(){
			refocus();
		}, tout);
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
		if(!isFocusing) unreadCount[1]++;
	}
	if(!isFocusing) unreadCount[0]++;
	else unreadCount = [0,0];
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
 * Show biography of a user
 * @param {Object} User object
 */
function showBio(user){
	$("header #bio").remove();
	ele = $('<div id="bio"><a href="#" class="biolink" target="_blank"><table class="userinfo"><tr><td><img src=""></td><td style="padding-left: 10px;"><div class="close"><a href="#">X</a></div><h1></h1><h2><span></span> <a href="#" target="_blank"></a></h2></td></tr></table></a><p class="bio"></p><p class="loc"></p><table class="stat"><tr><td><div></div>Tweets</td><td><div></div>Following</td><td><div></div>Followers</td><td><div></div>Listed</td><td><div><a href="#" target="_blank">&nbsp;</a></div>Klout</td></tr></table></div>').appendTo("header")
	$(".close", ele).click(function(){
		ele.slideUp(function(){ele.remove(); refocus();});
	})
	//$("#bio").css("background-color", "#"+user['profile_background_color']);
	//$("#bio").css("color", "#"+user['profile_text_color']);
	$(".userinfo img", ele).attr("src", user['profile_image_url']);
	$(".biolink", ele).attr("href", user['profile_url']);
	$("h1", ele).text(user['name']).css("color", color_of(user['screen_name']));
	$("h2 span", ele).text("@"+user['screen_name']);
	if(user['url'])
		$("h2 a", ele).text(user['url']).attr("href", user['url']);
	else
		$("h2 a", ele).remove();
	$(".bio", ele).text(user['description']);
	$(".loc", ele).text(user['location']);
	$(".stat div:eq(0)", ele).text(number_format(user['statuses_count']));
	$(".stat div:eq(1)", ele).text(number_format(user['friends_count']));
	$(".stat div:eq(2)", ele).text(number_format(user['followers_count']));
	$(".stat div:eq(3)", ele).text(number_format(user['listed_count']));
	$(".stat div:eq(4) a", ele).attr("href", "http://klout.com/profile/summary/"+user['screen_name'])
	$.getJSON("http://api.klout.com/1/klout.json?callback=?", {"key": "ghnt6x8dcgyzk47pyngnpndj", "users": user['screen_name']}, function(d){
		$(".stat div:eq(4) a", ele).text(d['users'][0]['kscore'])
	})
}

/**
 * PHP's number_format()
 * @author php.js
 * @see https://github.com/kvz/phpjs/raw/master/functions/strings/number_format.js
 */
function number_format (number, decimals, dec_point, thousands_sep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

/**
 * Set the text cursor to position
 * @param {Element} The textbox
 * @param {Integer} Position to move to
 * TODO: Implement this as jQuery plugin
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
 * Insert text at cursor
 * @param {Element} The textbox
 * @param {string} Text to insert
 * @see http://stackoverflow.com/questions/1064089/inserting-a-text-where-cursor-is-using-javascript-jquery
 * TODO: Implement this as jQuery plugin
 */
function insertAtCaret(txtarea,text) {
    var scrollPos = txtarea.scrollTop;
    var strPos = 0;
    var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ? 
        "ff" : (document.selection ? "ie" : false ) );
    if (br == "ie") { 
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart ('character', -txtarea.value.length);
        strPos = range.text.length;
    }
    else if (br == "ff") strPos = txtarea.selectionStart;
	if(!strPos) strPos = 0;
 
    var front = (txtarea.value).substring(0,strPos);  
    var back = (txtarea.value).substring(strPos,txtarea.value.length); 
    txtarea.value=front+text+back;
    strPos = strPos + text.length;
    if (br == "ie") { 
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart ('character', -txtarea.value.length);
        range.moveStart ('character', strPos);
        range.moveEnd ('character', 0);
        range.select();
    }
    else if (br == "ff") {
        txtarea.selectionStart = strPos;
        txtarea.selectionEnd = strPos;
        txtarea.focus();
    }
    txtarea.scrollTop = scrollPos;
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
		if(!ppls) return;
		ppls.unshift("@"+twdata['user']['screen_name']);
		if(ppls && ppls.length > 0){
			ppls = ppls.filter(function(x){if(x=="@"+accInfo['twitter']['username']) return false; else return true;});
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
		ft.keyup();
	}
	setCaretTo(ft.get(0), ft.val().length);
	$(".user").removeClass("mentioned");
	$(".user", getCurrent()).addClass("mentioned");
}
var repeatTime = 0;
var tweetId = "0";
/**
 * Repeat/Retweet the selected message
 */
function repeatCur(){
	if($.query.get("timeline") == "dm"){
		return notify("Not applicable.");
	}
	type = getCurrent().data("type");
	if(type == "twitter"){
		if((getCurrent().data("data")['user']['protected'] && !getCurrent().data("data")['retweeted_status'])){ // rt always rt-able!
			if(getCurrent().data("data")['user']['protected'])
				notify("<strong>WARN:</strong> Retweeting protected tweet")
			$("footer textarea").val("RT @"+getCurrent().data("data")['user']['screen_name']+" "+getCurrent().data("data")['text']);
			return;
		}
		targetId = getCurrent().data("data")['id_str']
		if(tweetId != targetId) repeatTime = 0;
		if(SET['doubletaprt'] && repeatTime < new Date().getTime() - 1000){
			notify("Press again to retweet");
			repeatTime = new Date().getTime();
			tweetId = targetId;
		}else{
			notify("Retweeting...");
			cb = function(d){
				try{
					d = JSON.parse(d);
				}catch(e){}
				if(d['errors']) d['error'] = d['errors'];
				if(d['error'].indexOf("sharing is not permissable for this status") == 0) d['error'] = "Did you already retweeted this? Are you retweeting your tweet?";
				if(!d['error']){
					notify("<div style='color: #afa'>Success! Retweeted</div>");
					addTweet(d, true);
				}else{
					notify("<strong>ERROR:</strong> "+d['error']);
				}
			};
			meta = {"id": targetId, "lat": geoPos[0], "long": geoPos[1]};
			twcom({type: "tw.retweet", data: meta}, cb);
		}
	}
}
/**
 * Quote the selected message
 */
function quoteCur(){
	if($.query.get("timeline") == "dm"){
		return notify("Not applicable.");
	}
	type = getCurrent().data("type");
	if(type == "twitter"){
		if(getCurrent().data("data")['user']['protected'])
			notify("<strong>WARN:</strong> Retweeting protected tweet")
		$("footer textarea").val("RT @"+getCurrent().data("data")['user']['screen_name']+" "+getCurrent().data("data")['text']);
	}
}
/**
 * Favorite current tweet
 */
function favCur(){
	if($.query.get("timeline") == "dm"){
		return notify("Not applicable.");
	}
	cur = getCurrent();
	data = cur.data("data");
	function updateDB(d){
		// add/remove star
		if(d['favorited']){
			$(".staricon", cur).remove();
			$(".tweeticon",  cur).append(starIcon);
			notify("Favorited");
		}else{
			$(".staricon", cur).remove();
			notify("Unfavorited");
		}
		DB.transaction(function(x){
			// scrollback is not possible to update
			x.executeSql("UPDATE notices SET data=? WHERE id=?", [JSON.stringify(d), d['id_str']]);
		});
		cur.data("data", d);
	}
	if(data['favorited']){
		notify("Unfavoriting...");
		twcom({type: "tw.unfav", id: data['id_str']}, updateDB);
	}else{
		notify("Favoriting...");
		twcom({type: "tw.fav", id: data['id_str']}, updateDB);
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
		if($.query.get("timeline") == "user"){
			showBio(d[d.length-1].user);
		}
		if(getCurrent().nextAll().length > 0 && SET['autoscroll']){
			setTimeout(focus, 1000, $("#body article:last"))
		}
	};
	params = {user: $.query.get("user"), since_id: last_twitter_id || "0"}
	if(!params.user) delete params.user;
	if(params.since_id === "0") delete params.since_id;
	if(params.user) params['include_rts'] = true;
	twcom({type: "tw.refresh", data: {timeline: $.query.get("timeline")}, param: params}, loadCb);
	if(!periodical && callback) callback();
	if(periodical)
		twloadtimeout = setTimeout(twitterLoad, 60000*3);
}
window['loadTestData'] = function(url){
	notify("Loading test data...")
	$.getJSON("http://t.whsgroup.ath.cx/"+url, function(d){
		t = new Date().getTime();
		notify("Test data loaded!");
		d = d.reverse();
		$.each(d, function(k,v){addTweet(v);});
		refocus();
		if(getCurrent().nextAll().length > 0 && SET['autoscroll']){
			setTimeout(focus, 1000, $("#body article:last"));
		}
		console.log(new Date().getTime() - t, "loadtime");
		notify("Parsed in "+(new Date().getTime() - t).toString())
	})
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
		if(CHDfriends)
			d['user']['following'] = CHDfriends.indexOf(d['user']['id']) != -1;
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
	}else if(d['delete']){
		if(dataDiv[d['delete']['status']['id_str']] === undefined) return;
		dataDiv[d['delete']['status']['id_str']].slideUp(function(){
			$(this).remove();
			delete dataDiv[d['delete']['status']['id_str']];
		});
		focus(getCurrent().prev());
		refocus();
	}else if(d['direct_message']){
		if(d['direct_message']['sender']['id'] == accInfo['twitter']['data']['id']) return;
		comnotify("DM from "+d['direct_message']['sender_screen_name'], d['direct_message']['text']+" (press Ctrl/Cmd+. to view/reply)", d['direct_message']['sender']['profile_image_url']);
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
					CHD.connected=  false;
					CHD.xhr.abort();
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
		notify("Twitter stream Error! Will retry soon.");
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
	if($.query.get("timeline") == "sample"){
		msg['action'] = "http://stream.twitter.com/1/statuses/sample.json"
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
				notify("Cannot login to user stream!");
				$("#refreshbut").parent().show();
				twitterLoad();
				CHD.xhr.abort();
			}
		}else if(CHD.xhr.readyState == 3){
			if(!CHD.connected){
				CHD.connected=true;
				CHDresetting=false;
				clearTimeout(chirpClearFallback);
				notify("Connected to user stream");
				CHDlastInd = 0;
				chirpConnected = new Date().getTime();
				$("#refreshbut").parent().hide();
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
			clearTimeout(chirpClearFallback);
			CHD.connected = false;
			if(CHDresetting) return;
			notify("Twitter stream Error! Will retry in "+chirpFallback+"s");
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
	ele = getCurrent();
	lastEle = ele.data("id");
	count = 0;
	maxCount = ele.prevAll().length;
	while(count <= maxCount){
		count += 1;
		if(dir){
			ele = ele.prev();
		}else{
			ele = ele.next();
		}
		if(ele.data("id") == lastEle) break;
		lastEle = ele.data("idterm");
		if($(".user", ele).text().toLowerCase().indexOf(keyword) != -1 || $(".noticebody", ele).text().toLowerCase().indexOf(keyword) != -1){
			focus(ele);
			refocus();
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
	if(!localStorage['bitlyKey'])
		localStorage['bitlyKey'] = "R_fe0508be39d31d16b36c8ae014d4bfc4"
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
		}else if(TwPlusAPI == "mac" || TwPlusAPI == "appengine"){
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
		}else if($.query.get("timeline") == "favorites"){
			document.title = "Favorites of @"+d['screen_name']+" | Twitica Desktop"+titleAdd;
		}else{
			document.title = "@"+d['screen_name']+" | Twitica Desktop"+titleAdd;
		}
		if(!SET['nogeo']) geoPoller();
		loadFollowing();
	});
	$("footer textarea").bind("keyup", function(e){
		if(e.which != 9 && e.which != 16){
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
			return x.replace("Ctrl+Shift+", "⇧⌘").replace("Ctrl+", "⌘");
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
		"This application have easter eggs!",
		"/bgimg might slow down your computer",
		"Read changelogs at #TwiticaDesktop",
		"Click user's avatar to open their timeline",
		"Ctrl/Cmd+Click on image link to open in tab",
		"Feature request and bug report at @manatsawin",
		"Press on <img src='marker.png' /> to view map",
		"Press Ctrl/Cmd+y two times to reply to all",
		"Help improve Twitica Desktop by using /report your comment"
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
	$(window).focus(function(){isFocusing=true;});
	$(window).blur(function(){isFocusing=false;});
	$(window).keydown(function(e){
		isFocusing = true;
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
				focus($("#body article:last"));
				refocus();
				e.preventDefault();
			}else if((e.which == 36 && !konami) || (e.which == 35 && konami)){
				focus($("#body article:first"));
				refocus();
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
			}else if(e.which == 46){
				var yourTweet = getCurrent().data("data")['user']['id'] == accInfo['twitter']['data']['id'];
				var yourRT = !!getCurrent().data("data")['rtdata'] && getCurrent().data("data")['rtdata']['user']['id'] == accInfo['twitter']['data']['id'];
				if(!yourTweet && !yourRT){
					return notify("Cannot delete this tweet");
				}
				var d = getCurrent().data("data");
				var id = d['id_str'];
				if(d['rtdata']){
					id = d['rtdata']['id_str'];
				}
				twcom({"type": "tw.destroy", "id": id}, function(d){
					if(d['error']) notify(d['error']);
					else notify("Tweet deleted.")
				})
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
			}else if(e.which == 70 && !e.shiftKey){
				search(true);
				e.preventDefault();
			}else if(e.which == 71){
				search(false);
				e.preventDefault();
			}else if(e.which == 77){
				window.open("?timeline=replies", 'repliestimeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
				e.preventDefault();
			}else if(e.which == 72){
				if($("#help").css("top") == "-100%"){
					$("#help").show()
					setTimeout(function(){
						$("#help").css("top", "5%")
					}, 50);
				}else{
					$("#help").css("top", "-100%");
					setTimeout(function(){
						$("#help").hide();
					}, 750);
				}
				e.preventDefault();
			}else if(e.which == 83){
				urls = twttr.txt.extractUrls($("footer textarea").val());
				urls = $.unique(urls);
				if(urls.length == 0){
					notify("No URL to shorten");
					e.preventDefault();
					return false;
				}
				notify("Shortening URLs");
				$.each(urls, function(k, url){
					if(!url) return;
					if(url.match(/^http:\/\/j\.mp\//)) return;
					twcom({'type': "shorten", 'url': url}, function(res){
						ov = $("footer textarea").val();
						ov = ov.replace(url, res['url']);
						$("footer textarea").val(ov);
					});
				})
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
				window.open("?timeline=dm", 'dmtimeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
				e.preventDefault();
			}else if(e.which == 70 && e.shiftKey){
				window.open("?timeline=favorites", 'favtimeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
				e.preventDefault();
			}else if(e.which == 66){
				favCur();
				e.preventDefault();
			}else if(e.which == 79){
				quoteCur();
				e.preventDefault();
			}
		}
		if(e.which == 9){
			var mentioning = getMentioning();
		}
		cmds = ["ytplaying", "bgimg", "nothai", "autoscroll", "nogeo", "notifyduration", "rightside", "usercolor", "report", "doubletaprt"].sort();
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
			}else if($.trim(txt).match(/^\/report/)){
				arg = $.trim(txt).split(" ").slice(1).join(" ");
				$.getJSON("manifest.json", function(out){
					data = {
						'settings': SET,
						'user': accInfo['twitter']['username'],
						'startTime': startTime,
						'time': new Date().getTime(),
						'uptime': new Date().getTime() - startTime,
						'tweets': $("#body article").length,
						'arg': arg,
						'version': out['version'],
						'api': TwPlusAPI,
						'useragent': navigator.userAgent
					}
					console.log(data, "/report");
					data = JSON.stringify(data);
					sig = hex_sha1(data);
					notify("Sending report...");
					$.getJSON("http://t.whsgroup.ath.cx/twreg.php?callback=?", {"data": data, "signature": sig}, function(d){
						notify(d['out']);
					})
					$("footer textarea").val("");
				})
				e.preventDefault();
				return;
			}else if(toggleSet = $.trim(txt).match(/^\/(bgimg|nothai|autoscroll|nogeo|rightside|usercolor|doubletaprt)(?: +|$)/)){
				toggleSet  = toggleSet[1];
				SET[toggleSet] = !SET[toggleSet]
				localStorage['config'] = JSON.stringify(SET);
				setName = {
					"bgimg": "Background image",
					"nothai": "No Thai input",
					"autoscroll": "Auto scrolling",
					"nogeo": "Disable geolocation",
					"rightside": "Own avatar at right",
					"usercolor": "Colored nick",
					"doubletaprt": "Double tap to RT"
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
				if(e.shiftKey){
					pos = moreTab.pos - 1;
					if(pos<0){
						notify("This is the first result");
						pos=0;
					}
				}else
					pos = moreTab.pos + 1;
			}else{
				kwd = txt[mentioning].substr(1);
				pos = 0;
			}
			DB.transaction(function(x){
				x.executeSql("SELECT name FROM following WHERE name LIKE ? ORDER BY name LIMIT ?,1", [kwd+"%", pos], function(x, rs){
					rs = rs.rows;
					if(rs.length == 0 && pos > 0){
						pos=0;
						$("footer textarea").data("autocomplete_u", {kwd: kwd, pos: pos});
						return;
					}
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
	
	/**
	 * Check whether the link should be handled on Twitica or not
	 * @param {Event}
	 * @returns {Boolean} True if the event can be processed on Twitica
	 */
	function linkCheck(e){
		if(e.ctrlKey || e.metaKey) return false;
		return true;
	}
	
	// Delegations
	$("#body").delegate("a>.avatar,a>.avatarright", "click", function(e){
		d = $(this).closest("article").data("data");
		if(!d) return true;
		window.open("?timeline=user&user="+d['user']['screen_name'], d['user']['screen_name']+'timeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
		e.preventDefault();
		return false;
	}).delegate("article .irp", "click", function(e){
		if(e.ctrlKey) return true;
		theDiv = dataDiv[$(this).data("id")];
		if(!theDiv) return true;
		else{
			focus(theDiv);
			refocus();
		}
		return false;
	}).delegate("article a", "click", function(e){
		if(linkCheck(e) == false) return true;
		if(this.href.match(/\.(png|jp[e]{0,1}g|gif|swf|flv)$/i)){
			player = this.href;
			if(player.indexOf(/\.(png|jp[e]{0,1}g|gif)$/i) != -1) player = "img";
			else if(player.indexOf(/\.swf$/i) != -1) player = "swf";
			else if(player.indexOf(/\.flv$/i) != -1) player = "flv";
			else player = "iframe";
			Shadowbox.open({
				content: this.href,
				player: player,
				title: "Attachment",
				"width": $(window).width() * 6/7, "height": $(window).height() * 3/4
			});
			e.preventDefault();
		}else if(ImageLoader['getProvider'](this.href)){
			if(linkCheck(e) == false) return true;
			notify("Loading image...");
			ImageLoader['viewer']['shadowbox'](this.href);
			e.preventDefault();
		}
	}).delegate("article", "click", function(e){
		focus($(this))
		refocus();
	}).delegate("article", "focus", function(e){
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
	}).delegate("article .noticebody a.username", "click", function(e){
		if(e.ctrlKey) return true;
		window.open("?timeline=user&user="+$(this).data("screen-name"), $(this).data("screen-name")+'timeline', "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width="+$(window).width()+",height="+$(window).height());
		e.preventDefault();
	});
	
	
	// HTML5 drop file upload
	if((new XMLHttpRequest).send){
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
			//if(e.dataTransfer.files.length == 0) return false;
			file = e.dataTransfer.files[0];
			notify("Uploading <strong>"+file.name+"</strong>");
			// todo: confirmation
			twcom({type: "tw.echo"}, function(head){
				var data = new FormData();
				data.append("key", "f34802b649652898869c2b9ea979d5bb");
				data.append("media", file);
				var req = new XMLHttpRequest();
				req.open("POST", "http://api.twitpic.com/2/upload.json", true);
				req.setRequestHeader("X-Auth-Service-Provider", "https://api.twitter.com/1/account/verify_credentials.json");
				req.setRequestHeader("X-Verify-Credentials-Authorization", head);
				req.onreadystatechange = function(){
					if (req.readyState == 4) {
						d = JSON.parse(req.responseText);
						if(d['errors']){
							return notify("<strong>ERROR:</strong> "+d['errors']['message']);
						}else{
							insertAtCaret($("footer textarea").get(0), d['url'])
						}
					}
				}
				req.send(data);
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
				unreadCount = [0,0];
				scroll($("#body article").length);
				if(!$.query.get("nostream") && navigator.userAgent.indexOf("Android") == -1){ // Android runs buggy with chirp
					twitterLoad(false, chirp); // User Stream Suggestions: Connections>Churn>Delay opening a stream in case user quit quickly
				}else{
					twitterLoad();
				}
			});
		});
	}else if($.query.get("timeline") == "sample"){
		chirp();
	}else{
		twitterLoad();
	}
	
	Shadowbox.init({
	    skipSetup: true
	});
	
	setTimeout(function(){$("header .info").slideUp()}, 60000);
});
