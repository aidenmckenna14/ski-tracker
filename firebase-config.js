// Firebase configuration for compat mode
const firebaseConfig = {
  apiKey: "AIzaSyAtF4Kuf6T-z2Bq1ou1EJTC1vZuzW2KOnU",
  authDomain: "ne-ski-tracker.firebaseapp.com",
  databaseURL: "https://ne-ski-tracker-default-rtdb.firebaseio.com",
  projectId: "ne-ski-tracker",
  storageBucket: "ne-ski-tracker.firebasestorage.app",
  messagingSenderId: "325169000327",
  appId: "1:325169000327:web:4fc6f701633da598646d22"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();