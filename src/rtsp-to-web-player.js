import 'webrtc-adapter';
import Hls from 'hls.js/dist/hls.light.min.js';
import './rtsp-to-web-player.css';

export default class RTSPtoWEBPlayer{

    MSE=null;
    MSEStreamingStarted=false;
    MSESourceBuffer=null;
    turn=[];
    codec=null;
    webSocket=null;
    webrtc=null;
    currentPlayerType=null;
    hidden = "hidden";
    paused=false;
    options={
        parentElement:null,
        source:null,
        controls:true,
        muted:true,
        autoplay:true,
        loop:false,
        hlsjsconfig: {

        },
        webrtcconfig:{
            iceServers: [{urls: ["stun:stun.l.google.com:19302"]}],
            sdpSemantics: "unified-plan",
            bundlePolicy: "max-compat",
            iceTransportPolicy: "all",//for option "relay" need use  turn server
        },
        debug:false
    }

    constructor(options) {
        this.options={...this.options,...options};
        this.createElements();
        if(this.options.parentElement){
            this.attachTo(this.options.parentElement);
        }
        this.defDocumentHidden();
    }

    createElements = ()=>{
        //video
        this.video=document.createElement("video");
        this.options.controls ? this.video.setAttribute('controls','') :0;
        this.options.muted ? this.video.setAttribute('muted',''):0;
        this.options.autoplay ? this.video.setAttribute('autoplay',''):0;
        this.options.loop ? this.video.setAttribute('loop',''):0;
        this.addVideoListeners();
        //wrapper
        this.player=document.createElement("div");
        this.player.classList.add('RTSPtoWEBPlayer');
        this.player.append(this.video);
    }

    attachTo=()=>{
        this.options.parentElement.innerHTML="";
        this.options.parentElement.append(this.player);
        if(this.options.source){
            this.load(this.options.source);
        }
    }

    load = (source)=>{
        this.options.source=source;
        this.destroy();
        const sourceType = new URL(this.options.source);
        if (sourceType.protocol === 'http:' || sourceType.protocol === 'https:') {
            if (this.options.source.indexOf('m3u8') !== -1) {
                this.currentPlayerType = "hls";
                this.hlsPlayer();
            }else if(this.options.source.indexOf('.mp4') !== -1){
                this.currentPlayerType = "mp4";
                this.mp4Player();
            } else {
                this.currentPlayerType = "rtc";
                this.webRtcPlayer();
            }
        } else if (sourceType.protocol === 'ws:' || sourceType.protocol === 'wss:') {
            this.currentPlayerType = "ws";
            this.msePlayer();
        } else {
            this.currentPlayerType = null;
        }

    }

    addMseListeners = () => {
        this.MSE.addEventListener('sourceopen', this.sourceOpenHandler);
    }

    sourceOpenHandler=()=>{
        this.websocketEvents();
    }

    websocketEvents=()=>{
        this.webSocket = new WebSocket(this.options.source);
        this.webSocket.binaryType = "arraybuffer";
        this.webSocket.onclose = () => {
            this.webSocket.onmessage=null;
        }
        this.webSocket.onmessage =  ({data}) => {
            if(this.codec===null){
                if(typeof (data)==="object"){
                    this.codec=new TextDecoder("utf-8").decode((new Uint8Array(data)).slice(1));
                }else{
                    this.codec=data;
                }
                this.MSESourceBuffer = this.MSE.addSourceBuffer(`video/mp4; codecs="${this.codec}"`);
                this.MSESourceBuffer.mode = "segments";
                this.MSESourceBuffer.addEventListener("updateend", this.pushPacket);
            }else{
                if(!this.paused){
                    this.readPacket(data);
                }
            }
            if (document[this.hidden] && this.video.buffered.length) {
                this.video.currentTime = this.video.buffered.end((this.video.buffered.length - 1)) - 1;
            }
        }
    }

    readPacket = (packet)=>{
        if (!this.MSEStreamingStarted) {
            try {
                this.MSESourceBuffer.appendBuffer(packet);
                this.MSEStreamingStarted = true;
            } catch (e) {
                console.log(e);
            }
            return;
        }
        this.turn.push(packet);
        this.pushPacket();
    }

    pushPacket = () => {
        if (!this.MSESourceBuffer.updating) {
            if (this.turn.length > 0) {
                const packet = this.turn.shift();
                try {
                    this.MSESourceBuffer.appendBuffer(packet)
                } catch (err) {
                    this.debugLogger(err);
                }
            } else {
                this.MSEStreamingStarted = false;
            }
        }
    }

    mp4Player=()=>{
        this.video.src=this.options.source;
    }

    msePlayer =()=>{
        this.MSE = new MediaSource();
        this.video.src = window.URL.createObjectURL(this.MSE);
        this.addMseListeners();
    }

