if($("#oauth_pin").html()){
	chrome.extension.sendRequest({type: "savePIN", pin: $("code").html()}, function(res){
		if(res===true) window.close();
	});
}