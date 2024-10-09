"use client"
import { useSession, signIn, signOut } from "next-auth/react"




export function Appbar() {
    const session = useSession();

    return <div className="flex justify-between px-20 pt-4">
        <div className="text-lg font-bold flex flex-col justify-center">
            Muzer
        </div>
        <div>
            {session.data?.user && <button className="bg-purple-600 text-white hover:bg-purple-700" onClick={() => signOut()}>Logout</button>}
            {!session.data?.user && <button className="bg-purple-600 text-white hover:bg-purple-700" onClick={() => signIn()}>Signin</button>}
        </div>
    </div>
}