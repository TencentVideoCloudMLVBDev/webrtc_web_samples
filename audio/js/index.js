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


function createAudioElement( id, isLocal ){
    var audioNode=document.createElement("audio");
    audioNode.id = id;
    audioNode.autoplay = 'true';
    if( isLocal ){
        audioNode.muted = 'true';
    }
    audioNode.controls = 'true';
    document.querySelector("#remote-video-wrap").appendChild(audioNode);
    return audioNode;
}


function onLocalStreamAdd(info) {
    if (info.stream && info.stream.active === true)
    {
        var id = "local";
        var audio = document.getElementById(id);
        if(!audio){
            audio = createAudioElement(id, true);
        }
        audio.srcObject = info.stream;
    }
}


function onRemoteStreamUpdate( info ) {
    if (info.stream && info.stream.active === true)
    {
        var id = info.videoId;
        var audio = document.getElementById(id);
        if(!audio){
            audio = createAudioElement(id);
        }
        audio.srcObject = info.stream;
    } else{
        console.log('欢迎用户'+ info.userId+ '加入房间');
    }
}


function onRemoteStreamRemove( info ) {
    console.log( info.userId+ ' 断开了连接');
    var audioNode = document.getElementById( info.videoId );
    if( audioNode ){
        audioNode.srcObject = null;
        document.querySelector("#remote-video-wrap").removeChild(audioNode);
    }
}

function onWebSocketClose() {
    WebRTCAPI.quit();
}

function initRTC(opts){
    // 初始化
    window.RTC = new WebRTCAPI({
        "userId": opts.username,
        "userSig": opts.userSig,
        "privateMapKey": opts.privateMapKey,
        "sdkAppId": opts.sdkappid,
        "accountType": opts.accountType,
        "closeLocalMedia": false,
        "video": false
    },function(){
        RTC.createRoom({
            roomid : opts.roomid * 1,
            privateMapKey: opts.privateMapKey,
            role : "user"
        });
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
    RTC.on("*",function(e){
        console.debug(e)
    });
}
$("#username").val("audio_"+ parseInt(Math.random()*100000000));
function login(){
    sdkappid = $("#sdkappid").val();
    username = $("#username").val();
    //请使用英文半角/数字作为用户名
    $.ajax({
        type: "POST",
        url: FetchSigCgi,
        dataType: 'json',
        data:JSON.stringify({
            pwd: "12345678",
            appid: parseInt(sdkappid),
            roomnum:parseInt($("#roomid").val()),
            privMap:255,
            identifier : username,
            accounttype: accountType
        }),
        success: function (json) {
            if(json && json.errorCode === 0 ){
                //一会儿进入房间要用到
                userSig = json.data.userSig;
                var privateMapKey = json.data.privMapEncrypt;
                // 页面处理，显示视频流页面
                $("#video-section").show();
                $("#input-container").hide();

                initRTC({
                    "username": username,
                    "userSig": userSig,
                    "privMapEncrypt": privateMapKey,
                    "sdkappid": sdkappid,
                    "accountType": accountType,
                    "roomid": $("#roomid").val()
                });
            }else{
                console.error(json);
            }
        },
        error: function (err){
            console.error(err);
        }
    })
}

