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

var hasInitStats = {};
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

    
    if( hasInitStats[info.userId] ){
        return;
    }
    hasInitStats[info.userId] = true;
    RTC.getStats({
        userId: info.userId ,
        interval: 2000 //2秒获取数据
    },function(result){
        //接收端数据
        var data = {
            recv: bytesToSize(result.audio.bytesReceived + result.video.bytesReceived),
            width: result.resolutions.recv.width,
            height: result.resolutions.recv.height,
            audioPacketsReceived: result.audio.packetsReceived,
            audioPacketsLost: result.audio.packetsLost,
            videoPacketsReceived: result.video.packetsReceived,
            videoPacketsLost: result.video.packetsLost,
        }
        console.debug( ' recv ', data)
        //test 代码
        //10秒后停止数据统计
        setTimeout(function(){
            result.nomore();
        },10000);
    });
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
    window.RTC = new WebRTCAPI({
        "useCloud":1,
        "userId": opts.userId,
        "userSig": opts.userSig,
        "sdkAppId": opts.sdkappid,
        "accountType": opts.accountType,
        "closeLocalMedia": opts.closeLocalMedia
    },function(){
        RTC.createRoom({
            roomid : opts.roomid * 1,
            privateMapKey: opts.privateMapKey,
            role : "user",
            pstnBizType: parseInt($("#pstnBizType").val() || 0),
            pstnPhoneNumber:  $("#pstnPhoneNumber").val()
        },function(){
            RTC.getStats({
                userId:0, //不传或者设置为0 ，为获取当前本端数据
                interval: 2000 //2秒获取数据
            },function(result){
                console.debug( result );
                //推流端数据
                var data = {
                    bandwidth: bytesToSize(result.bandwidth.speed),
                    send: bytesToSize(result.audio.bytesSent + result.video.bytesSent),
                    width: result.resolutions.send.width,
                    height: result.resolutions.send.height,
                    audioPacketsSent: result.audio.packetsSent || 0,
                    videoPacketsSent: result.video.packetsSent || 0,
                    videoPacketsLost: result.video.packetsLost
                };
                console.debug( ' send ' ,data)

                //test 代码
                //10秒后停止数据统计
                setTimeout(function(){
                    result.nomore();
                },10000);

            });
        });;
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
    RTC.on("onQualityReport",function( data ){
        // console.error( 'onQualityReport',data );
    })
    // just for debugging
    // RTC.on("*",function(e){
    //     console.debug(e)
    // });

    RTC.on("onErrorNotify", function( info ){
        console.error( info )
        /* info {
            errorCode: xxxx,
            errorMsg: "xxxxx"
        } */
    });
}
$("#userId").val("video_"+ parseInt(Math.random()*100000000));

function push(){
    //推流
    login( false );
}

function audience(){
    //不推流
    login( true );
}

function stopRTC(){
    RTC.stopRTC(0 , function( info ){
        console.debug( info )
    },function( info ){
        console.debug( info )
    });
}
function startRTC(){
    RTC.startRTC(0 , function( info ){
        console.debug( info )
    },function( info ){
        console.debug( info )
    });
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

function login( closeLocalMedia ){
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
                    "closeLocalMedia": closeLocalMedia,
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




function bytesToSize(bytes) {
    var k = 1000;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes <= 0) {
        return '0 Bytes';
    }
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(k)), 10);
    
    if(!sizes[i]) {
        return '0 Bytes';
    }

    return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}



//   <script id="template" type="text/html">
//   <div id="#id#">
//     <h2> Stream with id #id# </h2>
//     <p> <label class="label">bandwidth:</label> <span>#bandwidth#</span></p>
//     <p> <label class="label">resolutions:</label> <span>#resolutions#</span></p>
//     <p> <label class="label">Send Data</label> <span>#send#</span></p>
//     <p> <label class="label">Recv Data</label> <span>#recv#</span></p>
//   </div>
// </script>
function renderData(id,data){
    var html = $("#template").html();
    html = replaceWith(html, 'id', id)
    for( var a in data){
        html = replaceWith(html, a, data[a])
    }

    if( $("#"+id).length > 0 ){
        $("#"+id).html( html )
    }else{
        $("#stats").html( html );
    }
}

function replaceWith(str, name , value){
    var regex = new RegExp("#"+name+"#","gim");
    str = str.replace(regex, value)
    return str;
}