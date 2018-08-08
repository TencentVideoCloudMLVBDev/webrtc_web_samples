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
    username,
    streams = {
        screen:null,
        camera:null
    },
    screenSources = [];
var audioDevices = [];

function onKickout() {
    alert("on kick out!");
}

function onRelayTimeout(msg) {
    alert("onRelayTimeout!" + (msg ? JSON.stringify(msg) : ""));
}

function createVideoElement(id, isLocal) {
    var videoDiv = document.createElement("div");
    videoDiv.innerHTML = '<video id="' + id + '" autoplay ' + (isLocal ? 'muted' : '') + ' playsinline ></video>';
    document.querySelector("#remote-video-wrap").appendChild(videoDiv);

    return document.getElementById(id);
}

function onLocalStreamAdd(info) {
    if (info.stream && info.stream.active === true) {
        var id = "local";
        var video = document.getElementById(id);
        if (!video) {
            createVideoElement(id, true);
        }
        var video = document.getElementById(id)
        video.srcObject = info.stream;
        video.muted = true
        video.autoplay = true
        video.playsinline = true

    }
}


function onRemoteStreamUpdate(info) {
    console.debug(info)
    if (info.stream && info.stream.active === true) {
        var id = info.videoId;
        var video = document.getElementById(id);
        if (!video) {
            video = createVideoElement(id);
        }
        video.srcObject = info.stream;
    } else {
        console.log('欢迎用户' + info.userId + '加入房间');
    }
}


function onRemoteStreamRemove(info) {
    console.log(info.userId + ' 断开了连接');
    var videoNode = document.getElementById(info.videoId);
    if (videoNode) {
        videoNode.srcObject = null;
        document.getElementById(info.videoId).parentElement.removeChild(videoNode);
    }
}

function switchAudioDevice(){
    // 采取随机的方式设置麦克风
    var index2 = Math.floor(Math.random() * audioDevices.length);
    RTC.chooseAudioDevice( audioDevices[index2] );
}


function initRTC(opts) {

    var checkList = ['screen', 'window', 'tab', 'audio']
    checkList.forEach(function (item) {
        if ($("#" + item).prop("checked"))
            screenSources.push(item);
    })
    //初始化
    window.RTC = new WebRTCAPI({
        userId: opts.userId,
        userSig: opts.userSig,
        sdkAppId: opts.sdkappid,
        accountType: opts.accountType,
        closeLocalMedia: true //手动调用推流接口
    });

    //枚举麦克风
    //为切换摄像头测试做准备
    RTC.getAudioDevices(function(devices) {
        audioDevices = devices
        var deviceJsonList = [];
        var html = '';
        for(var a in devices){
            console.debug( devices[a])
            deviceJsonList.push({
                label: devices[a].label,
                deviceId: devices[a].deviceId
            })
            html += '<p>'+JSON.stringify({
                label: devices[a].label,
                deviceId: devices[a].deviceId
            })+'</p>'
        }
        $("#audioDevices").html( html );
    });

    // 远端流新增/更新
    RTC.on("onRemoteStreamUpdate", onRemoteStreamUpdate)
    // 本地流新增
    RTC.on("onLocalStreamAdd", onLocalStreamAdd)
    // 远端流断开
    RTC.on("onRemoteStreamRemove", onRemoteStreamRemove)
    // 重复登录被T
    RTC.on("onKickout", onKickout)
    // 服务器超时
    RTC.on("onRelayTimeout", onRelayTimeout)
    // just for debugging
    //监听SDK错误
    RTC.on("onErrorNotify", function (info) {
        console.error(info)
    });
    RTC.on("onStreamNotify", function (info) {
        console.error('onStreamNotify', info)
    });
}
$("#userId").val("video_" + parseInt(Math.random() * 100000000));


