(function(){
/**
 * TwitPic Image Loader
 * Example: ldr = new TwitPicLoader("http://twitpic.com/asdf123");
 * @param {String} URL of the TwitPic page. Eg. http://twitpic.com/asdf123
 */
TwitPicLoader = function(url){
	this.url = url.replace(/^http:/, "https:");
};
/**
 * Get the large image URL from TwitPic
 * FIXME: Make it use proper API if TwitPic offers one
 * @param {Function} Callback function. Will be called with first argument is the image's URL and second argument is the description
 */
TwitPicLoader.prototype.getURL = function(cb){
	return $.get(this.url+"/full", function(r){
		d = r.match(/<img src="(.*?)" alt="(.*?)">/);
		cb(d[1], d[2]);
	})
};
/**
 * Plixi Image Loader
 * Example: ldr = new PlixiLoader("https://plixi.com/p/asdf");
 * @param {String} URL of the Plixi page. Eg. https://plixi.com/p/asdf
 */
PlixiLoader = function(url){
	this.url = url.replace(/^https:/, "http:");
};
/**
 * Get the image URL from Plixi API
 * @param {Function} Callback function. Will be called with first argument is the image's URL and second argument is the description
 */
PlixiLoader.prototype.getURL = function(cb){
	$.getJSON("https://api.plixi.com/api/tpapi.svc/jsonp/metadatafromurl?url="+this.url+"&callback=?", function(d){
		console.log(d);
		cb(d.BigImageUrl, d.Message);
	});
};

/* Main class */
window.ImageLoader = {
	/**
	 * Get the image provider class from specified URL
	 * @todo Make it extensible
	 * @param {String} The image URL
	 */
	"getProvider": function(url){
		if(url.match(/^http[s]{0,1}:\/\/twitpic\.com\/([0-9a-zA-Z]+)/)){
			return new TwitPicLoader(url);
		}
		if(url.match(/^http[s]{0,1}:\/\/plixi\.com\/p\/([0-9]+)/)||
				url.match(/^http[s]{0,1}:\/\/lockerz\.com\/s\/([0-9]+)/)){
			return new PlixiLoader(url);
		}
	},
	"viewer": {
		/**
		 * Connect to frame and show the image
		 * @param {String} The image's URL
		 * @param {Frame}
		 */
		"frame": function(url, wnd){
			provider = ImageLoader.getProvider(url);
			provider.getURL(function(url, desc){
				wnd.document.write("<style>body{text-align:center;margin:0;padding:0;}img{border:none;}</style>");
				wnd.document.write("<p style='text-align: left;'></p>");
				$("p", wnd.document).text(desc);
				wnd.document.write("<img src='"+url+"' />");
			});
		},
		/**
		 * Show the image in Shadowbox (required seperately)
		 * @param {String} The image's URL
		 * @param {Frame}
		 */
		"shadowbox": function(url){
			provider = ImageLoader.getProvider(url);
			provider.getURL(function(url, desc){
				Shadowbox.open({
					content: url,
					player: "img",
					title: desc,
					//"width": $(window).width() * 6/7, "height": $(window).height() * 3/4,
				});
			});
		}
	},
};
})();

if(!$) alert("jQuery is required!")