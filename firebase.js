window.firebaseManager = (() => {
    /* @tweakable Firebase configuration details */
    const firebaseConfig = {
        apiKey: "AIzaSyDBe9ypNO9GDp_4im2cJmFP10jw3_44LK0",
        authDomain: "dragonblox-9953c.firebaseapp.com",
        projectId: "dragonblox-9953c",
        storageBucket: "dragonblox-9953c.appspot.com",
        messagingSenderId: "139175327778",
        appId: "1:139175327778:web:7430aeb3d6c69c531db27b",
        measurementId: "G-NL35GL645E"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const usersCollection = db.collection('users');

    // --- AUTH FUNCTIONS ---

    async function signUp(email, password) {
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            return null; // Success
        } catch (error) {
            console.error("Sign up error:", error.code, error.message);
            switch (error.code) {
                case 'auth/invalid-email':
                    return 'auth_error_invalid_email';
                case 'auth/email-already-in-use':
                    return 'auth_error_email_in_use';
                case 'auth/weak-password':
                    return 'auth_error_weak_password';
                default:
                    return 'auth_error_generic';
            }
        }
    }

    async function signIn(email, password) {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            return null; // Success
        } catch (error) {
            console.error("Sign in error:", error.code, error.message);
             switch (error.code) {
                case 'auth/invalid-email':
                     return 'auth_error_invalid_email';
                case 'auth/user-not-found':
                case 'auth/invalid-credential': // Covers wrong email and password
                    return 'auth_error_wrong_password';
                case 'auth/wrong-password':
                     return 'auth_error_wrong_password';
                default:
                    return 'auth_error_generic';
            }
        }
    }

    function signOutUser() {
        auth.signOut().catch(error => {
            console.error("Sign out error:", error);
        });
    }

    function onAuth(callback) {
        return auth.onAuthStateChanged(callback);
    }

    // --- FIRESTORE FUNCTIONS ---

    async function saveGameToFirestore(userId, gameState) {
        if (!userId) {
            console.error("Cannot save game: no user ID provided.");
            return;
        }
        try {
            // Create a deep copy to avoid modifying the original object
            const stateToSave = JSON.parse(JSON.stringify(gameState));
            await usersCollection.doc(userId).set(stateToSave);
        } catch (error) {
            console.error("Error saving game to Firestore:", error);
            throw error; // Re-throw to be caught by the caller
        }
    }

    async function loadGameFromFirestore(userId) {
        if (!userId) {
            console.error("Cannot load game: no user ID provided.");
            return null;
        }
        try {
            const doc = await usersCollection.doc(userId).get();
            if (doc.exists) {
                return doc.data();
            } else {
                console.log("No saved game found for this user, will create a new one.");
                return null;
            }
        } catch (error) {
            console.error("Error loading game from Firestore:", error);
            return null;
        }
    }


    return {
        signUp,
        signIn,
        signOutUser,
        onAuth,
        saveGameToFirestore,
        loadGameFromFirestore
    };
})();