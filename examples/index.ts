import { writeFile } from "fs/promises"
import { getKeyframeByRoomId } from "../src"

getKeyframeByRoomId({ cid: 213, platform: "h5" }).then(buf=>
    writeFile('114514.jpg',buf)
).then(()=>{console.log('wrote')})