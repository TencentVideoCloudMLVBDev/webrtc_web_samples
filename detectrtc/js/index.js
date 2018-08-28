


var rtc = new WebRTCAPI({
    debug:{
        vconsole: true
    },
    sdkAppId: 1400037025,
    userSig:"xxx",
    accountType: 12345
});


setTimeout( function(){
    
    WebRTCAPI.fn.detectRTC({
        screenshare : false
    }, function(info){
        console.log( info )
        $("#content").html( JSON.stringify(info))
    });

},1000)