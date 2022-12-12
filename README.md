# RTSPtoWEBPlayer
 external video player for projects:
- [RTSPtoWeb](https://github.com/deepch/RTSPtoWeb)
- [RTSPtoWebRTC](https://github.com/deepch/RTSPtoWebRTC)
- [RTSPtoWSMP4f](https://github.com/deepch/RTSPtoWSMP4f)
- [RTSPtoHLS](https://github.com/deepch/RTSPtoHLS)
- [RTSPtoHLSLL](https://github.com/deepch/RTSPtoHLSLL)

there is no GUI in this project, you can add your own GUI

[demo page](http://htmlpreview.github.io/?https://github.com/vdalex25/rtsp-to-web-player/blob/main/index.html)
[publish page](https://vdalex25.github.io/rtsp-to-web-player/dist)
## Install

```bash
git clone https://github.com/vdalex25/RTSPtoWEBPlayer.git

cd RTSPtoWEBPlayer

npm install

npm run build
```
it's created compiled file `dist/RTSPtoWEBPlayer.js`
## Usage
Add script to your page
```html
<script src="dist/RTSPtoWEBPlayer.js"></script>
```
Create new player
```js
const options={
    parentElement: document.getElementById('player')
};
const player=new RTSPtoWEBPlayer(options);
player.load('ws://localhost:8083/stream/517fe9dbf4b244aaa0330cf582de9932/channel/0/mse?uuid=517fe9dbf4b244aaa0330cf582de9932&channel=0');
```

## Options
```js
options={
        parentElement:null,
        source:null,
        controls:true,
        muted:true,
        autoplay:true,
        loop:false,
        hlsjsconfig: {

        }
    }
```

#### `parentElement`
default: null

HTMLElement
#### `source`
link to mediasource. requires explicit protocol http/https or ws/wss
#### `controls`
default: true

show/hide notive video control
#### `muted`
default: true

#### `autoplay`
default: true

#### `loop`
default: false

#### `hlsjsconfig`
default: empty;

full list of config  you can see on [API dicumentation hls.js](https://github.com/video-dev/hls.js/blob/master/docs/API.md#fine-tuning)

#### `webrtcconfig`
default: 
```js
{
iceServers: [{
    urls: [
        "stun:stun.l.google.com:19302"
    ]}
],
sdpSemantics: "unified-plan",
bundlePolicy: "max-compat",
iceTransportPolicy: "all"//for option "relay" need use  turn server
}
```
full list of config  you can see on [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#parameters)
## Methods
#### `load(source)`
breaking previos connections and load new source
```js
const server='127.0.0.1:8083';//server and port where is running one of mediaserver
const uuid='test';//stream uuid
const channel=0;//stream channel optional

//Project RTSPtoWeb[MSE]
const source=`ws://${server}/stream/${uuid}/channel/${channel}/mse?uuid=${uuid}/&channel=${channel}`;
//Project RTSPtoWeb[WEBRTC]
const source=`http://${server}/stream/${uuid}/channel/${channel}/webrtc?uuid=${uuid}/&channel=${channel}`;
//Project RTSPtoWeb[HLS]
const source=`http://${server}/stream/${uuid}/channel/${channel}/hls/live/index.m3u8`;
//Project RTSPtoWeb[HLSLL]
const source=`http://${server}/stream/${uuid}/channel/${channel}/hlsll/live/index.m3u8`;

//Project RTSPtoWebRTC[WEBRTC]
const source=`http://${server}/stream/receiver/${uuid}`;

//Project RTSPtoWSMP4f[MSE]
const source=`ws://${server}/ws/live?suuid=${uuid}`;

//Project RTSPtoHLS[HLS]
const source=`http://${server}/play/hls/${uuid}/index.m3u8`;

//Project RTSPtoHLSLL[HLS]
const source=`http://${server}/play/hls/${uuid}/index.m3u8`;

player.load(source);
```

#### `destroy()`
breaks all active connections and destroys the player

#### `control media`
for player control you can use all methods for video tag [HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement#methods)  over player.video

for example 
```js
const player=new RTSPtoWEBPlayer({
    parentElement: document.getElementById('player')
});
player.load(source_url);

//pause
player.video.pause();
//play
player.video.play();
//get currentTime
console.log(player.video.currentTime);
//set currentTime
player.video.currentTime=10;
//etc
```
