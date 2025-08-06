import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  createUserWithEmailAndPassword, // メールアドレスでユーザー登録
  signInWithEmailAndPassword,     // メールアドレスでログイン
  signOut                       // ログアウト
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// アプリのIDとFirebaseの設定は環境から提供されます
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// デバウンス関数：頻繁な保存を防ぎ、最後の変更から一定時間後に実行する
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('保存済み');
  const [email, setEmail] = useState(''); // メールアドレス入力用
  const [password, setPassword] = useState(''); // パスワード入力用
  const [authError, setAuthError] = useState(''); // 認証エラーメッセージ

  // レポート内容の変更をFirebaseに保存するデバウンスされた関数
  const debouncedSaveReport = useRef(
    debounce(async (contentToSave, currentUserId, databaseInstance) => {
      if (!currentUserId || !databaseInstance) {
        console.error('ユーザーIDまたはDBインスタンスが利用できません。');
        setSaveStatus('保存エラー');
        return;
      }
      try {
        setSaveStatus('保存中...');
        const reportDocRef = doc(databaseInstance, `artifacts/${appId}/users/${currentUserId}/dailyReports/currentDraft`);
        await setDoc(reportDocRef, {
          content: contentToSave,
          lastUpdated: serverTimestamp(),
        }, { merge: true }); // マージオプションで既存のフィールドを保持しつつ更新
        setSaveStatus('保存済み');
      } catch (error) {
        console.error('レポートの保存中にエラーが発生しました:', error);
        setSaveStatus('保存エラー');
      }
    }, 1000) // 1秒間のデバウンス
  ).current;

  // Firebaseの初期化と認証
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);

    setAuth(authInstance);
    setDb(dbInstance);

    // 認証状態の変更をリッスン
    const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        setUserId(user.uid);
        setAuthError(''); // 認証成功時はエラーをクリア
      } else {
        setUserId(null); // ログアウト状態
        // initialAuthTokenが提供されている場合はカスタム認証でサインインを試みる (Canvas環境向け)
        if (initialAuthToken) {
          try {
            await signInWithCustomToken(authInstance, initialAuthToken);
            setUserId(authInstance.currentUser?.uid);
            setAuthError('');
          } catch (error) {
            console.error('カスタム認証トークンでのサインインに失敗しました:', error);
            // エラー時は匿名サインインを試みる（最終手段）
            try {
              await signInAnonymously(authInstance);
              setUserId(authInstance.currentUser?.uid || crypto.randomUUID()); // fallback to random UUID if anon fails to get UID
              setAuthError('カスタム認証トークンでのログインに失敗しました。匿名でログインしています。');
            } catch (anonError) {
              console.error('匿名サインインに失敗しました:', anonError);
              setLoading(false);
              setAuthError('認証に失敗しました。');
            }
          }
        }
      }
      setLoading(false); // 認証処理が完了したらローディングを終了
    });

    return () => unsubscribeAuth();
  }, []);

  // ユーザーIDが取得できたらFirestoreからデータを読み込み、リアルタイムで同期する
  useEffect(() => {
    let unsubscribeSnapshot = () => {};
    if (db && userId) {
      setLoading(true); // データ読み込み開始時にローディング表示
      const reportDocRef = doc(db, `artifacts/${appId}/users/${userId}/dailyReports/currentDraft`);

      unsubscribeSnapshot = onSnapshot(reportDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // reportContentが入力中の内容と異なる場合のみ更新
          // これにより、入力中のカーソル位置がリセットされるのを防ぐ
          if (data.content !== reportContent) {
            setReportContent(data.content || '');
          }
        } else {
          setReportContent(''); // データが存在しない場合は空にする
        }
        setLoading(false); // データ読み込み完了時にローディング終了
      }, (error) => {
        console.error('リアルタイム同期中にエラーが発生しました:', error);
        setLoading(false);
      });
    } else if (db && !userId && !loading) {
      // ログアウト状態の場合、レポート内容をクリア
      setReportContent('');
    }

    return () => unsubscribeSnapshot(); // クリーンアップ関数
  }, [db, userId, loading]); // db, userId, loadingが変更されたときに再実行

  // 業務日報の内容が変更されたらデバウンスして保存を実行
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setReportContent(newContent);
    setSaveStatus('未保存の変更があります...');
    debouncedSaveReport(newContent, userId, db);
  };

  // ユーザー登録処理
  const handleRegister = async () => {
    setAuthError('');
    if (!auth || !email || !password) {
      setAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // 登録後、自動的にログイン状態になる
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('ユーザー登録エラー:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('このメールアドレスは既に登録されています。');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('パスワードは6文字以上で入力してください。');
      } else {
        setAuthError(`登録に失敗しました: ${error.message}`);
      }
    }
  };

  // ログイン処理
  const handleLogin = async () => {
    setAuthError('');
    if (!auth || !email || !password) {
      setAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('ログインエラー:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setAuthError('メールアドレスまたはパスワードが正しくありません。');
      } else {
        setAuthError(`ログインに失敗しました: ${error.message}`);
      }
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    setAuthError('');
    if (auth) {
      try {
        await signOut(auth);
        setReportContent(''); // ログアウト時にレポート内容をクリア
        setSaveStatus('ログアウト済み');
      } catch (error) {
        console.error('ログアウトエラー:', error);
        setAuthError(`ログアウトに失敗しました: ${error.message}`);
      }
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-xl text-gray-700">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl p-6 sm:p-8 lg:p-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 text-center">
          業務日報
        </h1>

        {!userId ? (
          // 未ログイン時の表示
          <div className="flex flex-col items-center">
            <p className="text-lg text-gray-700 mb-4 text-center">
              業務日報をリアルタイム同期するには、ログインまたは新規登録が必要です。
            </p>
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full max-w-md p-3 border border-gray-300 rounded-lg mb-3 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
            <input
              type="password"
              placeholder="パスワード (6文字以上)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full max-w-md p-3 border border-gray-300 rounded-lg mb-4 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
            {authError && <p className="text-red-600 mb-4 text-center">{authError}</p>}
            <div className="flex space-x-4">
              <button
                onClick={handleRegister}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                新規登録
              </button>
              <button
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                ログイン
              </button>
            </div>
          </div>
        ) : (
          // ログイン済み時の表示
          <>
            <div className="mb-4 text-sm text-gray-600 text-center">
              ユーザーID: <span className="font-semibold text-blue-700 break-words">{userId}</span>
            </div>
            <div className="mb-4 text-right text-sm text-gray-500 flex justify-between items-center">
              <span>保存状態: <span className={`font-semibold ${saveStatus === '保存済み' ? 'text-green-600' : 'text-orange-600'}`}>{saveStatus}</span></span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                ログアウト
              </button>
            </div>

            <textarea
              className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-base resize-y"
              placeholder="今日の業務日報を入力してください..."
              value={reportContent}
              onChange={handleContentChange}
            ></textarea>

            <div className="mt-6 text-center text-gray-600 text-sm">
              ※ 入力内容は自動的にクラウドに保存され、ログインしたアカウントでどの端末からでも続きを編集できます。
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