    hlsPlayer = ()=>{
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = this.options.source;
        } else if (Hls.isSupported()) {
            this.hls = new Hls(this.options.hlsjsconfig);
            this.hls.loadSource(this.options.source);
            this.hls.attachMedia(this.video);
        }else{
            console.warn('UNSUPPOERED MEDIA SOURCE');
        }
    }

    webRtcPlayer= async ()=>{
        this.mediaStream = new MediaStream();
        this.video.srcObject = this.mediaStream;
        this.webrtc = new RTCPeerConnection(this.options.webrtcconfig);
        this.webrtc.onnegotiationneeded         =this.handleNegotiationNeeded;
        this.webrtc.onsignalingstatechange      =this.signalingstatechange;
        this.webrtc.onicegatheringstatechange   =this.icegatheringstatechange;
        this.webrtc.onicecandidate              =this.icecandidate;
        this.webrtc.onicecandidateerror         =this.icecandidateerror;
        this.webrtc.onconnectionstatechange     =this.connectionstatechange;
        this.webrtc.oniceconnectionstatechange  =this.iceconnectionstatechange;
        this.webrtc.ontrack = this.onTrack;

        const offer = await this.webrtc.createOffer({
            //iceRestart:true,
            offerToReceiveAudio:true,
            offerToReceiveVideo:true
        });
        await this.webrtc.setLocalDescription(offer);
    }

    handleNegotiationNeeded = async ()=>{
        /*
        * in this project this handler is not needed, but in another it can be useful
        */
        this.debugLogger('handleNegotiationNeeded')
    }

    signalingstatechange = async ()=>{
        switch (this.webrtc.signalingState){
            case 'have-local-offer':
                const suuid=((new URL(this.options.source)).pathname).split('/').slice(-1);
                const formData = new FormData();
                formData.append('data', btoa(this.webrtc.localDescription.sdp));
                formData.append('suuid',suuid);
                const response=await  fetch(this.options.source, {
                    method: 'POST',
                    body: formData
                });
                if(response.ok){
                    const remoteDescription=await response.text();
                    this.webrtc.setRemoteDescription(new RTCSessionDescription({
                        type: 'answer',
                        sdp: atob(remoteDescription)
                    }))
                }
                break;
            case 'stable':
                /*
                * There is no ongoing exchange of offer and answer underway.
                * This may mean that the RTCPeerConnection object is new, in which case both the localDescription and remoteDescription are null;
                * it may also mean that negotiation is complete and a connection has been established.
                */
                break;

            case 'closed':
                /*
                 * The RTCPeerConnection has been closed.
                 */
                this.destroy();
                break;

            default:
                console.log(`unhandled signalingState is ${this.webrtc.signalingState}`);
                break;
        }
    }

    icegatheringstatechange =()=>{
        switch(this.webrtc.iceGatheringState) {
            case "gathering":
                /* collection of candidates has begun */
                this.debugLogger('collection of candidates has begun');
                break;
            case "complete":
                /* collection of candidates is finished */
                this.debugLogger('collection of candidates is finished');
                break;
        }
    }

    icecandidate = (event)=>{
        this.debugLogger('icecandidate\n',event.candidate)
    }

    icecandidateerror=(event)=>{
        this.debugLogger('icecandidateerror\n',`hostCandidate: ${event.hostCandidate} CODE: ${event.errorCode} TEXT: ${event.errorText}`);
    }

    connectionstatechange=()=>{
        switch(this.webrtc.connectionState) {
            case "new":
            case "connected":
                this.debugLogger("Online");
                break;
            case "disconnected":
                this.debugLogger("Disconnecting...");
                break;
            case "closed":
                this.debugLogger("Offline");
                break;
            case "failed":
                this.debugLogger("Error");
                break;
            default:
                this.debugLogger(`Unhadled state: ${this.webrtc.connectionState}`);
                break;
        }
    }
    iceconnectionstatechange=()=>{
        //this.debugLogger('iceconnectionstatechange\n',this.webrtc.iceConnectionState);
    }

    onTrack=(event)=>{
        this.mediaStream.addTrack(event.track);
    }

    destroy=()=>{
        this.codec=null;
        if (this.currentPlayerType != null) {
            switch (this.currentPlayerType) {
                case 'hls':
                    if (this.hls != null) {
                        this.hls.destroy();
                    }
                    break;

                case 'rtc':
                    if (this.webrtc != null) {
                        this.webrtc.close();
                        this.webrtc = null;
                        this.video.srcObject = null;
                        this.mediaStream = null;
                    }
                    break;

                case 'ws':
                    this.webSocket.onerror = null;
                    this.webSocket.onopen = null;
                    this.webSocket.onmessage = null;
                    this.webSocket.onclose = null;
                    this.webSocket.close(1000);
                    this.turn=[];
                    break;
                default:
            }
            this.video.pause();
            this.video.removeAttribute('src'); // empty source
            this.video.load();
        }
    }

    addVideoListeners=()=>{

        this.video.addEventListener('error', (e) => {
            this.debugLogger('[ video listener ]',e)
            this.destroy();
        });

        this.video.addEventListener('play', () => {
            this.paused=false
        });

        this.video.addEventListener('pause', () => {
            this.paused=true;
        });//

        this.video.addEventListener('progress', () => {
            if(this.currentPlayerType === 'ws' && this.video.buffered.length>0){
                if(this.video.currentTime<this.video.buffered.start(this.video.buffered.length-1)){
                    this.video.currentTime=this.video.buffered.end(this.video.buffered.length-1)-1;
                }
            }
        });
    }

    defDocumentHidden() {
        if (typeof document.hidden !== "undefined") {
            this.hidden = "hidden";
        } else if (typeof document.msHidden !== "undefined") {
            this.hidden = "msHidden";
        } else if (typeof document.webkitHidden !== "undefined") {
            this.hidden = "webkitHidden";
        }
    }

    getImageBase64 = ()=>{
        const canvas = document.createElement("canvas");
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        canvas.getContext('2d').drawImage(this.video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL();
        canvas.remove();
        return dataURL;
    }

    debugLogger=(...arg)=>{
        if(this.options.debug){
            if(this.options.debug==='trace'){
                console.trace(...arg)
            }else{
                console.log(...arg)
            }

        }
    }


}


