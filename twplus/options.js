var tw = new Twitter(), lsPoller;
/** @define {string} API for cool features */ var TwPlusAPI="";
function showLogout(){
	$("#twauth").html("<a href='#'>Logout</a>").unbind("click").click(function(){
		delete localStorage['twitterKey'];
		delete localStorage['twitterUser'];
		delete localStorage['twitterData'];
		window.location.reload();
	});
}
$(function(){
	if(localStorage['twitterUser']){
		$("#login-status").html("Currently logged in as <b>"+localStorage['twitterUser']+"</b>");
		showLogout();
	}else{
		$("#login-status").html("Not logged in.");
		tw.oauth(function(d){
			$("#twauth").html("<img src='http://a0.twimg.com/images/dev/buttons/sign-in-with-twitter-d.png'>")
					.unbind("click").click(function(){
				$(this).html("");
				localStorage['_tmp_pin'] = "not loaded";
				if(TwPlusAPI == "chrome")
					twAuth=window.open(d['url'], "twAuth", "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width=800,height=400");
				else if(TwPlusAPI == "mac"){
					window.resizeTo(820, 600);
					$("#twauth").html("<iframe src='"+d['url']+"' style='width:800px;height: 450px; background: #C0DEED; border:none;' sandbox='allow-forms' seamless />");
					frm = $("#twauth iframe").get(0);
				}
				lsPoller = setInterval((function(data){
					if(localStorage['_tmp_pin'] == "not loaded" && TwPlusAPI == "chrome") return;
					else if((TwPlusAPI == "appengine" || TwPlusAPI == "mac") && !frm.contentWindow.document.getElementById("oauth_pin")) return;
					if(TwPlusAPI == "chrome"){
						twAuth.close();
						pin = localStorage['_tmp_pin'];
					}else if(TwPlusAPI == "mac" || TwPlusAPI == "appengine"){
						pin = $.trim(frm.contentWindow.document.getElementById("oauth_pin").innerHTML);
					}
					clearTimeout(lsPoller);
					
					$("#twauth").html("Exchanging token...");
					tw.oauth2(pin, data, function(res){
						if(!res) return alert("Cannot authenticate to Twitter!");
						tw.get("account/verify_credentials", null, function(d){
							localStorage['twitterUser'] = d['screen_name'];
							localStorage['twitterData'] = JSON.stringify(d);
							localStorage['twitterKey'] = JSON.stringify([
								tw.consumer['token'],
								tw.consumer['tokenSecret']
							]);
							$("#login-status").html("Currently logged in as <b>"+localStorage['twitterUser']+"</b>. Please reopen the application.");
							showLogout();
							if(TwPlusAPI == "mac" || TwPlusAPI == "appengine"){
								window.location = "../index.html";
							}
						});
					});
				}).bind(this, d['data']), 10);
			});
		});
	}
});