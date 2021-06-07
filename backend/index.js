const {setData, getData} = require('./users');

const express=require("express");
      app=express();
      bodyParser=require("body-parser");
      cors=require("cors");
      socket=require("socket.io");
      http=require("http");
      oauth=require('./Routers/oauth');
      room=require('./Routers/room');
      path=require('path');
      session = require("express-session");
      mongoose = require("mongoose");
      Room=require('./Schemas/room');
      User=require('./Schemas/user');
const { v4: uuid } = require('uuid');

const Document = require("./Schemas/Document")
const Peer = require('./Schemas/peerinfos')

const PORT = process.env.PORT || 9000;

const router = require('./Routers/router');

app.use(router);
app.use(cors({credentials:true, origin:["http://localhost:3000"]}));
app.options('*', cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json({limit: '50mb'}));   
app.use(express.static(path.join(__dirname,'/public')));

app.use(session({
    resave:true,
    secret:"Failures are the stepping stones of success",
    saveUninitialized:true,
    name:"meet2codeCookie",
    cookie : {
          maxAge: 1000* 60 * 60 *24 * 365,
          secure:false,
      }

}))

let loggedinUserDetails=(req,res,next)=>{
    let loggedin=0;
    let user={};
    if(req.session.loggedin==true){
        loggedin=1;
        user=req.session.user;
    }
    res.locals={user:user,loggedin:loggedin};
    next();
}
app.use(loggedinUserDetails);

let isLoggedin=(req,res,next)=>{
    if(req.session.loggedin)
        next();
    else
    {     
          // res.status(404).json({"log_data":"Not logged in",...res.locals})
          res.status(401);
          return res.redirect(`${clientEndPoint}`);
    }
}

//Check if the user is not already logged in
let notLoggedin=(req,res,next)=>{
    // console.log(req.session)
    if(req.session.loggedin==undefined || req.session.loggedin==null)
        next();
    else
        res.status(404).json({log_data:"Already logged in",...res.locals})
}
const server = http.createServer(app);
const io = socket(server,{cors: {
    cors: true,
      origins: ["http://localhost:3000","192.168.0.13:3000","https://60a2be5a6ea5e300a1a9aca2--elegant-edison-5499d4.netlify.app"],
      methods: ["GET", "POST"]
    }
});

const defaultValue = ""

