# ccbar.js
![ccbar](demo/images/ccbar.png "ccbar")

##初始化ccbar
```
    // 初始化ccbar
    var _ccbar = new CCBAR.CORE.CCBAR({
        enterprise: 企业简称,
        account: 坐席账号,
        password: 坐席登录密码,
        skillGroupId: 签入的技能组ID
    });
```

##方法
方法名|参数|说明
:---:|:--:|:--:|:--:
signIn|无|签入
getNumberList|无|获取显号列表
changeStatus|1：空闲；2：小休；3：忙碌|坐席状态切换
normalCall|phone:呼叫号码,displayNum:显号|打电话
endCall|sessionId|结束电话
mute|sessionId|静音
holdOn|sessionId|保持通话
resumeCall|sessionId|恢复通话
satisfiy|sessionId|下发满意度
signOut|无|签出技能组
getSip|无|查询sip相关信息

