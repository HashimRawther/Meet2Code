import React,{useState,useEffect,useCallback} from 'react';
import { useParams } from "react-router-dom";
import io from 'socket.io-client';
import Quill from "quill"
import "quill/dist/quill.snow.css"
import Chat from './Modules/Chat/Chat/Chat';
import './styles.css';
import './Meet.css';
import VC from './Modules/VideoCall/vc-component'
import Participant from './Modules/Participants/Participant';
import Container from './Modules/Whiteboard/container/Container';
import TextEditor from './Modules/DocEditor/TextEditor';
import logo from '../../Images/logo.jpg';
import chat from '../../Images/chat.png';
import user from '../../Images/user.png';
import videoOn from '../../Images/videoOn.png';
import videoOff from '../../Images/videoOff.png';
import mute from '../../Images/mute.png';
import unmute from '../../Images/unmute.png';
import endCall from '../../Images/endCall.png';
import PeerInit from './Modules/VideoCall/peer-init'
import {toggleAudio, toggleVideo} from './Modules/VideoCall/vc'

let socket;

const SAVE_INTERVAL_MS = 2000
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
]

const Meet = (props) => {
    const { id: roomID } = useParams()
    const [page,setpage] = useState(0);
    const [com,setCom] = useState(1);
    const [name,setName] = useState('');
    const [room,setRoom] = useState('');
    const [messages,setMessages] = useState([]);
    const [message,setMessage] = useState('');
    const [usersInRoom,setUsersInRoom] = useState([]);
    const [ctx,setctx] = useState();
    const [timeout,settimeOut] = useState();
    const [image,setImage] = useState();
    const [quill, setQuill] = useState();
    const [camon,setcamon] = useState(true);
    const [micon,setmicon] = useState(true);
    const [roomName,setRoomName] = useState();
    const [myPeer] = useState(PeerInit())
    const ENDPOINT = 'http://localhost:9000';
    useEffect(()=>{
        var connectionOptions =  {
            "force new connection" : true,
            "reconnectionAttempts": "Infinity", 
            "timeout" : 10000,                  
            "transports" : ["websocket"]
        };
        socket = io(ENDPOINT,connectionOptions);
        let name = props.user.login;
        setName(name)
        setRoom(roomID);

        // console.log(roomID);
        let user = props.user;
        // Calling VC
        // const myPeer = PeerInit()
        //setMyPeer(myPeer)
        socket.emit('join',{roomID,user},(roomName)=>{
            setRoomName(roomName);
        });        
        return () =>{
            // socket.emit('disconnect');
            socket.off();
        }
    },[ENDPOINT,roomID,props.user]);
    useEffect(() => {
        if (socket == null || quill == null) return
    
        socket.once("load-document", document => {
          quill.setContents(document)
          quill.enable()
        })
    
        socket.emit("get-document",room)
    }, [quill, room])
    useEffect(() => {
        if (socket == null || quill == null) return
    
        const interval = setInterval(() => {
          socket.emit("save-document", quill.getContents())
        }, SAVE_INTERVAL_MS)
    
        return () => {
          clearInterval(interval)
        }
      }, [quill])
    useEffect(()=>{
        socket.on('message',(message)=>{
            // console.log('message');
            setMessages([...messages,message]);
        })
        socket.on('UserList',(users)=>{
            setUsersInRoom(users);
        })
        socket.on("userJoined", ({ user }) => {
            setUsersInRoom([...usersInRoom,user]);
        });
        socket.on("userLeft",({user})=>{
            setUsersInRoom(usersInRoom.filter((itr)=>itr._id!==user._id))
        })
        socket.on("canvas-data",function(data){
            var image= new Image();
            image.onload=function(){
                if(ctx===undefined) return;
                ctx.drawImage(image,0,0);
            };
            image.src = data;
            setImage(image);
        })
        const handler = delta => {
        quill.updateContents(delta)
        }
        socket.on("receive-changes", handler)
        return(() => {
            socket.off("receive-changes", handler);
            socket.off();
        })
    },[messages,ctx,quill,usersInRoom]);
    useEffect(() => {
        if (socket == null || quill == null) return
    
        const handler = (delta, oldDelta, source) => {
          if (source !== "user") return
          socket.emit("send-changes", delta)
        }
        quill.on("text-change", handler)
    
        return () => {
          quill.off("text-change", handler)
        }
      }, [quill])
    const sendMessage=(e)=>{
        e.preventDefault();
        if(message){
            let id= props.user._id;
            socket.emit('sendMessage',message,id,name,room,()=>{setMessage('')
        });
        }
    }
    const leaveMeet=(e)=>{
        e.preventDefault();
        socket.emit('leaveRoom',{host:props.user._id},(status)=>{
            // console.log(status)
            window.location.href="http://localhost:3000/";
        })
    }
    const wrapperRef = useCallback(wrapper => {
        if (wrapper == null) return
    
        wrapper.innerHTML = ""
        const editor = document.createElement("div")
        wrapper.append(editor)
        const q = new Quill(editor, {
          theme: "snow",
          modules: { toolbar: TOOLBAR_OPTIONS },
        })
        q.disable()
        q.setText("Loading...")
        setQuill(q)
      }, [])
    return (  
        <div className='meet'>
            <div className='logo-container resizeable'>
                <img src={logo} alt='logo' width='70' height='66'/> 
                <h1>{roomName}</h1>
            </div>
            <div className='video-container resizeable'>
                <VC roomid ={roomID} uname={props.user.login} mypeer = {myPeer}/>
            </div>
            <div className='communication-container resizeable'>
                <div className="com-navbar">
                    <button onClick={()=>setCom(1)}><img src={chat} alt='chat' width='40' height='40' /></button>
                    <button onClick={()=>setCom(2)}><img src={user} alt='user' width='40' height='40' /></button>
                </div>
                <div className="com-overview">
                    {

                        ( 
                            com===1?
                            <div className="ChatArea" id='ChatArea'><Chat id={props.user._id} messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage}/></div>
                            :<div className="ParticipantsArea" id='PartArea'><Participant users={usersInRoom}/></div>
                        )
                    }
                </div>
            </div>
            <div className='user-options-container resizeable'>

            </div>
            <div className='workspace-container resizeable'>
                <div className="work-choice-bar">
                    <button onClick={()=>setpage(0)}>1</button>
                    <button onClick={()=>setpage(1)}>2</button>
                    <button onClick={()=>setpage(2)}>3</button>
                </div>
                
                <div className="inner-workspace">
                    {
                        page === 0?(
                            <div className='codeArea'>
                                <div className='directory-container'></div>
                                <div className='code-container'></div>
                                <div className='terminal-container'></div>
                            </div>
                        ):
                        ( 
                            page===1?
                            <div className="DocEditing"><TextEditor wrapperRef={wrapperRef}/></div>
                            :<div className="WhiteBoard"><Container room={room} image={image} socket={socket} ctx={ctx} setctx={setctx} timeout={timeout} settimeOut={settimeOut}/></div>
                        )
                    }
                </div>
            </div> 
            
            <div className='com-features-container resizeable'>
                <button onClick={()=>{setmicon(!micon) 
                    toggleAudio(myPeer)}}>{micon?<img src={unmute} alt='video' width='40' height='40' />:<img src={mute} alt='video' width='40' height='40' />}</button>
                <button onClick={leaveMeet}><img src={endCall} alt='video' width='40' height='40' /></button>
                <button onClick={()=>{setcamon(!camon) 
                    toggleVideo(myPeer)}}>{camon?<img src={videoOn} alt='video' width='40' height='40' />:<img src={videoOff} alt='video' width='40' height='40' />}</button>
            </div>
        </div>
    );
}
 
export default Meet;