io.on('connection',(socket)=>{
    // VC socket events

    socket.on('audio-toggle-sender', (userId, astatus) => {
		Peer.updateOne({peerid: userId}, {
			audioStatus: astatus, 
		}, function(err, numberAffected, rawResponse) {
		   //handle it
		})
		socket.broadcast.to(roomId).emit('audio-toggle-receiver', {userId: userId, audioStatus: astatus})
	})

	socket.on('video-toggle-sender', (userId, vstatus) => {
		Peer.updateOne({peerid: userId}, {
			videoStatus: vstatus, 
		}, function(err, numberAffected, rawResponse) {
		   //handle it
		})
		socket.broadcast.to(roomId).emit('video-toggle-receiver', {userId: userId, videoStatus: vstatus})
	})

	socket.on('peer-track-sender', ()=>{

		Peer.find({roomid: roomId}, {'_id': 0, 'username': 1, 'peerid': 1, 'audioStatus': 1, 'videoStatus': 1})
		.then((mediaRes)=>{
			
			let res = mediaRes.map((x)=>x.peerid)
			// console.log('peerTrack'+res) 
			// console.log('medias'+mediaRes)
			socket.broadcast.to(roomId).emit('peer-track-receiver', res, mediaRes)     
		})
	})

	socket.on('join-room', (uname, room_id, userId, astatus, vstatus) => {
		roomId = room_id
		socket.join(roomId)
		socket.broadcast.to(roomId).emit('user-connected', userId)
		// peers.push(userId)
		// console.log('username:;'+ uname)
		const peer = new Peer({
			username: uname,
			roomid: roomId,
			peerid: userId,
			audioStatus: astatus,
			videoStatus: vstatus
		})
		peer.save()
		.then((res)=>console.log(res))
		.catch(err=>console.log(err))
		
		socket.on('disconnect', () => {

		// console.log("socket disc")
		// console.log(userId)
		socket.broadcast.to(roomId).emit('user-disconnected', userId)
		Peer.deleteOne({peerid: userId}, function (err) {
			if (err) return handleError(err);
		})
		// peers.splice( peers.indexOf(userId), 1)
		
		})
	})
    // Chat socket events
    socket.on('createRoom',async(arg,redirect)=>{
        let roomId=uuid();
        socket.join(`${roomId}`);
        try{
            //Get the details of user who emitted the event
            let user=await User.findById(arg.host)

            if(user['room']!==undefined && user['room']!==null){       //Check if user is already in a room
                // console.log(401)
                let room=await Room.findById(user['room'])
                redirect(room.roomId,401)
                return
            }
            //Create room with the arguments sent along with the newly created roomId
            let room=new Room({
                ...arg,
                roomId:roomId,
            })
            room=await room.save()

            //Update the user info with the new socket id and the room id
            user['room']=room._id
            user['socketId']=socket.id
            await user.save()
            // console.log(room);
            redirect(roomId,200);   //Created Successfully redirect with 200
        }
        catch(e){
            console.log(e)
            redirect(undefined,404)
        }
    })
    //Join an existing room
    socket.on('joinRoom',async(arg,redirect)=>{
        try{
            let room=await Room.findOne({roomId: arg.id}) //Get the room details
            if(room===undefined || room===null){    //Room doesn't exist
                redirect(undefined,404)
                return
            }
            //Get the details of user who emitted the event
            let user=await User.findById(arg.participant)

            if(user['room']!==undefined && user['room']!==null && user['room']!==room._id){       //Check if user is already in a room and not in the given room
                redirect(room.roomId,401)
                return
            }
            if(room['type']==="private" && room['password']!==arg.password){        //If private and password is not correct
                redirect(undefined, 403);    
                return;           
            }
            if(user['room']!=room._id){                         //If the user doesn't already exist

                room['participants'].push(user._id);
                user['room']=room._id
            }
            //Update user and room details and call client redirect function
            await room.save();          
            await user.save();  
            redirect(room.roomId,200); 
        }
        catch(e){
            console.log(e)
            redirect(undefined,404)
        }

    })
    socket.on('leaveRoom',async(arg,redirect)=>{
        try{
            //Get the details of user who emitted the event
            let user=await User.findById(arg.host);
            let room=await Room.findById(user['room']);
            // console.log(room['host'],arg.host);
            if(room!==undefined && room!==null){
                //Delete the room if the host has ended the meeting
                // console.log(room['host'],mongoose.Types.ObjecId(arg.host))
                io.to(room['roomId']).emit('message',{user:'',text:`${user['login']}, has left`});
                io.to(room['roomId']).emit('userLeft', {user: user});
                if(room['host']==(arg.host)){
                    // console.log(room['host'],mongoose.Types.ObjecId(arg.host))
                    //Emit an end room event to all participants of the room 
                    // socket.to(room['roomId']).emit('endRoom')
                    await Room.findByIdAndDelete(room._id)
                }
                //Remove the participant from the room
                else{
                    room['participants'].splice(room['participants'].indexOf(user._id),1);
                    // console.log(room);
                    await room.save();
                }
                //Remove the room from the user
                io.to(user['room']).emit('message',{user:'',text:`${user.name}, has left`});
                user['room']=undefined
                await user.save()
                redirect("Success",200)
            }
        }
        catch(e){
            console.log(e)
            redirect(undefined,404)
        }
    })

    socket.on('test',arg=>{
        // console.log(socket.rooms)
    })
    
    socket.on('closeConnection',arg=>{
        socket.leave(`${arg.room}`)
    })
    socket.on('join',async (arg,callback)=>{
        try{
            let room=arg.roomID;
            let name=arg.user.login;
            // console.log(room);
            let userRoom=await Room.findOne({roomId: room}) //Get the room details
            if(userRoom===undefined || userRoom===null){    //Room doesn't exist
                // redirect(undefined,404)
                console.log("cant read room");
                return
            }
            // const {error,user}= addUser({id:socket.id,name,room});
            // if(error) return callback(error);
            let userlist=await getParticipants(room);
            socket.join(room);
            data=getData(room);
            socket.emit('message',{user:'',text:`${name},welcome to the room ${userRoom['name']}`});
            socket.broadcast.to(room).emit('message',{user:'',text:`${name}, has joined`});
            socket.emit('UserList',userlist);
            socket.broadcast.to(room).emit('userJoined', { room: room, user: arg.user });
            io.to(room).emit('canvas-data',data);
            callback(userRoom['name']);
        }
        catch(e)
        {
            console.log(e)
            redirect(undefined,404)
        }
    });
    socket.on('canvas-data',(data,room)=>{
        setData(room,data);
        io.to(room).emit('canvas-data',data);
    });
    socket.on('sendMessage',(message,id,name,room,callback)=>{
        io.to(room).emit('message',{id:id,user:name,text:message});
        callback();
    })
    socket.on("get-document", async documentId => {
        const document = await findOrCreateDocument(documentId)
        socket.join(documentId)
        if(document !== undefined)
        socket.emit("load-document", document.data)

        socket.on("send-changes", delta => {
            socket.broadcast.to(documentId).emit("receive-changes", delta)
        })

        socket.on("save-document", async data => {
            await Document.findByIdAndUpdate(documentId, { data })
        })
    })
});

async function getParticipants(roomId){
    try{
        let room=await Room.findOne({roomId: roomId});
        let users=[];
        let user=await User.findById(room['host']);
        users.push(user);
        let participants = room['participants'];
        let i;
        for(i=0;i<participants.length;i++)
        {
            user=await User.findById(participants[i]);
            users.push(user);
        }
        // console.log(users);
        return users;
    }
    catch(e)
    {
        console.log(e)
        return [];
    }
}
async function findOrCreateDocument(id) {
    if (id == null) return
  
    const document = await Document.findById(id)
    if (document) return document
    return await Document.create({ _id: id, data: defaultValue })
}

app.set('socketio',io)

app.use('/oauth',oauth);
app.use('/room',room);
server.listen(PORT,()=>{
    console.log('Server started on port: ',PORT);
});