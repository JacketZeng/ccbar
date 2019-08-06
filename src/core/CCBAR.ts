import { Client } from "@stomp/stompjs";
import * as $ from "jquery";
import { Observable, Subject } from "rxjs";
import * as SockJS from "sockjs-client";
import { UA } from "../sip/UA";
export namespace CCBAR {
    export interface Configuration {
        sipAccount: string; // sip账号
        sipPassword: string; // sip密码
        sipUrl: string; // sipUrl
    }

    export interface AccountOptions {
        notice?: boolean;
        iconUrl?: string;
        api: string;
        wsUrl: string;
        enterprise: string;
        account: string;
        password: string;
        skillGroupId: number;
    }
}

const SIP_MESSAGE_REGISTERED = { code: 6001, msg: "SIP注册成功！" };
const SIP_MESSAGE_UNREGISTERED = { code: 6002, msg: "SIP未注册！" };
const SIP_MESSAGE_REGISTRATIONFAILD = { code: 6003, msg: "SIP注册失败！" };
const SIP_MESSAGE_MESSAGE = { code: 6004, msg: "SIP注册失败！" };
const SIP_MESSAGE_OUTOFDIALOGREFERREQUESTED = { code: 6005, msg: "outOfDialogReferRequested" };
const SIP_MESSAGE_TRANSPORTCREATED = { code: 6006, msg: "transportCreated" };
const SIP_MESSAGE_INVITE = { code: 6007, msg: "您有新的来电！" };
const SIP_MESSAGE_NOINVITE = { code: 6008, msg: "未检测到来电！" };
const SIP_MESSAGE_MEDIAFAILD = { code: 6008, msg: "未检测到音频设备！" };
const SIP_MESSAGE_MEDIA_UNSUPPORT = { code: 6009, msg: "浏览器无法获取音频设备！" };

const INTERFACE_FAIL_SIGNIN = { code: 5001, msg: "签入失败！" };
const INTERFACE_FAIL_GETNUMBERLIST = { code: 5002, msg: "获取显号列表失败！" };
const INTERFACE_FAIL_CHANGESTATUS = { code: 5003, msg: "坐席状态切换失败！" };
const INTERFACE_FAIL_NORMALCALL = { code: 5004, msg: "外呼失败！" };
const INTERFACE_FAIL_ENDCALL = { code: 5005, msg: "结束通话失败！" };
const INTERFACE_FAIL_MUTE = { code: 5006, msg: "静音失败！" };
const INTERFACE_FAIL_HOLDON = { code: 5007, msg: "保持失败！" };
const INTERFACE_FAIL_RESUMECALL = { code: 5008, msg: "恢复失败！" };
const INTERFACE_FAIL_SATISFIY = { code: 5009, msg: "下发满意度失败！" };
const INTERFACE_FAIL_SIGNOUT = { code: 50010, msg: "签出失败！" };
const INTERFACE_FAIL_GETSIP = { code: 50011, msg: "获取sip失败！" };

const INTERFACE_SUCCESS_SIGNIN = { code: 2001, msg: "签入成功！" };
const INTERFACE_SUCCESS_GETNUMBERLIST = { code: 2002, msg: "获取显号列表成功！" };
const INTERFACE_SUCCESS_CHANGESTATUS = { code: 2003, msg: "坐席状态切换成功！" };
const INTERFACE_SUCCESS_NORMALCALL = { code: 2004, msg: "外呼成功！" };
const INTERFACE_SUCCESS_ENDCALL = { code: 2005, msg: "结束通话成功！" };
const INTERFACE_SUCCESS_MUTE = { code: 2006, msg: "静音成功！" };
const INTERFACE_SUCCESS_HOLDON = { code: 2007, msg: "保持成功！" };
const INTERFACE_SUCCESS_RESUMECALL = { code: 2008, msg: "恢复成功！" };
const INTERFACE_SUCCESS_SATISFIY = { code: 2009, msg: "下发满意度成功！" };
const INTERFACE_SUCCESS_SIGNOUT = { code: 20010, msg: "签出成功！" };
const INTERFACE_SUCCESS_GETSIP = { code: 20011, msg: "获取sip成功！" };

export class CCBAR {
    private noticefication;
    private configuration: CCBAR.Configuration | undefined;
    private ua: UA | undefined;
    private remoteVideo: HTMLVideoElement;
    private session: any;
    private accountParams: CCBAR.AccountOptions;
    private stompClient: Client | undefined;
    // WebSocket消息主题
    private webSocketSubject: Subject<any> = new Subject<any>();
    // WebRTC消息主题
    private webRTCSubject: Subject<any> = new Subject<any>();
    // 接口消息主题
    private interfaceSubject: Subject<any> = new Subject<any>();

