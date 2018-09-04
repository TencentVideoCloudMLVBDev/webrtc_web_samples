/*
    写在前面：
    为了保持在功能演示方面的简洁， demo不会做任何合法性校验
*/

// 本demo用到的唯一一个CGI，获取usersig （什么是usersig? 请看 https://www.qcloudtrtc.com/webrtcapi/ )
// 如果您不了解非对称加密，可以这样简单理解：
// 你有公钥 和 私钥 两把钥匙，腾讯云有一把钥匙（公玥）
// 你把数据丢盒子里，并且用私钥上锁，然后把上了锁的盒子给到腾讯云
// 腾讯云可以用公钥这把钥匙来解开这把锁，拿到里面的数据。
// 所以你需要的是
// 去控制台把私钥下载下来，用TLS工具算一个签名（usersig)

//不要把您的sdkappid填进来就用这个cgi去测，测试demo的cgi没有您的私钥，臣妾做不到啊
var FetchSigCgi = 'https://www.qcloudtrtc.com/sxb_dev/?svc=account&cmd=authPrivMap';
$("#userId").val("video_"+ parseInt(Math.random()*100000000));
var sdkappid,
    accountType = 14418, // accounttype 还是在文档中会找到
    userSig,
    username,
    roomId = $("#roomid").val(),
    ext = 'videoInvite'; //// 消息元素对象(自定义)属性：扩展字段

var receiveInviteDialog = document.querySelector('#receive-invite-dialog');


$(function(){
    imLogin();
});
 
function invite(){
    ext = 'videoInvite';
    sendCustomMsg(ext);
}

function accept(){
    if(!window.RTC){
        login();
    }
    ext = 'videoAccept';
    sendCustomMsg(ext);
    receiveInviteDialog.close();
}

// webRTC 部分
function onKickout() {
    console.error("on kick out!");
}

