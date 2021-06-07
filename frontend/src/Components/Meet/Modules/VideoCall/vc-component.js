import React from 'react'
import {renderer} from './vc'

class VC extends React.Component
{

    componentDidMount()
    {
        if(this.props.mypeer !== undefined && this.props.mypeer !== null)
        {
            console.log(this.props.mypeer, this.props.roomid, this.props.uname)
            renderer(this.props.mypeer, this.props.roomid, this.props.uname)
        }
    }
    render()
    {
        return(<div id='video-grid'></div>)
    }
}

export default VC