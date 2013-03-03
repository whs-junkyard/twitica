/**
 * @license The imageloader.js library is licensed under GNU Lesser General Public License v3 or later
 */
(function(){
/**
 * TwitPic Image Loader
 * Example: ldr = new TwitPicLoader("http://twitpic.com/asdf123");
 * @param {string} URL of the TwitPic page. Eg. http://twitpic.com/asdf123
 * @constructor
 */
TwitPicLoader = function(url){
	this.url = url.replace(/^http:/, "https:");
};
/**
 * Get the large image URL from TwitPic
 * Note that TwitPic API doesn't offer JSONP
 * @param {Function} Callback function. Will be called with first argument is the image's URL and second argument is the description
 */
TwitPicLoader.prototype.getURL = function(cb){
	return $.get(this.url+"/full", function(r){
		var d = r.match(/<img src="(.*?)" alt="(.*?)">/);
		cb(d[1], d[2]);
	})
};
/**
 * Plixi Image Loader
 * Example: ldr = new PlixiLoader("https://plixi.com/p/asdf");
 * @param {string} URL of the Plixi page. Eg. https://plixi.com/p/asdf
 * @constructor
 */
PlixiLoader = function(url){
	this.url = url.replace(/^https:/, "http:");
};
/**
 * Get the image URL from Plixi API
 * @param {Function} Callback function. Will be called with first argument is the image's URL and second argument is the description
 */
PlixiLoader.prototype.getURL = function(cb){
	$.getJSON("https://api.plixi.com/api/tpapi.svc/jsonp/metadatafromurl?callback=?", {"url": this.url}, function(d){
		cb(d['BigImageUrl'], d['Message']);
	});
};
/**
 * OEmbed Image Loader
 * @param {string} Image URL
 * @param {string} OEmbed endpoint for that URL
 * @constructor
 */
OEmbedLoader = function(url, endpoint){
	this.url = url;
	this.endpoint = endpoint;
}
/**
 * Get the image URL from OEmbed endpoint
 * @param {Function} Callback function. Will be called with first argument is the image's URL and second argument is the description
 */
OEmbedLoader.prototype.getURL = function(cb){
	var join = this.endpoint.indexOf("?") == -1 ? "?" : "&"
	$.getJSON(this.endpoint+join+"callback=?", {"url": this.url}, function(d){
		cb(d['url'], d['title']);
	})
}
/**
 * picplz Image Loader
 * Example: ldr = new PicPlzLoader("https://picplz.com/Jn22");
 * @param {string} URL of the PicPlz page.
 * @constructor
 */
PicPlzLoader = function(url){
	if(url.match(/http[s]{0,1}:\/\/picplz\.com\/user\/[^\/]+\/pic\/([^\/]+)/)){
		this.urlType = "longurl";
	}else{
		this.urlType = "shorturl";
	}
	this.code = url.match(/\/([^\/]+)[\/]{0,1}$/)[1];
};
/**
 * Get the image URL from Plixi API
 * @param {Function} Callback function. Will be called with first argument is the image's URL and second argument is the description
 */
PicPlzLoader.prototype.getURL = function(cb){
	var data = {};
	data[this.urlType+"_id"] = this.code;
	$.getJSON("https://api.picplz.com/api/v2/pic.json?callback=?", data, function(d){
		var pic = d['value']['pics'][0];
		cb(pic['pic_files']['640r']['img_url'], pic['caption']);
	});
};
/**
 * twitgoo Image Loader
 * Note: No HTTPS support.
 * Example: ldr = new TwitGooLoader("http://twitgoo.com/a05dh");
 * @param {string} URL of the twitgoo page.
 * @constructor
 */
TwitGooLoader = function(url){
	this.code = url.match(/^http:\/\/twitgoo\.com\/([0-9a-zA-Z]+)/)[1];
};
/**
 * Get the image URL from twitgoo API
 * @param {Function} Callback function. Will be called with first argument is the image's URL and second argument is the description
 */
TwitGooLoader.prototype.getURL = function(cb){
	$.getJSON("http://twitgoo.com/api/message/info/"+this.code+"?format=json&callback=?", function(d){
		cb(d['imageurl'], d['text']);
	});
};

/* Main class */
window['ImageLoader'] = {
	/**
	 * Get the image provider class from specified URL
	 * @todo Make it extensible
	 * @param {String} The image URL
	 */
	"getProvider": function(url){
		if(url.match(/^http[s]{0,1}:\/\/twitpic\.com\/([0-9a-zA-Z]+)/)){
			// oohEmbed doesn't offer title
			return new TwitPicLoader(url);
		}else if(url.match(/^http[s]{0,1}:\/\/plixi\.com\/p\/([0-9]+)/)||
				url.match(/^http[s]{0,1}:\/\/lockerz\.com\/s\/([0-9]+)/)||
				url.match(/^http[s]{0,1}:\/\/tweetphoto\.com\/([0-9]+)/)){
			return new PlixiLoader(url);
		}else if(url.match(/^http[s]{0,1}:\/\/upic\.me\/(show\/([0-9]+)|e[^\/]+)/)){
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://upic.me/api/oembed");
		}else if(url.match(/^http[s]{0,1}:\/\/instagr\.am\/p\/([^\/]+)/)){
			return new OEmbedLoader(url, "https://api.instagram.com/oembed");
		}else if(url.match(/^http[s]{0,1}:\/\/picplz\.com\/([^\/]+)/) ||
				url.match(/http[s]{0,1}:\/\/picplz\.com\/user\/[^\/]+\/pic\/([^\/]+)/)){
			return new PicPlzLoader(url);
		}else if(url.match(/^http[s]{0,1}:\/\/(www\.|)flickr\.com\/photos\/(.*?)\/([0-9]+)/) ||
		url.match(/http[s]{0,1}:\/\/flic\.kr\/([a-zA-Z0-9])/)){
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://api.embed.ly/1/oembed");
		}else if(url.match(/^http[s]{0,1}:\/\/(www\.|)xkcd\.com\/([0-9]+)/)){
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://oohembed.com/oohembed/");
		}else if(url.match(/^http:\/\/twitgoo\.com\/([0-9a-zA-Z]+)/)){
			// no HTTPS support
			return new TwitGooLoader(url);
		}else if(url.match(/^http[s]{0,1}:\/\/imgur\.com\/gallery\/([0-9a-zA-Z])/)){
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://api.embed.ly/1/oembed");
		}else if(url.match(/^http[s]{0,1}:\/\/img\.ly\/([0-9a-zA-Z])/)){
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://api.embed.ly/1/oembed");
		}else if(url.match(/^http[s]{0,1}:\/\/instagr\.am\/p\/([0-9a-zA-Z])/) ||
		url.match(/^http[s]{0,1}:\/\/instagram\.com\/p\/([0-9a-zA-Z])/)){
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://api.embed.ly/1/oembed");
		}else if(url.match(/^http[s]{0,1}:\/\/twitgoo\.com\/([0-9a-zA-Z])/)){
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://api.embed.ly/1/oembed");
		}
		/*else if(url.match(/^http[s]{0,1}:\/\/(www\.|)yfrog\.(com|ru|com.tr|it|fr|co.il|co.uk|com.pl|pl|eu|us)\/(.+)/)){
			// yfrog doesn't offer JSONP
			return new OEmbedLoader(url.replace(/^https:/, "http:"), "http://oohembed.com/oohembed/");
		}*/
	},
	"viewer": {
		/**
		 * Connect to frame and show the image
		 * @param {String} The image's URL
		 * @param {Frame}
		 */
		"frame": function(url, wnd){
			var provider = ImageLoader['getProvider'](url);
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
			var provider = ImageLoader['getProvider'](url);
			if(!provider) return false;
			provider.getURL(function(url, desc){
				Shadowbox.open({
					content: url,
					player: "img",
					title: desc
					//"width": $(window).width() * 6/7, "height": $(window).height() * 3/4,
				});
			});
			return true;
		}
	}
};
})();

if(!$) alert("jQuery is required!")