function getMediaStream( type ,callback ){
    if( streams && streams[type] ){
        callback( streams[type] )
    }else if( type === 'screen' ){
        /* 
        | 参数                   | 类型       | 是否必须       | 描述            |
        | -------------------- | -------- | ------------- |
        | opts         | Object | 否 | 可以传空对象 {}    |
        | succ         | function |是 |  成功回调      |
        | fail         | function |否 |  失败回调      |

        #### opts 的参数定义

        | 参数                   | 类型       | 是否必须       | 描述            |
        | -------------------- | -------- | ------------- |
        | screen         | Boolean |否 | 是否采集屏幕分享 ,默认false   |
        | screenSources | string   |否 | 屏幕分享采集的媒介 用半角逗号隔开， 可选选项包括  screen window tab audio | 具体表现请参考下图 |
        | attributes         | Object |否 | 是否采集屏幕分享 ,默认false   |
        | videoDevice         | Device |否 | 指定设备，getVideoDevices 获取的device item   |
        | audioDevice         | Device |否 | 指定设备，getVideoDevices 获取的audio item   |

        #### attributes 的参数定义
        | width         | Boolean |否 | 分辨率宽度  |
        | height         | Boolean |否 | 分辨率高度 |
        | frameRate         | Boolean |否 | 帧率   |

        */
        RTC.getLocalStream({
            screen: true,
            screenSources: screenSources.join(","),
            attributes:{
                width:320,
                height:320,
                frameRate:10
            }
        },function(info){
            streams['screen'] = info.stream
            console.debug('getLocalStream succ', info.stream)
            callback( info.stream )
        },function(error){
            console.error('failed', error)
        });
    }else if( type === 'camera' ){
        RTC.getLocalStream({
            attributes:{
                width:640,
                height:320,
                frameRate:20
            }
        },function(info){
            console.debug('getLocalStream succ', info.stream)
            streams['camera'] = info.stream
            callback( info.stream )
        },function(error){
            console.error('failed', error)
        });
    }     
}


function getScreen() {
    getMediaStream('screen', function(stream){
        startRTC('screen');
    })
}
function getCamera() {
    getMediaStream('camera', function(stream){
        startRTC('camera');
    })
}

function start( name ){
    login( function(){
        switch( name ){
            case 'audience':
                startRTC( 'audience' )
                break;
            case 'screen':
                getScreen();
                break;
            case 'camera':
                getCamera();
                break;
        }
    });
}


function startRTC( name ){
    if( !streams[name] && name !=='audience' ) return;
    var stream = streams[name];
    if( RTC.global.localStream ){
        console.debug( 'update ')
        //无需房间，更新流
        RTC.updateStream({
            role:name == 'screen' ?  "wp1280" : 'user',
            stream: streams[name].clone()
        });
    }else{
        //进入房间，进行推流
        RTC.createRoom({
            roomid: $("#roomid").val() * 1,
            role: name == 'screen' ?  "wp1280" : 'user',
        }, function (info) {
            if( name ==='audience') {
                return;
            }
            RTC.startRTC({
                stream : stream.clone()
            }, function (info) {
                console.debug('推流成功');
            }, function (error) {
                console.error('推流失败', error)
            });
        },function(error){
            console.error('进房失败', error)
        });
    }
}


function detect() {
    WebRTCAPI.fn.detectRTC(function (data) {
        console.debug(data.screenshare);
        if (!data.screenshare) {
            alert("不支持")
        } else {
            alert('支持')
        }
    });
}


var Bom = {
    /**
     * @description 读取location.search
     *
     * @param {String} n 名称
     * @return {String} search值
     * @example
     * 		$.bom.query('mod');
     */
    query: function (n) {
        var m = window.location.search.match(new RegExp("(\\?|&)" + n + "=([^&]*)(&|$)"));
        return !m ? "" : decodeURIComponent(m[2]);
    },
    getHash: function (n) {
        var m = window.location.hash.match(new RegExp("(#|&)" + n + "=([^&]*)(&|$)"));
        return !m ? "" : decodeURIComponent(m[2]);
    }
};

function login( callback ) {
    sdkappid = Bom.query("sdkappid") || $("#sdkappid").val();
    userId = $("#userId").val();
    //请使用英文半角/数字作为用户名
    $.ajax({
        type: "POST",
        url: FetchSigCgi,
        dataType: 'json',
        data: JSON.stringify({
            pwd: "12345678",
            appid: parseInt(sdkappid),
            roomnum: parseInt($("#roomid").val()),
            privMap: 255,
            identifier: userId,
            accounttype: accountType
        }),
        success: function (json) {
            if (json && json.errorCode === 0) {
                var userSig = json.data.userSig;
                $("#video-section").show();
                $("#input-container").hide();
                initRTC({
                    "userId": userId,
                    "userSig": userSig,
                    "sdkappid": sdkappid,
                    "accountType": accountType,
                    "roomid": $("#roomid").val()
                });

                if( callback ) {
                    callback();
                }
            } else {
                console.error(json);
            }
        },
        error: function (err) {
            console.error(err);
        }
    })
}