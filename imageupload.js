(function(){
/* TwitPic Loader */
TwitPicLoader = function(url){
	this.url = url.replace(/^http:/, "https:");
};
TwitPicLoader.prototype.getURL = function(cb){
	return $.get(this.url+"/full", function(r){
		d = r.match(/<img src="(.*?)" alt="(.*?)">/);
		cb(d[1], d[2]);
	})
};
PlixiLoader = function(url){
	this.url = url.replace(/^https:/, "http:");
};
PlixiLoader.prototype.getURL = function(cb){
	$.getJSON("https://api.plixi.com/api/tpapi.svc/jsonp/metadatafromurl?url="+this.url+"&callback=?", function(d){
		console.log(d);
		cb(d.BigImageUrl, d.Message);
	});
};

/* Main class */
window.ImageUpload = {
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
		"frame": function(url, wnd){
			provider = ImageUpload.getProvider(url);
			provider.getURL(function(url, desc){
				wnd.document.write("<style>body{text-align:center;margin:0;padding:0;}img{border:none;}</style>");
				wnd.document.write("<p style='text-align: left;'></p>");
				$("p", wnd.document).text(desc);
				wnd.document.write("<img src='"+url+"' />");
			});
		},
		"shadowbox": function(url){
			provider = ImageUpload.getProvider(url);
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