    constructor(options: CCBAR.AccountOptions) {
        this.accountParams = options;
        // this.accountParams.api = "//172.16.0.219:8020/tscloud/ccbar/";
        // this.accountParams.api = "https://172.16.0.219:442/tscloud/ccbar/";
        this.accountParams.wsUrl = "172.16.0.219";
        const body = document.body;
        const videoTag = document.createElement("video");
        videoTag.style.display = "none";
        this.remoteVideo = videoTag;
        body.appendChild(videoTag);
    }

    public getWebSocketSubject(): Observable<any> {
        return this.webSocketSubject.asObservable();
    }
    public getWebRTCSubject(): Observable<any> {
        return this.webRTCSubject.asObservable();
    }
    public getInterfaceSubject(): Observable<any> {
        return this.interfaceSubject.asObservable();
    }
    /*************************WebRTC 注册 START***************************** */
    public initWebRTC() {
        if (this.configuration === undefined) {
            return;
        }
        // 初始化签入
        this.stop();
        // 构造一个User Agent
        const config: UA.Options = {
            uri: this.configuration.sipAccount + "@" + this.configuration.sipUrl,
            authorizationUser: this.configuration.sipAccount,
            password: this.configuration.sipPassword,
            transportOptions: {
                wsServers: "wss://" + this.configuration.sipUrl,
                maxReconnectionAttempts: 0
            },
            registerOptions: {
                expires: 60
            }
        };
        this.ua = new UA(config);

        this.ua.once("registered", (response) => {
            this.webRTCSubject.next(SIP_MESSAGE_REGISTERED);
        });
        this.ua.on("unregistered", (response, cause) => {
            this.webRTCSubject.next(SIP_MESSAGE_UNREGISTERED);
            this.stop();
        });
        this.ua.on("registrationFailed", (response, cause) => {
            this.webRTCSubject.next(SIP_MESSAGE_REGISTRATIONFAILD);
        });
        this.ua.on("message", (message) => {
            this.webRTCSubject.next(SIP_MESSAGE_MESSAGE);
        });
        this.ua.on("outOfDialogReferRequested", (referServerContext) => {
            this.webRTCSubject.next(SIP_MESSAGE_OUTOFDIALOGREFERREQUESTED);
        });
        this.ua.on("transportCreated", (transport) => {
            this.webRTCSubject.next(SIP_MESSAGE_TRANSPORTCREATED);
        });

        // 监听来电
        this.ua.on("invite", (session: any) => {
            this.session = session;
            session.on("trackAdded", () => {
                // We need to check the peer connection to determine which track was added
                const pc = session.sessionDescriptionHandler.peerConnection;
                // Gets remote tracks
                const remoteStream = new MediaStream();
                pc.getReceivers().forEach((receiver: { track: MediaStreamTrack; }) => {
                    remoteStream.addTrack(receiver.track);
                });

                this.remoteVideo.srcObject = remoteStream;
                this.remoteVideo.play();
            });
            this.webRTCSubject.next(SIP_MESSAGE_INVITE);
        });
        return this.ua;
    }

