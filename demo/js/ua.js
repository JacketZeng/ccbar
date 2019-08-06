var _ccbar;
var isAutoAccept = false;
var $ccbarDom = {
    title: document.getElementById('ccbarTitle'),
    step1: {
        wrap: document.getElementById('step1'),
        account: document.getElementById('account'),
        password: document.getElementById('password'),
        uri: document.getElementById('uri')
    },
    step2: {
        wrap: document.getElementById('step2'),
        enterprise: document.getElementById('a_enterprise'),
        account: document.getElementById('a_account'),
        password: document.getElementById('a_password'),
        skillGroupId: document.getElementById('a_skillGroupId')
    },
    main: {
        wrap: document.getElementById('main'),
        status: document.getElementById('status'),
        phone: document.getElementById('phone'),
        displayNum: document.getElementById('displayNum'),
        message: document.getElementById('message'),
        ringing: document.getElementById('ringing')
    },
    logout: {
        wrap: document.getElementById('logout')
    },
    unsign: {
        wrap: document.getElementById('unsign')
    }
}



function getSip() {
    _ccbar.getSip();
    $ccbarDom.step1.wrap.style.display = 'block';
    $ccbarDom.step2.wrap.style.display = 'none';
    $ccbarDom.main.wrap.style.display = 'none';
    $ccbarDom.unsign.wrap.style.display = 'none';
    $ccbarDom.logout.wrap.style.display = 'none';
    interface_messeageCallback();
}

var sessionId;
// sip初始化
function initWebRTC() {
    _ccbar.initWebRTC();
    sip_messeageCallback();
}

// 来电接听
function accept() {
    _ccbar.accept();
    isAutoAccept = false;
}
// 签入技能组
function signIn() {
    _ccbar.signIn();
}
// 签出技能组
function signOut() {
    if (confirm('您真的要注销吗？')) {
        _ccbar.signOut();
    }
}

// 获取显号
function getNumberList() {
    _ccbar.getNumberList();
}
// 坐席状态切换
function changeStatus() {
    _ccbar.changeStatus($ccbarDom.main.status.value);
}

// 打电话
function normalCall() {
    _ccbar.normalCall($ccbarDom.main.phone.value, $ccbarDom.main.displayNum.value);
}

// 结束通话
function endCall() {
    _ccbar.endCall(sessionId);
}

// 静音
function mute() {
    _ccbar.mute(sessionId);
}

// 保持通话
function holdOn() {
    _ccbar.holdOn(sessionId);
}

// 恢复通话
function resumeCall() {
    _ccbar.resumeCall(sessionId);
}

// 下发满意度
function satisfiy() {
    _ccbar.satisfiy(sessionId);
}

