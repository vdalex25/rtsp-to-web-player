import ReactPlayer from "./components/react-player/react-player";
import {useState} from "react";
import InputGroup from "./components/input-group";

const App = () => {

    const [url, setUrl] = useState(null);

    return (<div className="container mt-3">
            <h3 className="text-center">Simple Example RTSPtoWEB player React</h3>
            <div className="row">
                <div className="col-12">
                    <InputGroup setUrl={setUrl}/>
                </div>
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            PLAYER
                        </div>
                        <div className="card-body p-0">
                            <ReactPlayer url={url}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>)
}

export default App;
