'use client'

import { auth, db } from "@/firebase"
import { subscriptions } from "@/utils"
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider(props) {
    const {children} =props 

    const [currentUser, setCurrentUser] = useState(null)
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(false)

    function signup(email,password) {
        return createUserWithEmailAndPassword(auth, email, password)
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password)
    }

    function logout() {
        setCurrentUser(null)
        setUserData(null)
        return signOut(auth)
    }

    async function saveToFirebase(data) {
        try {
            const userRef = doc(db, 'users', currentUser.uid)
            const res= await setDoc(userRef, {
                subscriptions: data
            }, {merge:true})
        } catch(err) {
            console.log(err.message)
        }
    }

    async function handleAddSubscription(newSubscription) {
        if (userData.subscriptions.length >30) {return}
        const newSubscriptions=[...userData.subscriptions, newSubscription]
        setUserData({subscriptions: newSubscriptions})

        await saveToFirebase(newSubscriptions)
    }

    async function handleDeleteSubscription(index) {
        const newSubscriptions = userData.subscriptions.filter((val, valIndex) => {
            return valIndex!==index
        })
        setUserData({subscriptions: newSubscriptions})

        await saveToFirebase(newSubscriptions)
    }


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                setLoading(true)
                setCurrentUser(user)

                if (!user) {
                    setUserData(null)
                    setLoading(false)
                    return
                }

                console.log('Fetching user data')
                console.log('UID:', user.uid)

                const docRef = doc(db, 'users', user.uid)
                console.log(docRef.path)

                const docSnap = await getDoc(docRef)
                console.log(docSnap.exists())

                let firebaseData = { subscriptions: [] }

                if (docSnap.exists()) {
                    console.log('Found user data')
                    firebaseData = docSnap.data()
                }

                setUserData(firebaseData)

            } catch (err) {
                console.log(err.message)

            } finally {
                setLoading(false)
            }
        })
        return unsubscribe
    }, [])

    const value = {
        currentUser, userData, loading, signup, login, logout, handleAddSubscription, handleDeleteSubscription
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )

}