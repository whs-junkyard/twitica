var loginlogo, deleteUser, showUser, Tw=null;
/** @define {string} API for cool features */ var TwPlusAPI = "";
loginlogo = "https://si0.twimg.com/images/dev/buttons/sign-in-with-twitter-d.png";
deleteUser = function() {
	delete localStorage['twitterKey'];
	delete localStorage['twitterUser'];
	delete localStorage['twitterData'];
	return showUser(null);
};
showUser = function(user) {
	var showHelp, user;
	try{
		user = JSON.parse(localStorage['twitterData'])
	}catch(e){
		user = null;
	}
	if (user !== null) {
		var key = JSON.parse(localStorage['twitterKey']);
		Tw = new Twitter(key[0], key[1]);
		$("#loginstatus").html("Welcome <strong>" + user['screen_name'] + "</strong>");
		$("body").css("background-image", "url(" + user['profile_background_image_url'] + ")");
		$("body").css("background-color", "#" + user['profile_background_color']);
		$("body").css("background-repeat", user['profile_background_tile'] ? "repeat" : "no-repeat");
		$("<img id='avatar' />").attr("src", user['profile_image_url']).appendTo("#loginstatus");
		$("#loginaction").empty();
		showHelp = function() {
			return $("#help").html($(this).data("help"));
		};
		$("<a href='#'>Logout</a>").data("help", "Logout from the current user").appendTo("#loginaction").hover(showHelp).click(deleteUser);
		$("<a href='#'>Reload user data</a>").data("help", "Refresh the login data when you have changed your information such as username or avatar.").hover(showHelp).appendTo("#loginaction").click(function() {
			$("#loginaction").html("Updating user data...");
			return Tw.get("account/verify_credentials", null, function(d) {
				localStorage['twitterUser'] = d['screen_name'];
				localStorage['twitterData'] = JSON.stringify(d);
				localStorage['twitterKey'] = JSON.stringify([
					Tw.consumer['token'],
					Tw.consumer['tokenSecret']
				]);
				showUser();
			});
		});
		return $("<div id='help' />").appendTo("#loginaction").html("To enter Twitica Desktop, please launch it from the new tab page");
	} else {
		$("#loginstatus").html("Welcome to Twitica Desktop");
		$("#loginaction").html("Loading login token...");
		Tw = new Twitter;
		$("body").css("background-image", "");
		$("body").css("background-color", "");
		return Tw.oauth(function(d) {
			$("#loginaction").empty();
			return $("<img />").attr("src", loginlogo).appendTo("#loginaction").click(function() {
				$("#loginaction").html("");
				$("<input type='text' id='pin'	placeholder='Enter PIN and press enter' />").appendTo("#loginaction").keyup(function(e) {
					if (e.which === 13) {
						$("#loginaction").html("Exchanging token...");
						return Tw.oauth2(this.value, d.data, function(res) {
							if (!res) {
								return alert("Cannot authenticate to Twitter");
							}
							return Tw.get("account/verify_credentials", null, function(d) {
								localStorage['twitterUser'] = d['screen_name'];
								localStorage['twitterData'] = JSON.stringify(d);
								localStorage['twitterKey'] = JSON.stringify([
									Tw.consumer['token'],
									Tw.consumer['tokenSecret']
								]);
								showUser();
								window.location = "../index.html";
							});
						});
					}
				});
				return window.open(d.url, "twAuth", "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width=800,height=400");
			});
		});
	}
};
var optionList = {}
setName = {
	"bgimg": "User background image (slow)",
	"nothai": "No Thai input",
	"autoscroll": "Auto scrolling when already at bottom",
	"nogeo": "Disable geolocation",
	"rightside": "Own avatar at right",
	"usercolor": "IRC style colored nick",
	"doubletaprt": "Double tap to RT",
	"notifyDuration": "Notification hide timer",
	"bitlyUser": "Bit.ly Username",
	"bitlyKey": "Bit.ly API Key"
}
setType = {
	"bgimg": "bool",
	"nothai": "bool",
	"autoscroll": "bool",
	"nogeo": "bool",
	"rightside": "bool",
	"usercolor": "bool",
	"doubletaprt": "bool",
	"notifyDuration": "number",
	"bitlyUser": "text",
	"bitlyKey": "text"
}
function showOptions(){
	var SET;
	try{
		SET = JSON.parse(localStorage['config']);
	}catch(e){
		SET={"nogeo": true, "notifyDuration": 3};
	}
	if(!localStorage['bitlyKey'])
		localStorage['bitlyKey'] = ""
	if(!localStorage['bitlyUser'])
		localStorage['bitlyUser'] = ""
	$.each(setType, function(k,v){
		if(v == "bool"){
			widgetCode = "<input type='checkbox' "+ (SET[k] ? " checked" : "") +">";
		}else if(v=="number"){
			widgetCode = "<input type='number' value='"+SET[k]+"'>";
		}else if(v=="text"){
			widgetCode = "<input type='text' value='"+SET[k]+"'>";
		}
		desc = "/"+k;
		if(k == "bitlyKey" || k == "bitlyUser") desc="";
		line = $("<tr><th>"+setName[k]+" <small>"+desc+"</small></th><td>"+widgetCode+"</td></tr>").appendTo("#optionslist");
		if(k == "bitlyKey") $("input", line).val(localStorage['bitlyKey']);
		else if(k == "bitlyUser") $("input", line).val(localStorage['bitlyUser']);
		$("input", line).change(function(){
			if(v == "bool")
				val = $(this).attr("checked");
			else if(v == "number")
				val = parseInt($(this).val());
			else if(v == "text")
				val = $(this).val();
			if(k == "bitlyKey"){
				localStorage['bitlyKey'] = val
			}else if(k == "bitlyUser"){
				localStorage['bitlyUser'] = val
			}else{
				SET[k] = val
				localStorage['config'] = JSON.stringify(SET);
			}
		})
	})
}
$(function() {
	$("#loginstatus").html("Loading...");
	showUser();
	showOptions();
});