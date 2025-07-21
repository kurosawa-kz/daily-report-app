import React from 'react';

function App() {
  return (
    <div style={{ maxWidth: '700px', margin: 'auto', padding: '20px' }}>
      <h1>株式会社アイソニーフーズ業務日報</h1>
      <div style={{ marginBottom: '15px' }}>
        <label>日付:</label>
        <input type="date" style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>部署名:</label>
        <input type="text" style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>氏名:</label>
        <input type="text" style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>特記事項:</label>
        <textarea rows="5" style={{ width: '100%', padding: '8px' }}></textarea>
      </div>
      <button style={{ width: '100%', padding: '10px', fontSize: '16px' }}>提出する</button>
    </div>
  );
}

export default App;