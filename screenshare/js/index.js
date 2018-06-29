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
    RTC.quit();
}



function initRTC(opts){
    // 初始化
    var screenSources = [];

    var checkList = ['screen','window','audio','tab']

    checkList.forEach(function(item){
        if( $("#"+item).prop("checked") )
        screenSources.push(item);
    })
    window.RTC = new WebRTCAPI({
        userId: opts.userId,
        userSig: opts.userSig,
        sdkAppId: opts.sdkappid,
        accountType: opts.accountType,
        //2个地方可以设置，初始化，和 startRTC 时
        screenSources: screenSources.join(","),
        // screen  显示器
        // window 应用窗口
        // audio 声音
        // tab chrome tab页
        closeLocalMedia: true //手动调用推流接口
    },function(){
        RTC.createRoom({
            roomid : opts.roomid * 1,
            privateMapKey: opts.privateMapKey,
            role : "user",
            pstnBizType: parseInt($("#pstnBizType").val() || 0),
            pstnPhoneNumber:  $("#pstnPhoneNumber").val()
        },function(info){
            if( !opts.closeLocalMedia ){
                RTC.startRTC({
                    screen: opts.screen,
                    screenSources: screenSources.join(","),
                    screenRole: "user"
                },function(info){
                    console.debug('推流成功');
                },function(error){
                    console.error('推流失败',error)
                });
            }
        },function(error){
            console.error('error')
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

    //监听SDK错误
    RTC.on("onErrorNotify", function( info ){
        console.error( info )
    });
    RTC.on("onStreamNotify", function( info ){
        console.error( 'onStreamNotify',info )
    });
}
$("#userId").val("video_"+ parseInt(Math.random()*100000000));

function push(){
    //推流
    login(  );
}

function detect(){
    WebRTCAPI.fn.detectRTC( function(data) { 
        console.debug( data ); 
        if( data.screen ){
            alert("不支持")
        }else{
            alert('支持')
        }
    });
}

var swit_flag = 'camera'
function screen(){
    //推流
    login({ screen: true });
    swit_flag = 'screen';
}
function swit( swit_flag){
    // swit_flag =  swit_flag == 'camera' ? 'screen' : 'camera';
    console.error('switch to '+ swit_flag)
    switch( swit_flag ){
        case "camera":
            RTC.stopRTC(0 , function(){
                console.debug('停止推流成功')
                
                RTC.startRTC({
                    screen: false
                },function(info){
                    console.debug('推流成功[摄像头]');
                },function(error){
                    console.error('推流失败[摄像头]',error)
                });
            },function(){
                //RTC.startRTC(0);
            });
            break;
        case "screen":
            RTC.stopRTC(0 , function(){
                console.debug('停止推流成功')
                RTC.startRTC({
                    screen: true
                },function(info){
                    console.debug('推流成功[屏幕分享]');
                },function(error){
                    console.error('推流失败[屏幕分享]',error)
                });
            },function(){
                //RTC.startRTC(0);
            });
            break;
        default:
            break;
    }
}

function audience(){
    //不推流
    login({ closeLocalMedia: true });
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

function login( opt ){
    sdkappid = Bom.query("sdkappid") || $("#sdkappid").val();
    userId = $("#userId").val();
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
            identifier : userId,
            accounttype: accountType
        }),
        success: function (json) {
            if(json && json.errorCode === 0 ){
                //一会儿进入房间要用到
                var userSig = json.data.userSig;
                var privateMapKey = json.data.privMapEncrypt;
                // 页面处理，显示视频流页面
                $("#video-section").show();
                $("#input-container").hide();
                initRTC({
                    "userId": userId,
                    "userSig": userSig,
                    "privateMapKey": privateMapKey,
                    "sdkappid": sdkappid,
                    "accountType": accountType,
                    "closeLocalMedia": opt && opt.closeLocalMedia,
                    "screen": (opt && opt.screen) || false,
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

