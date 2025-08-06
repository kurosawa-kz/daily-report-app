// src/firebase.js

// 必要な機能をfirebaseからインポートします
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// あなたのWebアプリのFirebase設定情報
const firebaseConfig = {
  apiKey: "AIzaSyBiqYkSn9C_9iUSagpeanridSYrTJmgZf4",
  authDomain: "nippou-app-20250722.firebaseapp.com",
  projectId: "nippou-app-20250722",
  storageBucket: "nippou-app-20250722.appspot.com",
  messagingSenderId: "765477110672",
  appId: "1:765477110672:web:0698436dc905e49b39e915",
  measurementId: "G-BXM7C2ZLER"
};

// Firebaseアプリを初期化します
const app = initializeApp(firebaseConfig);

// Firestoreデータベースへの接続を確立し、他のファイルで使えるようにエクスポートします
export const db = getFirestore(app);