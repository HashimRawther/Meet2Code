// import React from 'react';
// import {BrowserRouter as Router , Route} from 'react-router-dom';
// import Join from './Components/Join/Join';
// import Meet from './Components/Meet/Meet';
// function App() {

//   return (
//     <Router>
//       <div className="App">
//         <Route path='/' exact component={Join}/>
//         <Route path='/chat' component={Meet}/>
//       </div>
//     </Router>
//   );
// }

// export default App;

  
import React from 'react';
import { useState, useEffect } from 'react';
import serverEndpoint from './config'
import MainPage from './Components/mainPage'
import Login from './Components/login'
import Room from './Components/room'
import {
  BrowserRouter as Router,
  Route,
  Switch
} from 'react-router-dom'

const App=()=>{

  let [user,setUser]=useState({});
  let [loggedin,setLoggedin]=useState(false);
  let [loading,setLoading]=useState(true);    //Loading Screen wait until user info fetched from server

  useEffect(()=>{

    async function getInfo(){
      let loginfo=await fetch(`${serverEndpoint}/oauth/isloggedin`,{
        method:"GET",
        credentials:"include"
      })

      loginfo=await loginfo.json()
      if(loginfo.loggedin===true){

        console.log(loginfo)
        setUser(loginfo.user)
        setLoggedin(true);
        setLoading(false);
      }
      else{
        console.log("Destoryed",loginfo);
        setLoading(false);
      }
    }
    getInfo()
  // eslint-disable-next-line
  },[])


  let logOutUser=async()=>{

    fetch(`${serverEndpoint}/oauth/logout`,{
      method:"post",
      credentials:"include"
    })
    .then(resp=>{
      if(resp.status===200){
        setUser({})
        setLoggedin(false)
      }
    })
  }

  const renderHome=()=>{      //Decides which component to run

    console.log(loading)
    if(loading===true)
      return <div></div>

    if(loggedin===false){
      return <Login ></Login>
    }
    else{
      return  <MainPage user={{...user}} loggedin={loggedin} logOutUser={logOutUser}></MainPage>
    }
  }

  return (  
      <div className='App'>
      <Router>
        <Switch>
            <Route exact path='/'>
              {renderHome()}
            </Route> 
            <Route exact path='/room/:id' component={(props)=><Room {...props} user={{...user}}></Room>}> 
            </Route>
        </Switch>
      </Router>
      </div>
      
);
}

export default App;