function onRelayTimeout(msg) {
    console.error("onRelayTimeout!" + (msg ? JSON.stringify(msg) : ""));
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
    window.RTC = new WebRTCAPI({
        "useCloud": Bom.query("useCloud") || 0 ,
        "userId": opts.userId,
        "userSig": opts.userSig,
        "sdkAppId": opts.sdkappid,
        "accountType": opts.accountType
    },function(){
        RTC.createRoom({
            roomid : opts.roomid * 1,
            privateMapKey: opts.privateMapKey,
            role : "user",
            pureAudioPush: parseInt($("#pstnBizType").val() || 0),
            pstnPhoneNumber:  $("#pstnPhoneNumber").val()
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

function login(){
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
            roomnum:parseInt(roomId),
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
                    "roomid": roomId
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

// IM部分
// IM登陆
function imLogin(){
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
            roomnum:parseInt(roomId),
            privMap:255,
            identifier : userId,
            accounttype: accountType
        }),
        success: function (json) {
            if(json && json.errorCode === 0 ){
                var userSig = json.data.userSig;
                // IM登陆接口
                webim.login({
                'sdkAppID': sdkappid, //用户所属应用id,必填
                'appIDAt3rd': sdkappid, //用户所属应用id，必填
                'accountType': accountType, //用户所属应用帐号类型，必填
                'identifier': userId, //当前用户ID,必须是否字符串类型，必填
                'userSig': userSig //当前用户userSig,必填
                }, IMListener, {
                isAccessFormalEnv: true,
                isLogOn: false
                }, function (resp) {
                    createRoom(); // 创建房间
                    console.log("webimLoginSuccess!");
                },
                function (err) {
                    alert(err.ErrorInfo);
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

// IM创建房间
function createRoom() {
    var groupID = roomId;
    var groupType = 'ChatRoom';
    var options = {
      'GroupId': groupID,
      'Owner_Account': userId,
      'Type': groupType, //Private/Public/ChatRoom/AVChatRoom
      'ApplyJoinOption': 'FreeAccess',
      'Name': groupID,
      'Notification': "",
      'Introduction': "",
      'MemberList': [],
    };
    webim.createGroup(
        options,
        function (resp) {
            console.log('webimCreateRoomSuccess!');
            console.log(resp); 
        },
        function (err) {
            if (err.ErrorCode == 10025) {
                console.log('webimCreateRoomError!');
                console.log(err); 
            } else if (err.ErrorCode == 10021) {
                console.log(err.ErrorCode + 'GROUP_IS_ALREADY_USED!');
                joinRoom(groupID); // 创建房间时房间已存在，就加入房间
            } else {
                console.log('webimCreateRoomError!');
                console.log(err); 
            }
        }
    );
}

//IM加入房间
function joinRoom(groupID) {
    webim.applyJoinGroup({
        GroupId: groupID
    }, function (resp) {
        if (resp.JoinedStatus && resp.JoinedStatus == 'JoinedSuccess') {
            console.log('webimJoinRoomSuccess!');
        }
    },function (err) {
        if (err.ErrorCode == 10013) { // 被邀请加入的用户已经是群成员,也表示成功
            console.log('webimJoinRoomSuccessAlreadyInRoom!');
        } else {
            console.log('webimJoinRoomFailed!');
            console.log(err);
        }
    });
}

// IMListener,IM登陆时需要
var IMListener = {
    // 监听新消息函数，必填
    onMsgNotify(msgs) {
        if (msgs.length) { // 如果有消息才处理
            var chatMsgs = [];
            msgs.forEach(msg => {
                if(!msg.getIsSend()){ // 消息不为自己发送时处理
                    var sess = msg.getSession();
                    var fromUserId = msg.getFromAccount()
                    var msgType = sess.type();
                    // 如果是群组消息
                    if (msgType === 'GROUP') {
                        var groupid = sess.id();
                        if (groupid == roomId) {
                            msg.getElems().forEach(elem => {
                                if(elem.getContent().getExt() == 'videoInvite'){ // 接收到视频邀请
                                    console.log('reciveVideoInvitefrom:' + fromUserId);
                                    if(!window.RTC){
                                        receiveInviteDialog.show();
                                        $("#input-container").hide();
                                    } else {
                                        console.log('AlreadyInVideoConnection');
                                    }
                                }  else if(elem.getContent().getExt() == 'videoAccept') { //视频邀请被接受
                                    console.log(fromUserId + 'acceptedVideoInvite');
                                }
                            })
                        }
                    } 
                }
            });
        }
    },

    // 监听（多终端同步）群系统消息事件，必填
    onGroupSystemNotifys: {},

};

// IM发送自定义群组消息
function sendCustomMsg(ext) {
    var sessionType = webim.SESSION_TYPE.GROUP,// 会话类型：群聊        
        subType = webim.GROUP_MSG_SUB_TYPE.COMMON, // 群消息子类型：普通消息
        roomId = $("#roomid").val() + "", //房间号
        name = "invite", //房间名称
        isSend = true, //是否为自己发送
        seq = -1, //消息序列，-1表示 SDK 自动生成，用于去重
        random = Math.round(Math.random() * 4294967296), //消息随机数，用于去重
        msgTime = '', //消息时间戳

        // 消息元素对象(自定义)属性
        data = 'data', // 数据
        desc = 'desc'; // 描述

    var selSess  = new webim.Session (sessionType, roomId, name, '', msgTime, seq); //一个会话对象
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, userId, subType); //一条消息对象
    var custom_obj = new webim.Msg.Elem.Custom(data, desc, ext); //消息元素对象(自定义)
    msg.addCustom(custom_obj);

    webim.sendMsg(msg, function (resp) {
        if(!window.RTC){
            login();
            console.log('sendCustomMsgSuccess!');
        } else{
            console.log('sendCustomMsgSuccessAlreadInitRTC!');
        }
    },
    function (err) {
        console.error('sendCustomMsgError!');
        console.error(err);
    });
}