/////////////////////////////消息回调//////////////////////////////////////
// ws消息回调
function ws_messeageCallback() {
    _ccbar.getWebSocketSubject().subscribe((message) => {
        var body = JSON.parse(message.body);
        console.log(body);
        if (body && body.msg && body.msg.sessionId) {
            sessionId = body.msg.sessionId;
        }
    });
}
// 接口消息回调
function interface_messeageCallback() {
    _ccbar.interfaceSubject.subscribe((message) => {
        $ccbarDom.main.ringing.src = '';
        if (message.code === 2001) {
            // 签入成功
            for (var i = 0; i < $ccbarDom.main.status.options.length; i++) {
                if ($ccbarDom.main.status.options[i].value == message.body.data.seatStatus) {
                    $ccbarDom.main.status.options[i].selected = true;
                    break;
                }
            }
            $ccbarDom.step2.wrap.style.display = 'none';
            $ccbarDom.main.wrap.style.display = 'block';
            $ccbarDom.title.innerText = $ccbarDom.step1.account.value;
            getNumberList();
            ws_messeageCallback();
            return;
        }

        if (message.code === 2002) {
            // 获取显号成功
            var list = message.body.data;
            var $displayNum = document.getElementById('displayNum');
            while ($displayNum.firstChild) {
                $displayNum.removeChild($displayNum.firstChild);
            }
            for (var i = 0; i < list.length; i++) {
                var $option = document.createElement('option');
                $option.value = list[i];
                $option.innerText = list[i];
                $displayNum.appendChild($option);
            }
            return;
        }
        $ccbarDom.main.message.innerText = message.body.msg;

        if (message.code === 2004) {
            isAutoAccept = true;
            return
        }

        if (message.code === 20010) {
            //签出成功
            $ccbarDom.main.wrap.style.display = 'none';
            $ccbarDom.unsign.wrap.style.display = 'none';
            $ccbarDom.logout.wrap.style.display = 'block';
            $ccbarDom.title.innerText = 'ccbar';
            return;
        }
        if (message.code === 20011) {
            //获取sip参数成功
            $ccbarDom.step1.account.value = message.body.data.sipAccount;
            $ccbarDom.step1.password.value = message.body.data.sipPassword;
            $ccbarDom.step1.uri.value = message.body.data.sipUrl;
            initWebRTC();
            return;
        }
    });
}
// sip消息回调
function sip_messeageCallback() {
    _ccbar.webRTCSubject.subscribe((message) => {
        $ccbarDom.main.message.innerText = message.msg;
        if (message.code === 6001) {
            // sip注册成功
            $ccbarDom.step1.wrap.style.display = 'none';
            $ccbarDom.step2.wrap.style.display = 'block';
            $ccbarDom.title.innerText = 'step2：签入技能组';
            signIn();
            return;
        }
        if (message.code === 6002) {
            // sip未注册
            $ccbarDom.main.wrap.style.display = 'none';
            $ccbarDom.logout.wrap.style.display = 'none';
            $ccbarDom.unsign.wrap.style.display = 'block';
            $ccbarDom.title.innerText = 'ccbar';
            return;
        }
        if (message.code === 6007) {
            // sip来电
            if (isAutoAccept) {
                $ccbarDom.main.message.innerText = '正在呼叫';
                accept();
            } else {
                $ccbarDom.main.ringing.src = '../ccbar_demo/images/ring.mp3';
                _ccbar.notice();
            }
        }
    });
}



var Dragging = function (validateHandler) { //参数为验证点击区域是否为可移动区域，如果是返回欲移动元素，负责返回null
    var draggingObj = null; //dragging Dialog
    var diffX = 0;
    var diffY = 0;

    function mouseHandler(e) {
        switch (e.type) {
            case 'mousedown':
                draggingObj = validateHandler(e);//验证是否为可点击移动区域
                if (draggingObj != null) {
                    diffX = e.clientX - draggingObj.offsetLeft;
                    diffY = e.clientY - draggingObj.offsetTop;
                }
                break;

            case 'mousemove':
                if (draggingObj) {
                    var left = (e.clientX - diffX);
                    var top = (e.clientY - diffY);
                    draggingObj.style.left = (left < 0 ? 0 : left) + 'px';
                    draggingObj.style.top = (top < 0 ? 0 : top) + 'px';
                }
                break;

            case 'mouseup':
                draggingObj = null;
                diffX = 0;
                diffY = 0;
                break;
        }
    };

    return {
        enable: function () {
            document.addEventListener('mousedown', mouseHandler);
            document.addEventListener('mousemove', mouseHandler);
            document.addEventListener('mouseup', mouseHandler);
        },
        disable: function () {
            document.removeEventListener('mousedown', mouseHandler);
            document.removeEventListener('mousemove', mouseHandler);
            document.removeEventListener('mouseup', mouseHandler);
        }
    }
}

function getDraggingDialog(e) {
    var target = e.target;
    while (target && target.className.indexOf('ccbar-title') == -1) {
        target = target.offsetParent;
    }
    if (target != null) {
        return target.offsetParent;
    } else {
        return null;
    }
}

Dragging(getDraggingDialog).enable();

function init() {

    _ccbar = new CCBAR.CORE.CCBAR({
        enterprise: $ccbarDom.step2.enterprise.value,
        account: $ccbarDom.step2.account.value,
        password: $ccbarDom.step2.password.value,
        skillGroupId: $ccbarDom.step2.skillGroupId.value,
        notice: true,
        iconUrl: '../images/log.ico'
    });
    setTimeout(getSip, 500);
}
init();
