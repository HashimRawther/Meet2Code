import './vc.css'
import io from 'socket.io-client'
// eslint-disable-next-line


var connectionOptions =  {
    "force new connection" : true,
    "reconnectionAttempts": "Infinity", 
    "timeout" : 10000,
    "transports" : ["websocket"]
};

// http://localhost:3030/
// https://codebois-server.herokuapp.com/

var socket = io('http://localhost:9000/', connectionOptions)

// var myPeer
let localStream

var peers = {}
var mediaId = []
var peerTrack = []
var mediaTrack = []

function userRemover(userid)
{
    var users = document.getElementsByClassName('user')
    let dropIndex = peerTrack.indexOf(userid)
    console.log('dropping--'+userid)
    if(dropIndex!== -1)
    {
        users[dropIndex+1].remove()
    } 
}

function userName(uname)
{
    let x = document.createElement('p')
    x.className = 'user-name'
    x.innerHTML = uname

    return x
}

function audioIcon(status, className = 'audioStatus')
{
    let x = document.createElement("IMG");
        
    if(status)
    {
        x.setAttribute("src", "/icons/audio-on.png");
    }
    else
    {
        x.setAttribute("src", "/icons/audio-off.png");
    }
    x.setAttribute("width", "30");
    x.setAttribute("height", "30");
    x.className = className
    return x
}

function videoIcon(status, className = 'videoStatus')
{
    let x = document.createElement("IMG");
        
    if(status)
    {
        x.setAttribute("src", "/icons/video-on.png");
    }
    else
    {
        x.setAttribute("src", "/icons/video-off.png");
    }
    x.setAttribute("width", "30");
    x.setAttribute("height", "30");
    x.className = className
    return x
}
    
function mediaStatusUpdate(userId, media, status)
{
    let index = peerTrack.indexOf(userId)+1
    console.log(index+"::"+userId+"/"+media+"/"+status)
    console.log(peerTrack)

    if(media === 'audio')
    {
        var audioStatuses = document.getElementsByClassName('audioStatus')
        audioStatuses[index].replaceWith(audioIcon(status))
    }
    else
    {
        var videoStatuses = document.getElementsByClassName('videoStatus')
        videoStatuses[index].replaceWith(videoIcon(status))
    }
}

function roomMediaStatus()
{
    console.log('media status')
    console.log(mediaTrack)
    var audioStatuses = document.getElementsByClassName('audioStatus')
    var videoStatuses = document.getElementsByClassName('videoStatus')
    var usernames = document.getElementsByClassName('user-name')
    for(let i=0; i<mediaTrack.length && mediaTrack.length===(audioStatuses.length-1); i++)
    {
        console.log('media status--'+i)
        usernames[i+1].replaceWith(userName(mediaTrack[i].username))
        audioStatuses[i+1].replaceWith(audioIcon(mediaTrack[i].audioStatus))
        
        videoStatuses[i+1].replaceWith(videoIcon(mediaTrack[i].videoStatus))
    }
}

function renderer(myPeer, ROOM_ID, username, audioEnable = true, videEnable = true)
{
    // eslint-disable-next-line
    console.log(ROOM_ID+"::"+username)
    const videoGrid = document.getElementById('video-grid')      
    const myVideo = document.createElement('video')
    myVideo.muted = true
        
    navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
    }).then(stream => {
        localStream = stream

        stream.getAudioTracks()[0].enabled = audioEnable
        stream.getVideoTracks()[0].enabled = videEnable


        var audioStatus = document.createElement('div')
        audioStatus.className = "audioStatus"

        var videoStatus = document.createElement('div')
        videoStatus.className = "videoStatus"
        audioStatus.appendChild(audioIcon(audioEnable));

        videoStatus.appendChild(videoIcon(videEnable));

        addVideoStream(myVideo, stream)
        // eslint-disable-next-line
        myPeer.on('call', call => {
            
            call.answer(stream)
            const video = document.createElement('video')

            call.on('stream', userVideoStream => {
                socket.emit('peer-track-sender')
                addVideoStream(video, userVideoStream)

            })
        })

        socket.on('audio-toggle-receiver', ({userId, audioStatus})=> {

            //console.log(peertTrack)
            mediaStatusUpdate(userId, "audio", audioStatus)
        })
    
        socket.on('video-toggle-receiver', ({userId, videoStatus})=>{

            mediaStatusUpdate(userId, "video", videoStatus)
            //console.log(userId, videoStatus)
        })

        socket.on('user-connected', userId => {
            socket.emit('peer-track-sender')
            connectToNewUser(userId, stream)
        })

        socket.on('peer-track-receiver', (p, media)=>{
                
            p.splice( p.indexOf(myPeer.id), 1)
            peerTrack = p

            mediaTrack = media
            for(let i=0; i<mediaTrack.length; i++)
            {
                if(myPeer.id === mediaTrack[i].peerid)
                {
                    mediaTrack.splice(i, 1)
                    break
                }
            }
            
        })
    })

    socket.on('user-disconnected', userId => {

           
        if (peers[userId]) 
        {
            peers[userId].close()
        }
        userRemover(userId) 
        //userRemover(userId)
    })

    // eslint-disable-next-line
    myPeer.on('open', id => {
            
        console.log("In peer open")
        socket.emit('join-room', username, ROOM_ID, id, audioEnable, videEnable)
        
    })

    function connectToNewUser(userId, stream) 
    {
        // eslint-disable-next-line
        const call = myPeer.call(userId, stream)
        const video = document.createElement('video')
        //console.log(userId)
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream)
        })
        call.on('close', () => {
            video.remove()
        })

        peers[userId] = call
        //console.log(peers)
    }   

    function addVideoStream(video, stream) 
    {
        //streams.push(stream)

        if(mediaId.indexOf(stream)!==-1)
        {
            return
        }
        else
        {
            mediaId.push(stream)
        }

        video.srcObject = stream
        video.addEventListener('loadedmetadata', () => {
            video.play()
        })

        let container = document.createElement('div')
        container.className = "user"
            
        let userInfo = document.createElement('div')
        userInfo.className = 'userInfo'

        let mediaBox = document.createElement('div')
        mediaBox.className = 'mediaBox'

        // console.log(mediaTrack)
        container.append(video)
        userInfo.append(userName(username))

        mediaBox.append(audioIcon(stream.getAudioTracks()[0].enabled))
        mediaBox.append(videoIcon(stream.getVideoTracks()[0].enabled))
        userInfo.append(mediaBox)

        container.append(userInfo)
        if(container.children.length===2)
        {
            videoGrid.append(container)
            roomMediaStatus() 
        }   
        
    }
    
    return
}

function toggleAudio(myPeer)
{
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled
        
    var audioStatuses = document.getElementsByClassName('audioStatus')
    audioStatuses[0].replaceWith(audioIcon(localStream.getAudioTracks()[0].enabled))

    socket.emit('peer-track-sender')
    setTimeout( ()=>{
        socket.emit('audio-toggle-sender', myPeer.id, localStream.getAudioTracks()[0].enabled)
    }, 50)
    
}

function toggleVideo(myPeer)
{
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled

    var videoStatuses = document.getElementsByClassName('videoStatus')
    videoStatuses[0].replaceWith(videoIcon(localStream.getVideoTracks()[0].enabled))

    socket.emit('peer-track-sender')
    setTimeout( ()=>{
        socket.emit('video-toggle-sender', myPeer.id, localStream.getVideoTracks()[0].enabled)
    }, 50)
    
}

function endcall()
{
    socket.disconnect()
}

export {
    renderer,
    toggleAudio,
    toggleVideo,
    endcall
}