var tw = new Twitter(), lsPoller;
function showLogout(){
	$("#twauth")['html']("<a href='#'>Logout</a>")['unbind']("click")['click'](function(){
		delete localStorage['twitterKey'];
		delete localStorage['twitterUser'];
		delete localStorage['twitterData'];
		window.location.reload();
	});
}
$(function(){
	if(localStorage['twitterUser']){
		$("#login-status")['html']("Currently logged in as <b>"+localStorage['twitterUser']+"</b>");
		showLogout();
	}else{
		$("#login-status")['html']("Not logged in.");
		tw.oauth(function(d){
			$("#twauth")['html']("<img src='http://a0.twimg.com/images/dev/buttons/sign-in-with-twitter-d.png'>")
					['unbind']("click")['click'](function(){
				$(this)['html']("");
				localStorage['_tmp_pin'] = "not loaded";
				twAuth=window.open(d['url'], "twAuth", "status=0,toolbar=0,location=0,menubar=0,directories=0,scrollbars=0,width=800,height=400");
				lsPoller = setInterval((function(data){
					if(localStorage['_tmp_pin'] != "not loaded"){
						twAuth.close();
						clearTimeout(lsPoller);
						
						$("#twauth")['html']("Exchanging token...");
						tw.oauth2(localStorage['_tmp_pin'], data, function(res){
							if(!res) return alert("Cannot authenticate to Twitter!");
							tw.get("account/verify_credentials", null, function(d){
								localStorage['twitterUser'] = d['screen_name'];
								localStorage['twitterData'] = JSON.stringify(d);
								localStorage['twitterKey'] = JSON.stringify([
									tw['consumer']['token'],
									tw['consumer']['tokenSecret']
								]);
								$("#login-status")['html']("Currently logged in as <b>"+localStorage['twitterUser']+"</b>");
								showLogout();
							});
						});
					}
				}).bind(this, d['data']), 10);
			});
		});
	}
});