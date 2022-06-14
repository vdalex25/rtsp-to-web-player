import {ReactComponent as PlayImg} from '../components/images/play.svg';
import {ReactComponent as PauseImg} from '../components/images/pause.svg';

const ControlButton = ({type, onClick}) => {
    switch (type) {
        case 'pause':
            return (<span className="c-button" onClick={onClick}><PlayImg/></span>)
        case 'play':
            return (<span className="c-button" onClick={onClick}><PauseImg/></span>)
        default:
            return null;
    }
}

export default ControlButton;