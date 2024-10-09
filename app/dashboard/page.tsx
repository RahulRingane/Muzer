"use client"
import 'react-toastify/dist/ReactToastify.css'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'
import StreamView from '../components/StreamView'

/*interface Video {
    "id": string,
    "type": string,
    "url": string,
    "extractedId": string,
    "title": string,
    "smallImg": string,
    "bigImg": string,
    "active": boolean,
    "userId": string,
    "upvotes": number,
    "haveUpvoted": boolean
}*/

//const REFRESH_INTERVAL_MS = 10 * 1000;

//const creatorId = ""

export default async function Component() {
    try {
        const data = await fetch("/api/user").then(res => res.json());
  
        return <StreamView creatorId={data.user.id} playVideo={true} />
    } catch(e) {
        return null
        console.log(e,"error")
    }
}

export const dynamic = 'auto' 