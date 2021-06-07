import Peer from 'peerjs'

function CreatePeer()
{
    const myPeer = new Peer({host:'codebois-peer-server.herokuapp.com', secure:true, port:443})
    return myPeer
}

export default CreatePeer