(function(){

/* prototypejs/src/lang/function.js */
function prototype_update(array, args) {
	var arrayLength = array.length, length = args.length;
	while (length--) array[arrayLength + length] = args[length];
	return array;
}
function prototype_merge(array, args) {
	slice = Array.prototype.slice;
	array = slice.call(array, 0);
	return prototype_update(array, args);
}
Function.prototype.bind = function(context) {
	//if (arguments.length < 2) return this;
	slice = Array.prototype.slice;
	var __method = this, args = slice.call(arguments, 1);
	return function() {
		var a = prototype_merge(args, arguments);
		return __method.apply(context, a);
	}
}

if($("#twiticom").length == 0){
	$("<div id='twiticom' />").appendTo("body").hide();
	$("<div id='twiticom-chirp' />").appendTo("body").hide();
	$("<div id='twiticom-chirpD' />").appendTo("body").hide();
}

$("#twiticom").get(0).onmousedown = function(){
	data = JSON.parse(decodeURIComponent($(this).html()));
	try{
		if(data.data.type == "tw.chirp")
			con_chirp();
	}catch(e){}
	chrome.extension.sendRequest(data.data, (function(id, res){
		$("#twiticom").html(encodeURIComponent(JSON.stringify({id:id, data:res}))).mouseup();
	}).bind(this, data.id));
};
chrome.extension.sendRequest({type: "logincheck"}, function(res){
	if(typeof res == "string") window.location = res;
});
var chrome__chirp;
function con_chirp(){
	chrome__chirp=chrome.extension.connect();
	if(!chrome__chirp.onMessage.hasListeners()){
		chrome__chirp.onMessage.addListener(function(res){
			if(res.type)
				$("#twiticom-chirpD").html(res.data).mouseup();
			else
				$("#twiticom-chirp").html(encodeURIComponent(res.data)).mouseup();
		});
	}
}

})();