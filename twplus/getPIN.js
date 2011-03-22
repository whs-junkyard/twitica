if($("#oauth_pin").html()){
	chrome.extension.sendRequest({type: "savePIN", pin: $("#oauth_pin").html()}, function(res){
		if(res===true) window.close();
	});
}