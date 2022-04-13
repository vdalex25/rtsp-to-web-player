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
            iceServers: [{
                urls: ["stun:stun.l.google.com:19302"]
            }],
            sdpSemantics: "unified-plan",
            bundlePolicy: 'max-compat'

        }
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

    addListeners = () => {
        this.MSE.addEventListener('sourceopen', this.sourceOpenHandler);
    }

    sourceOpenHandler=()=>{
        this.websocketEvents();
    }

    websocketEvents=()=>{
        this.webSocket = new WebSocket(this.options.source);
        this.webSocket.binaryType = "arraybuffer";
        this.webSocket.onopen = () => {

        }
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
                this.MSESourceBuffer.mode = "segments"
            }else{
                this.readPacket(data);
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

        if (!this.MSESourceBuffer.updating) {
            this.pushPacket();
        }
    }

    pushPacket = () => {
        if (!this.MSESourceBuffer.updating) {
            if (this.turn.length > 0) {
                const packet = this.turn.shift();
                try {
                    this.MSESourceBuffer.appendBuffer(packet)
                } catch (e) {
                    console.log(e);
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
        this.addListeners();
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

    webRtcPlayer() {
        this.mediaStream = new MediaStream();
        this.webrtc = new RTCPeerConnection(this.options.webrtcconfig);
        this.webrtc.onnegotiationneeded = this.handleNegotiationNeeded;

        this.webrtc.addTransceiver('video', {
            'direction': 'sendrecv'
        });
        this.webrtc.ontrack = this.onTrack;
    }

     handleNegotiationNeeded = async ()=>{
        const offer = await this.webrtc.createOffer();
        await this.webrtc.setLocalDescription(offer);
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

    }

    onTrack=(event)=>{
        this.mediaStream.addTrack(event.track);
        this.video.srcObject = this.mediaStream;
        this.video.play();
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

    defDocumentHidden() {
        if (typeof document.hidden !== "undefined") {
            this.hidden = "hidden";
        } else if (typeof document.msHidden !== "undefined") {
            this.hidden = "msHidden";
        } else if (typeof document.webkitHidden !== "undefined") {
            this.hidden = "webkitHidden";
        }
    }
}


