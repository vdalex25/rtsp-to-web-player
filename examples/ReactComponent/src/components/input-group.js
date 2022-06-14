import {useState} from "react";

const InputGroup = ({setUrl}) => {

    const [linkInput, setLinkInput] = useState('');
    const onClickHandler = () => {
        try {
            new URL(linkInput);
        } catch (e) {
            console.warn("URL is not valid ")
            return false;
        }
        setUrl(linkInput);
    }

    return (<div className="input-group mb-3">
            <input type="text"
                   className="form-control"
                   placeholder="Type url link here"
                   value={linkInput}
                   onChange={(e) => {
                       setLinkInput(e.target.value);
                   }}/>
            <button className="btn btn-outline-secondary" type="button" onClick={onClickHandler}>PLAY</button>
        </div>)
}

export default InputGroup;