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


// canvas绘制
var canvasEle = document.getElementById("clock");
var context = canvasEle.getContext("2d");
function drawClock() {
    context.clearRect(0, 0, canvasEle.width, canvasEle.height);

    context.fillStyle = "#fff";   
    context.fillRect(0, 0, canvasEle.width, canvasEle.height);  

    var circleX = 200;    // 圆心X坐标
    var circleY = 200;    // 圆心Y坐标
    var radius = 190;    // 半径长度

    // 获取时间信息
    var date = new Date();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    // 分针走一圈60度，时针走30度
    // 度数转化为弧度  度数*Math.PI/180
    var hourValue = (-90+30*hour+min/2)*Math.PI/180;
    var minValue = (-90+6*min)*Math.PI/180;
    var secValue = (-90+6*sec)*Math.PI/180;

    // 绘制表盘
    context.beginPath();
    context.font = "bold 16px Arial";
    context.lineWidth = '3';
    for(var i=0;i<12;i++) {
        context.moveTo(circleX,circleY);
        context.arc(circleX,circleY,radius,30*i*Math.PI/180,30*(i+1)*Math.PI/180,false); 
    }
    context.stroke();

    context.fillStyle='#0ff';
    context.beginPath();
    context.moveTo(circleX,circleY);
    context.arc(circleX,circleY,radius*19/20,0,360*Math.PI/180,false);
    context.closePath();
    context.fill();

    // 绘制钟表中心
    context.beginPath();
    context.arc(200,200,6,0,360,false);
    context.fillStyle = "#000";
    context.fill();//画实心圆
    context.closePath();

    // 绘制时针刻度
    context.lineWidth = '5';
    context.beginPath();
    context.moveTo(circleX, circleY);
    context.arc(circleX, circleY, radius*9/20, hourValue, hourValue, false);
    context.stroke();

    // 绘制分针
    context.lineWidth = '3';
    context.beginPath();
    context.moveTo(circleX, circleY);
    context.arc(circleX, circleY, radius*13/20, minValue, minValue, false);
    context.stroke();
    
    // 绘制秒针
    context.lineWidth = '1';
    context.beginPath();
    context.moveTo(circleX, circleY);
    context.arc(circleX, circleY, radius*18/20, secValue, secValue, false);
    context.stroke();


    // 绘制钟表的数字
    context.fillStyle = "#0ad";
    context.fillText("12", 190, 34);
    context.fillText("3", 370, 206);
    context.fillText("6", 196, 378);
    context.fillText("9", 22, 206);

}
setInterval(drawClock, 1000);
drawClock();


// canvas捕获为stream canvasEle.captureStream(frameRate)
var CanvasStream = canvasEle.captureStream(25);
// 获取音频流，并将音轨添加到捕获的stream中
navigator.mediaDevices.getUserMedia({audio:true},
    function(audioStream) {
        CanvasStream.addTrack(audioStream.getAudioTracks()[0]);
    }, function(error) {
        var errorMsg = "get user media failed : error = " + error.message;
        console.error(errorMsg);
    }
);

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
    console.log('functioncreateVideoElement')
    var videoDiv=document.createElement("div");
    videoDiv.innerHTML = '<video id="'+id+'" autoplay '+ (isLocal ? 'muted':'') +' playsinline ></video>';
    document.querySelector("#remote-video-wrap").appendChild(videoDiv);

    return document.getElementById(id);
}

function onLocalStreamAdd(info) {
    if (info.stream && info.stream.active === true)
    {
        console.log('functiononLocalStreamAdd')
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

    window.RTC = new WebRTCAPI({
        userId: opts.userId,
        userSig: opts.userSig,
        sdkAppId: opts.sdkappid,
        accountType: opts.accountType,
        "closeLocalMedia": true,
        // canvas传入参数为捕获的stream
        canvas: CanvasStream
    },function(){
        RTC.createRoom({
            roomid : opts.roomid * 1,
            privateMapKey: opts.privateMapKey,
            role : "user",
        },function(info){
            RTC.startRTC({
                canvas: CanvasStream
            },function(info){
                console.debug('推流成功');
            },function(error){
                console.error('推流失败',error)
            });
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

function start(){
    RTC.startRTC({
        canvas: CanvasStream
    },function(info){
        console.debug('推流成功');
    },function(error){
        console.error('推流失败',error)
    });
}

function stop(){
    RTC.stopRTC({
        canvas: CanvasStream
    },function(info){
        console.debug('断流成功');
    },function(error){
        console.error('断流失败',error)
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
                    "closeLocalMedia": false,
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
