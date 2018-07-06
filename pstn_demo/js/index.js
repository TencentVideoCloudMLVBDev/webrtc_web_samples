/*
    写在前面：
    为了保持在功能演示方面的简洁， demo不会做任何合法性校验
*/

// 本demo用到的唯一一个CGI，获取usersig （什么是usersig? 请看 https://sxb.qcloud.com/webrtcapi/ )
// 如果您不了解非对称加密，可以这样简单理解：
// 你有公钥 和 私钥 两把钥匙，腾讯云有一把钥匙（公玥）
// 你把数据丢盒子里，并且用私钥上锁，然后把上了锁的盒子给到腾讯云
// 腾讯云可以用公钥这把钥匙来解开这把锁，拿到里面的数据。
// 所以你需要的是
// 去控制台把私钥下载下来，用TLS工具算一个签名（usersig)

//不要把您的sdkappid填进来就用这个cgi去测，测试demo的cgi没有您的私钥，臣妾做不到啊
var FetchSigCgi = 'https://sxb.qcloud.com/sxb_dev/?svc=account&cmd=authPrivMap';
var sdkappid,
    accountType = 14418, // accounttype 还是在文档中会找到
    userSig,
    username;


function onKickout() {
    alert("on kick out!");
}

function onRelayTimeout(msg) {
    alert("onRelayTimeout!" + (msg ? JSON.stringify(msg) : ""));
}

function createVideoElement( id, isLocal ){
    var videoDiv=document.createElement("div");
    videoDiv.innerHTML = '<video id="'+id+'" autoplay '+ (isLocal ? 'muted':'') +' playsinline ></video>';
    document.querySelector("#remote-video-wrap").appendChild(videoDiv);

    return document.getElementById(id);
}

function onLocalStreamAdd(info) {
    if (info.stream && info.stream.active === true)
    {
        var id = "local";
        var video = document.getElementById(id);
        if(!video){
            createVideoElement(id, true);
        }
        var video = document.getElementById(id)
        video.srcObject = info.stream;
        video.muted = true
        video.autoplay = true
        video.playsinline = true

    }
}


function onRemoteStreamUpdate( info ) {
    console.debug( info )
    if (info.stream && info.stream.active === true)
    {
        var id = info.videoId;
        var video = document.getElementById(id);
        if(!video){
            video = createVideoElement(id);
        }
        video.srcObject = info.stream;
    } else{
        console.log('欢迎用户'+ info.userId+ '加入房间');
    }
}


function onRemoteStreamRemove( info ) {
    console.log( info.userId+ ' 断开了连接');
    var videoNode = document.getElementById( info.videoId );
    if( videoNode ){
        videoNode.srcObject = null;
        document.getElementById(info.videoId).parentElement.removeChild(videoNode);
    }
}

function onWebSocketClose() {
    ;
}
// {"code":0,"message":"请求成功","userID":"userid_web_1530589548965","roomID":"63604","roomInfo":"roomname_web_1530589548965","privateMapKey":"eJxNj09vgkAQxb9Kw5WmLq5LF5Me1j9BUgVRSIULAXbFrSgUWKBt*t0LFpPOYQ6-mffezLfkrPdPYZ5zGoRVAAsqTSUgPf7hOM7EtQqqz5z9w5yya8WPnBUdFCUrOm3DokBBECCsoQnWVDTslvQc3Ny7VWUCgAJUFSvDkLU5L1gQHqubFVTBPaLkSQc2S3du2HO6E9EXhws-Pokt1fK61hY68Ey-FdipMwO8Wf6rVliylhiJ*7x0I3s1sxB*r2TwMdb3wjfR6DSLZK6vRj5oN3pdwHWavQxhFb-07w3nqxgPvH8tEsduRAjx6MFM40t6PkCaeiluTWfTmE6CTMeeWI6nuHArhE2IvNpFVkOMTkNGTd-JPahmRcmzqzR9kMZAQcoYgr6kn1*vHnTS"}
function initRTC(opts){
    // 初始化
    window.RTC = new WebRTCAPI({
        "useCloud":0,
        "userId":  $("#userId").val(),
        "userSig":  $("#userSig").val(),
        "sdkAppId": 1400106681,
        "accountType": opts.accountType,
        "video":false //这里表示不采集摄像头
    },function(){
        var param = {
            roomid : $("#roomid").val(),
            privateMapKey: opts.privateMapKey,
            role : "user",
            pstnBizType: 1000,
        };
        RTC.createRoom( param );
    },function( error ){
        console.error("init error", error)
    });

    // 远端流新增/更新
    RTC.on("onRemoteStreamUpdate",onRemoteStreamUpdate)
    // 本地流新增
    RTC.on("onLocalStreamAdd",onLocalStreamAdd)
    // 远端流断开
    RTC.on("onRemoteStreamRemove",onRemoteStreamRemove)
    // 重复登录被T
    RTC.on("onKickout",onKickout)
    // 服务器超时
    RTC.on("onRelayTimeout",onRelayTimeout)
    // just for debugging
    // RTC.on("*",function(e){
    //     console.debug(e)
    // });
}
$("#userId").val("video_"+ parseInt(Math.random()*100000000));

function push(){
    //推流
    login( false );
}
function enter(){
    initRTC({
        "privateMapKey": null,
        "accountType": null,
    });
}

function audience(){
    //不推流
    login( true );
}


Bom = {
	/**
	 * @description 读取location.search
	 *
	 * @param {String} n 名称
	 * @return {String} search值
	 * @example
	 * 		$.bom.query('mod');
	 */
	query:function(n){ 
		var m = window.location.search.match(new RegExp( "(\\?|&)"+n+"=([^&]*)(&|$)"));   
		return !m ? "":decodeURIComponent(m[2]);  
	},
	getHash:function(n){
		var m = window.location.hash.match(new RegExp( "(#|&)"+n+"=([^&]*)(&|$)"));
		return !m ? "":decodeURIComponent(m[2]);  
	}
};