    // 拨打电话
    public call(bindnumber: string) {
        if (this.configuration === undefined) {
            return;
        }
        if (this.ua === undefined) {
            alert("未初始化sip");
            return;
        }
        this.session = this.ua.invite(bindnumber + "@" + this.configuration.sipUrl, {
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: true,
                    video: false
                }
            }
        });

        this.session.on("trackAdded", () => {
            // We need to check the peer connection to determine which track was added
            const pc = this.session.sessionDescriptionHandler.peerConnection;

            // Gets remote tracks
            const remoteStream = new MediaStream();
            pc.getReceivers().forEach((receiver: { track: MediaStreamTrack; }) => {
                remoteStream.addTrack(receiver.track);
            });
            this.remoteVideo.srcObject = remoteStream;
            this.remoteVideo.play();
        });
    }

    // 接听来电
    public accept() {

        if (window.navigator.mediaDevices === undefined) {
            this.webRTCSubject.next(SIP_MESSAGE_MEDIA_UNSUPPORT);
            return;
        }

        if (this.session === undefined) {
            this.webRTCSubject.next(SIP_MESSAGE_NOINVITE);
            return;
        }

        this.session.accept({
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: true,
                    video: false
                }
            }
        });
        this.session.sessionDescriptionHandler.on("userMediaFailed", (error: any) => {
            this.webRTCSubject.next(SIP_MESSAGE_MEDIAFAILD);
        });
    }

    // 挂断电话
    public hangUp() {
        if (this.session === undefined) {
            this.webRTCSubject.next(SIP_MESSAGE_NOINVITE);
            return;
        }
        this.session.terminate();
    }

    // 断开WebRTC链接 && 断开ws链接
    public stop() {
        if (this.ua) {
            this.ua.stop();
        }

        if (this.stompClient) {
            this.stompClient.deactivate();
        }
    }
    /*************************WebRTC 注册  END***************************** */

    /*************************jsonp 方式访问接口  START***************************** */
    // 签入接口
    public signIn() {
        // 签入获取tickt
        $.ajax({
            url: this.getJsonpUrl("signIn"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: this.accountParams,
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_SIGNIN.code,
                body: data
            });
            if (data.data) {
                const ticket = data.data.ticket;
                if (ticket) {
                    // 建立ws链接
                    // const sockJs = new SockJS(this.getConnectUrl(ticket));
                    // this.stompClient = Stomp.over(sockJs);
                    // this.stompClient.connect({}, (frame) => {
                    //     this.stompClient.subscribe(this.getUserUrl(ticket), (response) => {
                    //         this.webSocketSubject.next(response);
                    //     });
                    // });

                    // Typical usage with SockJS
                    this.stompClient = new Client({
                        heartbeatIncoming: 0,
                        heartbeatOutgoing: 20000,
                        reconnectDelay: 10000,
                        brokerURL: this.getConnectUrl(ticket)
                    });
                    this.stompClient.webSocketFactory = () => {
                        return new SockJS(this.getConnectUrl(ticket));
                    };

                    this.stompClient.activate();
                    this.stompClient.onConnect = (frame) => {
                        if (this.stompClient) {
                            this.stompClient.subscribe(this.getUserUrl(ticket), (response) => {
                                this.webSocketSubject.next(response);
                            });
                        }
                    };
                }
            }
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_SIGNIN),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 获取显号列表接口
    public getNumberList() {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("getNumberList"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_GETNUMBERLIST.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_GETNUMBERLIST),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 坐席状态切换接口
    public changeStatus(value: number) {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("changeStatus"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
                status: value
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_CHANGESTATUS.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_CHANGESTATUS),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 打电话接口
    public normalCall(phone1: string, displayNum1: string) {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("call"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
                phone: phone1,
                displayNum: displayNum1
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_NORMALCALL.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_NORMALCALL),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 结束电话接口
    public endCall(sessionId1: string) {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("endCall"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
                sessionId: sessionId1
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_ENDCALL.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_ENDCALL),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 静音接口
    public mute(sessionId1: string) {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("mute"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
                sessionId: sessionId1
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_MUTE.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_MUTE),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 保持通话接口
    public holdOn(sessionId1: string) {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("holdOn"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
                sessionId: sessionId1
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_HOLDON.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_HOLDON),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 恢复通话接口
    public resumeCall(sessionId1: string) {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("resumeCall"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
                sessionId: sessionId1
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_RESUMECALL.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_RESUMECALL),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 下发满意度接口
    public satisfiy(sessionId1: string) {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("satisfiy"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
                sessionId: sessionId1
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_SATISFIY.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_SATISFIY),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 签出技能组接口
    public signOut() {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("signOut"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_SIGNOUT.code,
                body: data
            });
            this.stop();
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_SIGNOUT),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    // 查询sip相关信息的接口
    public getSip() {
        if (this.accountParams === undefined) {
            console.log("accountParams is Undefined", this.accountParams);
            return;
        }
        $.ajax({
            url: this.getJsonpUrl("getSip"),
            dataType: "jsonp", // 指定服务器返回的数据类型
            data: {
                enterprise: this.accountParams.enterprise,
                account: this.accountParams.account,
                password: this.accountParams.password,
            },
            jsonp: "callback", // 指定参数名称
            jsonpCallback: "handleData" // 指定回调函数
        }).done((data) => {
            this.configuration = data.data;
            this.interfaceSubject.next({
                code: INTERFACE_SUCCESS_GETSIP.code,
                body: data
            });
        }).fail((statusValue, textValue, errValue) => {
            this.interfaceSubject.next({
                body: JSON.stringify(INTERFACE_FAIL_GETSIP),
                status: statusValue,
                text: textValue,
                err: errValue,
            });
        });
    }

    /*************************jsonp 方式访问接口  END***************************** */

    // 网页话机来电提醒
    public notice() {
        let phone = "";
        if (this.session) {
            phone = this.session.remoteIdentity.displayName;
        }
        this.closeNotice();
        Notification.requestPermission((status) => {
            this.noticefication = new Notification("云电销•系统提示",
                { body: "您有新的来电【" + phone + "】", icon: this.accountParams.iconUrl });
            this.noticefication.onclick = () => {
                window.focus();
            };
        });
    }

    private getJsonpUrl(url: string): string {
        return this.accountParams.api + url;
    }

    private getConnectUrl = (ticket) => {
        return "//" + this.accountParams.wsUrl + "/tscloud/websocket/ws?ticket=" + ticket;
    }
    private getUserUrl = (ticket) => {
        return "/topic/pss." + ticket;
    }
    // 关闭上一个网页话机来电提醒
    private closeNotice() {
        if (this.noticefication) {
            this.noticefication.close();
        }
    }

}
