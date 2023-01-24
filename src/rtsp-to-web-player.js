import "webrtc-adapter";
import Hls from "hls.js/dist/hls.light.min.js";
import "./rtsp-to-web-player.css";

export default class RTSPtoWEBPlayer {
  MSE = null;
  MSEStreamingStarted = false;
  MSESourceBuffer = null;
  turn = [];
  codec = null;
  webSocket = null;
  webrtc = null;
  webRtcSocket = null;
  currentPlayerType = null;
  hidden = "hidden";
  paused = false;
  presets = null;
  audio_tracks = null;
  switchFlag = false;
  options = {
    parentElement: null,
    source: null,
    controls: true,
    muted: true,
    autoplay: true,
    loop: false,
    hlsjsconfig: {},
    webrtcconfig: {
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"]
        },
      ],
      sdpSemantics: "unified-plan",
      bundlePolicy: "max-compat",
      //iceTransportPolicy: "relay",//for option "relay" need use  turn server
    },
    debug: false,
    getPresets: null,
    onResolutionChange: null,
    latency: null,
  };

  constructor(options) {
    this.options = { ...this.options, ...options };
    this.createElements();
    if (this.options.parentElement) {
      this.attachTo(this.options.parentElement);
    }
    this.defDocumentHidden();
  }

  createElements = () => {
    //video
    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", "");
    this.video.muted = this.options.muted ? true : false;
    this.video.controls = this.options.controls ? true : false;
    this.video.autoplay = this.options.autoplay ? true : false;
    this.video.loop = this.options.loop ? true : false;

    this.addVideoListeners();
    //wrapper
    this.player = document.createElement("div");
    this.player.classList.add("RTSPtoWEBPlayer");
    this.player.append(this.video);
  };

  attachTo = (element) => {
    this.options.parentElement = element;
    this.options.parentElement.innerHTML = "";
    this.options.parentElement.append(this.player);
    if (this.options.source) {
      this.load(this.options.source);
    }
  };

  load = (source) => {
    this.options.source = source;
    this.destroy();
    const sourceType = new URL(this.options.source);
    if (sourceType.protocol === "http:" || sourceType.protocol === "https:") {
      if (this.options.source.indexOf("m3u8") !== -1) {
        this.currentPlayerType = "hls";
        this.hlsPlayer();
      } else if (this.options.source.indexOf(".mp4") !== -1) {
        this.currentPlayerType = "mp4";
        this.mp4Player();
      } else {
        this.currentPlayerType = "rtc";
        this.webRtcPlayer();
      }
    } else if (
      sourceType.protocol === "ws:" ||
      sourceType.protocol === "wss:"
    ) {
      if (this.options.source.indexOf("webrtc") !== -1) {
        this.currentPlayerType = "ws-rtc";
        this.webRtcOverSocket();
      } else if (
        this.options.source.indexOf("on-air") !== -1 ||
        this.options.source.indexOf("preview") !== -1
      ) {
        this.currentPlayerType = "ws-new";
        this.newMsePlayer();
      } else {
        this.currentPlayerType = "ws";
        this.msePlayer();
      }
    } else {
      this.currentPlayerType = null;
    }
  };

  newMsePlayer = () => {
    this.webSocket = new WebSocket(this.options.source);

    this.webSocket.onclose = (e) => {
      this.debugLogger(e);
    };

    this.webSocket.onmessage = ({ data }) => {
      this.messageHandler(data);
    };
  };

  webRtcOverSocket = () => {
    this.webRtcSocket = new WebSocket(this.options.source);
    this.webRtcSocket.onopen = () => {
      this.webRtcPlayer();
    };
    this.webRtcSocket.onclose = (e) => {
      this.debugLogger(e);
      this.webRtcSocket.onmessage = null;
    };
    this.webRtcSocket.onerror = (e) => {
      this.debugLogger(e);
    };
    this.webRtcSocket.onmessage = ({ data }) => {
      this.webRtcSocketMessageHanler(data);
    };
  };

  webRtcSocketMessageHanler = (data) => {
    data = JSON.parse(data);
    if (data.candidate) {
      this.webrtc.addIceCandidate(data);
    } else {
      this.webrtc.setRemoteDescription(new RTCSessionDescription(data));
    }
  };

  messageHandler = (data) => {
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
        if (data.method === "play_response") {
          this.presets = data.payload.streams;
          if (typeof this.options.getPresets === "function") {
            this.options.getPresets(this.presets, data.payload.audio_tracks);
          }

          const arr_video = data.payload.streams.filter((item) => {
            return item.default;
          });

          const arr_audio = data.payload.audio_tracks.filter((item) => {
            return item.default;
          });

          const default_video = arr_video.length>0? arr_video[0].idx:data.payload.streams[0].idx;
          const default_audio = arr_audio.length>0? arr_audio[0].idx:data.payload.audio_tracks[0].idx;

          this.playPreset(default_video, default_audio);
        }
      } catch (e) {
        this.debugLogger(e);
      }
    } else if (typeof data === "object") {
      data.arrayBuffer().then((packet) => {
        this.readPacket(packet);
      });
      //
    }
  };

  getPresets = () => {
    return this.presets;
  };

  playPreset = (videoIdx, audioIdx) => {
    this.codec = this.presets.filter((item) => item.idx === videoIdx)[0].codecs;
    const answer = JSON.stringify({
      method: "play",
      payload: {
        variant_id: videoIdx,
        audio_track_id: audioIdx,
      },
    });
    this.MSE = new MediaSource();
    this.video.src = window.URL.createObjectURL(this.MSE);
    this.MSE.addEventListener("sourceopen", () => {
      this.MSESourceBuffer = this.MSE.addSourceBuffer(
        `video/mp4; codecs="${this.codec}"`
      );
      this.MSESourceBuffer.mode = "segments";
      this.MSESourceBuffer.addEventListener("updateend", this.pushPacket);
      //this.webSocket.send(answer);
    });
  };

  switchStream = (index) => {
    this.codec = this.presets[index].codecs;
    this.webSocket.send(
      JSON.stringify({
        method: "stop",
      })
    );
    this.switchFlag = true;
    this.webSocket.send(
      JSON.stringify({
        method: "play",
        payload: {
          variant_id: this.presets[index].idx,
        },
      })
    );
    this.MSESourceBuffer.timestampOffset =
      this.MSESourceBuffer.appendWindowStart =
        this.MSESourceBuffer.buffered.end(
          this.MSESourceBuffer.buffered.length - 1
        );
  };

  switchAudio = (idx) => {
    this.webSocket.send(
      JSON.stringify({
        method: "set_audio_track",
        payload: {
          audio_track_id: idx,
        },
      })
    );
    this.video.currentTime += 0.01;
  };

  addMseListeners = () => {
    this.MSE.addEventListener("sourceopen", this.sourceOpenHandler);
  };

  sourceOpenHandler = () => {
    this.websocketEvents();
  };

  websocketEvents = () => {
    this.webSocket = new WebSocket(this.options.source);
    this.webSocket.binaryType = "arraybuffer";
    this.webSocket.onclose = () => {
      this.webSocket.onmessage = null;
    };
    this.webSocket.onmessage = ({ data }) => {
      if (this.codec === null) {
        if (typeof data === "object") {
          this.codec = new TextDecoder("utf-8").decode(
            new Uint8Array(data).slice(1)
          );
        } else {
          this.codec = data;
        }
        this.MSESourceBuffer = this.MSE.addSourceBuffer(
          `video/mp4; codecs="${this.codec}"`
        );
        this.MSESourceBuffer.mode = "segments";
        this.MSESourceBuffer.addEventListener("updateend", this.pushPacket);
      } else {
        if (!this.paused) {
          this.readPacket(data);
        }
      }
      if (document[this.hidden] && this.video.buffered.length) {
        this.video.currentTime =
          this.video.buffered.end(this.video.buffered.length - 1) - 1;
      }
    };
  };

  readPacket = (packet) => {
    if (this.video.buffered && this.video.currentTime > 0) {
      if (typeof this.options.latency === "function") {
        this.options.latency(
          this.video.buffered.length,
          this.video.buffered.end(this.video.buffered.length - 1),
          this.video.currentTime
        );
      }

      if (
        this.video.currentTime <
        this.video.buffered.start(this.video.buffered.length - 1)
      ) {
        this.video.currentTime = this.video.buffered.end(
          this.video.buffered.length - 1
        );
      }
    }
    if (!this.MSEStreamingStarted) {
      try {
        this.MSESourceBuffer.appendBuffer(packet);
        this.MSEStreamingStarted = true;
      } catch (e) {
        this.debugLogger(e);
      }
      return;
    }
    this.turn.push(packet);
    this.pushPacket();
  };

  pushPacket = () => {
    if (!this.MSESourceBuffer.updating) {
      if (this.turn.length > 0) {
        const packet = this.turn.shift();
        try {
          this.MSESourceBuffer.appendBuffer(packet);
        } catch (err) {
          this.debugLogger(err);
        }
      } else {
        this.MSEStreamingStarted = false;
      }
    }
  };

  mp4Player = () => {
    this.video.src = this.options.source;
  };

  msePlayer = () => {
    this.MSE = new MediaSource();
    this.video.src = window.URL.createObjectURL(this.MSE);
    this.addMseListeners();
  };

  hlsPlayer = () => {
    if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
      this.video.src = this.options.source;
    } else if (Hls.isSupported()) {
      this.hls = new Hls(this.options.hlsjsconfig);
      this.hls.loadSource(this.options.source);
      this.hls.attachMedia(this.video);
    } else {
      console.warn("UNSUPPOERED MEDIA SOURCE");
    }
  };

  webRtcPlayer = async () => {
    this.mediaStream = new MediaStream();
    this.video.srcObject = this.mediaStream;
    this.webrtc = new RTCPeerConnection(this.options.webrtcconfig);
    this.webrtc.onnegotiationneeded = this.handleNegotiationNeeded;
    this.webrtc.onsignalingstatechange = this.signalingstatechange;
    this.webrtc.onicegatheringstatechange = this.icegatheringstatechange;
    this.webrtc.onicecandidate = this.icecandidate;
    this.webrtc.onicecandidateerror = this.icecandidateerror;
    this.webrtc.onconnectionstatechange = this.connectionstatechange;
    this.webrtc.oniceconnectionstatechange = this.iceconnectionstatechange;
    this.webrtc.ontrack = this.onTrack;

    const offer = await this.webrtc.createOffer({
      //iceRestart:true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.webrtc.setLocalDescription(offer);
  };

  handleNegotiationNeeded = async () => {
    /*
     * in this project this handler is not needed, but in another it can be useful
     */
    this.debugLogger("handleNegotiationNeeded");
  };

  signalingstatechange = async () => {
    switch (this.webrtc.signalingState) {
      case "have-local-offer":
        if (this.webRtcSocket) {
          this.webRtcSocket.send(JSON.stringify(this.webrtc.localDescription));
        } else {
          const suuid = new URL(this.options.source).pathname
            .split("/")
            .slice(-1);
          const formData = new FormData();
          formData.append("data", btoa(this.webrtc.localDescription.sdp));
          formData.append("suuid", suuid);
          const response = await fetch(this.options.source, {
            method: "POST",
            body: formData,
          });
          if (response.ok) {
            const remoteDescription = await response.text();
            this.webrtc.setRemoteDescription(
              new RTCSessionDescription({
                type: "answer",
                sdp: atob(remoteDescription),
              })
            );
          }
        }

        break;
      case "stable":
        /*
         * There is no ongoing exchange of offer and answer underway.
         * This may mean that the RTCPeerConnection object is new, in which case both the localDescription and remoteDescription are null;
         * it may also mean that negotiation is complete and a connection has been established.
         */
        break;

      case "closed":
        /*
         * The RTCPeerConnection has been closed.
         */
        this.destroy();
        break;

      default:
        console.log(
          `unhandled signalingState is ${this.webrtc.signalingState}`
        );
        break;
    }
  };

  icegatheringstatechange = () => {
    switch (this.webrtc.iceGatheringState) {
      case "gathering":
        /* collection of candidates has begun */
        this.debugLogger("collection of candidates has begun");
        break;
      case "complete":
        /* collection of candidates is finished */
        this.debugLogger("collection of candidates is finished");
        break;
    }
  };

  icecandidate = (event) => {
    this.debugLogger("icecandidate\n", event);
    if (this.webRtcSocket) {
      if (event.candidate && event.candidate.candidate !== "") {
        this.webRtcSocket.send(JSON.stringify(event.candidate));
      }
    }
  };

  icecandidateerror = (event) => {
    this.debugLogger(
      "icecandidateerror\n",
      `hostCandidate: ${event.hostCandidate} CODE: ${event.errorCode} TEXT: ${event.errorText}`
    );
  };

  connectionstatechange = (e) => {
    //console.log(e)
    switch (this.webrtc.connectionState) {
      case "new":
      case "connected":
        this.debugLogger("connected");
        break;
      case "disconnected":
        this.debugLogger("disconnected...");
        break;
      case "closed":
        this.debugLogger("Offline");
        break;
      case "failed":
        this.webrtc.restartIce();
        this.debugLogger("Error");
        break;
      default:
        this.debugLogger(`Unhadled state: ${this.webrtc.connectionState}`);
        break;
    }
  };
  iceconnectionstatechange = () => {
    this.debugLogger(
      "iceconnectionstatechange\n",
      this.webrtc.iceConnectionState
    );
  };

  onTrack = (event) => {
    this.debugLogger("onTrack\n", this.webrtc.iceConnectionState);
    this.mediaStream.addTrack(event.track);
  };

  destroy = () => {
    this.codec = null;
    this.presets = null;
    this.audio_tracks = null;
    if (this.currentPlayerType != null) {
      switch (this.currentPlayerType) {
        case "hls":
          if (this.hls != null) {
            this.hls.destroy();
          }
          break;

        case "rtc":
          if (this.webrtc != null) {
            this.webrtc.close();
            this.webrtc = null;
            this.video.srcObject = null;
            this.mediaStream = null;
          }
          break;

        case "ws":
        case "ws-new":
          this.webSocket.onerror = null;
          this.webSocket.onopen = null;
          this.webSocket.onmessage = null;
          this.webSocket.onclose = null;
          this.webSocket.close(1000);
          this.turn = [];
          break;
        case "ws-rtc":
          this.webRtcSocket.onerror = null;
          this.webRtcSocket.onopen = null;
          this.webRtcSocket.onmessage = null;
          this.webRtcSocket.onclose = null;
          this.webRtcSocket.close(1000);
          this.turn = [];
          if (this.webrtc != null) {
            this.webrtc.close();
            this.webrtc = null;
            this.video.srcObject = null;
            this.mediaStream = null;
          }
          break;
        default:
      }
      this.video.pause();
      this.video.removeAttribute("src"); // empty source
      this.video.load();
    }
  };

  addVideoListeners = () => {
    this.video.addEventListener("error", (e) => {
      this.debugLogger("[ video listener ]", e);
      this.destroy();
    });

    this.video.addEventListener("play", () => {
      this.paused = false;
    });

    this.video.addEventListener("pause", () => {
      this.paused = true;
    });

    this.video.addEventListener("resize", () => {
      if (typeof this.options.onResolutionChange === "function") {
        this.options.onResolutionChange(
          this.video.videoWidth,
          this.video.videoHeight
        );
      }
    });

    this.video.addEventListener("progress", () => {
      if (this.currentPlayerType === "ws" && this.video.buffered.length > 0) {
        if (
          this.video.currentTime <
          this.video.buffered.start(this.video.buffered.length - 1)
        ) {
          this.video.currentTime =
            this.video.buffered.end(this.video.buffered.length - 1) - 1;
        }
      }
    });
  };

  defDocumentHidden() {
    if (typeof document.hidden !== "undefined") {
      this.hidden = "hidden";
    } else if (typeof document.msHidden !== "undefined") {
      this.hidden = "msHidden";
    } else if (typeof document.webkitHidden !== "undefined") {
      this.hidden = "webkitHidden";
    }
  }

  getImageBase64 = () => {
    const canvas = document.createElement("canvas");
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    canvas
      .getContext("2d")
      .drawImage(this.video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL();
    canvas.remove();
    return dataURL;
  };

  debugLogger = (...arg) => {
    if (this.options.debug) {
      if (this.options.debug === "trace") {
        console.trace(...arg);
      } else {
        const d = new Date();
        console.log(d.toLocaleTimeString() + `.${d.getMilliseconds()}`, ...arg);
      }
    }
  };
}
