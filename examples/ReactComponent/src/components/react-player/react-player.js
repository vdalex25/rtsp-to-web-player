import {useEffect, useRef, useState} from "react";
import './react-player.css';
import RTSPtoWEBPlayer from "rtsptowebplayer";
import ControlButton from "../control-btn";

const ReactPlayer = ({url}) => {

    const playerElement = useRef(null);
    const [player, setPlayer] = useState(null);
    const [state, setState] = useState('pause');
    const stateListener = (e) => {
        setState(e.type);
    }
    const playPause = () => {
        if (player.video.src !== '') {
            player.video.paused ? player.video.play() : player.video.pause();
        }
    }

    useEffect(() => {
        if (player === null) {
            setPlayer(new RTSPtoWEBPlayer({
                parentElement: playerElement.current, controls: false
            }));
        } else if (player.video.onpause === null && player.video.onplay === null) {
            player.video.onpause = stateListener;
            player.video.onplay = stateListener;
        }
        if (url !== null && player !== null) {
            player.load(url);
        }

        return () => {
            if (player !== null) {
                player.destroy();
            }
        }
    }, [url, player]);

    return (<div className="player-wrapper">
        <div ref={playerElement}/>
        <div className="control">
            <ControlButton type={state} onClick={playPause}/>
        </div>
    </div>)
}

export default ReactPlayer;